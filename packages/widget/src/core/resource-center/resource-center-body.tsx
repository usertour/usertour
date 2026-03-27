import { memo } from 'react';
import type { ResourceCenterMessageBlock, UserTourTypes } from '@usertour/types';
import { ResourceCenterBlockType } from '@usertour/types';
import { cn } from '@usertour-packages/tailwind';
import { ContentEditorSerialize } from '../../serialize/content-editor-serialize';
import { useResourceCenterContext } from './context';

// ============================================================================
// Block — MESSAGE
// ============================================================================

interface ResourceCenterMessageBlockViewProps {
  block: ResourceCenterMessageBlock;
  userAttributes?: UserTourTypes.Attributes;
  onContentClick?: (element: any) => Promise<void>;
  editSlot?: React.ReactNode;
}

export const ResourceCenterMessageBlockView = memo(
  ({ block, userAttributes, onContentClick, editSlot }: ResourceCenterMessageBlockViewProps) => {
    if (editSlot) {
      return <div className="py-2 px-4">{editSlot}</div>;
    }

    return (
      <div className="py-2 px-4">
        <ContentEditorSerialize
          contents={block.content}
          onClick={onContentClick}
          userAttributes={userAttributes}
        />
      </div>
    );
  },
);

ResourceCenterMessageBlockView.displayName = 'ResourceCenterMessageBlockView';

// ============================================================================
// Block — CHECKLIST (slot)
// ============================================================================

interface ResourceCenterChecklistBlockViewProps {
  slot?: React.ReactNode;
}

export const ResourceCenterChecklistBlockView = memo(
  ({ slot }: ResourceCenterChecklistBlockViewProps) => {
    if (slot) {
      return <div className="px-4 py-2">{slot}</div>;
    }

    return (
      <div className="px-4 py-3">
        <div className="flex items-center gap-2 text-sm opacity-50">
          <span>📋</span>
          <span>No active checklist</span>
        </div>
      </div>
    );
  },
);

ResourceCenterChecklistBlockView.displayName = 'ResourceCenterChecklistBlockView';

// ============================================================================
// Body
// ============================================================================

export const ResourceCenterBody = memo(({ children }: { children: React.ReactNode }) => {
  const { themeSetting } = useResourceCenterContext();
  const rc = themeSetting.resourceCenter;

  return (
    <div
      className={cn(
        'order-2 min-h-0 min-w-0 flex-1 overflow-y-auto bg-sdk-background',
        'transition-opacity duration-sdk-resource-center',
        'group-data-[state=closed]:absolute group-data-[state=closed]:invisible group-data-[state=closed]:opacity-0',
        'group-data-[animating]:pointer-events-none group-data-[animating]:overflow-hidden',
      )}
      style={{
        maxHeight: rc?.maxHeight ? `${rc.maxHeight}px` : undefined,
      }}
    >
      {children}
    </div>
  );
});

ResourceCenterBody.displayName = 'ResourceCenterBody';

// ============================================================================
// Blocks — renders all blocks with dividers
// ============================================================================

interface ResourceCenterBlocksProps {
  messageEditSlots?: Record<string, React.ReactNode>;
}

export const ResourceCenterBlocks = memo(({ messageEditSlots }: ResourceCenterBlocksProps) => {
  const { themeSetting, data, userAttributes, onContentClick, checklistSlot } =
    useResourceCenterContext();

  const rc = themeSetting.resourceCenter;
  const showDividers = rc?.dividerLines !== false;

  return (
    <>
      {data.blocks.map((block, index) => {
        const showDivider = showDividers && index < data.blocks.length - 1;

        return (
          <div key={block.id}>
            {block.type === ResourceCenterBlockType.MESSAGE && (
              <ResourceCenterMessageBlockView
                block={block}
                userAttributes={userAttributes}
                onContentClick={onContentClick}
                editSlot={messageEditSlots?.[block.id]}
              />
            )}
            {block.type === ResourceCenterBlockType.CHECKLIST && (
              <ResourceCenterChecklistBlockView slot={checklistSlot} />
            )}
            {showDivider && <div className="mx-4 border-b border-sdk-resource-center-divider" />}
          </div>
        );
      })}

      {data.blocks.length === 0 && (
        <div className="py-8 text-center text-sm opacity-40">No blocks added yet</div>
      )}
    </>
  );
});

ResourceCenterBlocks.displayName = 'ResourceCenterBlocks';
