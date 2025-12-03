import { ThemeTypesSetting, ThemeVariation } from '@usertour/types';
import { useQuery } from '@apollo/client';
import { getTheme } from '@usertour-packages/gql';
import { Theme, ThemeDetailSelectorType } from '@usertour/types';
import {
  Dispatch,
  ReactNode,
  SetStateAction,
  createContext,
  useContext,
  useState,
  useEffect,
} from 'react';
import { themeDetailSelectorTypes } from '@/utils/theme';

export interface ThemeDetailProviderProps {
  children: ReactNode;
  themeId: string;
}

export interface ThemeDetailContextValue {
  settings: ThemeTypesSetting | null;
  setSettings: Dispatch<SetStateAction<ThemeTypesSetting | null>>;
  variations: ThemeVariation[];
  setVariations: Dispatch<SetStateAction<ThemeVariation[]>>;
  selectedType: ThemeDetailSelectorType;
  setSelectedType: Dispatch<SetStateAction<ThemeDetailSelectorType>>;
  customStyle: string;
  setCustomStyle: Dispatch<SetStateAction<string>>;
  theme: Theme | undefined;
  refetch: any;
  loading: boolean;
}
export const ThemeDetailContext = createContext<ThemeDetailContextValue | undefined>(undefined);

export function ThemeDetailProvider(props: ThemeDetailProviderProps): JSX.Element {
  const { children, themeId } = props;
  const [settings, setSettings] = useState<ThemeTypesSetting | null>(null);
  const [variations, setVariations] = useState<ThemeVariation[]>([]);
  const [selectedType, setSelectedType] = useState<ThemeDetailSelectorType>(
    themeDetailSelectorTypes[0],
  );
  const { data, refetch, loading } = useQuery(getTheme, {
    variables: { themeId },
  });
  const [customStyle, setCustomStyle] = useState('');

  const theme = data?.getTheme;

  // Initialize variations and settings from theme data
  useEffect(() => {
    if (!theme) {
      // Reset state when theme is undefined
      setVariations([]);
      setSettings(null);
      return;
    }

    // Update variations (reset to empty array if undefined)
    setVariations(theme.variations ?? []);

    // Update settings (should always exist per type definition)
    if (theme.settings) {
      setSettings(theme.settings);
    }
  }, [theme]);

  const value: ThemeDetailContextValue = {
    theme,
    selectedType,
    setSelectedType,
    settings,
    setSettings,
    variations,
    setVariations,
    customStyle,
    setCustomStyle,
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
