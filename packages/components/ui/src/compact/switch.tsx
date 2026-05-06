import { Switch } from '@usertour-packages/switch';
import { cn } from '@usertour-packages/tailwind';

interface Props {
  checked: boolean | undefined;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  id?: string;
}

// Switch tuned for compact form rows — unchecked state uses bg-muted to match
// the rest of the inspector's passive-control language (vs. the shared
// switch's default which can be too high-contrast against bg-muted panels).
export function CompactSwitch({ checked, onCheckedChange, disabled, className, id }: Props) {
  return (
    <Switch
      id={id}
      checked={!!checked}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
      className={cn('data-[state=unchecked]:bg-muted', className)}
    />
  );
}
