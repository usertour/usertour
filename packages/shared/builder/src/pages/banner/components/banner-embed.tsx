import { useThemeListContext } from "@usertour-ui/contexts";
import { convertSettings, convertToCssVars } from "@usertour-ui/shared-utils";
import { Theme, ThemeTypesSetting } from "@usertour-ui/types";
import { forwardRef, useEffect, useRef, useState } from "react";
import {
  ContentEditor,
  ContentEditorRoot,
  createValue1,
} from "@usertour-ui/shared-editor";
import { useAws } from "../../../hooks/use-aws";
import { useLazyQuery } from "@apollo/client";
import { queryOembedInfo } from "@usertour-ui/gql";
import { EXTENSION_CONTENT_POPPER } from "@usertour-ui/constants";
export interface BannerEmbedProps {}

export const BannerEmbed = forwardRef<HTMLDivElement, BannerEmbedProps>(
  (props: BannerEmbedProps, ref) => {
    const [globalStyle, setGlobalStyle] = useState<string>("");
    const [themeSetting, setThemeSetting] = useState<ThemeTypesSetting>();
    const containerRef = useRef<HTMLDivElement | null>(null);

    const [theme, setTheme] = useState<Theme | undefined>();
    const { themeList } = useThemeListContext();
    const { upload } = useAws();
    const [queryOembed] = useLazyQuery(queryOembedInfo);
    const handleCustomUploadRequest = (file: File): Promise<string> => {
      return upload(file);
    };

    useEffect(() => {
      if (!themeList) {
        return;
      }
      if (themeList.length > 0) {
        let theme: Theme | undefined;
        theme = themeList.find((item) => item.isDefault);
        if (theme) {
          setTheme(theme);
        }
      }
    }, [themeList]);

    useEffect(() => {
      if (theme) {
        setThemeSetting(theme.settings);
      }
    }, [theme]);

    useEffect(() => {
      if (themeSetting) {
        setGlobalStyle(convertToCssVars(convertSettings(themeSetting)));
      }
    }, [themeSetting]);

    useEffect(() => {
      if (containerRef.current && globalStyle) {
        containerRef.current.style.cssText = globalStyle;
      }
    }, [containerRef.current, globalStyle]);

    return (
      <>
        <div id="usertour-widget" ref={containerRef}>
          <div className="usertour-banner usertour-banner--animate-true usertour-banner--embed-mode-BODY_FIRST usertour-banner--sticky-false usertour-banner--overlay-false">
            <div
              className="w-full"
              style={{
                background: "var(--usertour-banner-background-color)",
                color: "var(--usertour-banner-foreground-color)",
              }}
            >
              <ContentEditor
                zIndex={11111 + EXTENSION_CONTENT_POPPER}
                customUploadRequest={handleCustomUploadRequest}
                initialValue={createValue1 as ContentEditorRoot[]}
                onValueChange={() => {}}
              ></ContentEditor>
            </div>
          </div>
        </div>
      </>
    );
  }
);

BannerEmbed.displayName = "BannerEmbed";
