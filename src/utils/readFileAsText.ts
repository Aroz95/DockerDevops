/**
 * Legge un file scelto dall'utente come testo.
 * Usa FileReader invece di file.text(): è supportato da tutti i browser, anche i più vecchi,
 * e dall'ambiente di test.
 */
export function readFileAsText(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(reader.error ?? new Error('Lettura del file non riuscita'));
    reader.readAsText(file);
  });
}
