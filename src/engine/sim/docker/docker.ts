import { fail, hint, ok, type CommandOutput, type OutputLine } from '../types';
import { CATALOG, parseImageRef, pseudoHex, type CatalogImage, type ProgramResult } from './catalog';
import { ellipsis, humanDuration, shortId, table } from './format';

/**
 * Docker simulato: immagini locali, container e i comandi principali della CLI,
 * con output e messaggi d'errore nel formato di Docker Engine 29.
 */

export const DOCKER_VERSION = '29.9.0';

export interface LocalImage {
  repo: string;
  tag: string;
  catalog: CatalogImage;
  pulledAt: number;
}

export interface PortMapping {
  host: string;
  container: string;
}

export type ContainerState = 'created' | 'running' | 'exited';

export interface Container {
  id: string;
  name: string;
  /** L'immagine come l'ha scritta lo studente (è quello che mostra `docker ps`). */
  imageName: string;
  image: LocalImage;
  command: string[];
  created: number;
  started?: number;
  finished?: number;
  state: ContainerState;
  exitCode: number;
  /** Per i processi a durata limitata (es. sleep 30): quando terminano da soli. */
  runUntil?: number;
  ports: PortMapping[];
  env: Record<string, string>;
  logs: string[];
  autoRemove: boolean;
  /** true se il comando è quello predefinito dell'immagine (rilevante per SIGTERM). */
  defaultCommand: boolean;
}

const ADJECTIVES = ['admiring', 'brave', 'clever', 'eager', 'focused', 'gifted', 'happy', 'jolly', 'keen', 'nostalgic', 'quirky', 'serene', 'vibrant', 'zealous'];
const SURNAMES = ['hopper', 'lovelace', 'turing', 'curie', 'hamilton', 'ritchie', 'torvalds', 'montalcini', 'fermi', 'hypatia', 'noether', 'volta', 'galileo', 'meitner'];

const RUN_HELP = "Run 'docker run --help' for more information";

export class DockerEngine {
  images: LocalImage[] = [];
  containers: Container[] = [];
  private counter = 0;

  constructor(private readonly now: () => number) {}

  private nextHex(length: number): string {
    this.counter++;
    return pseudoHex(`c${this.counter}-${this.now()}`, length);
  }

  private randomName(): string {
    for (let attempt = 0; attempt < 50; attempt++) {
      this.counter++;
      const adjective = ADJECTIVES[this.counter % ADJECTIVES.length];
      const surname = SURNAMES[(this.counter * 7 + attempt) % SURNAMES.length];
      const name = `${adjective}_${surname}`;
      if (!this.containers.some((c) => c.name === name)) return name;
    }
    return `container_${this.counter}`;
  }

  /** Aggiorna i container che nel frattempo hanno finito (es. `sleep 30` dopo 30 secondi). */
  refresh(): void {
    const now = this.now();
    for (const container of this.containers) {
      if (container.state === 'running' && container.runUntil !== undefined && container.runUntil <= now) {
        container.state = 'exited';
        container.exitCode = 0;
        container.finished = container.runUntil;
      }
    }
    this.containers = this.containers.filter((c) => !(c.autoRemove && c.state === 'exited'));
  }

  findImage(ref: string): LocalImage | undefined {
    const { repo, tag } = parseImageRef(ref);
    return this.images.find((image) => image.repo === repo && image.tag === tag)
      ?? this.images.find((image) => ref.length >= 4 && image.catalog.id.startsWith(ref.replace(/^sha256:/, '')));
  }

  findContainer(ref: string): Container | undefined {
    const byName = this.containers.find((c) => c.name === ref || c.name === ref.replace(/^\//, ''));
    if (byName) return byName;
    const matches = this.containers.filter((c) => c.id.startsWith(ref));
    return matches.length === 1 ? matches[0] : undefined;
  }

  /** Aggiunge un'immagine come se fosse già stata scaricata (per preparare le missioni). */
  preload(ref: string): boolean {
    const { repo, tag } = parseImageRef(ref);
    const catalog = CATALOG[repo];
    if (!catalog || !catalog.tags.includes(tag)) return false;
    if (!this.findImage(ref)) this.images.push({ repo, tag, catalog, pulledAt: this.now() });
    return true;
  }

  /** Scarica un'immagine. Restituisce le righe di avanzamento oppure un errore. */
  private pull(ref: string): { lines: string[]; image?: LocalImage; error?: string } {
    const { repo, tag } = parseImageRef(ref);
    const existing = this.findImage(ref);
    const fullName = `${repo}:${tag}`;
    if (existing) {
      return {
        image: existing,
        lines: [
          `${tag}: Pulling from library/${repo}`,
          `Digest: sha256:${existing.catalog.digest}`,
          `Status: Image is up to date for ${fullName}`,
        ],
      };
    }
    const catalog = CATALOG[repo];
    if (!catalog) {
      return {
        lines: [],
        error: `Error response from daemon: pull access denied for ${repo}, repository does not exist or may require 'docker login'`,
      };
    }
    if (!catalog.tags.includes(tag)) {
      return {
        lines: [],
        error: `Error response from daemon: manifest for ${fullName} not found: manifest unknown: manifest unknown`,
      };
    }
    const image: LocalImage = { repo, tag, catalog, pulledAt: this.now() };
    this.images.push(image);
    return {
      image,
      lines: [
        `${tag}: Pulling from library/${repo}`,
        ...catalog.layers.map((layer) => `${layer}: Pull complete`),
        `Digest: sha256:${catalog.digest}`,
        `Status: Downloaded newer image for ${fullName}`,
      ],
    };
  }

  // --- Programmi eseguiti dentro un container -------------------------------------------

  private runProgram(container: Container, argv: string[], interactive: boolean): ProgramResult | { notFound: string } {
    const catalog = container.image.catalog;
    if (container.defaultCommand) return catalog.runDefault(container.env, this.now());
    const [program = '', ...args] = argv;
    const name = program.split('/').pop() ?? program;
    switch (name) {
      case 'echo':
        return { kind: 'exit', stdout: [args.join(' ')], code: 0 };
      case 'sh':
      case 'bash':
      case 'ash':
        if (name === 'bash' && catalog.repo === 'alpine') return { notFound: program };
        if (args[0] === '-c' && args[1]) {
          return this.runProgram({ ...container, defaultCommand: false }, args[1].split(/\s+/), interactive);
        }
        return interactive ? { kind: 'interactive', stdout: [], code: 0 } : { kind: 'exit', stdout: [], code: 0 };
      case 'hostname':
        return { kind: 'exit', stdout: [shortId(container.id)], code: 0 };
      case 'whoami':
        return { kind: 'exit', stdout: ['root'], code: 0 };
      case 'pwd':
        return { kind: 'exit', stdout: ['/'], code: 0 };
      case 'uname':
        return { kind: 'exit', stdout: [args.includes('-a') ? `Linux ${shortId(container.id)} 6.8.0 #1 SMP x86_64 GNU/Linux` : 'Linux'], code: 0 };
      case 'ls':
        return {
          kind: 'exit',
          code: 0,
          stdout: [args.filter((a) => !a.startsWith('-'))[0] === '/' || args.length === 0
            ? 'bin\nboot\ndev\netc\nhome\nlib\nmedia\nmnt\nopt\nproc\nroot\nrun\nsbin\nsrv\nsys\ntmp\nusr\nvar'
            : ''].filter(Boolean),
        };
      case 'cat':
        if (args[0] === '/etc/os-release' && catalog.osRelease) {
          return { kind: 'exit', stdout: catalog.osRelease.trimEnd().split('\n'), code: 0 };
        }
        return { kind: 'exit', stdout: [], stderr: [`cat: ${args[0] ?? ''}: No such file or directory`], code: 1 };
      case 'env':
        return {
          kind: 'exit',
          code: 0,
          stdout: [
            'PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin',
            `HOSTNAME=${shortId(container.id)}`,
            ...Object.entries(container.env).map(([key, value]) => `${key}=${value}`),
            'HOME=/root',
          ],
        };
      case 'sleep': {
        const seconds = Number(args[0]);
        if (!Number.isFinite(seconds)) return { kind: 'exit', stdout: [], stderr: ['sleep: invalid time interval'], code: 1 };
        return { kind: 'service', stdout: [], code: 0, durationMs: seconds * 1000 };
      }
      case 'nginx':
        if (catalog.repo === 'nginx' && args.includes('-v')) {
          return { kind: 'exit', stdout: [], stderr: ['nginx version: nginx/1.29.2'], code: 0 };
        }
        return catalog.repo === 'nginx' ? catalog.runDefault(container.env, this.now()) : { notFound: program };
      default:
        return { notFound: program };
    }
  }

  private start(container: Container, interactive: boolean): { result: ProgramResult | { notFound: string } } {
    const now = this.now();
    const result = this.runProgram(container, container.command, interactive);
    if ('notFound' in result) {
      container.state = 'created';
      container.exitCode = 127;
      return { result };
    }
    container.started = now;
    container.logs.push(...result.stdout, ...(result.stderr ?? []));
    if (result.kind === 'service') {
      container.state = 'running';
      container.runUntil = result.durationMs !== undefined ? now + result.durationMs : undefined;
    } else {
      container.state = 'exited';
      container.exitCode = result.code;
      container.finished = now;
    }
    return { result };
  }

  private stop(container: Container, signal: 'TERM' | 'KILL'): void {
    if (container.state !== 'running') return;
    const graceful = signal === 'TERM' && container.defaultCommand && container.image.catalog.handlesSigterm;
    container.state = 'exited';
    container.exitCode = graceful ? 0 : 137;
    container.finished = this.now();
    container.runUntil = undefined;
  }

  private hostPortInUse(host: string): Container | undefined {
    return this.containers.find((c) => c.state === 'running' && c.ports.some((p) => p.host === host));
  }

  // --- Comandi ---------------------------------------------------------------------------

  run(args: string[]): CommandOutput {
    let detach = false;
    let interactive = false;
    let tty = false;
    let name: string | undefined;
    let autoRemove = false;
    const ports: PortMapping[] = [];
    const env: Record<string, string> = {};
    let index = 0;

    const takeValue = (arg: string): string | null => {
      const eq = arg.indexOf('=');
      if (arg.startsWith('--') && eq > 0) return arg.slice(eq + 1);
      if (!arg.startsWith('--') && arg.length > 2) return arg.slice(2);
      index++;
      return args[index] ?? null;
    };

    for (; index < args.length; index++) {
      const arg = args[index] as string;
      if (!arg.startsWith('-')) break;
      const longName = arg.split('=')[0];
      if (longName === '--detach') detach = true;
      else if (longName === '--interactive') interactive = true;
      else if (longName === '--tty') tty = true;
      else if (longName === '--rm') autoRemove = true;
      else if (longName === '--name' || arg === '--name') {
        const value = takeValue(arg);
        if (!value) return fail(125, 'docker: flag needs an argument: --name', '', RUN_HELP);
        name = value;
      } else if (longName === '--publish' || arg.startsWith('-p')) {
        const value = takeValue(arg);
        if (!value) return fail(125, "docker: flag needs an argument: 'p' in -p", '', RUN_HELP);
        const match = /^(?:(\d+\.\d+\.\d+\.\d+):)?(\d+):(\d+)(?:\/(tcp|udp))?$/.exec(value);
        if (!match) return fail(125, `docker: invalid publish opts format (should be name=value but got '${value}')`, '', RUN_HELP);
        ports.push({ host: match[2] as string, container: `${match[3]}/${match[4] ?? 'tcp'}` });
      } else if (longName === '--env' || arg.startsWith('-e')) {
        const value = takeValue(arg);
        if (!value) return fail(125, "docker: flag needs an argument: 'e' in -e", '', RUN_HELP);
        const eq = value.indexOf('=');
        if (eq > 0) env[value.slice(0, eq)] = value.slice(eq + 1);
      } else if (longName === '--volume' || arg.startsWith('-v') || longName === '--restart') {
        takeValue(arg); // accettati ma non simulati
      } else if (/^-[dit]+$/.test(arg)) {
        if (arg.includes('d')) detach = true;
        if (arg.includes('i')) interactive = true;
        if (arg.includes('t')) tty = true;
      } else if (arg.startsWith('--')) {
        return fail(125, `docker: unknown flag: ${longName}`, '', RUN_HELP);
      } else {
        return fail(125, `docker: unknown shorthand flag: '${arg[1]}' in ${arg}`, '', RUN_HELP);
      }
    }

    const imageName = args[index];
    if (!imageName) {
      return fail(125, "docker: 'docker run' requires at least 1 argument", '', 'Usage:  docker run [OPTIONS] IMAGE [COMMAND] [ARG...]', '', 'Create and run a new container from an image');
    }
    const command = args.slice(index + 1);

    const stdout: string[] = [];
    /** Righe del download: vanno mostrate prima di tutto il resto. */
    const before: OutputLine[] = [];
    const extra: OutputLine[] = [];
    let image = this.findImage(imageName);
    if (!image) {
      const { repo, tag } = parseImageRef(imageName);
      const pulled = this.pull(imageName);
      if (pulled.error) {
        return { stdout: '', extra: [{ kind: 'err', text: `Unable to find image '${repo}:${tag}' locally` }, { kind: 'err', text: `docker: ${pulled.error}` }, { kind: 'err', text: '' }, { kind: 'err', text: RUN_HELP }], code: 125 };
      }
      before.push({ kind: 'err', text: `Unable to find image '${repo}:${tag}' locally` }, ...pulled.lines.map((text) => ({ kind: 'err' as const, text })));
      image = pulled.image as LocalImage;
    }

    if (name && this.containers.some((c) => c.name === name)) {
      const other = this.containers.find((c) => c.name === name) as Container;
      return {
        stdout: '',
        before,
        extra: [
          { kind: 'err', text: `docker: Error response from daemon: Conflict. The container name "/${name}" is already in use by container "${other.id}". You have to remove (or rename) that container to be able to reuse that name.` },
          { kind: 'err', text: '' },
          { kind: 'err', text: RUN_HELP },
        ],
        code: 125,
      };
    }

    const container: Container = {
      id: this.nextHex(64),
      name: name ?? this.randomName(),
      imageName,
      image,
      command: command.length ? command : image.catalog.defaultCommand,
      defaultCommand: command.length === 0,
      created: this.now(),
      state: 'created',
      exitCode: 0,
      ports,
      env,
      logs: [],
      autoRemove,
    };
    this.containers.push(container);

    for (const port of ports) {
      if (this.hostPortInUse(port.host)) {
        return {
          before,
          stdout: detach ? `${container.id}\n` : '',
          extra: [
            { kind: 'err', text: `docker: Error response from daemon: failed to set up container networking: driver failed programming external connectivity on endpoint ${container.name} (${this.nextHex(64)}): Bind for 0.0.0.0:${port.host} failed: port is already allocated` },
            { kind: 'err', text: '' },
            { kind: 'err', text: RUN_HELP },
          ],
          code: 125,
        };
      }
    }

    const { result } = this.start(container, interactive && tty);
    if ('notFound' in result) {
      return {
        before,
        stdout: '',
        extra: [
          { kind: 'err', text: `docker: Error response from daemon: failed to create task for container: failed to create shim task: OCI runtime create failed: runc create failed: unable to start container process: error during container init: exec: "${result.notFound}": executable file not found in $PATH` },
          { kind: 'err', text: '' },
          { kind: 'err', text: RUN_HELP },
        ],
        code: 127,
      };
    }

    if (detach) {
      stdout.push(container.id);
    } else {
      stdout.push(...result.stdout);
      extra.push(...(result.stderr ?? []).map((text) => ({ kind: 'err' as const, text })));
      if (result.kind === 'service') {
        // Nella realtà il terminale resterebbe "agganciato" al container fino a Ctrl+C.
        extra.push({ kind: 'out', text: '^C' }, hint('foregroundStopped', { name: container.name }));
        this.stop(container, 'TERM');
        if (container.exitCode === 137) container.exitCode = 130;
      } else if (result.kind === 'interactive' && interactive && tty) {
        extra.push(hint('interactiveShell'));
      }
    }
    this.refresh();
    return {
      before,
      stdout: stdout.length ? `${stdout.join('\n')}\n` : '',
      extra,
      code: detach ? 0 : container.exitCode,
    };
  }

  ps(args: string[]): CommandOutput {
    this.refresh();
    const all = args.includes('-a') || args.includes('--all') || args.some((a) => /^-[a-z]*a/.test(a) && !a.startsWith('--'));
    const quiet = args.includes('-q') || args.includes('--quiet') || args.some((a) => /^-[a-z]*q/.test(a) && !a.startsWith('--'));
    const now = this.now();
    const shown = this.containers.filter((c) => all || c.state === 'running').slice().reverse();
    if (quiet) return ok(shown.map((c) => `${shortId(c.id)}\n`).join(''));
    const rows = [['CONTAINER ID', 'IMAGE', 'COMMAND', 'CREATED', 'STATUS', 'PORTS', 'NAMES']];
    for (const c of shown) {
      const status =
        c.state === 'running'
          ? `Up ${humanDuration(now - (c.started ?? now))}`
          : c.state === 'exited'
            ? `Exited (${c.exitCode}) ${humanDuration(now - (c.finished ?? now))} ago`
            : 'Created';
      const ports =
        c.state === 'running'
          ? [
              ...c.ports.flatMap((p) => [`0.0.0.0:${p.host}->${p.container}`, `[::]:${p.host}->${p.container}`]),
              ...c.image.catalog.exposedPorts.filter((e) => !c.ports.some((p) => p.container === e)),
            ].join(', ')
          : '';
      rows.push([
        shortId(c.id),
        c.imageName,
        `"${ellipsis(c.command.join(' '), 20)}"`,
        `${humanDuration(now - c.created)} ago`,
        status,
        ports,
        c.name,
      ]);
    }
    return ok(table(rows));
  }

  imagesCommand(): CommandOutput {
    this.refresh();
    if (this.images.length === 0) {
      return ok('IMAGE   ID             DISK USAGE   CONTENT SIZE   EXTRA\n');
    }
    const inUse = (image: LocalImage) => this.containers.some((c) => c.image === image);
    const anyInUse = this.images.some(inUse);
    const sorted = [...this.images].sort((a, b) => `${a.repo}:${a.tag}`.localeCompare(`${b.repo}:${b.tag}`));
    const nameWidth = Math.max(5, ...sorted.map((i) => `${i.repo}:${i.tag}`.length));
    const pad = (text: string, width: number) => text.padEnd(width);
    const header = `${pad('IMAGE', nameWidth)}   ${pad('ID', 12)}   ${pad('DISK USAGE', 10)}   ${pad('CONTENT SIZE', 12)}   EXTRA`;
    const rows = sorted.map((i) =>
      `${pad(`${i.repo}:${i.tag}`, nameWidth)}   ${shortId(i.catalog.id)}   ${i.catalog.diskUsage.padStart(10)}   ${i.catalog.contentSize.padStart(12)}   ${inUse(i) ? 'U' : ''}`.trimEnd(),
    );
    const legend = anyInUse ? ['i Info →   U  In Use', ''] : [];
    return ok(`${[...legend, header, ...rows].join('\n')}\n`);
  }

  pullCommand(args: string[]): CommandOutput {
    const ref = args.find((a) => !a.startsWith('-'));
    if (!ref) return fail(1, "docker: 'docker pull' requires 1 argument", '', 'Usage:  docker pull [OPTIONS] NAME[:TAG|@DIGEST]', '', 'Download an image from a registry');
    const { repo, tag } = parseImageRef(ref);
    const result = this.pull(ref);
    if (result.error) return fail(1, result.error);
    const header = ref.includes(':') ? [] : ['Using default tag: latest'];
    return ok(`${[...header, ...result.lines, `docker.io/library/${repo}:${tag}`].join('\n')}\n`);
  }

  private eachContainer(args: string[], action: (c: Container, ref: string) => string | null): CommandOutput {
    this.refresh();
    const refs = args.filter((a) => !a.startsWith('-'));
    const out: string[] = [];
    const errors: string[] = [];
    for (const ref of refs) {
      const container = this.findContainer(ref);
      if (!container) {
        errors.push(`Error response from daemon: No such container: ${ref}`);
        continue;
      }
      const error = action(container, ref);
      if (error) errors.push(error);
      else out.push(ref);
    }
    this.refresh();
    return {
      stdout: out.length ? `${out.join('\n')}\n` : '',
      extra: errors.map((text) => ({ kind: 'err', text })),
      code: errors.length ? 1 : 0,
    };
  }

  stopCommand(args: string[]): CommandOutput {
    return this.eachContainer(args, (c) => {
      this.stop(c, 'TERM');
      return null;
    });
  }

  killCommand(args: string[]): CommandOutput {
    return this.eachContainer(args, (c, ref) => {
      if (c.state !== 'running') {
        return `Error response from daemon: cannot kill container: ${ref}: container ${c.id} is not running`;
      }
      this.stop(c, 'KILL');
      return null;
    });
  }

  startCommand(args: string[]): CommandOutput {
    return this.eachContainer(args, (c) => {
      if (c.state === 'running') return null;
      for (const port of c.ports) {
        const other = this.hostPortInUse(port.host);
        if (other && other !== c) {
          return `Error response from daemon: failed to set up container networking: driver failed programming external connectivity on endpoint ${c.name}: Bind for 0.0.0.0:${port.host} failed: port is already allocated`;
        }
      }
      this.start(c, false);
      return null;
    });
  }

  restartCommand(args: string[]): CommandOutput {
    return this.eachContainer(args, (c) => {
      this.stop(c, 'TERM');
      this.start(c, false);
      return null;
    });
  }

  rmCommand(args: string[]): CommandOutput {
    const force = args.some((a) => a === '-f' || a === '--force' || /^-[a-z]*f/.test(a));
    return this.eachContainer(args, (c) => {
      if (c.state === 'running' && !force) {
        return `Error response from daemon: cannot remove container "${c.name}": container is running: stop the container before removing or force remove`;
      }
      this.containers = this.containers.filter((other) => other !== c);
      return null;
    });
  }

  logsCommand(args: string[]): CommandOutput {
    this.refresh();
    const ref = args.filter((a) => !a.startsWith('-')).pop();
    if (!ref) return fail(1, "docker: 'docker logs' requires exactly 1 argument", '', 'Usage:  docker logs [OPTIONS] CONTAINER');
    const container = this.findContainer(ref);
    if (!container) return fail(1, `Error response from daemon: No such container: ${ref}`);
    return ok(container.logs.length ? `${container.logs.join('\n')}\n` : '');
  }

  execCommand(args: string[]): CommandOutput {
    this.refresh();
    let index = 0;
    let interactive = false;
    for (; index < args.length && (args[index] as string).startsWith('-'); index++) {
      if (/i/.test(args[index] as string)) interactive = true;
    }
    const ref = args[index];
    const command = args.slice(index + 1);
    if (!ref || command.length === 0) {
      return fail(1, "docker: 'docker exec' requires at least 2 arguments", '', 'Usage:  docker exec [OPTIONS] CONTAINER COMMAND [ARG...]');
    }
    const container = this.findContainer(ref);
    if (!container) return fail(1, `Error response from daemon: No such container: ${ref}`);
    if (container.state !== 'running') return fail(1, `Error response from daemon: container ${container.id} is not running`);
    const result = this.runProgram({ ...container, defaultCommand: false }, command, interactive);
    if ('notFound' in result) {
      return fail(127, `OCI runtime exec failed: exec failed: unable to start container process: exec: "${result.notFound}": executable file not found in $PATH`);
    }
    const extra: OutputLine[] = (result.stderr ?? []).map((text) => ({ kind: 'err', text }));
    if (result.kind === 'interactive') extra.push(hint('interactiveShell'));
    if (result.kind === 'service') extra.push(hint('execLimited'));
    return { stdout: result.stdout.length ? `${result.stdout.join('\n')}\n` : '', extra, code: result.code };
  }

  rmiCommand(args: string[]): CommandOutput {
    this.refresh();
    const force = args.some((a) => a === '-f' || a === '--force');
    const refs = args.filter((a) => !a.startsWith('-'));
    if (!refs.length) return fail(1, "docker: 'docker rmi' requires at least 1 argument", '', 'Usage:  docker rmi [OPTIONS] IMAGE [IMAGE...]');
    const out: string[] = [];
    const errors: string[] = [];
    for (const ref of refs) {
      const image = this.findImage(ref);
      if (!image) {
        errors.push(`Error response from daemon: No such image: ${ref.includes(':') ? ref : `${ref}:latest`}`);
        continue;
      }
      const user = this.containers.find((c) => c.image === image);
      if (user && !force) {
        errors.push(`Error response from daemon: conflict: unable to remove repository reference "${ref}" (must force) - container ${shortId(user.id)} is using its referenced image ${shortId(image.catalog.id)}`);
        continue;
      }
      this.images = this.images.filter((i) => i !== image);
      out.push(`Untagged: ${image.repo}:${image.tag}`, `Deleted: sha256:${image.catalog.id}`);
    }
    return { stdout: out.length ? `${out.join('\n')}\n` : '', extra: errors.map((text) => ({ kind: 'err', text })), code: errors.length ? 1 : 0 };
  }

  version(): CommandOutput {
    // Valori indicativi della versione 29 (controllare con `docker version` su un'installazione reale).
    return ok(`Client: Docker Engine - Community
 Version:           ${DOCKER_VERSION}
 API version:       1.52
 OS/Arch:           linux/amd64
 Context:           default

Server: Docker Engine - Community
 Engine:
  Version:          ${DOCKER_VERSION}
  API version:      1.52 (minimum version 1.44)
  OS/Arch:          linux/amd64
 containerd:
  Version:          v2.1.4
 runc:
  Version:          1.3.0
 docker-init:
  Version:          0.19.0
`);
  }
}

export const DOCKER_USAGE = `
Usage:  docker [OPTIONS] COMMAND

A self-sufficient runtime for containers

Common Commands:
  run         Create and run a new container from an image
  exec        Execute a command in a running container
  ps          List containers
  build       Build an image from a Dockerfile
  pull        Download an image from a registry
  push        Upload an image to a registry
  images      List images
  login       Authenticate to a registry
  logout      Log out from a registry
  search      Search Docker Hub for images
  version     Show the Docker version information
  info        Display system-wide information

Run 'docker COMMAND --help' for more information on a command.
`;
