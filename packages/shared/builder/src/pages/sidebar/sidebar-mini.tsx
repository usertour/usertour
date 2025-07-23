import {
  DoubleArrowLeftIcon,
  DoubleArrowRightIcon,
  SlideLeftIcon,
  SlideRightIcon,
} from '@usertour-packages/icons';
import { cn } from '@usertour-packages/utils';
import anime from 'animejs/lib/anime.es.js';
import { useEffect, useState } from 'react';

import { useBuilderContext } from '../../contexts';

interface SideBarMiniProps {
  // container: React.MutableRefObject<HTMLDivElement>;
  container: React.RefObject<HTMLDivElement>;
  containerWidth?: number;
}

export const SidebarMini = (props: SideBarMiniProps) => {
  const { position, setPosition } = useBuilderContext();
  const { container, containerWidth = 312 } = props;
  const [isMini, setIsMini] = useState(false);
  const handleHideSideBar = () => {
    setIsMini(!isMini);
  };
  const getTranslateX = (isMini: boolean) => {
    if (position === 'left') {
      return isMini ? `-${containerWidth}px` : '0px';
    }
    return isMini ? `${containerWidth}px` : '0px';
  };
  useEffect(() => {
    const translateX = getTranslateX(isMini);
    anime({
      targets: container.current,
      translateX,
      duration: 500,
      easing: 'easeInCubic',
    });
  }, [isMini]);

  useEffect(() => {
    if (container.current) {
      const translateX = getTranslateX(isMini);
      container.current.style.transform = `translateX(${translateX})`;
    }
  }, [position]);

  return (
    <>
      <div
        className={cn(
          'absolute w-8 h-16 bg-background-700 flex flex-col justify-around	 text-center items-center	top-6 ',
          position === 'right' ? '-left-6 rounded-l-lg' : '-right-6 rounded-r-lg ',
        )}
      >
        {position === 'right' && (
          <SlideLeftIcon
            width={20}
            height={20}
            className="cursor-pointer"
            onClick={() => {
              setPosition('left');
            }}
          />
        )}
        {position === 'left' && (
          <SlideRightIcon
            width={20}
            height={20}
            className="cursor-pointer"
            onClick={() => {
              setPosition('right');
            }}
          />
        )}
        {position === 'left' && isMini && (
          <DoubleArrowRightIcon
            width={20}
            height={20}
            className="cursor-pointer"
            onClick={handleHideSideBar}
          />
        )}
        {position === 'left' && !isMini && (
          <DoubleArrowLeftIcon
            width={20}
            className="cursor-pointer"
            height={20}
            onClick={handleHideSideBar}
          />
        )}
        {position === 'right' && isMini && (
          <DoubleArrowLeftIcon
            width={20}
            className="cursor-pointer"
            height={20}
            onClick={handleHideSideBar}
          />
        )}
        {position === 'right' && !isMini && (
          <DoubleArrowRightIcon
            width={20}
            height={20}
            className="cursor-pointer"
            onClick={handleHideSideBar}
          />
        )}
      </div>
    </>
  );
};
SidebarMini.displayName = 'SidebarMini';
