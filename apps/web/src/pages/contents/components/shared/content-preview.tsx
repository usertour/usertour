import * as SharedPopper from "@usertour-ui/sdk";
import { convertSettings, convertToCssVars } from "@usertour-ui/shared-utils";
import {
  ChecklistData,
  ContentVersion,
  LauncherData,
  Step,
  Theme,
} from "@usertour-ui/types";
import { useMeasure } from "react-use";
import { LauncherContainer, LauncherView } from "@usertour-ui/sdk/src/launcher";
import { LauncherRoot } from "@usertour-ui/sdk/src/launcher";
import { ChecklistContainer, ChecklistDropdown } from "@usertour-ui/sdk";
import { ChecklistProgress } from "@usertour-ui/sdk";
import { ChecklistItems } from "@usertour-ui/sdk";
import { ChecklistDismiss } from "@usertour-ui/sdk";
import { PopperMadeWith } from "@usertour-ui/sdk";
import { ChecklistStaticPopper } from "@usertour-ui/sdk";
import { ChecklistRoot } from "@usertour-ui/sdk";
import { useEffect, useState, forwardRef, useRef } from "react";
import { ContentEditorSerialize } from "@usertour-ui/shared-editor";
import { cn } from "@usertour-ui/ui-utils";

const EmptyContentPreview = () => {
  return <img src="/images/empty.png" className="h-[160px]" />;
};

interface ScaledPreviewContainerProps {
  children: React.ReactNode;
  maxWidth?: number;
  maxHeight?: number;
  className?: string;
  onContentRectChange?: (contentRect: DOMRect, scale: number) => void;
}

const ScaledPreviewContainer = forwardRef<
  HTMLDivElement,
  ScaledPreviewContainerProps
>(
  (
    {
      children,
      maxWidth = 300,
      maxHeight = 160,
      className = "origin-[center_center]",
      onContentRectChange,
    },
    ref
  ) => {
    const [scale, setScale] = useState<number>(1);
    const [contentRef, contentRect] = useMeasure<HTMLDivElement>();

    // Calculate scale when content dimensions change
    useEffect(() => {
      if (!contentRect) return;

      const widthScale = maxWidth / contentRect.width;
      const heightScale = maxHeight / contentRect.height;
      const newScale = Math.min(widthScale, heightScale, 1);

      setScale(newScale);
    }, [contentRect]);

    useEffect(() => {
      if (onContentRectChange) {
        onContentRectChange(contentRect as DOMRect, scale);
      }
    }, [contentRect, scale]);

    return (
      <div
        ref={ref}
        style={{
          scale: `${scale}`,
        }}
        className={cn("[&_iframe]:pointer-events-none", className)}
      >
        <div ref={contentRef as any}>{children}</div>
      </div>
    );
  }
);

// Add display name for better debugging
ScaledPreviewContainer.displayName = "ScaledPreviewContainer";

interface FlowPreviewProps {
  currentTheme: Theme;
  currentStep: Step;
}
const FlowPreview = ({ currentTheme, currentStep }: FlowPreviewProps) => {
  return (
    <SharedPopper.Popper
      open={true}
      zIndex={1}
      globalStyle={convertToCssVars(convertSettings(currentTheme.settings))}
    >
      <SharedPopper.PopperStaticContent
        arrowSize={{ width: 20, height: 10 }}
        side="bottom"
        showArrow={false}
        width={currentStep.setting.width + "px"}
        height={"auto"}
      >
        {currentStep.setting.skippable && <SharedPopper.PopperClose />}
        <ContentEditorSerialize contents={currentStep.data} />
      </SharedPopper.PopperStaticContent>
    </SharedPopper.Popper>
  );
};

const LauncherPreview = ({
  currentTheme,
  currentVersion,
}: {
  currentTheme: Theme;
  currentVersion: ContentVersion;
}) => {
  const data = currentVersion.data as LauncherData;

  return (
    <LauncherRoot theme={currentTheme} data={data}>
      <LauncherContainer>
        <LauncherView
          type={data.type}
          iconType={data.iconType}
          style={{
            zIndex: 1,
          }}
        />
      </LauncherContainer>
    </LauncherRoot>
  );
};

const ChecklistPreview = (props: {
  currentTheme: Theme;
  currentVersion: ContentVersion;
}) => {
  const { currentTheme, currentVersion } = props;
  const data = currentVersion.data as ChecklistData;

  return (
    <ChecklistRoot data={data} theme={currentTheme}>
      <ChecklistContainer>
        <ChecklistStaticPopper zIndex={1111}>
          <ChecklistDropdown />
          <ChecklistProgress width={45} />
          <ChecklistItems />
          <ChecklistDismiss />
          <PopperMadeWith />
        </ChecklistStaticPopper>
      </ChecklistContainer>
    </ChecklistRoot>
  );
};

export {
  FlowPreview,
  LauncherPreview,
  ChecklistPreview,
  EmptyContentPreview,
  ScaledPreviewContainer,
};
