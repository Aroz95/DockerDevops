import { COMMANDS, usageFor } from './commands';
import { dockerCli } from './docker/cli';
import { DockerEngine } from './docker/docker';
import { VirtualFs } from './fs';
import { parseLine } from './parse';
import { displayPath, HOME, HOSTNAME, resolvePath, USER } from './path';
import { hint, type CommandOutput, type ExecutedCommand, type OutputLine } from './types';

export interface MachineSetup {
  /** Cartella di partenza (predefinita: la cartella personale ~). */
  cartella?: string;
  /** Cartelle da creare (con tutte le cartelle intermedie). */
  cartelle?: string[];
  /** File da creare: percorso → contenuto. */
  file?: Record<string, string>;
  /** Immagini Docker già scaricate. */
  immagini?: string[];
}

export interface ExecResult {
  lines: OutputLine[];
  clear: boolean;
}

/**
 * Un computer simulato: file system, shell e Docker.
 * `now` si può sostituire nei test per controllare il tempo.
 */
export class Machine {
  readonly fs: VirtualFs;
  readonly docker: DockerEngine;
  cwd = HOME;
  oldPwd = HOME;
  /** Righe digitate, in ordine (per `history` e ↑). */
  readonly history: string[] = [];
  /** Ogni comando semplice eseguito con il suo codice d'uscita (per gli obiettivi). */
  readonly executed: ExecutedCommand[] = [];
  lastExitCode = 0;

  constructor(
    setup: MachineSetup = {},
    readonly now: () => number = () => Date.now(),
  ) {
    this.fs = new VirtualFs(now);
    for (const dir of ['/bin', '/etc', '/home', HOME, '/tmp', '/usr', '/var']) this.fs.mkdir(dir, true);
    this.fs.writeFile('/etc/hostname', `${HOSTNAME}\n`);
    this.docker = new DockerEngine(now);

    for (const dir of setup.cartelle ?? []) this.fs.mkdir(resolvePath(HOME, dir), true);
    for (const [path, content] of Object.entries(setup.file ?? {})) {
      const full = resolvePath(HOME, path);
      this.fs.mkdir(full.slice(0, full.lastIndexOf('/')) || '/', true);
      this.fs.writeFile(full, content);
    }
    for (const image of setup.immagini ?? []) this.docker.preload(image);
    if (setup.cartella) {
      const start = resolvePath(HOME, setup.cartella);
      this.fs.mkdir(start, true);
      this.cwd = start;
      this.oldPwd = start;
    }
  }

  get env(): Record<string, string> {
    return { HOME, USER, PWD: this.cwd, OLDPWD: this.oldPwd, SHELL: '/bin/bash', '?': String(this.lastExitCode) };
  }

  /** Il prompt di bash: studente@corso:~/progetto$ */
  get prompt(): string {
    return `${USER}@${HOSTNAME}:${displayPath(this.cwd)}$ `;
  }

  private runSimple(argv: string[], stdin: string | null): CommandOutput {
    const [name = '', ...args] = argv;
    if (name === 'docker') return dockerCli(this.docker, args);
    const command = COMMANDS[name];
    if (!command) {
      return {
        stdout: '',
        extra: [{ kind: 'err', text: `${name}: command not found` }, hint('unknownCommand', { command: name })],
        code: 127,
      };
    }
    if (args.includes('--help')) {
      const usage = usageFor(name);
      if (usage) return { stdout: usage, extra: [], code: 0 };
    }
    return command(this, args, stdin);
  }

  /** Esegue una riga di comando e restituisce le righe da mostrare. */
  exec(line: string): ExecResult {
    const lines: OutputLine[] = [{ kind: 'input', prompt: this.prompt, text: line }];
    const trimmed = line.trim();
    if (trimmed === '') return { lines, clear: false };
    this.history.push(trimmed);

    const parsed = parseLine(trimmed, this.env);
    if (!parsed.ok) {
      this.lastExitCode = 2;
      lines.push({ kind: 'err', text: parsed.error });
      return { lines, clear: false };
    }

    let clear = false;
    for (const { pipeline, onlyIfOk } of parsed.list) {
      if (onlyIfOk && this.lastExitCode !== 0) continue;
      let stdin: string | null = null;
      let code = 0;
      pipeline.forEach((simple, index) => {
        const result = this.runSimple(simple.argv, stdin);
        this.executed.push({ argv: simple.argv, code: result.code });
        code = result.code;
        if (result.clear) {
          clear = true;
          lines.length = 0;
        }
        lines.push(...(result.before ?? []));
        const isLast = index === pipeline.length - 1;
        let output = result.stdout;
        if (simple.redirect) {
          const target = resolvePath(this.cwd, simple.redirect.target);
          const error = this.fs.writeFile(target, output, simple.redirect.append);
          if (error) {
            lines.push({
              kind: 'err',
              text: `bash: ${simple.redirect.target}: ${error === 'isDir' ? 'Is a directory' : 'No such file or directory'}`,
            });
            code = 1;
          }
          output = '';
        }
        if (isLast) {
          for (const text of output.replace(/\n$/, '').split('\n')) {
            if (output !== '') lines.push({ kind: 'out', text });
          }
          stdin = null;
        } else {
          stdin = output;
        }
        lines.push(...result.extra);
      });
      this.lastExitCode = code;
    }
    return { lines, clear };
  }

  /** Nomi per il completamento con Tab: comandi (prima parola) o file e cartelle. */
  complete(line: string): string | null {
    const match = /(\S*)$/.exec(line);
    const partial = match?.[1] ?? '';
    const before = line.slice(0, line.length - partial.length);
    const isFirstWord = before.trim() === '';
    let candidates: string[];
    let prefix = '';
    let base = partial;
    if (isFirstWord) {
      candidates = [...Object.keys(COMMANDS), 'docker'];
    } else {
      const slash = partial.lastIndexOf('/');
      prefix = slash >= 0 ? partial.slice(0, slash + 1) : '';
      base = partial.slice(prefix.length);
      const dir = resolvePath(this.cwd, prefix || '.');
      candidates = this.fs.list(dir).map((name) => (this.fs.isDir(resolvePath(dir, name)) ? `${name}/` : name));
    }
    const found = candidates.filter((c) => c.startsWith(base));
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
