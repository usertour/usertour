import { ChevronLeftIcon, DotsHorizontalIcon } from '@radix-ui/react-icons';
import type { Theme } from '@usertour/types';
import { ThemeEditDropdownMenu } from '../../theme-edit-dropmenu';
import { BuilderIconButton, BuilderSaveButton } from '../ui';
import { pillClass, topBarClass } from '../ui/tokens';
import { EditableTitle } from './editable-title';

interface Props {
  theme: Theme;
  onBack: () => void;
  onRename: (name: string) => Promise<void>;
  onActionComplete: (action: string) => void;
  hasUnsavedChanges: boolean;
  isSaving: boolean;
  onSave: () => void;
}

export function TopBar({
  theme,
  onBack,
  onRename,
  onActionComplete,
  hasUnsavedChanges,
  isSaving,
  onSave,
}: Props) {
  return (
    <div className={topBarClass}>
      <div className="flex items-center gap-2">
        <BuilderIconButton variant="depth" onClick={onBack} aria-label="Back">
          <ChevronLeftIcon className="h-4 w-4" />
        </BuilderIconButton>
      </div>

      <div className="absolute left-1/2 flex max-w-[40%] -translate-x-1/2 items-center gap-2">
        <EditableTitle value={theme.name} onRename={onRename} disabled={theme.isSystem} />
        {theme.isSystem && <span className={pillClass}>System</span>}
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
