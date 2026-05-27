import { SpinnerIcon } from '@usertour/icons';

export interface ContentLoadingProps {
  message?: string;
  className?: string;
}

export const ContentLoading = (props: ContentLoadingProps) => {
  const { message = 'Loading...', className = '' } = props;
  // `h-full` only resolves when the parent has a definite height. Detail
  // pages wrap content in a `min-h-full` div inside ScrollArea, which
  // does not provide a definite height — so the spinner used to collapse
  // to its own size and stick to the top. The 60vh floor keeps the
  // spinner centered in a meaningful area regardless of parent layout.
  return (
    <div className={`flex h-full min-h-[60vh] w-full items-center justify-center ${className}`}>
      <div className="flex flex-col items-center space-y-4">
        <SpinnerIcon className="h-8 w-8 animate-spin text-primary" />
        {message && <div className="text-lg text-gray-600">{message}</div>}
      </div>
    </div>
  );
};
