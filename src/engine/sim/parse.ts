/**
 * Analisi di una riga di comando, come fa la shell bash (in versione semplificata):
 * - parole separate da spazi, virgolette "doppie" e 'singole', barra rovesciata \
 * - variabili $NOME e ${NOME} (non dentro le virgolette singole)
 * - redirezioni >  >>
 * - pipe |   e sequenze  ;  &&
 */

export interface SimpleCommand {
  argv: string[];
  redirect?: { append: boolean; target: string };
}

/** Comandi collegati da pipe: l'output di uno diventa l'input del successivo. */
export type Pipeline = SimpleCommand[];

/** Sequenza di pipeline; `onlyIfOk` = collegata con && alla precedente. */
export type CommandList = { pipeline: Pipeline; onlyIfOk: boolean }[];

export type ParseResult = { ok: true; list: CommandList } | { ok: false; error: string };

type Token = { type: 'word'; value: string } | { type: 'op'; value: '|' | '>' | '>>' | ';' | '&&' };

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
      pushWord();
      const append = line[i + 1] === '>';
      tokens.push({ type: 'op', value: append ? '>>' : '>' });
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

  const syntaxError = (near: string): ParseResult => ({
    ok: false,
    error: `bash: syntax error near unexpected token \`${near}'`,
  });

  for (let index = 0; index < tokens.length; index++) {
    const token = tokens[index];
    if (!token) continue;
    if (token.type === 'word') {
      current.argv.push(token.value);
      continue;
    }
    if (token.value === '>' || token.value === '>>') {
      const target = tokens[index + 1];
      if (!target || target.type !== 'word') return syntaxError(target ? target.value : 'newline');
      current.redirect = { append: token.value === '>>', target: target.value };
      index++;
      continue;
    }
    if (current.argv.length === 0) return syntaxError(token.value);
    pipeline.push(current);
    current = { argv: [] };
    if (token.value !== '|') {
      list.push({ pipeline, onlyIfOk });
      pipeline = [];
      onlyIfOk = token.value === '&&';
    }
  }

  if (current.argv.length > 0) pipeline.push(current);
  else if (pipeline.length > 0) return syntaxError('newline');
  if (pipeline.length > 0) list.push({ pipeline, onlyIfOk });
  return { ok: true, list };
}
