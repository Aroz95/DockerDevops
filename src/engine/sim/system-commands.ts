import type { CommandFn } from './commands';
import type { FsNode } from './fs';
import { resolvePath } from './path';
import { GROUP_IDS, MEMORY, PACKAGES, SHELL_PID, USERS, type Process } from './system';
import { fail, hint, ok, type OutputLine } from './types';

/**
 * Comandi di sistema del Livello 3: utenti e permessi, variabili, pacchetti, processi.
 * Messaggi e formati riproducono quelli reali (bash, coreutils, procps, apt su Ubuntu).
 */

const err = (texts: string[]): OutputLine[] => texts.map((text) => ({ kind: 'err', text }));

// --- Utenti ---------------------------------------------------------------------------

const id: CommandFn = (m) => {
  const user = USERS[m.fs.actor.user];
  if (!user) return ok(`${m.fs.actor.user}\n`);
  const groups = user.groups.map((g) => `${GROUP_IDS[g] ?? 0}(${g})`).join(',');
  const primary = user.groups[0] ?? m.fs.actor.user;
  return ok(`uid=${user.uid}(${m.fs.actor.user}) gid=${user.gid}(${primary}) groups=${groups}\n`);
};

const groups: CommandFn = (m) => ok(`${(USERS[m.fs.actor.user]?.groups ?? []).join(' ')}\n`);

// --- Permessi -------------------------------------------------------------------------

const WHO_MASKS: Record<string, number> = { u: 0o700, g: 0o070, o: 0o007 };
const PERM_BITS: Record<string, number> = { r: 0o444, w: 0o222, x: 0o111 };

/** Converte un modo di chmod (755, u+x, go-w, a=r…) in una funzione che calcola i nuovi permessi. */
export function parseMode(text: string): ((current: number, isDir: boolean) => number) | null {
  if (/^[0-7]{1,4}$/.test(text)) {
    const value = parseInt(text, 8);
    return () => value;
  }
  const clauses = text.split(',');
  const parsed = clauses.map((clause) => /^([ugoa]*)([-+=])([rwxX]*)$/.exec(clause));
  if (parsed.some((match) => !match)) return null;
  return (current, isDir) => {
    let mode = current;
    for (const match of parsed) {
      const [, who = '', op, perms = ''] = match as RegExpExecArray;
      const mask = (who === '' || who.includes('a') ? 'ugo' : who)
        .split('')
        .reduce((sum, w) => sum | (WHO_MASKS[w] ?? 0), 0);
      let bits = perms.split('').reduce((sum, p) => {
        if (p === 'X') return sum | (isDir || mode & 0o111 ? 0o111 : 0);
        return sum | (PERM_BITS[p] ?? 0);
      }, 0);
      bits &= mask;
      if (op === '+') mode |= bits;
      else if (op === '-') mode &= ~bits;
      else mode = (mode & ~mask) | bits;
    }
    return mode;
  };
}

const chmod: CommandFn = (m, args) => {
  const recursive = args.includes('-R') || args.includes('--recursive');
  const rest = args.filter((a) => a !== '-R' && a !== '--recursive');
  const [modeText, ...files] = rest;
  if (!modeText) return fail(1, 'chmod: missing operand', "Try 'chmod --help' for more information.");
  if (!files.length) return fail(1, `chmod: missing operand after ‘${modeText}’`, "Try 'chmod --help' for more information.");
  const mode = parseMode(modeText);
  if (!mode) return fail(1, `chmod: invalid mode: ‘${modeText}’`, "Try 'chmod --help' for more information.");
  const errors: string[] = [];
  const apply = (path: string, shown: string) => {
    const result = m.fs.chmod(path, mode);
    if (result === 'notOwner') errors.push(`chmod: changing permissions of '${shown}': Operation not permitted`);
    else if (result === 'denied') errors.push(`chmod: cannot access '${shown}': Permission denied`);
    else if (result) errors.push(`chmod: cannot access '${shown}': No such file or directory`);
    const node = m.fs.get(path);
    if (!result && recursive && node?.type === 'dir') {
      for (const name of node.children.keys()) apply(`${path}/${name}`, `${shown}/${name}`);
    }
  };
  for (const file of files) apply(resolvePath(m.cwd, file), file);
  return { stdout: '', extra: err(errors), code: errors.length ? 1 : 0 };
};

const chown: CommandFn = (m, args) => {
  const rest = args.filter((a) => !a.startsWith('-'));
  const [spec, ...files] = rest;
  if (!spec) return fail(1, 'chown: missing operand', "Try 'chown --help' for more information.");
  if (!files.length) return fail(1, `chown: missing operand after ‘${spec}’`, "Try 'chown --help' for more information.");
  const [owner = '', group] = spec.split(':');
  if (owner && !USERS[owner]) return fail(1, `chown: invalid user: ‘${spec}’`);
  if (group !== undefined && group !== '' && GROUP_IDS[group] === undefined) return fail(1, `chown: invalid group: ‘${spec}’`);
  const errors: string[] = [];
  for (const file of files) {
    const result = m.fs.chown(resolvePath(m.cwd, file), owner || undefined, group || undefined);
    if (result === 'notOwner') errors.push(`chown: changing ownership of '${file}': Operation not permitted`);
    else if (result) errors.push(`chown: cannot access '${file}': No such file or directory`);
  }
  return { stdout: '', extra: err(errors), code: errors.length ? 1 : 0 };
};

// --- Variabili ------------------------------------------------------------------------

const NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;

const exportCmd: CommandFn = (m, args) => {
  if (!args.length || args[0] === '-p') {
    const names = [...m.exported].sort();
    return ok(names.map((name) => `declare -x ${name}="${m.getVar(name) ?? ''}"\n`).join(''));
  }
  const errors: string[] = [];
  for (const arg of args) {
    const eq = arg.indexOf('=');
    const name = eq >= 0 ? arg.slice(0, eq) : arg;
    if (!NAME.test(name)) {
      errors.push(`bash: export: \`${arg}': not a valid identifier`);
      continue;
    }
    if (eq >= 0) m.setVar(name, arg.slice(eq + 1));
    m.exported.add(name);
  }
  return { stdout: '', extra: err(errors), code: errors.length ? 1 : 0 };
};

const unset: CommandFn = (m, args) => {
  for (const name of args) m.unsetVar(name);
  return ok();
};

const env: CommandFn = (m) =>
  ok(
    m
      .environment()
      .map(([name, value]) => `${name}=${value}\n`)
      .join(''),
  );

const printenv: CommandFn = (m, args) => {
  const all = new Map(m.environment());
  if (!args.length) return env(m, args, null);
  const values = args.map((name) => all.get(name));
  return {
    stdout: values.filter((v) => v !== undefined).map((v) => `${v}\n`).join(''),
    extra: [],
    code: values.every((v) => v !== undefined) ? 0 : 1,
  };
};

// --- Pacchetti ------------------------------------------------------------------------

const READING = ['Reading package lists... Done', 'Building dependency tree... Done', 'Reading state information... Done'];

const NOT_ROOT_LOCK = [
  'E: Could not open lock file /var/lib/dpkg/lock-frontend - open (13: Permission denied)',
  'E: Unable to acquire the dpkg frontend lock (/var/lib/dpkg/lock-frontend), are you root?',
];

const APT_USAGE = `Usage: apt [options] command

Most used commands:
  list - list packages based on package names
  search - search in package descriptions
  show - show package details
  install - install packages
  remove - remove packages
  update - update list of available packages
  upgrade - upgrade the system by installing/upgrading packages
`;

const apt: CommandFn = (m, args) => {
  const yes = args.includes('-y') || args.includes('--yes');
  const words = args.filter((a) => !a.startsWith('-'));
  const [action, ...names] = words;
  const root = m.fs.actor.user === 'root';
  const lines = (texts: string[]) => `${texts.join('\n')}\n`;

  if (!action) return ok(APT_USAGE);

  if (action === 'update') {
    if (!root) {
      return {
        stdout: 'Reading package lists... Done\n',
        extra: err(['E: Could not open lock file /var/lib/apt/lists/lock - open (13: Permission denied)', 'E: Unable to lock directory /var/lib/apt/lists/']),
        code: 100,
      };
    }
    m.aptUpdated = true;
    return ok(
      lines([
        'Hit:1 http://archive.ubuntu.com/ubuntu noble InRelease',
        'Hit:2 http://archive.ubuntu.com/ubuntu noble-updates InRelease',
        'Hit:3 http://security.ubuntu.com/ubuntu noble-security InRelease',
        ...READING,
        'All packages are up to date.',
      ]),
    );
  }

  if (action === 'upgrade') {
    if (!root) return { stdout: '', extra: err(NOT_ROOT_LOCK), code: 100 };
    return ok(lines([...READING, 'Calculating upgrade... Done', '0 upgraded, 0 newly installed, 0 to remove and 0 not upgraded.']));
  }

  if (action === 'install' || action === 'remove') {
    if (!root) return { stdout: '', extra: err(NOT_ROOT_LOCK), code: 100 };
    if (!names.length) {
      return ok(lines([...READING, '0 upgraded, 0 newly installed, 0 to remove and 0 not upgraded.']));
    }
    const unknown = names.find((name) => !PACKAGES[name]);
    if (unknown) return { stdout: lines(READING), extra: err([`E: Unable to locate package ${unknown}`]), code: 100 };
    const out = [...READING];

    if (action === 'install') {
      const fresh = names.filter((name) => !m.packages.has(name));
      for (const name of names.filter((n) => m.packages.has(n))) {
        out.push(`${name} is already the newest version (${PACKAGES[name]?.version}).`);
      }
      if (fresh.length) {
        out.push('The following NEW packages will be installed:', `  ${fresh.join(' ')}`);
      }
      out.push(`0 upgraded, ${fresh.length} newly installed, 0 to remove and 0 not upgraded.`);
      fresh.forEach((name, index) => {
        const pkg = PACKAGES[name];
        if (!pkg) return;
        out.push(
          ...(index === 0 ? [`Need to get ${pkg.download} of archives.`, `After this operation, ${pkg.installed} of additional disk space will be used.`] : []),
          `Get:${index + 1} http://archive.ubuntu.com/ubuntu ${pkg.section} amd64 ${name} amd64 ${pkg.version} [${pkg.download}]`,
        );
      });
      for (const name of fresh) {
        const pkg = PACKAGES[name];
        out.push(
          `Selecting previously unselected package ${name}.`,
          `Preparing to unpack .../${name}_${pkg?.version}_amd64.deb ...`,
          `Unpacking ${name} (${pkg?.version}) ...`,
          `Setting up ${name} (${pkg?.version}) ...`,
        );
        m.packages.add(name);
      }
      if (fresh.length) out.push('Processing triggers for man-db (2.12.0-4build2) ...');
      return ok(lines(out));
    }

    const present = names.filter((name) => m.packages.has(name));
    for (const name of names.filter((n) => !m.packages.has(n))) {
      out.push(`Package '${name}' is not installed, so not removed`);
    }
    if (!present.length) {
      out.push('0 upgraded, 0 newly installed, 0 to remove and 0 not upgraded.');
      return ok(lines(out));
    }
    out.push('The following packages will be REMOVED:', `  ${present.join(' ')}`, `0 upgraded, 0 newly installed, ${present.length} to remove and 0 not upgraded.`);
    if (!yes) {
      // apt chiede conferma prima di rimuovere: il simulatore risponde «no» (apt annulla).
      return {
        stdout: lines(out),
        extra: [{ kind: 'out', text: 'Do you want to continue? [Y/n] ' }, { kind: 'out', text: 'Abort.' }, hint('promptAnsweredNo')],
        code: 1,
      };
    }
    for (const name of present) {
      out.push(`Removing ${name} (${PACKAGES[name]?.version}) ...`);
      m.packages.delete(name);
    }
    out.push('Processing triggers for man-db (2.12.0-4build2) ...');
    return ok(lines(out));
  }

  return { stdout: '', extra: [hint('notSimulated', { command: `apt ${action}` })], code: 1 };
};

/** `tree`: disponibile solo dopo `sudo apt install tree`. */
const tree: CommandFn = (m, args) => {
  const target = args.find((a) => !a.startsWith('-')) ?? '.';
  const root = resolvePath(m.cwd, target);
  const node = m.fs.get(root);
  if (node?.type !== 'dir') return ok(`${target}  [error opening dir]\n\n0 directories, 0 files\n`);
  const out = [target];
  let dirs = 0;
  let files = 0;
  const walk = (dir: FsNode, prefix: string) => {
    if (dir.type !== 'dir') return;
    const names = [...dir.children.keys()].filter((n) => !n.startsWith('.')).sort((a, b) => a.localeCompare(b, 'en'));
    names.forEach((name, index) => {
      const last = index === names.length - 1;
      const child = dir.children.get(name) as FsNode;
      out.push(`${prefix}${last ? '└── ' : '├── '}${name}`);
      if (child.type === 'dir') {
        dirs++;
        walk(child, `${prefix}${last ? '    ' : '│   '}`);
      } else files++;
    });
  };
  walk(node, '');
  out.push('', `${dirs} director${dirs === 1 ? 'y' : 'ies'}, ${files} file${files === 1 ? '' : 's'}`);
  return ok(`${out.join('\n')}\n`);
};

// --- Processi -------------------------------------------------------------------------

function psList(m: { processes: Process[]; nextPid: number }): Process[] {
  // Anche ps è un processo: compare nell'elenco mentre gira.
  return [
    ...m.processes,
    { pid: m.nextPid, user: 'studente', command: 'ps', tty: 'pts/0', stat: 'R+', cpu: 0, mem: 0.1, vsz: 11320, rss: 4480, start: '10:00', time: '0:00' },
  ];
}

const ps: CommandFn = (m, args) => {
  const options = args.join('');
  const all = psList(m);
  if (/^-?a?u?x?$/.test(options) && options.includes('u') && options.includes('x')) {
    const header = 'USER         PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND';
    const rows = all.map(
      (p) =>
        `${p.user.padEnd(8)} ${String(p.pid).padStart(7)} ${p.cpu.toFixed(1).padStart(4)} ${p.mem.toFixed(1).padStart(4)} ${String(p.vsz).padStart(6)} ${String(p.rss).padStart(5)} ${p.tty.padEnd(8)} ${p.stat.padEnd(4)} ${p.start.padStart(5)} ${p.time.padStart(6)} ${p.command}`,
    );
    return ok(`${[header, ...rows].join('\n')}\n`);
  }
  const everyone = args.includes('-e') || args.includes('-A');
  if (args.length && !everyone) return { stdout: '', extra: [hint('notSimulated', { command: `ps ${args.join(' ')}` })], code: 1 };
  const shown = everyone ? all : all.filter((p) => p.tty === 'pts/0');
  const name = (p: Process) => p.command.split(' ')[0]?.split('/').pop()?.replace(/^-/, '') ?? p.command;
  const rows = shown.map((p) => `${String(p.pid).padStart(7)} ${p.tty.padEnd(8)} ${'00:00:00'.padStart(8)} ${name(p)}`);
  return ok(`${['    PID TTY          TIME CMD', ...rows].join('\n')}\n`);
};

const SIGNALS: Record<string, 'TERM' | 'KILL' | 'INT' | 'HUP'> = {
  '15': 'TERM', TERM: 'TERM', SIGTERM: 'TERM',
  '9': 'KILL', KILL: 'KILL', SIGKILL: 'KILL',
  '2': 'INT', INT: 'INT', SIGINT: 'INT',
  '1': 'HUP', HUP: 'HUP', SIGHUP: 'HUP',
};

const kill: CommandFn = (m, args) => {
  let signal: 'TERM' | 'KILL' | 'INT' | 'HUP' = 'TERM';
  const targets: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i] as string;
    if (arg === '-s' || arg === '-n') {
      const value = args[++i] ?? '';
      const found = SIGNALS[value.toUpperCase()];
      if (!found) return fail(1, `bash: kill: ${value}: invalid signal specification`);
      signal = found;
    } else if (arg === '-l' || arg === '-L') {
      return { stdout: '', extra: [hint('notSimulated', { command: 'kill -l' })], code: 0 };
    } else if (arg.startsWith('-') && arg.length > 1) {
      const found = SIGNALS[arg.slice(1).toUpperCase()];
      if (!found) return fail(1, `bash: kill: ${arg.slice(1)}: invalid signal specification`);
      signal = found;
    } else targets.push(arg);
  }
  if (!targets.length) {
    return fail(2, 'kill: usage: kill [-s sigspec | -n signum | -sigspec] pid | jobspec ... or kill -l [sigspec]');
  }
  const errors: string[] = [];
  const extra: OutputLine[] = [];
  for (const target of targets) {
    if (!/^\d+$/.test(target)) {
      errors.push(`bash: kill: ${target}: arguments must be process or job IDs`);
      continue;
    }
    const pid = Number(target);
    const process = m.processes.find((p) => p.pid === pid);
    if (!process) {
      errors.push(`bash: kill: (${pid}) - No such process`);
      continue;
    }
    if (m.fs.actor.user !== 'root' && process.user !== m.fs.actor.user) {
      errors.push(`bash: kill: (${pid}) - Operation not permitted`);
      continue;
    }
    // init (PID 1) ignora i segnali che non gestisce; la shell interattiva ignora TERM.
    if (pid === 1) continue;
    if (pid === SHELL_PID) {
      extra.push(hint('shellProtected'));
      continue;
    }
    if (signal === 'KILL' || !process.ignoreTerm) {
      m.processes = m.processes.filter((p) => p !== process);
    }
  }
  return { stdout: '', extra: [...err(errors), ...extra], code: errors.length ? 1 : 0 };
};

const free: CommandFn = (_m, args) => {
  const human = args.includes('-h') || args.includes('--human');
  const fmt = (kib: number) => {
    if (!human) return String(kib);
    if (kib === 0) return '0B';
    const units: [string, number][] = [['Gi', 1024 ** 2], ['Mi', 1024], ['Ki', 1]];
    const [unit, size] = units.find(([, s]) => kib >= s) ?? ['Ki', 1];
    const value = kib / size;
    return `${value < 10 && unit !== 'Ki' ? value.toFixed(1) : Math.round(value)}${unit}`;
  };
  const col = (value: string) => value.padStart(12);
  const { mem, swap } = MEMORY;
  return ok(
    [
      `${''.padEnd(8)}${['total', 'used', 'free', 'shared', 'buff/cache', 'available'].map(col).join('')}`,
      `${'Mem:'.padEnd(8)}${[mem.total, mem.used, mem.free, mem.shared, mem.cache, mem.available].map((v) => col(fmt(v))).join('')}`,
      `${'Swap:'.padEnd(8)}${[swap.total, swap.used, swap.free].map((v) => col(fmt(v))).join('')}`,
    ].join('\n') + '\n',
  );
};

export const SYSTEM_COMMANDS: Record<string, CommandFn> = {
  id,
  groups,
  chmod,
  chown,
  export: exportCmd,
  unset,
  env,
  printenv,
  apt,
  'apt-get': apt,
  tree,
  ps,
  kill,
  free,
  nproc: () => ok('2\n'),
  top: () => ({ stdout: '', extra: [hint('notSimulated', { command: 'top' })], code: 1 }),
  htop: () => ({ stdout: '', extra: [hint('notSimulated', { command: 'htop' })], code: 1 }),
  nano: (_m, args) => ({ stdout: '', extra: [hint('notSimulated', { command: `nano ${args.join(' ')}`.trim() })], code: 1 }),
};

