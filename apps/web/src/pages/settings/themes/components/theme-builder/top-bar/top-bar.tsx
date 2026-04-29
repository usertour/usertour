import { RiArrowLeftSLine, RiMoreFill } from '@usertour-packages/icons';
import type { Theme } from '@usertour/types';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  return (
    <div className={topBarClass}>
      {/* Title sits next to the back button as a left-aligned breadcrumb
          ("← Standard Light 2") rather than centered over the canvas.
          Editor chrome reads as utility, not a stage; an inline editable
          title also keeps its position stable as the user types instead
          of jumping horizontally with each keystroke. min-w-0 lets the
          editable title's truncate take effect when the name is long. */}
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <BuilderIconButton
          variant="depth"
          onClick={onBack}
          aria-label={t('themeBuilder.aria.back')}
        >
          <RiArrowLeftSLine className="h-4 w-4" />
        </BuilderIconButton>
        <div className="flex min-w-0 items-center gap-2">
          <EditableTitle value={theme.name} onRename={onRename} disabled={theme.isSystem} />
          {theme.isSystem && (
            <span className={pillClass}>{t('themeBuilder.chrome.systemPill')}</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <BuilderSaveButton
          hasUnsavedChanges={hasUnsavedChanges}
          isSaving={isSaving}
          onSave={onSave}
          disabled={theme.isSystem}
        />
        <ThemeEditDropdownMenu theme={theme} onSubmit={onActionComplete}>
          <BuilderIconButton variant="secondary" aria-label={t('themeBuilder.aria.themeActions')}>
            <RiMoreFill className="h-4 w-4" />
          </BuilderIconButton>
        </ThemeEditDropdownMenu>
      </div>
    </div>
  );
}
