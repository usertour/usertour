import { PickElementButton, type PickElementResult } from '@usertour/business-components';
import { BUILDER_Z } from '@usertour/constants';
import { Input, Label, QuestionTooltip } from '@usertour/ui';
import { ChangeEvent, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ContentError,
  ContentErrorAnchor,
  ContentErrorContent,
} from '@/pages/contents/components/builder/components/content-error';
import { useContentPlacement } from '@/pages/contents/components/builder/components/content-placement/content-placement-context';
import { SequenceSelect } from '@/pages/contents/components/builder/components/content-placement/sequence-select';

export const ContentPlacementManual = () => {
  const { target, onTargetChange, isShowError } = useContentPlacement();
  const { t } = useTranslation();
  // Match count reported by the last visual pick — transient hint guiding
  // the user to the sequence select; cleared on manual selector edits.
  const [pickedMatchCount, setPickedMatchCount] = useState<number | null>(null);

  const handleContentChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      onTargetChange({ content: e.target.value });
    },
    [onTargetChange],
  );

  const handleSelectorChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      setPickedMatchCount(null);
      onTargetChange({ customSelector: e.target.value });
    },
    [onTargetChange],
  );

  const handleElementPicked = useCallback(
    (result: PickElementResult) => {
      setPickedMatchCount(result.matchCount);
      onTargetChange({ customSelector: result.selector });
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
            value={target?.content ?? ''}
            onChange={handleContentChange}
          />
          <div className="flex justify-start items-center space-x-1">
            <Label htmlFor="css-selector">{t('contentBuilder.shared.cssSelector')}</Label>
            <QuestionTooltip>{t('contentBuilder.shared.cssSelectorTooltip')}</QuestionTooltip>
          </div>

          <div className="flex items-center gap-1.5">
            <ContentErrorAnchor className="flex-1">
              <Input
                variant="compact"
                id="css-selector"
                value={target?.customSelector ?? ''}
                onChange={handleSelectorChange}
              />
            </ContentErrorAnchor>
            <PickElementButton
              label={t('contentBuilder.shared.pickElement')}
              onPicked={handleElementPicked}
            />
          </div>

          {pickedMatchCount !== null && pickedMatchCount > 1 && (
            <p className="text-sm text-muted-foreground">
              {t('contentBuilder.shared.pickElementMatches', { count: pickedMatchCount })}
            </p>
          )}

          <SequenceSelect
            value={target?.sequence}
            onChange={handleSequenceChange}
            zIndex={BUILDER_Z.popover}
          />
        </div>
      </div>
      <ContentErrorContent style={{ zIndex: BUILDER_Z.popover }}>
        {t('contentBuilder.shared.cssSelectorRequired')}
      </ContentErrorContent>
    </ContentError>
  );
};
