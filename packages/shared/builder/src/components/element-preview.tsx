import { Button } from '@usertour-ui/button';

interface ElementPreviewProps {
  onClick: () => void;
  previewImageUrl?: string;
  title?: string;
}

export const ElementPreview = ({
  onClick,
  previewImageUrl,
  title = 'Show launcher on this element',
}: ElementPreviewProps) => {
  return (
    <section className="space-y-3">
      <header className="flex justify-between items-center">
        <h2 className="text-sm">Target</h2>
      </header>

      <Button
        className="w-full flex flex-col bg-background-700 p-3.5 rounded-lg space-y-6 cursor-pointer"
        onClick={onClick}
      >
        <div className="space-y-2">
          <h3 className="text-sm">{title}</h3>
          <div className="rounded-2xl overflow-hidden">
            {previewImageUrl ? (
              <div className="w-[242px] h-[130px] overflow-hidden">
                <img src={previewImageUrl} alt={`Preview for ${title}`} />
              </div>
            ) : (
              <p className="text-destructive text-sm">No element selected yet.</p>
            )}
          </div>
        </div>
      </Button>
    </section>
  );
};

ElementPreview.displayName = 'ElementPreview';
