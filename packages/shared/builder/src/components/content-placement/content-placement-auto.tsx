import { Crosshair2Icon } from '@radix-ui/react-icons';
import { Button } from '@usertour-packages/button';
import { EXTENSION_SELECT } from '@usertour-packages/constants';
import { Label } from '@usertour-packages/label';
import { SelectorDialog } from '@usertour-packages/shared-components';
import { QuestionTooltip } from '@usertour-packages/tooltip';
import { Switch } from '@usertour-packages/switch';
import { ContentError, ContentErrorAnchor, ContentErrorContent } from '../content-error';
import { useContentPlacement } from './content-placement-context';
import { PrecisionSelect } from './precision-select';

export const ContentPlacementAuto = () => {
  const {
    target,
    zIndex,
    isWebBuilder,
    screenshot,
    onChangeElement,
    onTargetChange,
    buildUrl,
    token,
    onScreenChange,
    isShowError,
    subTitle,
  } = useContentPlacement();

  const handleElementSelectSuccess = (output: any) => {
    onTargetChange({
      selectors: output.target.selectors,
      content: output.target.content,
      selectorsList: output.target.selectorsList,
    });
    if (onScreenChange) {
      onScreenChange(output.screenshot);
    }
  };

  return (
    <ContentError open={isShowError && (!target?.selectors || target?.selectors.length === 0)}>
      <div className="flex flex-col space-y-2">
        <h1 className="text-sm">{subTitle}</h1>
        {!isWebBuilder ? (
          <div
            className="rounded-2xl flex-col overflow-hidden"
            onClick={(e) => onChangeElement?.(e.currentTarget)}
          >
            <div className="w-[242px] h-[130px] overflow-hidden">
              <img src={screenshot?.mini} alt="" />
            </div>

            <ContentErrorAnchor>
              <Button className="w-full rounded-none">
                <Crosshair2Icon className="mr-2" />
                Select another element
              </Button>
            </ContentErrorAnchor>
          </div>
        ) : (
          <SelectorDialog
            onSuccess={handleElementSelectSuccess}
            buildUrl={buildUrl || ''}
            zIndex={zIndex + EXTENSION_SELECT}
            token={token || ''}
          >
            <div className="rounded-2xl flex-col overflow-hidden">
              <div className="w-[242px] h-[130px] overflow-hidden">
                <img src={screenshot?.mini} alt="" />
              </div>
              <ContentErrorAnchor>
                <Button className="w-full rounded-none">
                  <Crosshair2Icon className="mr-2" />
                  {!target ? 'Select element' : 'Select another element'}
                </Button>
              </ContentErrorAnchor>
            </div>
          </SelectorDialog>
        )}

        <PrecisionSelect
          value={target?.precision}
          onChange={(value) => onTargetChange({ precision: value })}
          zIndex={zIndex + EXTENSION_SELECT}
        />

        <div className="flex items-center justify-between space-x-2">
          <div className="flex space-x-2 grow">
            <Label htmlFor="dynamic-content">Dynamic text</Label>
            <QuestionTooltip>
              If the element's text is dynamic and may change, enabled this switch to make Usertour
              find it without considering its current text.
            </QuestionTooltip>
          </div>
          <Switch
            id="dynamic-content"
            checked={target?.isDynamicContent}
            onCheckedChange={(value) => onTargetChange({ isDynamicContent: value })}
          />
        </div>
      </div>
      <ContentErrorContent style={{ zIndex: zIndex + EXTENSION_SELECT }}>
        Please select an element
      </ContentErrorContent>
    </ContentError>
  );
};
