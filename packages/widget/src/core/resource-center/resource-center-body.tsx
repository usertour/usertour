import { Fragment, memo } from 'react';
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
  onBlockClick?: (blockId: string) => Promise<void>;
  editSlot?: React.ReactNode;
}

export const ResourceCenterMessageBlockView = memo(
  ({
    block,
    userAttributes,
    onContentClick,
    onBlockClick,
    editSlot,
  }: ResourceCenterMessageBlockViewProps) => {
    if (editSlot) {
      return <div className="p-2">{editSlot}</div>;
    }

    const handleContentClick = async (element: any) => {
      onContentClick?.(element);
      onBlockClick?.(block.id);
    };

    return (
      <div className="p-2">
        <ContentEditorSerialize
          contents={block.content}
          onClick={handleContentClick}
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
      return <div className="p-2">{slot}</div>;
    }

    return (
      <div className="p-2">
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
        'order-2 min-h-0 min-w-0 flex-1 overflow-y-auto bg-sdk-background p-2',
        'group-data-[animate-frame=true]:transition-opacity',
        'group-data-[animate-frame=true]:duration-sdk-resource-center',
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
  const { themeSetting, data, userAttributes, onContentClick, onBlockClick, checklistSlot } =
    useResourceCenterContext();

  const rc = themeSetting.resourceCenter;
  const showDividers = rc?.dividerLines !== false;

  return (
    <>
      {data.blocks.map((block, index) => {
        const showDivider = showDividers && index < data.blocks.length - 1;

        return (
          <Fragment key={block.id}>
            {block.type === ResourceCenterBlockType.MESSAGE && (
              <ResourceCenterMessageBlockView
                block={block}
                userAttributes={userAttributes}
                onContentClick={onContentClick}
                onBlockClick={onBlockClick}
                editSlot={messageEditSlots?.[block.id]}
              />
            )}
            {block.type === ResourceCenterBlockType.CHECKLIST && (
              <ResourceCenterChecklistBlockView slot={checklistSlot} />
            )}
            {showDivider && <div className="my-4 bg-sdk-foreground/10 h-px overflow-hidden" />}
          </Fragment>
        );
      })}

      {data.blocks.length === 0 && (
        <div className="py-8 text-center text-sm opacity-40">No blocks added yet</div>
      )}
    </>
  );
});

ResourceCenterBlocks.displayName = 'ResourceCenterBlocks';
