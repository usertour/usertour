import { Popper, PopperClose, PopperStaticContent } from "@usertour-ui/sdk";
import { convertSettings, convertToCssVars } from "@usertour-ui/shared-utils";
import { useEffect, useState } from "react";
import {
  ContentEditor,
  ContentEditorSerialize,
  defaultInitialValue,
} from "@usertour-ui/shared-editor";
import { defaultSettings } from "@/types/theme-settings";
import { ContentEditorRoot } from "@usertour-ui/shared-editor/src/types/editor";
import { useContentVersionContext } from "@/contexts/content-version-context";
import { useAttributeListContext } from "@/contexts/attribute-list-context";
import { useContentListContext } from "@/contexts/content-list-context";

export const ContentDetailEditor = () => {
  const [globalStyle, setGlobalStyle] = useState(
    convertToCssVars(convertSettings(defaultSettings))
  );

  const { version } = useContentVersionContext();
  const { attributeList } = useAttributeListContext();
  const { contents } = useContentListContext();
  const defaultValue =
    version && version.steps && version.steps?.length > 0
      ? (version.steps[0].data as ContentEditorRoot[])
      : (defaultInitialValue as ContentEditorRoot[]);

  const [value, setValue] = useState<ContentEditorRoot[]>(defaultValue);

  const userInfo = {
    id: "clyzu0fd7000stekk50l8f82m",
    createdAt: "2024-07-24T12:39:29.996Z",
    externalId: "cccc",
    environmentId: "clyxtotnt0004w8fgpjnn0eyt",
    data: {
      male: true,
      sdsdd: 13,
      registerAt: "2024-03-29T16:05:45.000Z",
      userNamedddd: "liuzhaodong-test",
    },
  };

  return (
    <>
      <div id="usertour-widget" className="flex flex-row space-x-4">
        <Popper
          triggerRef={undefined}
          open={true}
          zIndex={1}
          globalStyle={globalStyle}
        >
          <PopperStaticContent
            arrowSize={{
              width: 20,
              height: 10,
            }}
            side="bottom"
            showArrow={false}
            width={"400px"}
            height={"auto"}
            // arrowColor={settings?.mainColor.background}
          >
            {<PopperClose />}
            {/* <PopperEditorMini
              zIndex={10}
              // className="w-32"
              attributes={attributeList}
              initialValue={[]}
            /> */}
            {version && (
              <ContentEditor
                zIndex={10}
                attributes={attributeList}
                currentVersion={version}
                contentList={contents}
                // customUploadRequest={handleCustomUploadRequest}
                initialValue={defaultValue}
                onValueChange={setValue}
              ></ContentEditor>
            )}
          </PopperStaticContent>
        </Popper>
        <Popper
          triggerRef={undefined}
          open={true}
          zIndex={1}
          globalStyle={globalStyle}
        >
          <PopperStaticContent
            arrowSize={{
              width: 20,
              height: 10,
            }}
            side="bottom"
            showArrow={false}
            width={"400px"}
            height={"auto"}
            // arrowColor={settings?.mainColor.background}
          >
            {<PopperClose />}
            <ContentEditorSerialize
              contents={value}
              userInfo={userInfo as any}
            ></ContentEditorSerialize>
          </PopperStaticContent>
        </Popper>
      </div>
    </>
  );
};

ContentDetailEditor.displayName = "ContentDetailEditor";
