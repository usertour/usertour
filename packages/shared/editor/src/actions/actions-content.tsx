import { CaretSortIcon, CheckIcon, OpenInNewWindowIcon } from '@radix-ui/react-icons';
import * as Popover from '@radix-ui/react-popover';
import { Button } from '@usertour-ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@usertour-ui/command';
import { EDITOR_RICH_ACTION_CONTENT } from '@usertour-ui/constants';
import { ScrollArea } from '@usertour-ui/scroll-area';
import { getContentError } from '@usertour-ui/shared-utils';
import { ContentDataType } from '@usertour-ui/types';
import { cn } from '@usertour-ui/ui-utils';
import {
  Dispatch,
  SetStateAction,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { useActionsGroupContext } from '../contexts/actions-group-context';
import { useContentActionsContext } from '../contexts/content-actions-context';
import {
  ContentActionsError,
  ContentActionsErrorAnchor,
  ContentActionsErrorContent,
} from './actions-error';
import {
  ContentActionsPopover,
  ContentActionsPopoverContent,
  ContentActionsPopoverTrigger,
} from './actions-popper';
import { ContentActionsRemove } from './actions-remove';
import { ActionsConditionRightContent, ContentActionsConditionIcon } from './actions-template';

export interface SelectItemType {
  id: string;
  name: string;
}

export interface ContentActionsContentsProps {
  data?: {
    logic: string;
    type: string;
    contentId: string;
  };
  type: string;
  index: number;
}

interface ContentActionsContentsContextValue {
  selectedPreset: SelectItemType | null;
  setSelectedPreset: Dispatch<SetStateAction<SelectItemType | null>>;
}

const ContentActionsContentsContext = createContext<ContentActionsContentsContextValue | undefined>(
  undefined,
);

function useContentActionsContentsContext(): ContentActionsContentsContextValue {
  const context = useContext(ContentActionsContentsContext);
  if (!context) {
    throw new Error(
      'useContentActionsContentsContext must be used within a ContentActionsContentsContext.',
    );
  }
  return context;
}

const ContentActionsContentsName = () => {
  const [open, setOpen] = useState(false);
  const { selectedPreset, setSelectedPreset } = useContentActionsContentsContext();
  const { contents, zIndex } = useContentActionsContext();
  const handleOnSelected = (item: SelectItemType) => {
    setSelectedPreset(item);
    setOpen(false);
  };

  const handleFilter = useCallback(
    (value: string, search: string) => {
      if (contents && contents.length > 0) {
        const flow = contents.find((flow) => flow.id === value);
        if (flow?.name?.includes(search)) {
          return 1;
        }
      }
      return 0;
    },
    [contents],
  );
  return (
    <div className="flex flex-row">
      <Popover.Popover open={open} onOpenChange={setOpen}>
        <Popover.PopoverTrigger asChild>
          <Button variant="outline" className="flex-1 justify-between ">
            {selectedPreset?.name}
            <CaretSortIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </Popover.PopoverTrigger>
        <Popover.PopoverContent
          className="w-[350px] p-0"
          style={{ zIndex: zIndex + EDITOR_RICH_ACTION_CONTENT + 1 }}
        >
          <Command filter={handleFilter}>
            <CommandInput placeholder="Search flow..." />
            <CommandEmpty>No items found.</CommandEmpty>
            <CommandGroup heading="Flow">
              <ScrollArea className="h-72">
                {contents &&
                  contents.length > 0 &&
                  contents
                    .filter((c) => c.type === ContentDataType.FLOW)
                    .map((item) => (
                      <CommandItem
                        key={item.id}
                        value={item.id}
                        className="cursor-pointer"
                        onSelect={() => {
                          handleOnSelected({
                            id: item.id,
                            name: item.name || '',
                          });
                        }}
                      >
                        {item.name}
                        <CheckIcon
                          className={cn(
                            'ml-auto h-4 w-4',
                            selectedPreset?.id === item.id ? 'opacity-100' : 'opacity-0',
                          )}
                        />
                      </CommandItem>
                    ))}
              </ScrollArea>
            </CommandGroup>
          </Command>
        </Popover.PopoverContent>
      </Popover.Popover>
    </div>
  );
};

export const ContentActionsContents = (props: ContentActionsContentsProps) => {
  const { index, data } = props;
  const { updateConditionData } = useActionsGroupContext();
  const { contents, zIndex } = useContentActionsContext();
  const item =
    contents && contents.length > 0
      ? contents?.find((item) => item.id === data?.contentId)
      : undefined;
  const [selectedPreset, setSelectedPreset] = useState<SelectItemType | null>(
    item ? { id: item?.id, name: item?.name || '' } : null,
  );
  const [openError, setOpenError] = useState(false);
  const [errorInfo, setErrorInfo] = useState('');
  const [open, setOpen] = useState(false);
  const value = {
    selectedPreset,
    setSelectedPreset,
  };

  useEffect(() => {
    if (open) {
      return;
    }
    const updates = {
      contentId: selectedPreset?.id || '',
      type: 'flow',
      logic: 'and',
    };
    const { showError, errorInfo } = getContentError(updates);
    setOpenError(showError);
    setErrorInfo(errorInfo);
    updateConditionData(index, updates);
  }, [selectedPreset, open]);

  return (
    <ContentActionsContentsContext.Provider value={value}>
      <ContentActionsError open={openError}>
        <div className="flex flex-row space-x-3">
          <ContentActionsErrorAnchor>
            <ActionsConditionRightContent>
              <ContentActionsPopover onOpenChange={setOpen} open={open}>
                <ContentActionsPopoverTrigger className="flex flex-row w-fit">
                  <ContentActionsConditionIcon>
                    <OpenInNewWindowIcon width={16} height={16} />
                  </ContentActionsConditionIcon>
                  Start flow: <span className="font-bold">{selectedPreset?.name} </span>
                </ContentActionsPopoverTrigger>
                <ContentActionsPopoverContent
                  style={{ zIndex: zIndex + EDITOR_RICH_ACTION_CONTENT }}
                >
                  <div className=" flex flex-col space-y-2">
                    <div>Flow</div>
                    <ContentActionsContentsName />
                  </div>
                </ContentActionsPopoverContent>
              </ContentActionsPopover>
              <ContentActionsRemove index={index} />
            </ActionsConditionRightContent>
          </ContentActionsErrorAnchor>
          <ContentActionsErrorContent style={{ zIndex: zIndex + EDITOR_RICH_ACTION_CONTENT + 3 }}>
            {errorInfo}
          </ContentActionsErrorContent>
        </div>
      </ContentActionsError>
    </ContentActionsContentsContext.Provider>
  );
};

ContentActionsContents.displayName = 'ContentActionsContents';
