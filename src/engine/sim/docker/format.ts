/**
 * Formattazione come nella CLI di Docker.
 */

/**
 * Durata "umana", identica a HumanDuration della libreria go-units usata da Docker
 * ("Less than a second", "5 seconds", "About a minute", "3 hours"…).
 */
export function humanDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 1) return 'Less than a second';
  if (seconds === 1) return '1 second';
  if (seconds < 60) return `${seconds} seconds`;
  const minutes = Math.floor(seconds / 60);
  if (minutes === 1) return 'About a minute';
  if (minutes < 60) return `${minutes} minutes`;
  const hours = Math.round(seconds / 3600);
  if (hours === 1) return 'About an hour';
  if (hours < 48) return `${hours} hours`;
  if (hours < 24 * 7 * 2) return `${Math.floor(hours / 24)} days`;
  if (hours < 24 * 30 * 2) return `${Math.floor(hours / 24 / 7)} weeks`;
  if (hours < 24 * 365 * 2) return `${Math.floor(hours / 24 / 30)} months`;
  return `${Math.floor(hours / 24 / 365)} years`;
}

/** Tronca come Docker: al massimo `max` caratteri, l'ultimo diventa "…". */
export function ellipsis(text: string, max: number): string {
  return [...text].length > max ? `${[...text].slice(0, max - 1).join('')}…` : text;
}

/**
 * Tabella come quella di `docker ps`: Docker usa un tabwriter con larghezza minima 10
 * e 3 spazi di distanza tra le colonne. L'ultima colonna non viene allineata.
 */
export function table(rows: string[][], minWidth = 10, padding = 3): string {
  const columns = Math.max(...rows.map((row) => row.length));
  const widths = Array.from({ length: columns - 1 }, (_, col) =>
    Math.max(minWidth, ...rows.map((row) => [...(row[col] ?? '')].length + padding)),
  );
  return rows
    .map((row) =>
      row
        .map((cell, col) => (col < columns - 1 ? cell.padEnd((widths[col] ?? 0) - ([...cell].length - cell.length)) : cell))
        .join('')
        .trimEnd(),
    )
    .join('\n')
    .concat('\n');
}

export function shortId(id: string): string {
  return id.slice(0, 12);
}
