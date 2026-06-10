import { RiCrosshair2Line, SpinnerIcon } from '@usertour/icons';
import { Button } from '@usertour/ui';
import { useState } from 'react';
import { type PickElementResult, useElementPicker } from './element-picker-context';

export interface PickElementButtonProps {
  // Tooltip / accessible label — consumers pass their own t(...) so this
  // package stays free of an i18n dep.
  label: string;
  mustMatch?: string;
  onPicked: (result: PickElementResult) => void;
}

// Icon button that triggers visual element picking, sized to sit beside a
// compact input. Renders nothing when no element-picker host is mounted —
// the surrounding manual selector input keeps working as-is.
export const PickElementButton = (props: PickElementButtonProps) => {
  const { label, mustMatch, onPicked } = props;
  const pickElement = useElementPicker();
  const [isPicking, setIsPicking] = useState(false);

  if (!pickElement) {
    return null;
  }

  const handleClick = async () => {
    if (isPicking) {
      return;
    }
    setIsPicking(true);
    try {
      const result = await pickElement({ mustMatch });
      if (result) {
        onPicked(result);
      }
    } finally {
      setIsPicking(false);
    }
  };

  return (
    <Button
      type="button"
      variant="compact-outline"
      size="compact-icon-lg"
      className="shrink-0"
      onClick={handleClick}
      disabled={isPicking}
      title={label}
      aria-label={label}
    >
      {isPicking ? (
        <SpinnerIcon className="h-4 w-4 animate-spin" />
      ) : (
        <RiCrosshair2Line className="h-4 w-4" />
      )}
    </Button>
  );
};
