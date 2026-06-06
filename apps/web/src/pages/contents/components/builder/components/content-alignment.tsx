import { Label, QuestionTooltip, Tabs, TabsContent, TabsList, TabsTrigger } from '@usertour/ui';
import { Align, AlignType, ContentAlignmentData, Side } from '@usertour/types';
import { useTranslation } from 'react-i18next';
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
  const { initialValue, onChange, title } = props;
  const { t } = useTranslation();

  const handleDataChange = (newData: Partial<ContentAlignmentData>) => {
    onChange({ ...initialValue, ...newData });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-start space-x-1">
        <h1 className="text-sm">{title ?? t('contentBuilder.shared.alignment')}</h1>
        <QuestionTooltip>{t('contentBuilder.shared.alignmentTooltip')}</QuestionTooltip>
      </div>
      <Tabs
        defaultValue={initialValue.alignType}
        onValueChange={(value) => handleDataChange({ alignType: value as AlignType })}
      >
        <TabsList
          className="grid w-full grid-cols-2 bg-slate-50"
          aria-label={t('contentBuilder.shared.alignment')}
        >
          <TabsTrigger value="auto" variant="primary">
            {t('contentBuilder.shared.auto')}
          </TabsTrigger>
          <TabsTrigger value="fixed" variant="primary">
            {t('contentBuilder.shared.fixed')}
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
        <Label htmlFor="button-distance-element">
          {t('contentBuilder.shared.distanceFromElement')}
        </Label>
        <InputNumber
          defaultNumber={initialValue.sideOffset}
          onValueChange={(value) => handleDataChange({ sideOffset: value ?? 0 })}
          allowNegative
        />
      </div>
      {initialValue.align !== 'center' && (
        <div className="flex flex-col space-y-2">
          <Label htmlFor="button-distance-alignment">
            {t('contentBuilder.shared.offsetFromAlignment')}
          </Label>
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
