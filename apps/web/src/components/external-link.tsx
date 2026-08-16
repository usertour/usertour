import { RiExternalLinkLine } from '@usertour/icons';
import type { ReactNode } from 'react';

/** Inline external link with the trailing open-in-new icon — one styling, N call sites. */
export const ExternalLink = ({ href, children }: { href: string; children: ReactNode }) => (
  <a
    href={href}
    target="_blank"
    rel="noreferrer"
    className="inline-flex items-center gap-0.5 text-primary hover:underline"
  >
    {children}
    <RiExternalLinkLine className="h-3.5 w-3.5" />
  </a>
);

ExternalLink.displayName = 'ExternalLink';
