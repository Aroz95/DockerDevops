import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type { Machine } from '@/engine/sim/machine';
import type { OutputLine } from '@/engine/sim/types';

interface TerminalProps {
  machine: Machine;
  /** Chiamata dopo ogni comando (per aggiornare obiettivi e stato). */
  onCommand?: () => void;
  /** Righe mostrate all'apertura (es. un messaggio di benvenuto). */
  initialLines?: OutputLine[];
  className?: string;
}

const KEY_TAB = 'Tab';
const KEY_UP = '↑';
const KEY_DOWN = '↓';
const KEY_CTRL_C = 'Ctrl+C';

/**
 * Terminale nel browser collegato alla macchina simulata.
 * Usa un normale campo di testo: funziona bene anche con la tastiera dei telefoni.
 * La barra sotto offre i tasti che sul telefono mancano (Tab, frecce, Ctrl+C).
 */
export function Terminal({ machine, onCommand, initialLines = [], className = '' }: TerminalProps) {
  const { t } = useTranslation();
  const [lines, setLines] = useState<OutputLine[]>(initialLines);
  const [input, setInput] = useState('');
  const [historyIndex, setHistoryIndex] = useState<number | null>(null);
  const [prompt, setPrompt] = useState(machine.prompt);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Una macchina nuova (es. "ricomincia") riparte con lo schermo pulito.
  useEffect(() => {
    setLines(initialLines);
    setPrompt(machine.prompt);
    setInput('');
    setHistoryIndex(null);
    // initialLines è un valore iniziale: non deve far ripartire il terminale.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [machine]);

  useEffect(() => {
    const box = scrollRef.current;
    if (box) box.scrollTop = box.scrollHeight;
  }, [lines]);

  function run() {
    const result = machine.exec(input);
    setLines((current) => (result.clear ? result.lines : [...current, ...result.lines]));
    setPrompt(machine.prompt);
    setInput('');
    setHistoryIndex(null);
    onCommand?.();
  }

  function browseHistory(direction: -1 | 1) {
    const history = machine.history;
    if (history.length === 0) return;
    const start = historyIndex ?? history.length;
    const next = Math.min(history.length, Math.max(0, start + direction));
    setHistoryIndex(next === history.length ? null : next);
    setInput(next === history.length ? '' : (history[next] ?? ''));
  }

  function complete() {
    const completed = machine.complete(input);
    if (completed !== null) setInput(completed);
  }

  function interrupt() {
    setLines((current) => [...current, { kind: 'input', prompt, text: `${input}^C` }]);
    setInput('');
    setHistoryIndex(null);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault();
      run();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      browseHistory(-1);
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      browseHistory(1);
    } else if (event.key === 'Tab') {
      event.preventDefault();
      complete();
    } else if (event.ctrlKey && event.key === 'c') {
      event.preventDefault();
      interrupt();
    } else if (event.ctrlKey && event.key === 'l') {
      event.preventDefault();
      setLines([]);
    }
  }

  const toolbar: { label: string; title: string; action: () => void }[] = [
    { label: KEY_TAB, title: t('terminal.keys.tab'), action: complete },
    { label: KEY_UP, title: t('terminal.keys.up'), action: () => browseHistory(-1) },
    { label: KEY_DOWN, title: t('terminal.keys.down'), action: () => browseHistory(1) },
    { label: KEY_CTRL_C, title: t('terminal.keys.ctrlC'), action: interrupt },
  ];

  return (
    <div className={`overflow-hidden rounded-xl border border-slate-700 bg-slate-950 text-slate-100 shadow-lg ${className}`}>
      <div
        ref={scrollRef}
        role="log"
        aria-live="polite"
        aria-label={t('terminal.outputLabel')}
        onClick={() => inputRef.current?.focus()}
        className="h-80 overflow-y-auto p-3 font-mono text-[13px] leading-relaxed sm:h-96"
      >
        {lines.map((line, index) => (
          <TerminalLine key={index} line={line} />
        ))}
        <div className="flex items-baseline">
          <span aria-hidden="true" className="whitespace-pre text-teal-400">
            {prompt}
          </span>
          <input
            ref={inputRef}
            aria-label={t('terminal.inputLabel')}
            value={input}
            onChange={(event) => {
              setInput(event.target.value);
              setHistoryIndex(null);
            }}
            onKeyDown={onKeyDown}
            enterKeyHint="send"
            autoCapitalize="off"
            autoCorrect="off"
            autoComplete="off"
            spellCheck={false}
            className="min-w-0 flex-1 bg-transparent font-mono text-base text-slate-100 caret-teal-400 outline-none sm:text-[13px]"
          />
        </div>
      </div>
      <div className="flex gap-1 border-t border-slate-800 bg-slate-900 p-1.5">
        {toolbar.map((key) => (
          <button
            key={key.label}
            type="button"
            title={key.title}
            aria-label={key.title}
            onClick={() => {
              key.action();
              inputRef.current?.focus();
            }}
            className="rounded-md border border-slate-700 px-2.5 py-1 font-mono text-xs text-slate-200 hover:bg-slate-800"
          >
            {key.label}
          </button>
        ))}
        <button
          type="button"
          onClick={run}
          className="ml-auto rounded-md bg-teal-600 px-3 py-1 text-xs font-semibold text-white hover:bg-teal-500"
        >
          {t('terminal.keys.enter')}
        </button>
      </div>
    </div>
  );
}

function TerminalLine({ line }: { line: OutputLine }) {
  const { t } = useTranslation();
  // Le chiavi dei suggerimenti sono tutte in terminal.hints.*; i parametri variano per chiave,
  // quindi qui si usa la firma generica di t().
  const hintText = t as unknown as (key: string, params: Record<string, string>) => string;
  switch (line.kind) {
    case 'input':
      return (
        <div className="whitespace-pre-wrap break-all">
          <span className="text-teal-400">{line.prompt}</span>
          {line.text}
        </div>
      );
    case 'out':
      return <div className="min-h-[1lh] whitespace-pre-wrap break-all">{line.text}</div>;
    case 'err':
      return <div className="min-h-[1lh] whitespace-pre-wrap break-all text-red-300">{line.text}</div>;
    case 'hint':
      return (
        <div className="my-1 rounded border-l-2 border-amber-400 bg-amber-400/10 px-2 py-1 font-sans text-xs text-amber-200">
          {hintText(`terminal.hints.${line.key}`, line.params ?? {})}
        </div>
      );
  }
}
