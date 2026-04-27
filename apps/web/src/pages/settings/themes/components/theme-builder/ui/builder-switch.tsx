import { Switch } from '@usertour-packages/switch';
import { cn } from '@usertour-packages/tailwind';

interface Props {
  checked: boolean | undefined;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export function BuilderSwitch({ checked, onCheckedChange, disabled, className, id }: Props) {
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
