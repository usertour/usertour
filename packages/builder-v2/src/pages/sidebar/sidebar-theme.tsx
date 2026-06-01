'use client';

import { CubeIcon, OpenInNewWindowIcon } from '@radix-ui/react-icons';
import {
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectPortal,
  SelectTrigger,
  SelectValue,
  QuestionTooltip,
  useToast,
} from '@usertour/ui';
import { EXTENSION_SELECT } from '@usertour/constants';
import { useThemeList } from '../../hooks/use-theme-list';
import { Theme } from '@usertour/types';
import { useCallback, useEffect } from 'react';

import { useMutation } from '@apollo/client';
import { updateContentVersion } from '@usertour/gql';
import { getErrorMessage } from '@usertour/helpers';
import { useBuilderConfig, useBuilderMethods, useBuilderStore, useProjectId } from '../../contexts';

export const SidebarTheme = () => {
  const { themeList } = useThemeList();
  const [updateContentVersionMutation] = useMutation(updateContentVersion);
  const { toast } = useToast();
  const { zIndex } = useBuilderConfig();
  const { fetchContentAndVersion } = useBuilderMethods();
  const currentVersion = useBuilderStore((state) => state.currentVersion);
  const setCurrentVersion = useBuilderStore((state) => state.setCurrentVersion);
  const projectId = useProjectId();
  const setIsLoading = useBuilderStore((state) => state.setIsLoading);

  useEffect(() => {
    if (currentVersion && !currentVersion.themeId && themeList) {
      const defaultThemeId = themeList.find((item) => item.isDefault === true);
      if (defaultThemeId) {
        setCurrentVersion((pre) => (pre ? { ...pre, themeId: defaultThemeId.id } : pre));
      }
    }
  }, [currentVersion, themeList]);

  const handleThemeChange = async (value: string) => {
    try {
      const ret = await updateContentVersionMutation({
        variables: {
          versionId: currentVersion?.id,
          content: { themeId: value },
        },
      });
      setIsLoading(true);
      if (ret.data.updateContentVersion && currentVersion?.contentId) {
        await fetchContentAndVersion(currentVersion?.contentId, currentVersion?.id);
      } else {
        return toast({
          variant: 'destructive',
          title: 'Failed to save theme!',
        });
      }
      setIsLoading(false);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: getErrorMessage(error),
      });
      setIsLoading(false);
    }
  };

  const handleEditTheme = useCallback(() => {
    if (!currentVersion) {
      return;
    }
    const url = `/project/${projectId}/settings/theme/${currentVersion.themeId}`;
    window.open(url, '_blank');
  }, [currentVersion]);

  return (
    <>
      <div className="flex justify-between items-center space-x-1	">
        <div className="flex flex-row justify-between items-center space-x-1 ">
          <h1 className="text-sm">Theme</h1>
          <QuestionTooltip>
            This is the flow theme that will be used by default in every step
          </QuestionTooltip>
        </div>

        <Button variant="link" onClick={handleEditTheme} className="p-0 h-full	text-sm	">
          Edit this theme
          <OpenInNewWindowIcon className="ml-1" />
        </Button>
      </div>
      {currentVersion && (
        <Select
          defaultValue={currentVersion.themeId}
          onValueChange={handleThemeChange}
          value={currentVersion.themeId}
        >
          <SelectTrigger className="justify-start flex h-8 text-xs	">
            <CubeIcon className="flex-none mr-2" />
            <div className="grow text-left">
              <SelectValue placeholder="Select" />
            </div>
          </SelectTrigger>

          <SelectPortal style={{ zIndex: zIndex + EXTENSION_SELECT }}>
            <SelectContent>
              {themeList?.map((theme: Theme) => (
                <SelectItem value={theme.id} key={theme.id} className="text-xs">
                  {theme.name}
                </SelectItem>
              ))}
            </SelectContent>
          </SelectPortal>
        </Select>
      )}
    </>
  );
};
SidebarTheme.displayName = 'SidebarTheme';
