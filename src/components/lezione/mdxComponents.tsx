import type { AnchorHTMLAttributes } from 'react';
import type { MdxComponents } from '@/content/lessons';
import { Analogia, Callout } from './Callout';
import { Termine } from './Termine';

/** I link esterni (documentazione ufficiale) si aprono in una nuova scheda. */
function MdxLink(props: AnchorHTMLAttributes<HTMLAnchorElement>) {
  const external = props.href?.startsWith('http');
  return (
    <a
      {...props}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
    />
  );
}

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
