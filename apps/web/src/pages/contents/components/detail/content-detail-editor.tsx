import { useAppContext } from '@/contexts/app-context';
import { useAttributeListContext } from '@/contexts/attribute-list-context';
import { useContentListContext } from '@/contexts/content-list-context';
import { useContentVersionContext } from '@/contexts/content-version-context';
import { defaultSettings } from '@/types/theme-settings';
import { Popper, PopperClose, PopperStaticContent } from '@usertour-ui/sdk';
import {
  ContentEditor,
  ContentEditorSerialize,
  defaultInitialValue,
} from '@usertour-ui/shared-editor';
import { ContentEditorRoot } from '@usertour-ui/shared-editor/src/types/editor';
import { convertSettings, convertToCssVars } from '@usertour-ui/shared-utils';
import { useState } from 'react';

export const ContentDetailEditor = () => {
  const [globalStyle, _] = useState(convertToCssVars(convertSettings(defaultSettings)));

  const { version } = useContentVersionContext();
  const { attributeList } = useAttributeListContext();
  const { contents } = useContentListContext();
  const { project } = useAppContext();
  const defaultValue =
    version?.steps && version.steps?.length > 0
      ? (version.steps[0].data as ContentEditorRoot[])
      : (defaultInitialValue as ContentEditorRoot[]);

  const [value, setValue] = useState<ContentEditorRoot[]>(defaultValue);

  const userInfo = {
    id: 'clyzu0fd7000stekk50l8f82m',
    createdAt: '2024-07-24T12:39:29.996Z',
    externalId: 'cccc',
    environmentId: 'clyxtotnt0004w8fgpjnn0eyt',
    data: {
      male: true,
      sdsdd: 13,
      registerAt: '2024-03-29T16:05:45.000Z',
      userNamedddd: 'test-user',
    },
  };

  return (
    <>
      <div id="usertour-widget" className="flex flex-row space-x-4">
        <Popper triggerRef={undefined} open={true} zIndex={1} globalStyle={globalStyle}>
          <PopperStaticContent
            arrowSize={{
              width: 20,
              height: 10,
            }}
            side="bottom"
            showArrow={false}
            width={'400px'}
            height={'auto'}
            // arrowColor={settings?.mainColor.background}
          >
            {<PopperClose />}
            {/* <PopperEditorMini
              zIndex={10}
              // className="w-32"
              attributes={attributeList}
              initialValue={[]}
            /> */}
            {version?.steps && project?.id && (
              <ContentEditor
                zIndex={10}
                projectId={project?.id}
                attributes={attributeList}
                currentVersion={version}
                contentList={contents}
                // customUploadRequest={handleCustomUploadRequest}
                initialValue={defaultValue}
                onValueChange={setValue}
              />
            )}
          </PopperStaticContent>
        </Popper>
        <Popper triggerRef={undefined} open={true} zIndex={1} globalStyle={globalStyle}>
          <PopperStaticContent
            arrowSize={{
              width: 20,
              height: 10,
            }}
            side="bottom"
            showArrow={false}
            width={'400px'}
            height={'auto'}
            // arrowColor={settings?.mainColor.background}
          >
            {<PopperClose />}
            <ContentEditorSerialize contents={value} userInfo={userInfo as any} />
          </PopperStaticContent>
        </Popper>
      </div>
    </>
  );
};

ContentDetailEditor.displayName = 'ContentDetailEditor';
