import { DEFAULT_LANGUAGE, type Language } from '@/i18n/languages';
import enTesti from './en/mondi.json';
import itTesti from './it/mondi.json';
import struttura from './mondi.json';

/** Struttura del corso: identica in tutte le lingue (id, ordine). */
interface MondoStruttura {
  id: string;
  livelli: string[];
}

/** Testi di una lingua, collegati alla struttura tramite gli id. */
interface TestiMondi {
  mondi: Record<string, { titolo: string; descrizione: string; boss: string }>;
  livelli: Record<string, string>;
}

export interface LivelloVista {
  id: string;
  /** Numero progressivo su tutto il corso (0, 1, 2…), come nel piano del corso. */
  numero: number;
  titolo: string;
}

export interface MondoVista {
  id: string;
  numero: number;
  titolo: string;
  descrizione: string;
  boss: string;
  livelli: LivelloVista[];
}

export const STRUTTURA: readonly MondoStruttura[] = struttura.mondi;

export const TESTI: Record<Language, TestiMondi> = {
  it: itTesti,
  en: enTesti,
};

/** Unisce struttura e testi. Se una traduzione manca, usa la lingua di riserva. */
export function getMondi(language: Language): MondoVista[] {
  const testi = TESTI[language];
  const riserva = TESTI[DEFAULT_LANGUAGE];
  let numeroLivello = 0;

  return STRUTTURA.map((mondo, indice) => {
    const testo = testi.mondi[mondo.id] ?? riserva.mondi[mondo.id];
    return {
      id: mondo.id,
      numero: indice,
      titolo: testo?.titolo ?? mondo.id,
      descrizione: testo?.descrizione ?? '',
      boss: testo?.boss ?? '',
      livelli: mondo.livelli.map((id) => ({
        id,
        numero: numeroLivello++,
        titolo: testi.livelli[id] ?? riserva.livelli[id] ?? id,
      })),
    };
  });
}
