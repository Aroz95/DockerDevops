import type { AnchorHTMLAttributes } from 'react';

/** I link esterni (documentazione ufficiale) si aprono in una nuova scheda. */
export function MdxLink(props: AnchorHTMLAttributes<HTMLAnchorElement>) {
  const external = props.href?.startsWith('http');
  return (
    <a {...props} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})} />
  );
}
