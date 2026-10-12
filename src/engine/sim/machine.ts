import { COMMANDS, ERROR_TEXT, usageFor } from './commands';
import { dockerCli } from './docker/cli';
import { DockerEngine } from './docker/docker';
import { ROOT, VirtualFs, type FsError } from './fs';
import { parseLine, splitSequence, type SimpleCommand } from './parse';
import { displayPath, HOME, HOSTNAME, resolvePath, USER } from './path';
import {
  BUILTINS,
  DEFAULT_PATH,
  defaultProcesses,
  GROUP,
  PACKAGES,
  PASSWD,
  STUDENT,
  type Process,
} from './system';
import { SYSTEM_COMMANDS } from './system-commands';
import { hint, type CommandOutput, type ExecutedCommand, type OutputLine } from './types';

export interface MachineSetup {
  /** Cartella di partenza (predefinita: la cartella personale ~). */
  cartella?: string;
  /** Cartelle da creare (con tutte le cartelle intermedie). */
  cartelle?: string[];
  /** File da creare: percorso → contenuto. */
  file?: Record<string, string>;
  /** Permessi da impostare: percorso → modo ottale ("640"). */
  permessi?: Record<string, string>;
  /** Proprietari da impostare: percorso → "utente" oppure "utente:gruppo". */
  proprietari?: Record<string, string>;
  /** Pacchetti già installati (tra quelli disponibili in apt). */
  pacchetti?: string[];
  /** Processi in esecuzione oltre a quelli di sistema. */
  processi?: { comando: string; utente?: string; cpu?: number; mem?: number; ignoraTerm?: boolean }[];
  /** Immagini Docker già scaricate. */
  immagini?: string[];
}

export interface ExecResult {
  lines: OutputLine[];
  clear: boolean;
}

const ASSIGNMENT = /^[A-Za-z_][A-Za-z0-9_]*=/;
const MAX_SCRIPT_DEPTH = 4;

/**
 * Un computer simulato: file system con utenti e permessi, shell, pacchetti, processi e Docker.
 * `now` si può sostituire nei test per controllare il tempo.
 */
export class Machine {
  readonly fs: VirtualFs;
  readonly docker: DockerEngine;
  cwd = HOME;
  oldPwd = HOME;
  /** Righe digitate, in ordine (per `history` e ↑). */
  readonly history: string[] = [];
  /** Ogni comando semplice eseguito, con il suo codice d'uscita e l'utente (per gli obiettivi). */
  readonly executed: ExecutedCommand[] = [];
  lastExitCode = 0;
  /** Variabili della shell; quelle in `exported` fanno parte dell'ambiente. */
  private readonly vars = new Map<string, string>();
  readonly exported = new Set<string>();
  packages = new Set<string>();
  aptUpdated = false;
  processes: Process[] = defaultProcesses();
  nextPid = 1301;
  private sudoAuthenticated = false;

  constructor(
    setup: MachineSetup = {},
    readonly now: () => number = () => Date.now(),
  ) {
    this.fs = new VirtualFs(now);
    this.docker = new DockerEngine(now);
    this.buildSystem();

    for (const [name, value] of [
      ['SHELL', '/bin/bash'],
      ['PWD', HOME],
      ['LOGNAME', USER],
      ['HOME', HOME],
      ['LANG', 'C.UTF-8'],
      ['USER', USER],
      ['PATH', DEFAULT_PATH],
    ] as const) {
      this.vars.set(name, value);
      this.exported.add(name);
    }

    // I file dell'esercizio appartengono allo studente, come se li avesse creati lui.
    this.fs.actor = STUDENT;
    for (const dir of setup.cartelle ?? []) this.fs.mkdir(resolvePath(HOME, dir), true);
    for (const [path, content] of Object.entries(setup.file ?? {})) {
      const full = resolvePath(HOME, path);
      this.fs.mkdir(full.slice(0, full.lastIndexOf('/')) || '/', true);
      this.fs.writeFile(full, content);
    }
    this.fs.actor = ROOT;
    for (const [path, spec] of Object.entries(setup.proprietari ?? {})) {
      const [owner, group] = spec.split(':');
      this.fs.chown(resolvePath(HOME, path), owner, group ?? owner);
    }
    for (const [path, mode] of Object.entries(setup.permessi ?? {})) {
      this.fs.chmod(resolvePath(HOME, path), () => parseInt(mode, 8));
    }
    this.fs.actor = STUDENT;

    for (const name of setup.pacchetti ?? []) if (PACKAGES[name]) this.packages.add(name);
    for (const process of setup.processi ?? []) {
      this.processes.push({
        pid: this.nextPid,
        user: process.utente ?? USER,
        command: process.comando,
        tty: '?',
        stat: 'R',
        cpu: process.cpu ?? 0,
        mem: process.mem ?? 0.1,
        vsz: 2804,
        rss: 1536,
        start: '10:00',
        time: '0:00',
        ignoreTerm: process.ignoraTerm,
      });
      this.nextPid += 37;
    }
    for (const image of setup.immagini ?? []) this.docker.preload(image);
    if (setup.cartella) {
      const start = resolvePath(HOME, setup.cartella);
      this.fs.mkdir(start, true);
      this.cwd = start;
      this.oldPwd = start;
    }
  }

  /** Le cartelle e i file di sistema, di proprietà di root, come su Ubuntu. */
  private buildSystem() {
    const fs = this.fs;
    fs.actor = ROOT;
    for (const dir of ['/bin', '/dev', '/etc', '/home', '/usr/bin', '/usr/local/bin', '/var/lib', '/var/log']) {
      fs.mkdir(dir, true);
    }
    fs.mkdir('/root');
    fs.chmod('/root', () => 0o700);
    fs.mkdir('/tmp');
    fs.chmod('/tmp', () => 0o1777);
    fs.writeFile('/etc/hostname', `${HOSTNAME}\n`);
    fs.writeFile('/etc/passwd', PASSWD);
    fs.writeFile('/etc/group', GROUP);
    fs.writeFile('/etc/shadow', `root:*:20000:0:99999:7:::\n${USER}:$y$j9T$segreto:20000:0:99999:7:::\n`);
    fs.chown('/etc/shadow', 'root', 'shadow');
    fs.chmod('/etc/shadow', () => 0o640);
    fs.writeFile('/root/.bashrc', '# configurazione di root\n');
    fs.mkdir(HOME);
    fs.chown(HOME, USER, USER);
    fs.chmod(HOME, () => 0o750);
    // /dev/null: il "buco nero" in cui finisce ciò che non interessa.
    fs.place('/dev/null', { type: 'file', content: '', mtime: this.now(), owner: 'root', group: 'root', mode: 0o666 });
  }

  // --- Variabili ------------------------------------------------------------------------

  getVar(name: string): string | undefined {
    if (name === 'PWD') return this.cwd;
    if (name === 'OLDPWD') return this.oldPwd;
    return this.vars.get(name);
  }

  setVar(name: string, value: string): void {
    this.vars.set(name, value);
  }

  unsetVar(name: string): void {
    this.vars.delete(name);
    this.exported.delete(name);
  }

  /** Le variabili d'ambiente, nell'ordine in cui `env` le stampa. */
  environment(): [string, string][] {
    return [...this.exported].flatMap((name) => {
      const value = this.getVar(name);
      return value === undefined ? [] : [[name, value] as [string, string]];
    });
  }

  /** Valori usati per espandere $NOME nella riga di comando. */
  get env(): Record<string, string> {
    const values: Record<string, string> = Object.fromEntries(this.vars);
    values.PWD = this.cwd;
    values.OLDPWD = this.oldPwd;
    values['?'] = String(this.lastExitCode);
    return values;
  }

  /** Il prompt di bash: studente@corso:~/progetto$ */
  get prompt(): string {
    return `${USER}@${HOSTNAME}:${displayPath(this.cwd)}$ `;
  }

  // --- Esecuzione -----------------------------------------------------------------------

  /** Trova il programma in una delle cartelle di PATH (i comandi del simulatore stanno in /usr/bin). */
  private inPath(): boolean {
    const dirs = (this.getVar('PATH') ?? '').split(':');
    return dirs.includes('/usr/bin') || dirs.includes('/bin');
  }

  private notFound(name: string): CommandOutput {
    if (PACKAGES[name] && !this.packages.has(name)) {
      // Il messaggio del pacchetto command-not-found di Ubuntu.
      return {
        stdout: '',
        extra: [
          { kind: 'err', text: `Command '${name}' not found, but can be installed with:` },
          { kind: 'err', text: '' },
          { kind: 'err', text: `sudo apt install ${name}` },
        ],
        code: 127,
      };
    }
    const known = Boolean(COMMANDS[name] || SYSTEM_COMMANDS[name] || name === 'docker' || name === 'sudo');
    if (known && !this.inPath()) {
      return {
        stdout: '',
        extra: [
          { kind: 'err', text: `Command '${name}' is available in the following places` },
          { kind: 'err', text: ` * /bin/${name}` },
          { kind: 'err', text: ` * /usr/bin/${name}` },
          { kind: 'err', text: "The command could not be located because '/bin:/usr/bin' is not included in the PATH environment variable." },
          { kind: 'err', text: `${name}: command not found` },
        ],
        code: 127,
      };
    }
    return {
      stdout: '',
      extra: [{ kind: 'err', text: `${name}: command not found` }, hint('unknownCommand', { command: name })],
      code: 127,
    };
  }

  private runSimple(argv: string[], stdin: string | null, depth: number): CommandOutput {
    const result = this.dispatch(argv, stdin, depth);
    this.executed.push({ argv, code: result.code, user: this.fs.actor.user });
    return result;
  }

  private dispatch(argv: string[], stdin: string | null, depth: number): CommandOutput {
    // NOME=valore: assegnazione di una variabile della shell.
    const assignments = argv.filter((word, index) => ASSIGNMENT.test(word) && argv.slice(0, index).every((w) => ASSIGNMENT.test(w)));
    if (assignments.length) {
      const rest = argv.slice(assignments.length);
      if (rest.length === 0) {
        for (const assignment of assignments) {
          const eq = assignment.indexOf('=');
          this.setVar(assignment.slice(0, eq), assignment.slice(eq + 1));
        }
        return { stdout: '', extra: [], code: 0 };
      }
      return this.dispatch(rest, stdin, depth); // NOME=valore comando: per semplicità si esegue il comando
    }

    const [name = '', ...args] = argv;
    if (name.includes('/')) return this.runScriptPath(name, depth);
    if (name === 'sudo') return this.sudo(args, stdin, depth);
    if (!BUILTINS.has(name) && !this.inPath()) return this.notFound(name);
    if (name === 'docker') return dockerCli(this.docker, args);
    if (name === 'bash' || name === 'sh') return this.runScriptCommand(name, args, depth);
    if (PACKAGES[name] && !this.packages.has(name)) return this.notFound(name);
    const command = COMMANDS[name] ?? SYSTEM_COMMANDS[name];
    if (!command) return this.notFound(name);
    if (args.includes('--help')) {
      const usage = usageFor(name);
      if (usage) return { stdout: usage, extra: [], code: 0 };
    }
    return command(this, args, stdin);
  }

  private sudo(args: string[], stdin: string | null, depth: number): CommandOutput {
    const [first] = args;
    if (!first) return { stdout: '', extra: [{ kind: 'err', text: 'usage: sudo -h | -K | -k | -V' }], code: 1 };
    if (first === '-i' || first === '-s' || first === 'su' || first === 'bash') {
      return { stdout: '', extra: [hint('notSimulated', { command: `sudo ${args.join(' ')}` })], code: 1 };
    }
    if (BUILTINS.has(first) && first !== 'echo' && first !== 'pwd' && first !== 'kill') {
      return { stdout: '', extra: [{ kind: 'err', text: `sudo: ${first}: command not found` }], code: 1 };
    }
    // La prima volta sudo chiede la password dell'utente; poi la ricorda per un po'.
    const before: OutputLine[] = [];
    if (!this.sudoAuthenticated && this.fs.actor.user !== 'root') {
      before.push({ kind: 'out', text: `[sudo] password for ${USER}: ` }, hint('sudoPassword'));
      this.sudoAuthenticated = true;
    }
    const previous = this.fs.actor;
    this.fs.actor = ROOT;
    try {
      const result = this.runSimple(args, stdin, depth);
      return { ...result, before: [...before, ...(result.before ?? [])] };
    } finally {
      this.fs.actor = previous;
    }
  }

  /** ./script.sh o /percorso/programma: serve il permesso di esecuzione. */
  private runScriptPath(name: string, depth: number): CommandOutput {
    const path = resolvePath(this.cwd, name);
    const { node, error } = this.fs.lookup(path);
    const failWith = (code: number, reason: string) => ({
      stdout: '',
      extra: [{ kind: 'err' as const, text: `bash: ${name}: ${reason}` }],
      code,
    });
    if (error) return failWith(error === 'missing' ? 127 : 126, ERROR_TEXT[error]);
    if (!node) return failWith(127, 'No such file or directory');
    if (node.type === 'dir') return failWith(126, 'Is a directory');
    if (!this.fs.can(node, 'x') || !this.fs.can(node, 'r')) return failWith(126, 'Permission denied');
    return this.runScript(node.content, depth);
  }

  /** bash script.sh: basta il permesso di lettura. */
  private runScriptCommand(name: string, args: string[], depth: number): CommandOutput {
    const file = args.find((a) => !a.startsWith('-'));
    if (!file) return { stdout: '', extra: [hint('subshell')], code: 0 };
    const { content, error } = this.fs.read(resolvePath(this.cwd, file));
    if (error) return { stdout: '', extra: [{ kind: 'err', text: `${name}: ${file}: ${ERROR_TEXT[error]}` }], code: 127 };
    return this.runScript(content ?? '', depth);
  }

  private runScript(content: string, depth: number): CommandOutput {
    if (depth >= MAX_SCRIPT_DEPTH) return { stdout: '', extra: [], code: 1 };
    const collected: OutputLine[] = [];
    for (const raw of content.split('\n')) {
      const line = raw.trim();
      if (line === '' || line.startsWith('#')) continue;
      collected.push(...this.runLine(line, depth + 1).lines);
    }
    const stdout = collected.filter((l) => l.kind === 'out').map((l) => (l.kind === 'out' ? l.text : ''));
    return {
      stdout: stdout.length ? `${stdout.join('\n')}\n` : '',
      extra: collected.filter((l) => l.kind !== 'out'),
      code: this.lastExitCode,
    };
  }

  private redirectError(target: string, error: FsError): OutputLine {
    return { kind: 'err', text: `bash: ${target}: ${ERROR_TEXT[error === 'noParent' ? 'missing' : error]}` };
  }

  private runPipeline(pipeline: SimpleCommand[], lines: OutputLine[], depth: number): { code: number; clear: boolean } {
    let stdin: string | null = null;
    let code = 0;
    let clear = false;
    pipeline.forEach((simple, index) => {
      const result = this.runSimple(simple.argv, stdin, depth);
      code = result.code;
      if (result.clear) {
        clear = true;
        lines.length = 0;
      }
      lines.push(...(result.before ?? []));
      let output = result.stdout;
      let extra = result.extra;

      // 2>&1, 2> file: dove vanno i messaggi d'errore.
      if (simple.errRedirect) {
        const errors = extra.filter((l) => l.kind === 'err').map((l) => (l.kind === 'err' ? `${l.text}\n` : '')).join('');
        extra = extra.filter((l) => l.kind !== 'err');
        if ('toStdout' in simple.errRedirect) {
          output += errors;
        } else {
          const target = resolvePath(this.cwd, simple.errRedirect.target);
          const error = this.fs.writeFile(target, errors, simple.errRedirect.append);
          if (error) lines.push(this.redirectError(simple.errRedirect.target, error));
        }
      }
      if (simple.redirect) {
        const target = resolvePath(this.cwd, simple.redirect.target);
        const error = this.fs.writeFile(target, output, simple.redirect.append);
        if (error) {
          lines.push(this.redirectError(simple.redirect.target, error));
          code = 1;
        }
        output = '';
      }
      if (index === pipeline.length - 1) {
        if (output !== '') {
          for (const text of output.replace(/\n$/, '').split('\n')) lines.push({ kind: 'out', text });
        }
        stdin = null;
      } else {
        stdin = output;
      }
      lines.push(...extra);
    });
    return { code, clear };
  }

  /** Esegue una riga (senza mostrarla) e restituisce le righe prodotte. */
  private runLine(text: string, depth: number): ExecResult {
    const lines: OutputLine[] = [];
    const split = splitSequence(text);
    if (!split.ok) {
      this.lastExitCode = 2;
      return { lines: [{ kind: 'err', text: split.error }], clear: false };
    }
    let clear = false;
    for (const segment of split.segments) {
      if (segment.onlyIfOk && this.lastExitCode !== 0) continue;
      // Le variabili si espandono solo ora, con i valori aggiornati dai comandi precedenti.
      const parsed = parseLine(segment.text, this.env);
      if (!parsed.ok) {
        this.lastExitCode = 2;
        lines.push({ kind: 'err', text: parsed.error });
        continue;
      }
      for (const { pipeline } of parsed.list) {
        const result = this.runPipeline(pipeline, lines, depth);
        this.lastExitCode = result.code;
        if (result.clear) {
          clear = true;
        }
      }
    }
    return { lines, clear };
  }

  /** Esegue una riga di comando digitata e restituisce le righe da mostrare. */
  exec(line: string): ExecResult {
    const input: OutputLine = { kind: 'input', prompt: this.prompt, text: line };
    const trimmed = line.trim();
    if (trimmed === '') return { lines: [input], clear: false };
    this.history.push(trimmed);
    const result = this.runLine(trimmed, 0);
    return { lines: result.clear ? result.lines : [input, ...result.lines], clear: result.clear };
  }

  /** Nomi per il completamento con Tab: comandi (prima parola) o file e cartelle. */
  complete(line: string): string | null {
    const match = /(\S*)$/.exec(line);
    const partial = match?.[1] ?? '';
    const before = line.slice(0, line.length - partial.length);
    const isFirstWord = before.trim() === '' || before.trim() === 'sudo';
    let candidates: string[];
    let prefix = '';
    let base = partial;
    if (isFirstWord && !partial.includes('/')) {
      candidates = [
        ...Object.keys(COMMANDS),
        ...Object.keys(SYSTEM_COMMANDS).filter((name) => !PACKAGES[name] || this.packages.has(name)),
        'docker',
        'sudo',
      ];
    } else {
      const slash = partial.lastIndexOf('/');
      prefix = slash >= 0 ? partial.slice(0, slash + 1) : '';
      base = partial.slice(prefix.length);
      const dir = resolvePath(this.cwd, prefix || '.');
      candidates = this.fs.list(dir).map((name) => (this.fs.isDir(resolvePath(dir, name)) ? `${name}/` : name));
    }
    const found = [...new Set(candidates)].filter((c) => c.startsWith(base));
    if (found.length === 0) return null;
    let common = found[0] as string;
    for (const candidate of found) {
      while (!candidate.startsWith(common)) common = common.slice(0, -1);
    }
    if (common.length <= base.length && found.length > 1) return null;
    const suffix = found.length === 1 && !common.endsWith('/') ? ' ' : '';
    return `${before}${prefix}${common}${suffix}`;
  }
}

