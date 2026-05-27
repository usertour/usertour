import type { ReactNode } from 'react';
import { OpenInNewWindowIcon } from '@radix-ui/react-icons';
import { Separator } from '../../primitives/separator';
import { cn } from '@usertour/tailwind';

export interface SettingsPageProps {
  /**
   * Section title — rendered as h3 in the standard Settings page chrome.
   */
  title: ReactNode;
  /**
   * Right-aligned action area (typically a "New X" button or a small
   * toolbar). Inline-flexed against the title.
   */
  actions?: ReactNode;
  /**
   * Body copy shown below the title. Plain string for the common case;
   * ReactNode when the page needs inline emphasis or a custom paragraph.
   */
  description?: ReactNode;
  /**
   * "Read the X guide" link rendered below the description. Skipped when
   * absent.
   */
  docs?: {
    href: string;
    label: ReactNode;
  };
  /**
   * `false` removes the trailing separator. Pages that wrap their own
   * tab/card system below the header sometimes don't want the line.
   */
  separator?: boolean;
  className?: string;
  children?: ReactNode;
}

/**
 * Standard Settings page chrome: padded outer container, header block
 * (title + actions + description + docs link), separator, then body.
 *
 * Replaces the `relative > flex-col space-y-2 > flex-row justify-between
 * > h3 + Button` boilerplate that was hand-rolled in every `*-list-header`
 * file under apps/web Settings.
 */
export const SettingsPage = (props: SettingsPageProps) => {
  const { title, actions, description, docs, separator = true, className, children } = props;
  return (
    <div className={cn('flex-1 grow space-y-6 px-4 py-6 lg:px-8', className)}>
      <div className="flex flex-col space-y-2">
        <div className="flex flex-row items-center justify-between gap-4">
          <h3 className="text-xl font-semibold tracking-tight">{title}</h3>
          {actions ? <div className="flex flex-none items-center gap-2">{actions}</div> : null}
        </div>
        {description ? <div className="text-sm text-muted-foreground">{description}</div> : null}
        {docs ? (
          <div className="text-sm text-muted-foreground">
            <a href={docs.href} className="text-primary" target="_blank" rel="noreferrer">
              <span>{docs.label}</span>
              <OpenInNewWindowIcon className="ml-0.5 mb-0.5 inline size-3.5" />
            </a>
          </div>
        ) : null}
      </div>
      {separator ? <Separator /> : null}
      {children}
    </div>
  );
};

SettingsPage.displayName = 'SettingsPage';
