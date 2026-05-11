import { Badge } from '@usertour-packages/badge';
import { RiArrowRightSLine, RiShieldCheckFill } from '@usertour-packages/icons';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@usertour-packages/tooltip';
import type { Theme } from '@usertour/types';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { ThemeEditDropdownMenu } from '../../theme-edit-dropmenu';
import { BuilderSaveButton } from '../ui';
import { EditableTitle } from '@/components/molecules/editable-title';
import { MoreButton } from '@/components/molecules/section-breadcrumb-header';

interface Props {
  theme: Theme;
  onRename: (name: string) => Promise<void>;
  onActionComplete: (action: string) => void;
  hasUnsavedChanges: boolean;
  isSaving: boolean;
  onSave: () => void;
}

export function TopBar({
  theme,
  onRename,
  onActionComplete,
  hasUnsavedChanges,
  isSaving,
  onSave,
}: Props) {
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
    <div className="relative flex h-14 flex-none items-center justify-between border-b border-border/50 bg-background px-4">
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
          <EditableTitle value={theme.name} onRename={onRename} disabled={theme.isSystem} />
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
          disabled={theme.isSystem}
        />
        <ThemeEditDropdownMenu theme={theme} onSubmit={onActionComplete}>
          <MoreButton aria-label={t('themeBuilder.aria.themeActions')} />
        </ThemeEditDropdownMenu>
      </div>
    </div>
  );
}
