import { ChevronLeftIcon, DotsHorizontalIcon } from '@radix-ui/react-icons';
import { EditIcon } from '@usertour-packages/icons';
import type { Theme } from '@usertour/types';
import { ThemeEditDropdownMenu } from '../../theme-edit-dropmenu';
import { ThemeRenameForm } from '../../theme-rename-form';
import { BuilderIconButton, BuilderSaveButton } from '../ui';
import { pillClass, topBarClass } from '../ui/tokens';

interface Props {
  theme: Theme;
  onBack: () => void;
  onAfterRename: () => void;
  onActionComplete: (action: string) => void;
  hasUnsavedChanges: boolean;
  isSaving: boolean;
  onSave: () => void;
}

export function TopBar({
  theme,
  onBack,
  onAfterRename,
  onActionComplete,
  hasUnsavedChanges,
  isSaving,
  onSave,
}: Props) {
  return (
    <div className={topBarClass}>
      <div className="flex items-center gap-2">
        <BuilderIconButton variant="outline" onClick={onBack} aria-label="Back">
          <ChevronLeftIcon className="h-4 w-4" />
        </BuilderIconButton>
        <span className="max-w-[200px] truncate text-xs font-medium text-foreground">
          {theme.name}
        </span>
        {theme.isSystem ? (
          <span className={pillClass}>System</span>
        ) : (
          <ThemeRenameForm data={theme} onSubmit={onAfterRename}>
            <BuilderIconButton aria-label="Rename theme">
              <EditIcon width={14} height={14} />
            </BuilderIconButton>
          </ThemeRenameForm>
        )}
      </div>

      <div className="flex items-center gap-2">
        <BuilderSaveButton
          hasUnsavedChanges={hasUnsavedChanges}
          isSaving={isSaving}
          onSave={onSave}
          disabled={theme.isSystem}
        />
        <ThemeEditDropdownMenu theme={theme} onSubmit={onActionComplete}>
          <BuilderIconButton variant="secondary" aria-label="Theme actions">
            <DotsHorizontalIcon className="h-4 w-4" />
          </BuilderIconButton>
        </ThemeEditDropdownMenu>
      </div>
    </div>
  );
}
