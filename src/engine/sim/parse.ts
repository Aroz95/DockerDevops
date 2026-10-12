/**
 * Analisi di una riga di comando, come fa la shell bash (in versione semplificata):
 * - parole separate da spazi, virgolette "doppie" e 'singole', barra rovesciata \
 * - variabili $NOME e ${NOME} (non dentro le virgolette singole)
 * - redirezioni  >  >>  2>  2>>  2>&1
 * - pipe |   e sequenze  ;  &&
 */

export type ErrRedirect = { append: boolean; target: string } | { toStdout: true };

export interface SimpleCommand {
  argv: string[];
  /** Dove va lo standard output (descrittore 1). */
  redirect?: { append: boolean; target: string };
  /** Dove va lo standard error (descrittore 2). */
  errRedirect?: ErrRedirect;
}

/** Comandi collegati da pipe: l'output di uno diventa l'input del successivo. */
export type Pipeline = SimpleCommand[];

/** Sequenza di pipeline; `onlyIfOk` = collegata con && alla precedente. */
export type CommandList = { pipeline: Pipeline; onlyIfOk: boolean }[];

export type ParseResult = { ok: true; list: CommandList } | { ok: false; error: string };

type Op = '|' | '>' | '>>' | '2>' | '2>>' | '2>&1' | ';' | '&&';
type Token = { type: 'word'; value: string } | { type: 'op'; value: Op };

const syntaxError = (near: string) => `bash: syntax error near unexpected token \`${near}'`;

function tokenize(line: string, env: Record<string, string>): Token[] | string {
  const tokens: Token[] = [];
  let word = '';
  let inWord = false;
  let i = 0;

  const pushWord = () => {
    if (inWord) tokens.push({ type: 'word', value: word });
    word = '';
    inWord = false;
  };

  const readVariable = (): string => {
    // i punta al carattere dopo "$"
    if (line[i] === '{') {
      const end = line.indexOf('}', i);
      if (end === -1) return '$';
      const name = line.slice(i + 1, end);
      i = end + 1;
      return env[name] ?? '';
    }
    const match = /^[A-Za-z_][A-Za-z0-9_]*|^\?/.exec(line.slice(i));
    if (!match) return '$';
    i += match[0].length;
    return env[match[0]] ?? '';
  };

  while (i < line.length) {
    const char = line[i] ?? '';
    if (char === ' ' || char === '\t') {
      pushWord();
      i++;
    } else if (char === "'") {
      const end = line.indexOf("'", i + 1);
      if (end === -1) return "bash: unexpected EOF while looking for matching `''";
      word += line.slice(i + 1, end);
      inWord = true;
      i = end + 1;
    } else if (char === '"') {
      inWord = true;
      i++;
      let closed = false;
      while (i < line.length) {
        const c = line[i] ?? '';
        if (c === '"') {
          closed = true;
          i++;
          break;
        }
        if (c === '\\' && ['"', '\\', '$'].includes(line[i + 1] ?? '')) {
          word += line[i + 1];
          i += 2;
        } else if (c === '$') {
          i++;
          word += readVariable();
        } else {
          word += c;
          i++;
        }
      }
      if (!closed) return 'bash: unexpected EOF while looking for matching `"\'';
    } else if (char === '\\') {
      word += line[i + 1] ?? '';
      inWord = true;
      i += 2;
    } else if (char === '$') {
      i++;
      word += readVariable();
      inWord = true;
    } else if (char === '|' || char === ';') {
      pushWord();
      tokens.push({ type: 'op', value: char });
      i++;
    } else if (char === '&' && line[i + 1] === '&') {
      pushWord();
      tokens.push({ type: 'op', value: '&&' });
      i += 2;
    } else if (char === '>') {
      // "2>" attaccato: redirezione dello standard error.
      const stderr = inWord && word === '2' && line[i - 1] === '2';
      if (stderr) {
        word = '';
        inWord = false;
      } else {
        pushWord();
      }
      if (stderr && line[i + 1] === '&' && line[i + 2] === '1') {
        tokens.push({ type: 'op', value: '2>&1' });
        i += 3;
        continue;
      }
      const append = line[i + 1] === '>';
      tokens.push({ type: 'op', value: stderr ? (append ? '2>>' : '2>') : append ? '>>' : '>' });
      i += append ? 2 : 1;
    } else if (char === '#' && !inWord) {
      break; // commento fino a fine riga
    } else {
      word += char;
      inWord = true;
      i++;
    }
  }
  pushWord();
  return tokens;
}

export function parseLine(line: string, env: Record<string, string> = {}): ParseResult {
  const tokens = tokenize(line, env);
  if (typeof tokens === 'string') return { ok: false, error: tokens };

  const list: CommandList = [];
  let pipeline: Pipeline = [];
  let current: SimpleCommand = { argv: [] };
  let onlyIfOk = false;

  for (let index = 0; index < tokens.length; index++) {
    const token = tokens[index];
    if (!token) continue;
    if (token.type === 'word') {
      current.argv.push(token.value);
      continue;
    }
    if (token.value === '2>&1') {
      current.errRedirect = { toStdout: true };
      continue;
    }
    if (token.value === '>' || token.value === '>>' || token.value === '2>' || token.value === '2>>') {
      const target = tokens[index + 1];
      if (!target || target.type !== 'word') {
        return { ok: false, error: syntaxError(target ? target.value : 'newline') };
      }
      const redirect = { append: token.value.endsWith('>>'), target: target.value };
      if (token.value.startsWith('2')) current.errRedirect = redirect;
      else current.redirect = redirect;
      index++;
      continue;
    }
    if (current.argv.length === 0) return { ok: false, error: syntaxError(token.value) };
    pipeline.push(current);
    current = { argv: [] };
    if (token.value !== '|') {
      list.push({ pipeline, onlyIfOk });
      pipeline = [];
      onlyIfOk = token.value === '&&';
    }
  }

  if (current.argv.length > 0) pipeline.push(current);
  else if (pipeline.length > 0) return { ok: false, error: syntaxError('newline') };
  if (pipeline.length > 0) list.push({ pipeline, onlyIfOk });
  return { ok: true, list };
}

export type SplitResult =
  | { ok: true; segments: { text: string; onlyIfOk: boolean }[] }
  | { ok: false; error: string };

/**
 * Divide la riga nei punti ; e && (fuori dalle virgolette), senza ancora espandere le variabili.
 * Come in bash, ogni parte viene espansa solo al momento di eseguirla: in `cd x && echo $PWD`
 * la variabile vale già la nuova cartella.
 */
export function splitSequence(line: string): SplitResult {
  const segments: { text: string; onlyIfOk: boolean }[] = [];
  let start = 0;
  let quote: '"' | "'" | null = null;
  let onlyIfOk = false;

  const push = (end: number, next: boolean, near: string): string | null => {
    const text = line.slice(start, end);
    if (text.trim() === '') return syntaxError(near);
    segments.push({ text, onlyIfOk });
    onlyIfOk = next;
    return null;
  };

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (quote) {
      if (char === '\\' && quote === '"') i++;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === '\\') {
      i++;
    } else if (char === '"' || char === "'") {
      quote = char;
    } else if (char === '#' && (i === 0 || /\s/.test(line[i - 1] ?? ''))) {
      break;
    } else if (char === ';') {
      const error = push(i, false, ';');
      if (error) return { ok: false, error };
      start = i + 1;
    } else if (char === '&' && line[i + 1] === '&') {
      const error = push(i, true, '&&');
      if (error) return { ok: false, error };
      start = i + 2;
      i++;
    }
  }
  const rest = line.slice(start);
  if (rest.trim() !== '' && !rest.trim().startsWith('#')) segments.push({ text: rest, onlyIfOk });
  else if (onlyIfOk) return { ok: false, error: syntaxError('newline') };
  return { ok: true, segments };
}
