import { SpinnerIcon } from '@usertour-packages/icons';

interface ContentLoadingProps {
  message?: string;
  className?: string;
}

export function ContentLoading({ message = 'Loading...', className = '' }: ContentLoadingProps) {
  return (
    <div className={`flex items-center justify-center min-h-screen ${className}`}>
      <div className="flex flex-col items-center space-y-4">
        <SpinnerIcon className="h-8 w-8 animate-spin text-primary" />
        {message && <div className="text-lg text-gray-600">{message}</div>}
      </div>
    </div>
  );
}
