import { modeString, type FsError, type FsNode } from './fs';
import type { Machine } from './machine';
import { basename, HOSTNAME, resolvePath } from './path';
import { fail, hint, ok, type CommandOutput, type OutputLine } from './types';

/**
 * Comandi della shell simulata. I messaggi d'errore riproducono quelli reali di bash
 * e dei GNU coreutils (Ubuntu), in inglese come nella realtà.
 */
export type CommandFn = (machine: Machine, args: string[], stdin: string | null) => CommandOutput;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Separa le opzioni brevi (-la → l, a) dagli argomenti. `--` chiude le opzioni. */
function splitFlags(args: string[]): { flags: Set<string>; long: Set<string>; rest: string[] } {
  const flags = new Set<string>();
  const long = new Set<string>();
  const rest: string[] = [];
  let ended = false;
  for (const arg of args) {
    if (ended || arg === '-' || !arg.startsWith('-')) rest.push(arg);
    else if (arg === '--') ended = true;
    else if (arg.startsWith('--')) long.add(arg.slice(2));
    else for (const char of arg.slice(1)) flags.add(char);
  }
  return { flags, long, rest };
}

function toErr(errors: string[]): OutputLine[] {
  return errors.map((text) => ({ kind: 'err', text }));
}

function lines(text: string): string[] {
  if (text === '') return [];
  const parts = text.split('\n');
  if (parts[parts.length - 1] === '') parts.pop();
  return parts;
}

function joinLines(items: string[]): string {
  return items.length ? `${items.join('\n')}\n` : '';
}

/**
 * Opzioni sconosciute: stesso messaggio dei GNU coreutils.
 * Restituisce l'errore da mostrare, oppure null se tutte le opzioni sono valide.
 */
function badOption(
  command: string,
  parsed: { flags: Set<string>; long: Set<string> },
  allowedShort: string,
  allowedLong: string[],
  code = 1,
): CommandOutput | null {
  const short = [...parsed.flags].find((flag) => !allowedShort.includes(flag));
  if (short) {
    return fail(code, `${command}: invalid option -- '${short}'`, `Try '${command} --help' for more information.`);
  }
  const long = [...parsed.long].find((name) => !allowedLong.includes(name));
  if (long) {
    return fail(code, `${command}: unrecognized option '--${long}'`, `Try '${command} --help' for more information.`);
  }
  return null;
}

export const ERROR_TEXT: Record<FsError, string> = {
  missing: 'No such file or directory',
  noParent: 'No such file or directory',
  exists: 'File exists',
  notDir: 'Not a directory',
  isDir: 'Is a directory',
  notEmpty: 'Directory not empty',
  denied: 'Permission denied',
};

/** Testo d'uso mostrato con --help (prima riga dell'help reale). */
const USAGE: Record<string, string> = {
  ls: 'Usage: ls [OPTION]... [FILE]...\nList information about the FILEs (the current directory by default).\n\n  -a, --all      do not ignore entries starting with .\n  -l             use a long listing format\n',
  cd: 'cd: cd [dir]\n    Change the shell working directory.\n',
  pwd: 'pwd: pwd\n    Print the name of the current working directory.\n',
  mkdir: 'Usage: mkdir [OPTION]... DIRECTORY...\nCreate the DIRECTORY(ies), if they do not already exist.\n\n  -p, --parents   no error if existing, make parent directories as needed\n',
  touch: 'Usage: touch [OPTION]... FILE...\nUpdate the access and modification times of each FILE to the current time.\nA FILE argument that does not exist is created empty.\n',
  cat: 'Usage: cat [OPTION]... [FILE]...\nConcatenate FILE(s) to standard output.\n',
  echo: 'echo: echo [-n] [arg ...]\n    Write arguments to the standard output.\n',
  rm: 'Usage: rm [OPTION]... [FILE]...\nRemove (unlink) the FILE(s).\n\n  -f, --force           ignore nonexistent files and arguments, never prompt\n  -r, -R, --recursive   remove directories and their contents recursively\n',
  rmdir: 'Usage: rmdir [OPTION]... DIRECTORY...\nRemove the DIRECTORY(ies), if they are empty.\n',
  cp: 'Usage: cp [OPTION]... SOURCE DEST\nCopy SOURCE to DEST, or multiple SOURCE(s) to DIRECTORY.\n\n  -r, -R, --recursive   copy directories recursively\n',
  mv: 'Usage: mv [OPTION]... SOURCE DEST\nRename SOURCE to DEST, or move SOURCE(s) to DIRECTORY.\n',
  grep: 'Usage: grep [OPTION]... PATTERNS [FILE]...\nSearch for PATTERNS in each FILE.\n\n  -i   ignore case distinctions in patterns and data\n  -n   print line number with output lines\n  -v   select non-matching lines\n',
  wc: 'Usage: wc [OPTION]... [FILE]...\nPrint newline, word, and byte counts for each FILE.\n\n  -c   print the byte counts\n  -l   print the newline counts\n  -w   print the word counts\n',
  head: 'Usage: head [OPTION]... [FILE]...\nPrint the first 10 lines of each FILE to standard output.\n\n  -n NUM   print the first NUM lines instead of the first 10\n',
  tail: 'Usage: tail [OPTION]... [FILE]...\nPrint the last 10 lines of each FILE to standard output.\n\n  -n NUM   output the last NUM lines, instead of the last 10\n',
  sort: 'Usage: sort [OPTION]... [FILE]...\nWrite sorted concatenation of all FILE(s) to standard output.\n\n  -r   reverse the result of comparisons\n',
  whoami: 'Usage: whoami [OPTION]...\nPrint the user name associated with the current effective user ID.\n',
  chmod: 'Usage: chmod [OPTION]... MODE[,MODE]... FILE...\n  or:  chmod [OPTION]... OCTAL-MODE FILE...\nChange the mode of each FILE to MODE.\n\n  -R, --recursive   change files and directories recursively\n\nEach MODE is of the form \'[ugoa]*([-+=]([rwxXst]*|[ugo]))+|[-+=][0-7]+\'.\n',
  chown: 'Usage: chown [OPTION]... [OWNER][:[GROUP]] FILE...\nChange the owner and/or group of each FILE to OWNER and/or GROUP.\n',
  id: 'Usage: id [OPTION]... [USER]...\nPrint user and group information for each specified USER,\nor (when USER omitted) for the current process.\n',
  ps: 'Usage:\n ps [options]\n\n Basic options:\n  -A, -e               all processes\n  a                    all with tty, including other users\n  x                    processes without controlling ttys\n  u                    user-oriented format\n',
  kill: 'kill: kill [-s sigspec | -n signum | -sigspec] pid | jobspec ... or kill -l [sigspec]\n    Send a signal to a job.\n',
  sudo: 'usage: sudo [-u user] command [arg ...]\nexecute a command as another user (by default root)\n',
  env: 'Usage: env [OPTION]... [-] [NAME=VALUE]... [COMMAND [ARG]...]\nSet each NAME to VALUE in the environment and run COMMAND.\nIf no COMMAND, print the resulting environment.\n',
  printenv: 'Usage: printenv [OPTION]... [VARIABLE]...\nPrint the values of the specified environment VARIABLE(s).\nIf no VARIABLE is specified, print name and value pairs for them all.\n',
  free: 'Usage:\n free [options]\n\nOptions:\n -h, --human         show human-readable output\n',
  apt: 'Usage: apt [options] command\n\nMost used commands:\n  install - install packages\n  remove - remove packages\n  update - update list of available packages\n  upgrade - upgrade the system by installing/upgrading packages\n',
};

function formatDate(time: number): string {
  const date = new Date(time);
  const day = String(date.getDate()).padStart(2, ' ');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${MONTHS[date.getMonth()]} ${day} ${hours}:${minutes}`;
}

function size(node: FsNode): number {
  return node.type === 'dir' ? 4096 : new TextEncoder().encode(node.content).length;
}

/** Dimensione come `ls -h`: 4096 → 4.0K, 1536 → 1.5K, 300 → 300 (arrotondando per eccesso). */
function humanSize(bytes: number): string {
  if (bytes < 1024) return String(bytes);
  const units = ['K', 'M', 'G', 'T'];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  const text = value < 10 ? (Math.ceil(value * 10) / 10).toFixed(1) : String(Math.ceil(value));
  return `${text}${units[unit]}`;
}

const ls: CommandFn = (m, args) => {
  const parsed = splitFlags(args);
  const { flags, long, rest } = parsed;
  const invalid = badOption('ls', parsed, 'alh1', ['all', 'human-readable'], 2);
  if (invalid) return invalid;
  const showAll = flags.has('a') || long.has('all');
  const longFormat = flags.has('l');
  const human = flags.has('h') || long.has('human-readable');
  const shownSize = (node: FsNode) => (human ? humanSize(size(node)) : String(size(node)));
  const targets = rest.length ? rest : ['.'];
  const out: string[] = [];
  const errors: string[] = [];

  const render = (dir: string, names: string[]) => {
    if (!longFormat) return names.length ? [names.join('  ')] : [];
    const entries = names.map((name) => ({ name, node: m.fs.get(resolvePath(dir, name)) as FsNode }));
    const width = Math.max(1, ...entries.map((e) => shownSize(e.node).length));
    const ownerWidth = Math.max(...entries.map((e) => e.node.owner.length));
    const groupWidth = Math.max(...entries.map((e) => e.node.group.length));
    const total = entries.reduce(
      (sum, e) => sum + (e.node.type === 'dir' ? 4 : Math.ceil(size(e.node) / 4096) * 4),
      0,
    );
    return [
      `total ${total}`,
      ...entries.map(({ name, node }) => {
        const links = node.type === 'dir' ? 2 + [...node.children.values()].filter((c) => c.type === 'dir').length : 1;
        return `${modeString(node)} ${links} ${node.owner.padEnd(ownerWidth)} ${node.group.padEnd(groupWidth)} ${shownSize(node).padStart(width)} ${formatDate(node.mtime)} ${name}`;
      }),
    ];
  };

  const found = targets.map((target) => ({ target, ...m.fs.lookup(resolvePath(m.cwd, target)) }));
  for (const { target, error } of found) {
    if (error) errors.push(`ls: cannot access '${target}': ${ERROR_TEXT[error]}`);
  }
  const files = found.filter((f) => f.node?.type === 'file').map((f) => f.target);
  const dirs = found.filter((f) => f.node?.type === 'dir');

  if (files.length) {
    out.push(
      ...(longFormat
        ? render(m.cwd, files).slice(1) // nessuna riga "total" per i file
        : [files.join('  ')]),
    );
  }
  dirs.forEach(({ target, node }, index) => {
    if (!node || !m.fs.can(node, 'r')) {
      errors.push(`ls: cannot open directory '${target}': Permission denied`);
      return;
    }
    const path = resolvePath(m.cwd, target);
    const names = m.fs.list(path).filter((name) => showAll || !name.startsWith('.'));
    const all = showAll ? ['.', '..', ...names] : names;
    if (targets.length > 1) {
      if (index > 0 || files.length) out.push('');
      out.push(`${target}:`);
    }
    out.push(...render(path, all));
  });

  return {
    stdout: joinLines(out),
    extra: toErr(errors),
    code: errors.length ? 2 : 0,
  };
};

const cd: CommandFn = (m, args) => {
  if (args.length > 1) return fail(1, 'bash: cd: too many arguments');
  const arg = args[0];
  if (arg === '-') {
    const previous = m.oldPwd;
    m.oldPwd = m.cwd;
    m.cwd = previous;
    return ok(`${previous}\n`);
  }
  const target = resolvePath(m.cwd, arg ?? '~');
  const { node, error } = m.fs.lookup(target);
  const shown = arg ?? target;
  if (error) return fail(1, `bash: cd: ${shown}: ${ERROR_TEXT[error]}`);
  if (!node) return fail(1, `bash: cd: ${shown}: No such file or directory`);
  if (node.type !== 'dir') return fail(1, `bash: cd: ${shown}: Not a directory`);
  if (!m.fs.can(node, 'x')) return fail(1, `bash: cd: ${shown}: Permission denied`);
  m.oldPwd = m.cwd;
  m.cwd = target;
  return ok();
};

const mkdir: CommandFn = (m, args) => {
  const parsed = splitFlags(args);
  const { flags, long, rest } = parsed;
  const invalid = badOption('mkdir', parsed, 'pv', ['parents', 'verbose']);
  if (invalid) return invalid;
  if (!rest.length) return fail(1, 'mkdir: missing operand', "Try 'mkdir --help' for more information.");
  const parents = flags.has('p') || long.has('parents');
  const errors: string[] = [];
  for (const name of rest) {
    const error = m.fs.mkdir(resolvePath(m.cwd, name), parents);
    if (error) errors.push(`mkdir: cannot create directory ‘${name}’: ${ERROR_TEXT[error]}`);
  }
  return { stdout: '', extra: toErr(errors), code: errors.length ? 1 : 0 };
};

const touch: CommandFn = (m, args) => {
  const { rest } = splitFlags(args);
  if (!rest.length) return fail(1, 'touch: missing file operand', "Try 'touch --help' for more information.");
  const errors: string[] = [];
  for (const name of rest) {
    const error = m.fs.touch(resolvePath(m.cwd, name));
    if (error) errors.push(`touch: cannot touch '${name}': ${ERROR_TEXT[error]}`);
  }
  return { stdout: '', extra: toErr(errors), code: errors.length ? 1 : 0 };
};

const cat: CommandFn = (m, args, stdin) => {
  const { rest } = splitFlags(args);
  if (!rest.length) return ok(stdin ?? '');
  let stdout = '';
  const errors: string[] = [];
  for (const name of rest) {
    const { content, error } = m.fs.read(resolvePath(m.cwd, name));
    if (error) errors.push(`cat: ${name}: ${ERROR_TEXT[error]}`);
    else stdout += content ?? '';
  }
  return { stdout, extra: toErr(errors), code: errors.length ? 1 : 0 };
};

const echo: CommandFn = (_m, args) => {
  const noNewline = args[0] === '-n';
  const text = (noNewline ? args.slice(1) : args).join(' ');
  return ok(noNewline ? text : `${text}\n`);
};

const rm: CommandFn = (m, args) => {
  const parsed = splitFlags(args);
  const { flags, long, rest } = parsed;
  const invalid = badOption('rm', parsed, 'fiIrRv', ['force', 'interactive', 'recursive', 'verbose']);
  if (invalid) return invalid;
  const force = flags.has('f') || long.has('force');
  const recursive = flags.has('r') || flags.has('R') || long.has('recursive');
  if (!rest.length) {
    return force ? ok() : fail(1, 'rm: missing operand', "Try 'rm --help' for more information.");
  }
  // rm -i chiede conferma per ogni file. Il simulatore non può aspettare la risposta:
  // mostra la domanda reale e risponde «no», quindi non cancella nulla.
  if ((flags.has('i') || long.has('interactive')) && !force) {
    const out: string[] = [];
    const errors: string[] = [];
    for (const name of rest) {
      const node = m.fs.get(resolvePath(m.cwd, name));
      if (!node) errors.push(`rm: cannot remove '${name}': No such file or directory`);
      else if (node.type === 'dir' && !recursive) errors.push(`rm: cannot remove '${name}': Is a directory`);
      else if (node.type === 'dir') out.push(`rm: descend into directory '${name}'? `);
      else out.push(`rm: remove regular ${node.content === '' ? 'empty ' : ''}file '${name}'? `);
    }
    return {
      stdout: '',
      extra: [...out.map((text) => ({ kind: 'out' as const, text })), ...toErr(errors), ...(out.length ? [hint('promptAnsweredNo')] : [])],
      code: errors.length ? 1 : 0,
    };
  }
  const errors: string[] = [];
  for (const name of rest) {
    const path = resolvePath(m.cwd, name);
    if (path === '/') {
      errors.push("rm: it is dangerous to operate recursively on '/'", 'rm: use --no-preserve-root to override this failsafe');
      continue;
    }
    const error = m.fs.remove(path, recursive);
    if (error === 'missing' && !force) errors.push(`rm: cannot remove '${name}': No such file or directory`);
    else if (error && error !== 'missing') errors.push(`rm: cannot remove '${name}': ${ERROR_TEXT[error]}`);
  }
  return { stdout: '', extra: toErr(errors), code: errors.length ? 1 : 0 };
};

const rmdir: CommandFn = (m, args) => {
  const { rest } = splitFlags(args);
  if (!rest.length) return fail(1, 'rmdir: missing operand', "Try 'rmdir --help' for more information.");
  const errors: string[] = [];
  for (const name of rest) {
    const error = m.fs.removeEmptyDir(resolvePath(m.cwd, name));
    if (error) errors.push(`rmdir: failed to remove '${name}': ${ERROR_TEXT[error]}`);
  }
  return { stdout: '', extra: toErr(errors), code: errors.length ? 1 : 0 };
};

/** Destinazione finale di cp/mv: se DEST è una cartella esistente, il file finisce dentro. */
function destination(m: Machine, source: string, dest: string): string {
  const target = resolvePath(m.cwd, dest);
  return m.fs.isDir(target) ? `${target}/${basename(resolvePath(m.cwd, source))}` : target;
}

function copyOrMove(name: 'cp' | 'mv'): CommandFn {
  return (m, args) => {
    const parsed = splitFlags(args);
    const { flags, long, rest } = parsed;
    const invalid =
      name === 'cp'
        ? badOption('cp', parsed, 'rRiv', ['recursive', 'interactive', 'verbose'])
        : badOption('mv', parsed, 'fiv', ['force', 'interactive', 'verbose']);
    if (invalid) return invalid;
    const recursive = flags.has('r') || flags.has('R') || long.has('recursive');
    if (rest.length === 0) return fail(1, `${name}: missing file operand`, `Try '${name} --help' for more information.`);
    if (rest.length === 1) {
      return fail(1, `${name}: missing destination file operand after '${rest[0]}'`, `Try '${name} --help' for more information.`);
    }
    const dest = rest[rest.length - 1] as string;
    const sources = rest.slice(0, -1);
    if (sources.length > 1 && !m.fs.isDir(resolvePath(m.cwd, dest))) {
      return fail(1, `${name}: target '${dest}': Not a directory`);
    }
    const interactive = flags.has('i') || long.has('interactive');
    const prompts: string[] = [];
    const errors: string[] = [];
    for (const source of sources) {
      const sourcePath = resolvePath(m.cwd, source);
      const { node, error: lookupError } = m.fs.lookup(sourcePath);
      if (!node) {
        errors.push(`${name}: cannot stat '${source}': ${ERROR_TEXT[lookupError ?? 'missing']}`);
        continue;
      }
      if (name === 'cp' && node.type === 'file' && !m.fs.can(node, 'r')) {
        errors.push(`cp: cannot open '${source}' for reading: Permission denied`);
        continue;
      }
      if (name === 'cp' && node.type === 'dir' && !recursive) {
        errors.push(`cp: -r not specified; omitting directory '${source}'`);
        continue;
      }
      const target = destination(m, source, dest);
      if (target === sourcePath || target.startsWith(`${sourcePath}/`)) {
        errors.push(`${name}: cannot ${name === 'cp' ? 'copy' : 'move'} '${source}' to a subdirectory of itself, '${dest}'`);
        continue;
      }
      const existing = m.fs.get(target);
      if (existing?.type === 'dir' && node.type === 'file') {
        errors.push(`${name}: cannot overwrite directory '${dest}' with non-directory`);
        continue;
      }
      if (existing?.type === 'file' && interactive) {
        // -i: chiederebbe conferma prima di sovrascrivere; il simulatore risponde «no».
        prompts.push(`${name}: overwrite '${dest}'? `);
        continue;
      }
      if (name === 'mv') {
        // Spostare richiede di poter togliere il file dalla cartella di origine.
        const removable = m.fs.remove(sourcePath, true);
        if (removable) {
          errors.push(`mv: cannot move '${source}' to '${dest}': ${ERROR_TEXT[removable]}`);
          continue;
        }
        const error = m.fs.place(target, node);
        if (error) {
          m.fs.place(sourcePath, node); // rimette il file dov'era
          errors.push(`mv: cannot move '${source}' to '${dest}': ${ERROR_TEXT[error]}`);
        }
        continue;
      }
      const error = m.fs.place(target, m.fs.clone(node));
      if (error) errors.push(`cp: cannot create regular file '${dest}': ${ERROR_TEXT[error]}`);
    }
    return {
      stdout: '',
      extra: [
        ...prompts.map((text) => ({ kind: 'out' as const, text })),
        ...toErr(errors),
        ...(prompts.length ? [hint('promptAnsweredNo')] : []),
      ],
      code: errors.length ? 1 : 0,
    };
  };
}

/** Legge i file indicati oppure, se non ce ne sono, l'input della pipe. */
function readInputs(m: Machine, files: string[], stdin: string | null, command: string) {
  if (!files.length) return { texts: [{ name: '', text: stdin ?? '' }], errors: [] as string[] };
  const texts: { name: string; text: string }[] = [];
  const errors: string[] = [];
  for (const file of files) {
    const { content, error } = m.fs.read(resolvePath(m.cwd, file));
    if (error) errors.push(`${command}: ${file}: ${ERROR_TEXT[error]}`);
    else texts.push({ name: file, text: content ?? '' });
  }
  return { texts, errors };
}

const grep: CommandFn = (m, args, stdin) => {
  const { flags, rest } = splitFlags(args);
  const [pattern, ...files] = rest;
  if (pattern === undefined) {
    return fail(2, 'Usage: grep [OPTION]... PATTERNS [FILE]...', "Try 'grep --help' for more information.");
  }
  let regex: RegExp;
  try {
    regex = new RegExp(pattern, flags.has('i') ? 'i' : '');
  } catch {
    regex = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags.has('i') ? 'i' : '');
  }
  const { texts, errors } = readInputs(m, files, stdin, 'grep');
  const out: string[] = [];
  for (const { name, text } of texts) {
    lines(text).forEach((line, index) => {
      if (regex.test(line) !== flags.has('v')) {
        const prefix = (files.length > 1 ? `${name}:` : '') + (flags.has('n') ? `${index + 1}:` : '');
        out.push(prefix + line);
      }
    });
  }
  return {
    stdout: joinLines(out),
    extra: toErr(errors),
    code: errors.length ? 2 : out.length ? 0 : 1,
  };
};

const wc: CommandFn = (m, args, stdin) => {
  const { flags, rest } = splitFlags(args);
  const wanted = (['l', 'w', 'c'] as const).filter((f) => flags.has(f));
  const columns = wanted.length ? wanted : (['l', 'w', 'c'] as const);
  const { texts, errors } = readInputs(m, rest, stdin, 'wc');
  const counts = texts.map(({ name, text }) => ({
    name,
    values: columns.map((col) =>
      col === 'l'
        ? (text.match(/\n/g) ?? []).length
        : col === 'w'
          ? text.split(/\s+/).filter(Boolean).length
          : new TextEncoder().encode(text).length,
    ),
  }));
  if (counts.length > 1) {
    counts.push({ name: 'total', values: columns.map((_, i) => counts.reduce((s, c) => s + (c.values[i] ?? 0), 0)) });
  }
  const fromStdin = rest.length === 0;
  const width = fromStdin && columns.length > 1 ? 7 : Math.max(...counts.flatMap((c) => c.values.map((v) => String(v).length)), 1);
  const out = counts.map(({ name, values }) =>
    [...values.map((v) => (columns.length === 1 && fromStdin ? String(v) : String(v).padStart(width))), ...(name ? [name] : [])].join(' '),
  );
  return { stdout: joinLines(out), extra: toErr(errors), code: errors.length ? 1 : 0 };
};

function headOrTail(name: 'head' | 'tail'): CommandFn {
  return (m, args, stdin) => {
    let count = 10;
    const files: string[] = [];
    for (let i = 0; i < args.length; i++) {
      const arg = args[i] as string;
      if (arg === '-n') {
        count = Number(args[++i]);
      } else if (/^-n\d+$/.test(arg)) {
        count = Number(arg.slice(2));
      } else if (/^-\d+$/.test(arg)) {
        count = Number(arg.slice(1));
      } else files.push(arg);
    }
    if (!Number.isFinite(count) || count < 0) return fail(1, `${name}: invalid number of lines`);
    const { texts, errors } = readInputs(m, files, stdin, name);
    const out: string[] = [];
    texts.forEach(({ name: file, text }, index) => {
      if (texts.length > 1) out.push(...(index > 0 ? [''] : []), `==> ${file} <==`);
      const all = lines(text);
      out.push(...(name === 'head' ? all.slice(0, count) : all.slice(Math.max(0, all.length - count))));
    });
    return { stdout: joinLines(out), extra: toErr(errors), code: errors.length ? 1 : 0 };
  };
}

const sort: CommandFn = (m, args, stdin) => {
  const { flags, rest } = splitFlags(args);
  const { texts, errors } = readInputs(m, rest, stdin, 'sort');
  const all = texts.flatMap(({ text }) => lines(text)).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  if (flags.has('r')) all.reverse();
  return { stdout: joinLines(all), extra: toErr(errors), code: errors.length ? 2 : 0 };
};

const HELP_COMMANDS = [
  'pwd', 'ls', 'cd', 'mkdir', 'touch', 'cat', 'echo', 'cp', 'mv', 'rm', 'rmdir',
  'grep', 'wc', 'head', 'tail', 'sort', 'whoami', 'id', 'hostname', 'history', 'clear',
  'chmod', 'chown', 'sudo', 'apt', 'env', 'printenv', 'export', 'unset', 'ps', 'kill', 'free',
  'docker',
];

export const COMMANDS: Record<string, CommandFn> = {
  pwd: (m) => ok(`${m.cwd}\n`),
  ls,
  cd,
  mkdir,
  touch,
  cat,
  echo,
  rm,
  rmdir,
  cp: copyOrMove('cp'),
  mv: copyOrMove('mv'),
  grep,
  wc,
  head: headOrTail('head'),
  tail: headOrTail('tail'),
  sort,
  whoami: (m) => ok(`${m.fs.actor.user}\n`),
  hostname: () => ok(`${HOSTNAME}\n`),
  date: (m) => ok(`${new Date(m.now()).toUTCString().replace(/^(\w+), (\d+) (\w+) (\d+) ([\d:]+) GMT$/, '$1 $3 $2 $5 UTC $4')}\n`),
  history: (m) =>
    ok(joinLines(m.history.map((line, i) => `${String(i + 1).padStart(5)}  ${line}`))),
  clear: () => ({ stdout: '', extra: [], code: 0, clear: true }),
  help: () => ({
    stdout: `${HELP_COMMANDS.join('  ')}\n`,
    extra: [hint('helpIntro'), hint('helpFooter')],
    code: 0,
  }),
  man: (_m, args) => {
    const page = args[0];
    if (!page) return fail(1, 'What manual page do you want?', "For example, try 'man man'.");
    const usage = USAGE[page];
    if (!usage) return fail(16, `No manual entry for ${page}`);
    return { stdout: usage, extra: [hint('manReduced', { command: page })], code: 0 };
  },
};

/** Testo di --help per un comando, se previsto. */
export function usageFor(command: string): string | undefined {
  return USAGE[command];
}
