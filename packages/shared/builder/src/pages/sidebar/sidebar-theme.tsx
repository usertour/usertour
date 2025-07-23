'use client';

import { CubeIcon, OpenInNewWindowIcon, QuestionMarkCircledIcon } from '@radix-ui/react-icons';
import { Button } from '@usertour-packages/button';
import { EXTENSION_SELECT, MESSAGE_CRX_OPEN_NEW_TARGET } from '@usertour-packages/constants';
import { useThemeListContext } from '@usertour-packages/contexts';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectPortal,
  SelectTrigger,
  SelectValue,
} from '@usertour-packages/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@usertour-packages/tooltip';
import { Theme } from '@usertour-packages/types';
import { useCallback, useEffect } from 'react';

import { useMutation } from '@apollo/client';
import { updateContentVersion } from '@usertour-packages/gql';
import { getErrorMessage } from '@usertour-packages/utils';
import { useToast } from '@usertour-packages/use-toast';
import { useBuilderContext } from '../../contexts';
import { postProxyMessageToWindow } from '../../utils/post-message';

export const SidebarTheme = () => {
  const { themeList } = useThemeListContext();
  const [updateContentVersionMutation] = useMutation(updateContentVersion);
  const { toast } = useToast();
  const {
    currentVersion,
    setCurrentVersion,
    projectId,
    zIndex,
    webHost,
    isWebBuilder,
    setIsLoading,
    fetchContentAndVersion,
  } = useBuilderContext();

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
    if (isWebBuilder) {
      return window.open(url, '_blank');
    }
    postProxyMessageToWindow({
      kind: MESSAGE_CRX_OPEN_NEW_TARGET,
      url: `${webHost}${url}`,
    });
  }, [currentVersion]);

  return (
    <>
      <div className="flex justify-between items-center space-x-1	">
        <div className="flex flex-row justify-between items-center space-x-1 ">
          <h1 className="text-sm">Theme</h1>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <QuestionMarkCircledIcon />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                This is the flow theme that will be used by default in every step
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
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
