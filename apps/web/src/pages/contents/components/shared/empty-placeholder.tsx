import { EmptyPlaceholderIcon } from '@usertour-ui/icons';

interface EmptyPlaceholderProps {
  children: React.ReactNode;
  name?: string;
  description?: string;
}

export const EmptyPlaceholder = (props: EmptyPlaceholderProps) => {
  const {
    children,
    name = 'No flows added',
    description = 'You have not added any flows. Add one below.',
  } = props;
  return (
    <div className="flex h-[450px] shrink-0 items-center justify-center rounded-md border border-dashed">
      <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center text-center">
        <EmptyPlaceholderIcon className="h-10 w-10 text-muted-foreground" />

        <h3 className="mt-4 text-lg font-semibold">{name}</h3>
        <p className="mb-4 mt-2 text-sm text-muted-foreground">{description}</p>
        {children}
      </div>
    </div>
  );
};

EmptyPlaceholder.displayName = 'EmptyPlaceholder';
