import type { ReactNode } from 'react';
import { OpenInNewWindowIcon } from '@radix-ui/react-icons';
import { Card, CardHeader, CardTitle, Skeleton } from '@usertour/ui';

export interface IntegrationProviderHeaderProps {
  /** Provider logo URL — rendered as a 48x48 image to the left of the name. */
  imagePath: string;
  /** Provider display name (e.g. "Mixpanel"). */
  name: string;
  /** Short marketing-style description. */
  description?: ReactNode;
  /** Optional "Read the X guide" docs link. */
  docs?: {
    href: string;
    label: ReactNode;
  };
}

/**
 * Provider banner card used at the top of every integration detail page.
 * Same shape across all six analytics providers — only the logo, name,
 * description, and docs URL differ.
 */
export const IntegrationProviderHeader = ({
  imagePath,
  name,
  description,
  docs,
}: IntegrationProviderHeaderProps) => (
  <Card>
    <CardHeader>
      <CardTitle className="space-between flex flex-row items-center gap-4">
        <img src={imagePath} alt={`${name} logo`} className="w-12 h-12" />
        <div className="flex flex-col gap-1">
          <div className="text-lg font-medium">{name}</div>
          {description ? (
            <div className="text-sm text-muted-foreground font-normal">
              {description}
              {docs ? (
                <>
                  {' '}
                  <a href={docs.href} className="text-primary" target="_blank" rel="noreferrer">
                    <span>{docs.label}</span>
                    <OpenInNewWindowIcon className="size-3.5 inline ml-0.5 mb-0.5" />
                  </a>
                </>
              ) : null}
            </div>
          ) : null}
        </div>
      </CardTitle>
    </CardHeader>
  </Card>
);

IntegrationProviderHeader.displayName = 'IntegrationProviderHeader';

export const IntegrationProviderHeaderSkeleton = () => (
  <Card>
    <CardHeader>
      <CardTitle className="space-between flex flex-row items-center gap-4">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="flex flex-col gap-1">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-64" />
        </div>
      </CardTitle>
    </CardHeader>
  </Card>
);

IntegrationProviderHeaderSkeleton.displayName = 'IntegrationProviderHeaderSkeleton';
