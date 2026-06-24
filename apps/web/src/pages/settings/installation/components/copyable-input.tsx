import { RiFileCopyLine } from '@usertour/icons';
import { Button, Input } from '@usertour/ui';
import { useCopyWithToast } from '@/hooks/use-copy-with-toast';

export interface CopyableInputProps {
  value: string;
  /** Localized toast shown after a successful copy. */
  copiedMessage: string;
}

/** Read-only single-line value (token / install command) with a copy button. */
export const CopyableInput = (props: CopyableInputProps) => {
  const { value, copiedMessage } = props;
  const copy = useCopyWithToast();

  return (
    <div className="flex gap-2">
      <Input
        readOnly
        value={value}
        onFocus={(event) => event.target.select()}
        className="font-mono text-sm"
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="shrink-0"
        onClick={() => copy(value, copiedMessage)}
      >
        <RiFileCopyLine className="h-4 w-4" />
      </Button>
    </div>
  );
};

CopyableInput.displayName = 'CopyableInput';
