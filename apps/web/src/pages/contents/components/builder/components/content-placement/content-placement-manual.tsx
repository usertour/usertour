import { EXTENSION_SELECT } from '@usertour/constants';
import { Input, Label, QuestionTooltip } from '@usertour/ui';
import { ChangeEvent, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ContentError,
  ContentErrorAnchor,
  ContentErrorContent,
} from '@/pages/contents/components/builder/components/content-error';
import { useContentPlacement } from '@/pages/contents/components/builder/components/content-placement/content-placement-context';
import { SequenceSelect } from '@/pages/contents/components/builder/components/content-placement/sequence-select';

export const ContentPlacementManual = () => {
  const { target, onTargetChange, zIndex, isShowError } = useContentPlacement();
  const { t } = useTranslation();

  const handleContentChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      onTargetChange({ content: e.target.value });
    },
    [onTargetChange],
  );

  const handleSelectorChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      onTargetChange({ customSelector: e.target.value });
    },
    [onTargetChange],
  );

  const handleSequenceChange = useCallback(
    (value: number | string) => {
      onTargetChange({ sequence: String(value) });
    },
    [onTargetChange],
  );

  return (
    <ContentError open={isShowError && !target?.customSelector}>
      <div className="flex flex-col space-y-2">
        <div className="flex flex-col space-y-2">
          <div className="flex justify-start items-center space-x-1">
            <Label htmlFor="element-text">{t('contentBuilder.shared.elementText')}</Label>
            <QuestionTooltip>{t('contentBuilder.shared.elementTextTooltip')}</QuestionTooltip>
          </div>
          <Input
            variant="compact"
            id="element-text"
            className="bg-slate-50 shadow-none"
            value={target?.content ?? ''}
            onChange={handleContentChange}
          />
          <div className="flex justify-start items-center space-x-1">
            <Label htmlFor="css-selector">{t('contentBuilder.shared.cssSelector')}</Label>
            <QuestionTooltip>{t('contentBuilder.shared.cssSelectorTooltip')}</QuestionTooltip>
          </div>

          <ContentErrorAnchor>
            <Input
              variant="compact"
              id="css-selector"
              className="bg-slate-50 shadow-none"
              value={target?.customSelector ?? ''}
              onChange={handleSelectorChange}
            />
          </ContentErrorAnchor>

          <SequenceSelect
            value={target?.sequence}
            onChange={handleSequenceChange}
            zIndex={zIndex + EXTENSION_SELECT}
          />
        </div>
      </div>
      <ContentErrorContent style={{ zIndex: zIndex + EXTENSION_SELECT }}>
        {t('contentBuilder.shared.cssSelectorRequired')}
      </ContentErrorContent>
    </ContentError>
  );
};
