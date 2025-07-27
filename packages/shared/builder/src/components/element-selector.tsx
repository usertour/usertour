'use client';

import {
  Cross1Icon,
  Crosshair2Icon,
  CubeIcon,
  GlobeIcon,
  PinBottomIcon,
  PinTopIcon,
} from '@radix-ui/react-icons';
import { cn } from '@usertour/helpers';
import { useEffect, useRef, useState } from 'react';

interface ElementSelectorProps {
  onCancel: () => void;
  onPositionChange?: (isBottom: boolean) => void;
  isBottom?: boolean;
  enabledSelector?: boolean;
  setEnabledSelector?: (enabled: boolean) => void;
}

export const ElementSelector = ({
  onCancel,
  onPositionChange,
  enabledSelector = false,
  setEnabledSelector,
  isBottom = true,
}: ElementSelectorProps) => {
  const selectRef = useRef(null);
  const navigateRef = useRef(null);
  const [selectClass, setSelectClass] = useState('bg-primary');
  const [navigateClass, setNavigateClass] = useState('bg-background-700');
  const [isPinBottom, setIsPinBottom] = useState<boolean>(isBottom);

  const handleElementSelect = () => {
    if (setEnabledSelector) {
      setEnabledSelector(true);
    }
  };
  const handleNavigatePage = () => {
    if (setEnabledSelector) {
      setEnabledSelector(false);
    }
  };
  const handleCancelAction = () => {
    if (setEnabledSelector) {
      setEnabledSelector(false);
    }
    onCancel();
  };

  useEffect(() => {
    if (enabledSelector) {
      setSelectClass('bg-primary');
      setNavigateClass('bg-background-700');
    } else {
      setSelectClass('bg-background-700');
      setNavigateClass('bg-primary');
    }
  }, [enabledSelector]);

  const handlePositonChange = (isBottom: boolean) => {
    if (onPositionChange) {
      onPositionChange(isBottom);
    }
    setIsPinBottom(isBottom);
  };

  return (
    <div className="w-full h-[52px] flex text-slate-50 ">
      <div className="bg-gradient-to-r from-slate-700 to-slate-800 flex rounded-l-2xl flex-none items-center space-x-2 px-4 ">
        <CubeIcon className="text-slate-50 opacity-70" width={16} height={16} />{' '}
        {isPinBottom && (
          <PinTopIcon
            className="text-slate-50 cursor-pointer"
            width={16}
            height={16}
            onClick={() => {
              handlePositonChange(false);
            }}
          />
        )}
        {!isPinBottom && (
          <PinBottomIcon
            className="text-slate-50 cursor-pointer"
            onClick={() => {
              handlePositonChange(true);
            }}
            width={16}
            height={16}
          />
        )}
      </div>
      <div className="bg-gradient-to-r from-slate-700 to-slate-800  rounded-r-2xl grow flex">
        <div className="px-4 items-center grow leading-[52px]">
          Navigate to the page the element appears on
        </div>
        <div className="flex-none flex py-2">
          <div
            className={cn(
              'rounded-l-xl flex items-center space-x-2 px-4 cursor-pointer ',
              navigateClass,
            )}
            ref={navigateRef}
            onClick={handleNavigatePage}
          >
            <GlobeIcon className="text-slate-50" width={16} height={16} />
            <span>Navigate to another page</span>
          </div>
          <div
            className={cn(
              'rounded-r-xl flex items-center space-x-2 px-4 cursor-pointer ',
              selectClass,
            )}
            ref={selectRef}
            onClick={handleElementSelect}
          >
            <Crosshair2Icon className="text-slate-50" width={16} height={16} />
            <span>Select element here</span>
          </div>
        </div>
        <div className="flex-none py-2 ml-4 mr-2 inline-flex items-center">
          <div
            className="rounded-xl p-2 h-fit bg-background-700 cursor-pointer"
            onClick={handleCancelAction}
          >
            <Cross1Icon className="text-slate-50" width={16} height={16} />
          </div>
        </div>
      </div>
    </div>
  );
};

ElementSelector.displayName = 'ElementSelector';
