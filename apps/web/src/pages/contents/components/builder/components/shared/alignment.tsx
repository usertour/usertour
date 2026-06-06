import { cn } from '@usertour/tailwind';
import { createContext, useContext } from 'react';
import { useTranslation } from 'react-i18next';

const circleHoveredClassName =
  "bg-primary before:content-[''] before:border before:border-indigo-900 before:cursor-pointer before:h-2 before:w-2 before:rounded-[50%] before:border-solid before:scale-100 items-center cursor-pointer flex justify-center h-2.5 relative transition-transform duration-200 w-2.5 rounded-[50%] scale-[1.6] hover:bg-primary hover:scale-[1.6]";
const circleClassName =
  'items-center cursor-pointer flex justify-center h-2.5 relative transition-transform duration-200 w-2.5 rounded-[50%] bg-background-400 hover:bg-primary hover:scale-[1.6]';

const POSITIONS = {
  BOTTOM: 'bottom',
  TOP: 'top',
  LEFT: 'left',
  RIGHT: 'right',
} as const;

const ALIGNMENTS = {
  START: 'start',
  CENTER: 'center',
  END: 'end',
} as const;

type Position = (typeof POSITIONS)[keyof typeof POSITIONS];
type Alignment = (typeof ALIGNMENTS)[keyof typeof ALIGNMENTS];

// Tailwind classes that position the preview arrow for each side/align combo.
const arrowClassByPosition: Record<string, string> = {
  'bottom-start': 'border-b-slate-400 left-[12px] bottom-full',
  'bottom-center': 'border-b-slate-400 left-[calc(50%_-_6px)] bottom-full',
  'bottom-end': 'border-b-slate-400 right-[12px] bottom-full',
  'right-start': 'border-r-slate-400 top-[12px] right-full',
  'right-center': 'border-r-slate-400 top-[calc(50%_-_6px)] right-full',
  'right-end': 'border-r-slate-400 bottom-[12px] right-full',
  'left-start': 'border-l-slate-400 top-[12px] left-full',
  'left-center': 'border-l-slate-400 top-[calc(50%_-_6px)] left-full',
  'left-end': 'border-l-slate-400 bottom-[12px] left-full',
  'top-start': 'border-t-slate-400 left-[12px] top-full',
  'top-center': 'border-t-slate-400 left-[calc(50%_-_6px)] top-full',
  'top-end': 'border-t-slate-400 right-[12px] top-full',
};

interface AlignmentProps {
  className?: string;
  type: string;
  side?: Position;
  align?: Alignment;
  onAlignmentChange?: (side: Position, align: Alignment) => void;
}

interface AlignmentContextProps {
  currentSide: Position;
  type: string;
  currentAlign: Alignment;
}

const defaultContextValue: AlignmentContextProps = {
  currentAlign: ALIGNMENTS.CENTER,
  type: '',
  currentSide: POSITIONS.BOTTOM,
};

const AlignmentContext = createContext<AlignmentContextProps>(defaultContextValue);

interface CircleProps {
  side: Position;
  align: Alignment;
  onClick: (side: Position, align: Alignment) => void;
}

const Circle = (props: CircleProps) => {
  const { side, align, onClick } = props;
  const { type, currentAlign, currentSide } = useContext(AlignmentContext);
  // Active state is derived on render from context — no local state / effect.
  const isActive = type === 'fixed' && currentAlign === align && currentSide === side;
  const className = cn('sdk-alignment', isActive ? circleHoveredClassName : circleClassName);
  return <div className={className} onClick={() => onClick(side, align)} />;
};

// Controlled: the active side/align and the arrow preview are derived straight
// from props on every render — no local mirror of side/align, no effects.
export const Alignment = (props: AlignmentProps) => {
  const { onAlignmentChange, type, align = ALIGNMENTS.CENTER, side = POSITIONS.BOTTOM } = props;
  const { t } = useTranslation();

  const handleAlignmentChange = (nextSide: Position, nextAlign: Alignment) => {
    if (type !== 'fixed') {
      return;
    }
    onAlignmentChange?.(nextSide, nextAlign);
  };

  let text = '';
  let arrowCls = '';
  if (type === 'auto') {
    text = t('contentBuilder.shared.autoPosition');
  } else if (type === 'fixed') {
    arrowCls = arrowClassByPosition[`${side}-${align}`];
    text = t('contentBuilder.shared.alwaysShowFrom', {
      side: t(`contentBuilder.shared.sides.${side}`),
      align: t(`contentBuilder.shared.aligns.${align}`),
    });
  }

  const value = { currentSide: side, currentAlign: align, type };

  return (
    <AlignmentContext.Provider value={value}>
      <div className="flex flex-col bg-background-700 p-3.5 rounded-lg">
        <div className="items-center flex justify-between px-9 py-0">
          <Circle
            side={POSITIONS.BOTTOM}
            align={ALIGNMENTS.START}
            onClick={handleAlignmentChange}
          />
          <Circle
            side={POSITIONS.BOTTOM}
            align={ALIGNMENTS.CENTER}
            onClick={handleAlignmentChange}
          />
          <Circle side={POSITIONS.BOTTOM} align={ALIGNMENTS.END} onClick={handleAlignmentChange} />
        </div>
        <div className="items-center flex justify-between">
          <div className="items-center flex-col flex h-20 justify-between px-0 py-3">
            <Circle
              side={POSITIONS.RIGHT}
              align={ALIGNMENTS.START}
              onClick={handleAlignmentChange}
            />
            <Circle
              side={POSITIONS.RIGHT}
              align={ALIGNMENTS.CENTER}
              onClick={handleAlignmentChange}
            />
            <Circle side={POSITIONS.RIGHT} align={ALIGNMENTS.END} onClick={handleAlignmentChange} />
          </div>
          <div className="items-center bg-slate-200 rounded flex grow h-20 justify-center relative w-full m-3 px-3 py-6">
            <p className="text-sm">{text}</p>
            <div
              className={cn('absolute border-transparent border-solid border-[6px]', arrowCls)}
            />
          </div>
          <div className="items-center flex-col flex h-20 justify-between px-0 py-3">
            <Circle
              side={POSITIONS.LEFT}
              align={ALIGNMENTS.START}
              onClick={handleAlignmentChange}
            />
            <Circle
              side={POSITIONS.LEFT}
              align={ALIGNMENTS.CENTER}
              onClick={handleAlignmentChange}
            />
            <Circle side={POSITIONS.LEFT} align={ALIGNMENTS.END} onClick={handleAlignmentChange} />
          </div>
        </div>
        <div className="items-center flex justify-between px-9 py-0">
          <Circle side={POSITIONS.TOP} align={ALIGNMENTS.START} onClick={handleAlignmentChange} />
          <Circle side={POSITIONS.TOP} align={ALIGNMENTS.CENTER} onClick={handleAlignmentChange} />
          <Circle side={POSITIONS.TOP} align={ALIGNMENTS.END} onClick={handleAlignmentChange} />
        </div>
      </div>
    </AlignmentContext.Provider>
  );
};

Alignment.displayName = 'Alignment';
