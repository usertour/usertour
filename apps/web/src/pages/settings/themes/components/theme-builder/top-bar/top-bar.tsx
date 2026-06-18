import {
  Badge,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  EditableTitle,
} from '@usertour/ui';
import { RiArrowRightSLine, RiShieldCheckFill } from '@usertour/icons';
import type { Theme } from '@usertour/types';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { ThemeEditDropdownMenu } from '../../theme-edit-dropdown-menu';
import { BuilderSaveButton } from '../ui';
import { MoreButton } from '@/components/section-breadcrumb-header';

export interface TopBarProps {
  theme: Theme;
  onRename: (name: string) => Promise<void>;
  onActionComplete: (action: string) => void;
  hasUnsavedChanges: boolean;
  isSaving: boolean;
  onSave: () => void;
  // Covers both system-preset themes and Viewer-role users. Used to gate
  // rename + save; the System pill below still reads only `theme.isSystem`
  // because that badge specifically signals "this is a preset", not "you
  // can't write".
  isReadOnly: boolean;
  // Viewer-role gate, used to disable the actions dropdown (Duplicate /
  // Delete / Set-as-default). Distinct from `isReadOnly` because a system
  // theme should still expose the dropdown so non-Viewer users can
  // Duplicate it — only Viewers lose the menu entirely. Mirrors the
  // ThemeEditDropdownMenu `disabled` prop usage in theme-card-preview.
  isViewOnly: boolean;
}

export const TopBar = (props: TopBarProps) => {
  const {
    theme,
    onRename,
    onActionComplete,
    hasUnsavedChanges,
    isSaving,
    onSave,
    isReadOnly,
    isViewOnly,
  } = props;
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { projectId } = useParams();
  const themesListPath = projectId ? `/project/${projectId}/settings/themes` : null;
  return (
    // h-14 breadcrumb-style header. Mirrors content detail's "<Plural> ▸
    // <name>" pattern so users see one consistent header vocabulary across
    // detail pages. Inner panes (variations sidebar, sections accordion,
    // fields) keep the v2 compact chrome — only the outer header reads as
    // shadcn page chrome.
    <div className="relative flex h-14 flex-none items-center justify-between border-b border-border/50 bg-card px-4">
      {/* max-w-sm caps how wide the editable title can grow before
          truncating — matches content detail header so long theme names
          don't swallow the header chrome. */}
      <div className="flex min-w-0 max-w-sm flex-1 items-center gap-2">
        <button
          type="button"
          onClick={() => themesListPath && navigate(themesListPath)}
          disabled={!themesListPath}
          className="shrink-0 text-sm text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
        >
          {t('themeBuilder.chrome.themes')}
        </button>
        <RiArrowRightSLine className="h-4 w-4 shrink-0 text-muted-foreground/60" />
        <div className="flex min-w-0 items-center gap-2">
          <EditableTitle value={theme.name} onRename={onRename} disabled={isReadOnly} />
          {theme.isSystem && (
            // Same shape as the System badges on Events / Attributes lists
            // (shield + sentence-case label, secondary muted surface) so users
            // recognize the marker across the app. Wrapped in a tooltip so
            // hovering explains *why* the theme is read-only — v1 had this
            // info inline as a sentence; pill alone wasn't self-explanatory.
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  {/* span wrapper because Badge is a plain function component
                      without forwardRef — Radix's asChild slot needs the
                      immediate child to forward refs, and intrinsic <span>
                      does that natively. */}
                  <span className="inline-flex cursor-help">
                    <Badge
                      variant="secondary"
                      className="gap-1 px-1.5 py-0 font-normal text-muted-foreground"
                    >
                      <RiShieldCheckFill className="h-3 w-3 text-foreground" />
                      {t('themeBuilder.chrome.systemPill')}
                    </Badge>
                  </span>
                </TooltipTrigger>
                <TooltipContent className="max-w-sm">
                  {t('themeBuilder.chrome.systemPillTooltip')}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <BuilderSaveButton
          hasUnsavedChanges={hasUnsavedChanges}
          isSaving={isSaving}
          onSave={onSave}
          disabled={isReadOnly}
        />
        <ThemeEditDropdownMenu theme={theme} onSubmit={onActionComplete} disabled={isViewOnly}>
          <MoreButton aria-label={t('themeBuilder.aria.themeActions')} />
        </ThemeEditDropdownMenu>
      </div>
    </div>
  );
};
