import { EditIcon, RiDeleteBinLine, RiMoreFill } from '@usertour-packages/icons';
import { cn } from '@usertour-packages/tailwind';
import {
  BuilderDropdownMenu,
  BuilderDropdownMenuContent,
  BuilderDropdownMenuItem,
  BuilderDropdownMenuTrigger,
  BuilderIconButton,
} from '../ui';
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
          <BuilderDropdownMenu>
            <BuilderDropdownMenuTrigger asChild>
              <BuilderIconButton
                size="sm"
                aria-label="Variation menu"
                onClick={(e) => e.stopPropagation()}
              >
                <RiMoreFill className="h-3.5 w-3.5" />
              </BuilderIconButton>
            </BuilderDropdownMenuTrigger>
            <BuilderDropdownMenuContent align="end">
              {onRename && (
                <BuilderDropdownMenuItem onClick={onRename}>
                  <EditIcon className="h-3.5 w-3.5" />
                  Rename
                </BuilderDropdownMenuItem>
              )}
              {onDelete && (
                <BuilderDropdownMenuItem onClick={onDelete} className="text-destructive">
                  <RiDeleteBinLine className="h-3.5 w-3.5" />
                  Delete
                </BuilderDropdownMenuItem>
              )}
            </BuilderDropdownMenuContent>
          </BuilderDropdownMenu>
        </div>
      )}
    </div>
  );
}
