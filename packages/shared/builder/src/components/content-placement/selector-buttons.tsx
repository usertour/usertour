import { Button } from '@usertour-ui/button';

interface SelectorButtonsProps {
  selectors?: string[];
  onSelect: (selector: string) => void;
}

export const SelectorButtons = ({ selectors, onSelect }: SelectorButtonsProps) => {
  if (!selectors?.length) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {selectors.map((selector) => (
        <Button key={selector} variant="outline" size="sm" onClick={() => onSelect(selector)}>
          {selector}
        </Button>
      ))}
    </div>
  );
};
