// Shared LinkControls component for content editor elements

import { Checkbox } from '@usertour-packages/checkbox';
import { Label } from '@usertour-packages/label';
import { memo, useCallback, useId } from 'react';
import type { Descendant } from 'slate';

import type { Attribute } from '@usertour/types';
import type { ContentEditorLinkData } from '../../types/editor';
import { INITIAL_LINK_URL_VALUE, LINK_OPEN_TYPE } from '../constants/link';
import { LinkEditorPanel } from './link-editor-panel';

export interface LinkControlsProps {
  link?: ContentEditorLinkData;
  onLinkChange: (link: ContentEditorLinkData | undefined) => void;
  zIndex: number;
  attributes?: Attribute[];
}

export const LinkControls = memo(
  ({ link, onLinkChange, zIndex, attributes }: LinkControlsProps) => {
    const id = useId();
    const linkCheckboxId = `${id}-link`;

    const handleLinkEnabledChange = useCallback(
      (enabled: boolean) => {
        if (!enabled) {
          onLinkChange(undefined);
        } else {
          onLinkChange({
            data: INITIAL_LINK_URL_VALUE,
            openType: LINK_OPEN_TYPE.SAME,
          });
        }
      },
      [onLinkChange],
    );

    const handleLinkDataChange = useCallback(
      (data: Descendant[]) => {
        onLinkChange({
          ...(link || {}),
          data,
        });
      },
      [link, onLinkChange],
    );

    const handleLinkOpenTypeChange = useCallback(
      (openType: string) => {
        onLinkChange({
          ...(link || {}),
          openType,
        });
      },
      [link, onLinkChange],
    );

    const handleLinkDelete = useCallback(() => {
      onLinkChange(undefined);
    }, [onLinkChange]);

    return (
      <>
        <div className="flex gap-x-2">
          <Checkbox
            id={linkCheckboxId}
            checked={!!link}
            onCheckedChange={handleLinkEnabledChange}
          />
          <Label htmlFor={linkCheckboxId}>Link URL</Label>
        </div>
        {link && (
          <LinkEditorPanel
            zIndex={zIndex}
            attributes={attributes ?? []}
            data={link.data ?? INITIAL_LINK_URL_VALUE}
            openType={link.openType ?? LINK_OPEN_TYPE.SAME}
            onDataChange={handleLinkDataChange}
            onOpenTypeChange={handleLinkOpenTypeChange}
            onDelete={handleLinkDelete}
            hideDelete
          />
        )}
      </>
    );
  },
);

LinkControls.displayName = 'LinkControls';
