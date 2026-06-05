import { RiArrowLeftRightLine, RiMenuFoldLine, RiMenuUnfoldLine } from '@usertour/icons';
import { useTranslation } from 'react-i18next';

export interface SidebarControlsProps {
  // Which edge the panel is docked to — flips the collapse chevron so it
  // points in the direction the panel folds.
  isLeft: boolean;
  // Switch the panel to the other side of the canvas.
  onSwitchSide: () => void;
  // Collapse the panel off-screen (a floating button re-opens it).
  onCollapse: () => void;
}

// The two top-corner panel controls (switch side + collapse). Sits inline in
// the header next to the truncating title, so the title yields space rather
// than being overlapped.
export const SidebarControls = (props: SidebarControlsProps) => {
  const { isLeft, onSwitchSide, onCollapse } = props;
  const { t } = useTranslation();

  return (
    <div className="flex flex-none items-center gap-0.5">
      <button
        type="button"
        onClick={onSwitchSide}
        title={t('contentBuilder.common.switchSide')}
        className="grid size-7 place-items-center rounded-md text-slate-300 hover:bg-muted hover:text-slate-500"
      >
        <RiArrowLeftRightLine className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={onCollapse}
        title={t('contentBuilder.common.collapsePanel')}
        className="grid size-7 place-items-center rounded-md text-slate-300 hover:bg-muted hover:text-slate-500"
      >
        {isLeft ? <RiMenuFoldLine className="h-4 w-4" /> : <RiMenuUnfoldLine className="h-4 w-4" />}
      </button>
    </div>
  );
};
SidebarControls.displayName = 'SidebarControls';
