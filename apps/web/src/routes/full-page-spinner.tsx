import { SpinnerIcon } from '@usertour/icons';

export const FullPageSpinner = () => (
  <div className="flex h-screen w-screen items-center justify-center">
    <SpinnerIcon className="h-6 w-6 animate-spin text-muted-foreground" />
  </div>
);

FullPageSpinner.displayName = 'FullPageSpinner';
