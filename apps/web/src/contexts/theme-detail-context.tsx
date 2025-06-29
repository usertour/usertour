import {
  ThemeDetailSelectorType,
  themeDetailSelectorTypes,
} from '@/pages/settings/themes/components/preview/theme-preview-selector';
import { ThemeTypesSetting } from '@/types/theme-settings';
import { useQuery } from '@apollo/client';
import { getTheme } from '@usertour-ui/gql';
import { Theme } from '@usertour-ui/types';
import { Dispatch, ReactNode, SetStateAction, createContext, useContext, useState } from 'react';

export interface ThemeDetailProviderProps {
  children: ReactNode;
  themeId: string;
}

export interface ThemeDetailContextValue {
  settings: ThemeTypesSetting | null;
  setSettings: Dispatch<SetStateAction<ThemeTypesSetting | null>>;
  selectedType: ThemeDetailSelectorType;
  setSelectedType: Dispatch<SetStateAction<ThemeDetailSelectorType>>;
  customStyle: string;
  setCustomStyle: Dispatch<SetStateAction<string>>;
  viewRect: Rect;
  setViewRect: Dispatch<SetStateAction<Rect>>;
  theme: Theme;
  refetch: any;
  loading: boolean;
}
export const ThemeDetailContext = createContext<ThemeDetailContextValue | undefined>(undefined);

type Rect = {
  width: number;
  height: number;
  x: number;
  y: number;
};

const defaultRect: Rect = {
  width: 0,
  height: 0,
  x: 0,
  y: 0,
};

export function ThemeDetailProvider(props: ThemeDetailProviderProps): JSX.Element {
  const { children, themeId } = props;
  const [settings, setSettings] = useState<ThemeTypesSetting | null>(null);
  const [selectedType, setSelectedType] = useState<ThemeDetailSelectorType>(
    themeDetailSelectorTypes[0],
  );
  const { data, refetch, loading } = useQuery(getTheme, {
    variables: { themeId },
  });
  const [customStyle, setCustomStyle] = useState('');
  const [viewRect, setViewRect] = useState<Rect>(defaultRect);

  const theme = data?.getTheme;
  const value: ThemeDetailContextValue = {
    theme,
    selectedType,
    setSelectedType,
    settings,
    setSettings,
    customStyle,
    setCustomStyle,
    viewRect,
    setViewRect,
    refetch,
    loading,
  };

  return <ThemeDetailContext.Provider value={value}>{children}</ThemeDetailContext.Provider>;
}

export function useThemeDetailContext(): ThemeDetailContextValue {
  const context = useContext(ThemeDetailContext);
  if (!context) {
    throw new Error('useThemeDetailContext must be used within a ThemeDetailProvider.');
  }
  return context;
}
