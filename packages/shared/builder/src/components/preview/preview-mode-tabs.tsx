import { Tabs, TabsList, TabsTrigger } from '@usertour-packages/tabs';
import { QuestionTooltip } from '@usertour-packages/tooltip';

interface PreviewModeOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface PreviewModeTabsProps {
  value: string;
  options: PreviewModeOption[];
  onValueChange: (value: string) => void;
  className?: string;
  tooltip?: React.ReactNode;
}

export const PreviewModeTabs = ({
  value,
  options,
  onValueChange,
  className,
  tooltip,
}: PreviewModeTabsProps) => {
  return (
    <div className={className ?? 'pointer-events-none fixed left-1/2 top-4 z-20 -translate-x-1/2'}>
      <div className="pointer-events-auto flex items-center gap-2">
        <Tabs value={value}>
          <TabsList className="grid w-[280px] grid-cols-2 bg-muted shadow-sm">
            {options.map((option) => (
              <TabsTrigger
                key={option.value}
                value={option.value}
                disabled={option.disabled}
                onClick={() => onValueChange(option.value)}
              >
                {option.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        {tooltip ? <QuestionTooltip>{tooltip}</QuestionTooltip> : null}
      </div>
    </div>
  );
};

PreviewModeTabs.displayName = 'PreviewModeTabs';
