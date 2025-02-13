import { Label } from '@usertour-ui/label';
import { HelpTooltip } from '@usertour-ui/shared-components';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@usertour-ui/tabs';
import { Align, AlignType, ContentAlignmentData, Side } from '@usertour-ui/types';
import { useState } from 'react';
import { Alignment } from './shared/alignment';
import { InputNumber } from './shared/input';

export interface ContentAlignmentProps {
  initialValue: ContentAlignmentData;
  onChange: (value: ContentAlignmentData) => void;
  title?: string;
}

export const ContentAlignment = (props: ContentAlignmentProps) => {
  const { initialValue, onChange, title = 'Alignment' } = props;
  const [data, setData] = useState<ContentAlignmentData>(initialValue);

  const handleDataChange = (newData: Partial<ContentAlignmentData>) => {
    const updatedData = { ...data, ...newData };
    setData(updatedData);
    onChange(updatedData);
  };

  const handleAlignmentChange = (side: Side, align: Align) => {
    handleDataChange({ side, align });
  };

  const handleAlignTypeChange = (value: string) => {
    handleDataChange({ alignType: value as AlignType });
  };

  const handleSideOffsetChange = (value: number) => {
    handleDataChange({ sideOffset: Number(value) });
  };

  const handleAlignOffsetChange = (value: number) => {
    handleDataChange({ alignOffset: Number(value) });
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-start items-center space-x-1	">
        <h1 className="text-sm">{title}</h1>
        <HelpTooltip>
          Customize which side of the target element the hen tooltip should appear on. By default,
          tooltips Ad are placed on the optimal side depending on the target's position and your
          user's screen size.
        </HelpTooltip>
      </div>
      <Tabs defaultValue={data.alignType} onValueChange={handleAlignTypeChange}>
        <TabsList
          className="grid w-full grid-cols-2 bg-background-700"
          aria-label="Alignment options"
        >
          <TabsTrigger
            value="auto"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            Auto
          </TabsTrigger>
          <TabsTrigger
            value="fixed"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            Fixed
          </TabsTrigger>
        </TabsList>
        <TabsContent value="auto">
          <Alignment type="auto" />
        </TabsContent>
        <TabsContent value="fixed">
          <Alignment
            type="fixed"
            side={data.side}
            align={data.align}
            onAlignmentChange={handleAlignmentChange}
          />
        </TabsContent>
      </Tabs>

      <div className="flex flex-col space-y-2">
        <Label htmlFor="button-distance-element">The distance in pixels from the element</Label>
        <InputNumber defaultNumber={data.sideOffset} onValueChange={handleSideOffsetChange} />
      </div>
      {data.align !== 'center' && (
        <div className="flex flex-col space-y-2">
          <Label htmlFor="button-distance-alignment">An offset in pixels from the alignment</Label>
          <InputNumber defaultNumber={data.alignOffset} onValueChange={handleAlignOffsetChange} />
        </div>
      )}
    </div>
  );
};
ContentAlignment.displayName = 'ContentAlignment';
