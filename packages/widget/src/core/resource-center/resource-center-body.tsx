import { Fragment, memo } from 'react';
import type {
  ResourceCenterActionBlock,
  ResourceCenterDividerBlock,
  ResourceCenterMessageBlock,
  UserTourTypes,
} from '@usertour/types';
import { LauncherIconSource, ResourceCenterBlockType } from '@usertour/types';
import { cn } from '@usertour-packages/tailwind';
import { ContentEditorSerialize } from '../../serialize/content-editor-serialize';
import { useResourceCenterContext } from './context';
import { IconsList } from '../launcher';

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

    return <></>;
  },
);

ResourceCenterChecklistBlockView.displayName = 'ResourceCenterChecklistBlockView';

// ============================================================================
// Block — DIVIDER
// ============================================================================

interface ResourceCenterDividerBlockViewProps {
  block: ResourceCenterDividerBlock;
}

export const ResourceCenterDividerBlockView = memo(
  ({ block }: ResourceCenterDividerBlockViewProps) => {
    return (
      <div data-block-id={block.id} className="my-4 h-px overflow-hidden bg-sdk-foreground/10" />
    );
  },
);

ResourceCenterDividerBlockView.displayName = 'ResourceCenterDividerBlockView';

// ============================================================================
// Block — ACTION
// ============================================================================

interface ResourceCenterActionBlockViewProps {
  block: ResourceCenterActionBlock;
  onActionBlockClick?: (blockId: string) => Promise<void>;
}

export const ResourceCenterActionBlockView = memo(
  ({ block, onActionBlockClick }: ResourceCenterActionBlockViewProps) => {
    const handleClick = async () => {
      onActionBlockClick?.(block.id);
    };

    const renderIcon = () => {
      if (block.iconSource === LauncherIconSource.NONE) {
        return null;
      }
      if (
        (block.iconSource === LauncherIconSource.UPLOAD ||
          block.iconSource === LauncherIconSource.URL) &&
        block.iconUrl
      ) {
        return <img src={block.iconUrl} alt="" className="h-5 w-5 flex-shrink-0 object-contain" />;
      }
      if (block.iconSource === LauncherIconSource.BUILTIN && block.iconType) {
        const iconItem = IconsList.find((item) => item.name === block.iconType);
        if (iconItem) {
          const Icon = iconItem.ICON;
          return <Icon size={20} className="flex-shrink-0 text-sdk-foreground" />;
        }
      }
      return null;
    };

    return (
      <button
        type="button"
        data-block-id={block.id}
        className="flex w-full items-center gap-3 rounded-md p-2 text-left text-sm transition-colors hover:bg-sdk-hover cursor-pointer"
        onClick={handleClick}
      >
        {renderIcon()}
        <span className="min-w-0 flex-1 truncate text-sdk-foreground">
          {block.name || 'Untitled action'}
        </span>
      </button>
    );
  },
);

ResourceCenterActionBlockView.displayName = 'ResourceCenterActionBlockView';

// ============================================================================
// Body
// ============================================================================

export const ResourceCenterBody = memo(({ children }: { children: React.ReactNode }) => {
  const { themeSetting } = useResourceCenterContext();
  const rc = themeSetting.resourceCenter;

  return (
    <div
      className={cn(
        'order-2 min-h-0 min-w-0 flex-1 overflow-y-auto bg-sdk-background p-4',
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
  const { data, userAttributes, onContentClick, onBlockClick, checklistSlot } =
    useResourceCenterContext();

  return (
    <>
      {data.blocks.map((block) => {
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
            {block.type === ResourceCenterBlockType.DIVIDER && (
              <ResourceCenterDividerBlockView block={block} />
            )}
            {block.type === ResourceCenterBlockType.ACTION && (
              <ResourceCenterActionBlockView block={block} onActionBlockClick={onBlockClick} />
            )}
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
