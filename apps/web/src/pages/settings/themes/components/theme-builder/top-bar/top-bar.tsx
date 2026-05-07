import { Button } from '@usertour-packages/button';
import { RiArrowLeftLine } from '@usertour-packages/icons';
import { pillClass } from '@usertour-packages/ui';
import type { Theme } from '@usertour/types';
import { useTranslation } from 'react-i18next';
import { ThemeEditDropdownMenu } from '../../theme-edit-dropmenu';
import { BuilderSaveButton } from '../ui';
import { EditableTitle } from '@/components/molecules/editable-title';
import { MoreButton } from '@/components/molecules/section-breadcrumb-header';

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
    // h-14 + ghost icon-sm back / MoreButton — same chrome metrics as
    // content detail's header (and SectionBreadcrumbHeader). Theme builder is
    // still a takeover (no app sidebar), but its top-bar now reads with the
    // same vocabulary so users don't see a register jump between content
    // detail and theme builder. v2 chrome density still owns the inner panes
    // (variations sidebar, sections accordion, color/number fields).
    <div className="relative flex h-14 flex-none items-center justify-between border-b border-border/50 bg-background px-4">
      {/* Title sits next to the back button as a left-aligned breadcrumb
          ("← Standard Light 2") rather than centered over the canvas.
          Editor chrome reads as utility, not a stage; an inline editable
          title also keeps its position stable as the user types instead
          of jumping horizontally with each keystroke. min-w-0 lets the
          editable title's truncate take effect when the name is long. */}
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onBack}
          aria-label={t('themeBuilder.aria.back')}
        >
          <RiArrowLeftLine className="h-4 w-4" />
        </Button>
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
          <MoreButton aria-label={t('themeBuilder.aria.themeActions')} />
        </ThemeEditDropdownMenu>
      </div>
    </div>
  );
}
