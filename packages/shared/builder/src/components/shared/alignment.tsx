import { cn } from '@usertour-ui/button/src/utils';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';

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

interface PositionConfig {
  className: string;
  text: string;
}

const positionMapping: Record<string, PositionConfig> = {
  'bottom-start': {
    className: 'border-b-slate-400 left-[12px] bottom-full',
    text: 'Always show from bottom-start',
  },
  'bottom-center': {
    className: 'border-b-slate-400 left-[calc(50%_-_6px)] bottom-full',
    text: 'Always show from bottom-center',
  },
  'bottom-end': {
    className: 'border-b-slate-400 right-[12px]  bottom-full',
    text: 'Always show from bottom-right',
  },
  'right-start': {
    className: 'border-r-slate-400 top-[12px]  right-full',
    text: 'Always show from bottom-right',
  },
  'right-center': {
    className: 'border-r-slate-400 top-[calc(50%_-_6px)]  right-full',
    text: 'Always show from bottom-right',
  },
  'right-end': {
    className: 'border-r-slate-400 bottom-[12px]  right-full',
    text: 'Always show from bottom-right',
  },
  'left-start': {
    className: 'border-l-slate-400 top-[12px]  left-full',
    text: 'Always show from bottom-right',
  },
  'left-center': {
    className: 'border-l-slate-400 top-[calc(50%_-_6px)]  left-full',
    text: 'Always show from bottom-right',
  },
  'left-end': {
    className: 'border-l-slate-400 bottom-[12px]  left-full',
    text: 'Always show from bottom-right',
  },
  'top-start': {
    className: 'border-t-slate-400 left-[12px]  top-full',
    text: 'Always show from bottom-right',
  },
  'top-center': {
    className: 'border-t-slate-400 left-[calc(50%_-_6px)]  top-full',
    text: 'Always show from bottom-right',
  },
  'top-end': {
    className: 'border-t-slate-400 right-[12px]  top-full',
    text: 'Always show from bottom-right',
  },
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

const Circle = ({ side, align, onClick }: CircleProps) => {
  const [className, setClassName] = useState('');
  const { type, currentAlign, currentSide } = useContext(AlignmentContext);

  useEffect(() => {
    const isActive = type === 'fixed' && currentAlign === align && currentSide === side;
    setClassName(cn('sdk-alignment', isActive ? circleHoveredClassName : circleClassName));
  }, [type, currentAlign, currentSide, align, side]);

  return <div className={className} onClick={() => onClick(side, align)} />;
};

export const Alignment = ({
  onAlignmentChange,
  type,
  align = ALIGNMENTS.CENTER,
  side = POSITIONS.BOTTOM,
}: AlignmentProps) => {
  const [arrowCls, setArrowCls] = useState('');
  const [text, setText] = useState('');
  const [currentSide, setCurrentSide] = useState<Position>(side);
  const [currentAlign, setCurrentAlign] = useState<Alignment>(align);

  useEffect(() => {
    if (type === 'auto') {
      setText('Automatically choose the optimal position');
      return;
    }

    if (type === 'fixed') {
      const key = `${currentSide}-${currentAlign}`;
      const config = positionMapping[key];
      setArrowCls(config.className);
      setText(config.text);
    }
  }, [type, currentSide, currentAlign]);

  const handleAlignmentChange = useCallback(
    (side: Position, align: Alignment) => {
      if (type !== 'fixed') return;

      setCurrentSide(side);
      setCurrentAlign(align);
      onAlignmentChange?.(side, align);
    },
    [type, onAlignmentChange],
  );

  const value = {
    currentSide,
    currentAlign,
    type,
  };

  return (
    <AlignmentContext.Provider value={value}>
      <div className="flex flex-col bg-background-700 p-3.5 rounded-lg">
        <div className="items-center flex justify-between px-9 py-0;">
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
          <div className="items-center bg-background-400 rounded flex grow h-20 justify-center relative w-full m-3 px-3 py-6">
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
