import { Label, QuestionTooltip, Tabs, TabsContent, TabsList, TabsTrigger } from '@usertour/ui';
import { Align, AlignType, ContentAlignmentData, Side } from '@usertour/types';
import { Alignment } from '@/pages/contents/components/builder/components/shared/alignment';
import { InputNumber } from '@/pages/contents/components/builder/components/shared/input';

export interface ContentAlignmentProps {
  initialValue: ContentAlignmentData;
  onChange: (value: ContentAlignmentData) => void;
  title?: string;
}

// Controlled: renders straight from `initialValue` and writes every edit back
// through `onChange` — the parent step/launcher data is the single source of
// truth. (No local copy of the value.)
export const ContentAlignment = (props: ContentAlignmentProps) => {
  const { initialValue, onChange, title = 'Alignment' } = props;

  const handleDataChange = (newData: Partial<ContentAlignmentData>) => {
    onChange({ ...initialValue, ...newData });
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-start items-center space-x-1	">
        <h1 className="text-sm">{title}</h1>
        <QuestionTooltip>
          Customize which side of the target element the hen tooltip should appear on. By default,
          tooltips Ad are placed on the optimal side depending on the target's position and your
          user's screen size.
        </QuestionTooltip>
      </div>
      <Tabs
        defaultValue={initialValue.alignType}
        onValueChange={(value) => handleDataChange({ alignType: value as AlignType })}
      >
        <TabsList
          className="grid w-full grid-cols-2 bg-background-700"
          aria-label="Alignment options"
        >
          <TabsTrigger value="auto" variant="primary">
            Auto
          </TabsTrigger>
          <TabsTrigger value="fixed" variant="primary">
            Fixed
          </TabsTrigger>
        </TabsList>
        <TabsContent value="auto">
          <Alignment type="auto" />
        </TabsContent>
        <TabsContent value="fixed">
          <Alignment
            type="fixed"
            side={initialValue.side}
            align={initialValue.align}
            onAlignmentChange={(side: Side, align: Align) => handleDataChange({ side, align })}
          />
        </TabsContent>
      </Tabs>

      <div className="flex flex-col space-y-2">
        <Label htmlFor="button-distance-element">The distance in pixels from the element</Label>
        <InputNumber
          defaultNumber={initialValue.sideOffset}
          onValueChange={(value) => handleDataChange({ sideOffset: value ?? 0 })}
          allowNegative
        />
      </div>
      {initialValue.align !== 'center' && (
        <div className="flex flex-col space-y-2">
          <Label htmlFor="button-distance-alignment">An offset in pixels from the alignment</Label>
          <InputNumber
            defaultNumber={initialValue.alignOffset}
            onValueChange={(value) => handleDataChange({ alignOffset: value ?? 0 })}
            allowNegative
          />
        </div>
      )}
    </div>
  );
};

ContentAlignment.displayName = 'ContentAlignment';
