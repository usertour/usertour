import { Button } from '@usertour-packages/button';
import { RiAddLine, RiCloseLine } from '@usertour-packages/icons';
import { Input } from '@usertour-packages/input';
import { useConditionsT } from '../conditions-context';

interface Props {
  values: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  // Translation key for the "add" tooltip; defaults to 'conditions.actions.addValue'.
  addLabelKey?: string;
}

// Repeating text inputs with add / remove buttons. Used by URL pattern, list
// attribute values, etc. Empty trailing slot is appended automatically while
// the user is editing — caller normalizes via filter(Boolean) on commit.
export function ListInput({
  values,
  onChange,
  placeholder,
  addLabelKey = 'conditions.actions.addValue',
}: Props) {
  const t = useConditionsT();
  const items = values.length === 0 ? [''] : values;

  const handleChange = (index: number, value: string) => {
    const next = [...items];
    next[index] = value;
    onChange(next);
  };

  const handleRemove = (index: number) => {
    if (items.length === 1) {
      onChange([]);
      return;
    }
    onChange(items.filter((_, i) => i !== index));
  };

  return (
    <div className="flex flex-col gap-1.5">
      {items.map((value, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: list is positional and short
        <div key={index} className="flex items-center gap-1.5">
          <Input
            variant="compact"
            value={value}
            placeholder={placeholder}
            onChange={(e) => handleChange(index, e.target.value)}
          />
          <Button
            type="button"
            variant="compact-ghost"
            size="compact-icon-sm"
            aria-label="Remove"
            onClick={() => handleRemove(index)}
            disabled={items.length === 1 && !value}
          >
            <RiCloseLine className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...items, ''])}
        className="inline-flex items-center gap-1 self-start rounded text-[11px] font-medium text-primary transition-colors hover:text-primary/80"
      >
        <RiAddLine className="h-3 w-3" />
        {t(addLabelKey)}
      </button>
    </div>
  );
}
