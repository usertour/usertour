import { RiMoreFill } from '@usertour-packages/icons';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@usertour-packages/dropdown-menu';
import { cn } from '@usertour-packages/tailwind';
import { BuilderIconButton } from '../ui';
import { listRowClass, listRowSelectedClass } from '../ui/tokens';

interface Props {
  label: string;
  selected: boolean;
  onClick: () => void;
  onRename?: () => void;
  onDelete?: () => void;
  disabled?: boolean;
}

export function VariationRow({ label, selected, onClick, onRename, onDelete, disabled }: Props) {
  const hasMenu = !!(onRename || onDelete);

  return (
    <div className="group/row relative flex items-center">
      <button
        type="button"
        onClick={onClick}
        className={cn(listRowClass, selected && listRowSelectedClass, hasMenu && 'pr-7')}
      >
        <span className="flex-1 truncate text-left">{label}</span>
      </button>
      {hasMenu && !disabled && (
        <div className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 transition-opacity group-hover/row:opacity-100 data-[state=open]:opacity-100">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <BuilderIconButton
                size="sm"
                aria-label="Variation menu"
                onClick={(e) => e.stopPropagation()}
              >
                <RiMoreFill className="h-3.5 w-3.5" />
              </BuilderIconButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="text-xs">
              {onRename && <DropdownMenuItem onClick={onRename}>Rename</DropdownMenuItem>}
              {onDelete && (
                <DropdownMenuItem onClick={onDelete} className="text-destructive">
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );
}
