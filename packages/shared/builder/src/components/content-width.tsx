import { QuestionTooltip } from '@usertour-packages/tooltip';
import { InputNumber } from './shared/input';

export interface ContentWidthProps {
  width: number;
  onChange: (width: number) => void;
  type: 'modal' | 'tooltip' | 'checklist';
}

const tooltipContent = {
  modal: 'The width in pixels of the modal',
  tooltip: 'The width in pixels of the tooltip',
  checklist: 'The width in pixels of the checklist',
} as const;

export const ContentWidth = (props: ContentWidthProps) => {
  const { type, width, onChange } = props;

  const handleWidthChange = (value: number) => {
    onChange(value);
  };

  return (
    <div className="space-y-3 ">
      <div className="flex justify-start items-center space-x-1	">
        <h1 className="text-sm">Width</h1>
        <QuestionTooltip>{tooltipContent[type]}</QuestionTooltip>
      </div>
      <InputNumber defaultNumber={width} onValueChange={handleWidthChange} />
    </div>
  );
};
ContentWidth.displayName = 'ContentWidth';
