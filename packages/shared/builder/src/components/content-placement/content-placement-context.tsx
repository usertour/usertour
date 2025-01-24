import { createContext, useContext } from "react";
import { ElementSelectorPropsData, StepScreenshot } from "@usertour-ui/types";

export interface ContentPlacementContextValue {
  target: ElementSelectorPropsData | undefined;
  onTargetChange: (value: Partial<ElementSelectorPropsData>) => void;
  zIndex: number;
  isWebBuilder?: boolean;
  isShowError?: boolean;
  screenshot?: StepScreenshot;
  onChangeElement?: (element: Element) => void;
  buildUrl?: string;
  token?: string;
  subTitle?: string;
  onScreenChange?: (screenshot: StepScreenshot) => void;
}

export interface ContentPlacementProviderProps
  extends ContentPlacementContextValue {
  children?: React.ReactNode;
}

export const ContentPlacementContext = createContext<
  ContentPlacementContextValue | undefined
>(undefined);

export const ContentPlacementProvider = ({
  children,
  ...props
}: ContentPlacementProviderProps) => {
  return (
    <ContentPlacementContext.Provider value={props}>
      {children}
    </ContentPlacementContext.Provider>
  );
};

export const useContentPlacement = () => {
  const context = useContext(ContentPlacementContext);
  if (!context) {
    throw new Error(
      "useContentPlacement must be used within ContentPlacementProvider"
    );
  }
  return context;
};
