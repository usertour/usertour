import { EXTENSION_SELECT } from '@usertour-ui/constants';
import { Input } from '@usertour-ui/input';
import { Label } from '@usertour-ui/label';
import { HelpTooltip } from '@usertour-ui/shared-components';
import { ChangeEvent, useCallback } from 'react';
import { ContentError, ContentErrorAnchor, ContentErrorContent } from '../content-error';
import { useContentPlacement } from './content-placement-context';
import { SelectorButtons } from './selector-buttons';
import { SequenceSelect } from './sequence-select';

export const ContentPlacementManual = () => {
  const { target, onTargetChange, zIndex, isShowError } = useContentPlacement();

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

  const handleSelectorSelect = useCallback(
    (selector: string) => {
      onTargetChange({ customSelector: selector });
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
        {/* <h1 className="text-sm">{subTitle}</h1> */}
        <div className="flex flex-col space-y-2">
          <div className="flex justify-start items-center space-x-1">
            <Label htmlFor="element-text">Element text</Label>
            <HelpTooltip>
              Usertour will select an element containing the text you write here.
            </HelpTooltip>
          </div>
          <Input id="element-text" value={target?.content ?? ''} onChange={handleContentChange} />
          <div className="flex justify-start items-center space-x-1	">
            <Label htmlFor="css-selector">CSS selector</Label>
            <HelpTooltip>
              Advanced feature: If possible, we recommend selecting elements using text. lf an
              element does not have text, or the text is very generic, you can select it using a CSS
              selector instead. lf both text and CSS selector is filled in, Usertour will select an
              element matching both.
            </HelpTooltip>
          </div>

          <ContentErrorAnchor>
            <Input
              id="css-selector"
              value={target?.customSelector ?? ''}
              onChange={handleSelectorChange}
            />
          </ContentErrorAnchor>

          <SelectorButtons selectors={target?.selectorsList} onSelect={handleSelectorSelect} />

          <SequenceSelect
            value={target?.sequence}
            onChange={handleSequenceChange}
            zIndex={zIndex + EXTENSION_SELECT}
          />
        </div>
      </div>
      <ContentErrorContent style={{ zIndex: zIndex + EXTENSION_SELECT }}>
        CSS selector is required
      </ContentErrorContent>
    </ContentError>
  );
};
