import type { MdxComponents } from '@/content/lessons';
import { Analogia, Callout } from './Callout';
import { MdxLink } from './MdxLink';
import { Termine } from './Termine';

/**
 * Componenti disponibili dentro i file .mdx senza bisogno di importarli.
 * Per aggiungerne uno: crearlo in questa cartella e aggiungerlo qui.
 */
export const mdxComponents = {
  a: MdxLink,
  Callout,
  Analogia,
  Termine,
} as unknown as MdxComponents;
