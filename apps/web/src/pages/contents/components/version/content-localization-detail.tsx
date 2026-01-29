import {
  ContentLocalizationListProvider,
  useContentLocalizationListContext,
} from '@/contexts/content-localization-list-context';
import { useContentVersionContext } from '@/contexts/content-version-context';
import { useLocalizationListContext } from '@/contexts/localization-list-context';
import { ArrowLeftIcon, ArrowRightIcon, KeyboardIcon, ResetIcon } from '@radix-ui/react-icons';
import { Badge } from '@usertour-packages/badge';
import { useAws } from '@usertour-packages/builder/src/hooks/use-aws';
import { Button } from '@usertour-packages/button';
import { ImageEditIcon, SpinnerIcon } from '@usertour-packages/icons';
import { Input } from '@usertour-packages/input';
import { Popover, PopoverContent, PopoverTrigger } from '@usertour-packages/popover';
import { Separator } from '@usertour-packages/separator';
import type {
  ContentEditorButtonElement,
  ContentEditorEmebedElement,
  ContentEditorImageElement,
  ContentEditorRoot,
  ContentEditorRootElement,
  ContentEditorTextElement,
  CustomElement,
} from '@usertour-packages/shared-editor';
import { ContentEditorElementType } from '@usertour-packages/shared-editor';
import type { ContentVersion, Localization, Step } from '@usertour/types';
import { cn } from '@usertour-packages/tailwind';
import Upload from 'rc-upload';
import { UploadRequestOption } from 'rc-upload/lib/interface';
import { ChangeEvent, ReactNode, useState } from 'react';
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

interface ContentLocalizationTemplateProps {
  children: ReactNode;
  name: string;
}

const ContentLocalizationTemplateContainer = (props: ContentLocalizationTemplateProps) => {
  const { children, name } = props;
  return (
    <>
      <Separator />
      <div className="flex flex-row">
        <div className="w-40 flex-none">{name}</div>
        <div className="flex flex-col space-y-1 grow ">{children}</div>
      </div>
    </>
  );
};
const ContentLocalizationTemplateB1 = (props: ContentLocalizationTemplateProps) => {
  const { children, name } = props;
  return (
    <>
      <div className="flex flex-row bg-secondary p-2 rounded-sm">
        <div className="w-40 flex-none">{name}</div>
        {children}
      </div>
    </>
  );
};
const ContentLocalizationTemplateB2 = (props: ContentLocalizationTemplateProps) => {
  const { children, name } = props;
  return (
    <>
      <div className="flex flex-row pl-2">
        <div className="w-40 flex-none">{name}</div>
        {children}
      </div>
    </>
  );
};

export interface LocalizationButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  className?: string;
}
const LocalizationButton = React.forwardRef<HTMLButtonElement, LocalizationButtonProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <Button
        className={cn(
          'flex-none flex flex-row text-primary h-auto w-auto p-1 hover:text-primary ',
          className,
        )}
        ref={ref}
        variant="ghost"
        {...props}
      >
        {children}
      </Button>
    );
  },
);

interface ContentLocalizationImageProps {
  defaultLocate: Localization;
  currentLocalization: Localization;
  element: ContentEditorImageElement;
  onChange: (element: ContentEditorImageElement) => void;
}

const ContentLocalizationImage = (props: ContentLocalizationImageProps) => {
  const { defaultLocate, currentLocalization, element, onChange } = props;
  const { upload } = useAws();
  const [imageUrl, setImageUrl] = useState<string>('');
  const [remoteImageUrl, setRemoteImageUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const handleCustomUploadRequest = async (option: UploadRequestOption) => {
    setIsLoading(true);
    const url = await upload(option.file as File);
    handleImageUrlChange(url);
    setIsLoading(false);
  };

  const handleImageUrlChange = (url: string) => {
    setImageUrl(url);
    onChange({ ...element, url });
  };
  return (
    <Popover>
      <ContentLocalizationTemplateContainer name={'Image'}>
        <ContentLocalizationTemplateB1 name={defaultLocate?.name}>
          <img src={element.url} className="max-w-64 max-h-64	" />
        </ContentLocalizationTemplateB1>
        <ContentLocalizationTemplateB2 name={currentLocalization?.name}>
          <div className="flex flex-col">
            {!isLoading && <img src={imageUrl} className="max-w-64 max-h-64	" />}
            {isLoading && (
              <div className="flex items-center w-40	h-40 justify-center">
                <SpinnerIcon className="mr-2 h-10 w-10 animate-spin" />
              </div>
            )}
            <div className="flex flex-row space-x-1">
              <Upload
                accept="image/*"
                customRequest={(option) => {
                  handleCustomUploadRequest(option as UploadRequestOption);
                }}
              >
                <LocalizationButton>
                  <ImageEditIcon className="mx-1 fill-primary" />
                  Upload image
                </LocalizationButton>
              </Upload>
              <PopoverTrigger asChild>
                <LocalizationButton>
                  <KeyboardIcon className="mx-1 fill-primary" />
                  Enter url
                </LocalizationButton>
              </PopoverTrigger>
              <PopoverContent
                className="bg-background w-[400px]"
                side="top"
                align="center"
                sideOffset={5}
              >
                <div className="flex flex-row space-x-2">
                  <Input
                    placeholder="Enter url"
                    value={remoteImageUrl}
                    onChange={(e) => {
                      setRemoteImageUrl(e.target.value);
                    }}
                    className="bg-background w-80 "
                  />
                  <Button
                    className="flex-none  h-9 py-1"
                    variant="ghost"
                    size="default"
                    onClick={() => {
                      handleImageUrlChange(remoteImageUrl);
                    }}
                  >
                    <ArrowRightIcon className="mr-1 " />
                    Load
                  </Button>
                </div>
              </PopoverContent>
              <LocalizationButton
                onClick={() => {
                  handleImageUrlChange(element.url);
                }}
              >
                <ResetIcon className="mx-1 fill-primary" />
                Use original
              </LocalizationButton>
            </div>
          </div>
          {/* <Input value={element.url} onChange={() => {}} /> */}
        </ContentLocalizationTemplateB2>
      </ContentLocalizationTemplateContainer>
    </Popover>
  );
};

interface ContentLocalizationEmbedProps {
  defaultLocate: Localization;
  currentLocalization: Localization;
  element: ContentEditorEmebedElement;
  onChange: (element: ContentEditorEmebedElement) => void;
}
const ContentLocalizationEmbed = (props: ContentLocalizationEmbedProps) => {
  const { defaultLocate, currentLocalization, element, onChange } = props;
  const [embedUrl, setEmbedUrl] = useState<string>('');

  const handleEmbedUrlChange = (url: string) => {
    setEmbedUrl(url);
    onChange({ ...element, url });
  };
  return (
    <ContentLocalizationTemplateContainer name={'Video'}>
      <ContentLocalizationTemplateB1 name={defaultLocate?.name}>
        <div>{element.url}</div>
      </ContentLocalizationTemplateB1>
      <ContentLocalizationTemplateB2 name={currentLocalization?.name}>
        <Input
          value={embedUrl}
          onChange={(e) => {
            handleEmbedUrlChange(e.target.value);
          }}
        />
      </ContentLocalizationTemplateB2>
    </ContentLocalizationTemplateContainer>
  );
};

interface ContentLocalizationButtonProps {
  defaultLocate: Localization;
  currentLocalization: Localization;
  element: ContentEditorButtonElement;
  onChange: (element: ContentEditorButtonElement) => void;
}
const ContentLocalizationButton = (props: ContentLocalizationButtonProps) => {
  const { defaultLocate, currentLocalization, element, onChange } = props;
  const [text, setText] = useState<string>('');
  const handleTextChange = (txt: string) => {
    setText(txt);
    onChange({ ...element, data: { ...element.data, text: txt } });
  };
  return (
    <ContentLocalizationTemplateContainer name={'Button'}>
      <ContentLocalizationTemplateB1 name={defaultLocate?.name}>
        <div className="pl-3">{element.data.text}</div>
      </ContentLocalizationTemplateB1>
      <ContentLocalizationTemplateB2 name={currentLocalization?.name}>
        <Input
          value={text}
          onChange={(e) => {
            handleTextChange(e.target.value);
          }}
        />
      </ContentLocalizationTemplateB2>
    </ContentLocalizationTemplateContainer>
  );
};

interface ContentLocalizationLeafProps {
  text: string;
  onChange: (text: string) => void;
}
const ContentLocalizationLeaf = (props: ContentLocalizationLeafProps) => {
  const { text } = props;

  const [inputValue, setInputValue] = useState<string>('');
  const handleOnChange = (e: ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };
  return (
    <>
      <div className="flex flex-col space-y-1 grow">
        <div className="pl-3 bg-secondary p-2 rounded-md">{text}</div>
        <Input value={inputValue} onChange={handleOnChange} />
      </div>
    </>
  );
};

interface ContentLocalizationRichTextProps {
  defaultLocate: Localization;
  currentLocalization: Localization;
  element: ContentEditorTextElement;
  onChange: (element: ContentEditorTextElement) => void;
}
const ContentLocalizationText = (props: ContentLocalizationRichTextProps) => {
  const { defaultLocate, currentLocalization, element, onChange } = props;

  const data = element.data;
  const clone = JSON.parse(JSON.stringify(data));
  const handleChildTextChange = (i: number, ii: number, text: string) => {
    clone[i][ii].text = text;
    onChange({ ...element, data: clone });
  };
  const handleSubChildTextChange = (i: number, ii: number, iii: number, text: string) => {
    clone[i][ii][iii].text = text;
    onChange({ ...element, data: clone });
  };
  return data.map((it, i: number) => {
    const item = it as CustomElement;
    const isNotEmpty = item.children.find(
      (leaf: any) => leaf.children?.find((subLeaf: any) => subLeaf.text) || leaf.text,
    );
    return (
      <React.Fragment key={i}>
        {isNotEmpty && (
          <>
            <Separator />
            <div className="flex flex-row">
              <div className="w-40 flex-none">Content</div>
              <div className="flex flex-row space-x-1 grow ">
                <div className="flex-none flex flex-col">
                  <div className="w-40 bg-secondary rounded-sm p-2">{defaultLocate.name}</div>
                  <div className="p-2">{currentLocalization.name}</div>
                </div>
                {item.children.map((leaf: any, ii: number) => {
                  if (leaf.text) {
                    return (
                      <ContentLocalizationLeaf
                        onChange={(text: string) => {
                          handleChildTextChange(i, ii, text);
                        }}
                        key={`${i}-${ii}`}
                        text={leaf.text}
                      />
                    );
                  }
                  if (leaf.children) {
                    return leaf.children.map((subLeaf: any, iii: number) => {
                      if (subLeaf.text) {
                        return (
                          <ContentLocalizationLeaf
                            key={`${i}-${ii}-${iii}`}
                            onChange={(text: string) => {
                              handleSubChildTextChange(i, ii, iii, text);
                            }}
                            text={subLeaf.text}
                          />
                        );
                      }
                    });
                  }
                })}
              </div>
            </div>
          </>
        )}
      </React.Fragment>
    );
  });
};

type ContentLocalizationItemProps = {
  defaultLocate: Localization;
  currentLocalization: Localization;
  element: ContentEditorRootElement;
  onChange: (element: ContentEditorRootElement) => void;
};

const ContentLocalizationItem = (props: ContentLocalizationItemProps) => {
  const { defaultLocate, currentLocalization, element, onChange } = props;
  if (element.element.type === ContentEditorElementType.TEXT) {
    return (
      <ContentLocalizationText
        defaultLocate={defaultLocate}
        onChange={(_element) => {
          onChange({ ...element, element: _element });
        }}
        currentLocalization={currentLocalization}
        element={element.element}
      />
    );
  }
  if (element.element.type === ContentEditorElementType.IMAGE) {
    return (
      <>
        <ContentLocalizationImage
          defaultLocate={defaultLocate}
          currentLocalization={currentLocalization}
          element={element.element}
          onChange={(_element) => {
            onChange({ ...element, element: _element });
          }}
        />
      </>
    );
  }
  if (element.element.type === ContentEditorElementType.EMBED) {
    return (
      <ContentLocalizationEmbed
        defaultLocate={defaultLocate}
        currentLocalization={currentLocalization}
        element={element.element}
        onChange={(_element) => {
          onChange({ ...element, element: _element });
        }}
      />
    );
  }
  if (element.element.type === ContentEditorElementType.BUTTON) {
    return (
      <ContentLocalizationButton
        defaultLocate={defaultLocate}
        currentLocalization={currentLocalization}
        element={element.element}
        onChange={(_element) => {
          onChange({ ...element, element: _element });
        }}
      />
    );
  }
};

interface ContentLocalizationDetailStepProps {
  currentStep: Step;
  index: number;
  currentVersion: ContentVersion;
  localization: Localization;
  localizedStepData: ContentEditorRoot[];
  onChange: (data: ContentEditorRoot[]) => void;
}

const ContentLocalizationDetailStep = (props: ContentLocalizationDetailStepProps) => {
  const { currentStep, index, localization, localizedStepData, onChange } = props;

  const { localizationList } = useLocalizationListContext();
  const defaultLocate = localizationList?.find((localte) => localte.isDefault);
  if (!currentStep.data || !defaultLocate) {
    return <></>;
  }

  const contents = currentStep.data as ContentEditorRoot[];
  const cloneContents = localizedStepData
    ? (JSON.parse(JSON.stringify(localizedStepData)) as ContentEditorRoot[])
    : [];

  const handleChange = (i: number, ii: number, iii: number, element: ContentEditorRootElement) => {
    cloneContents[i].children[ii].children[iii] = element;
    onChange(cloneContents);
  };

  return (
    <>
      <div className="flex flex-col p-4 shadow bg-white rounded-lg space-y-4">
        <div className="font-bold">
          {index + 1}、{currentStep.name}
        </div>
        <div className="flex flex-col space-y-4">
          {contents.map((content, i) => {
            return content.children.map((column, ii) => {
              return column.children.map((element, iii) => {
                return (
                  <ContentLocalizationItem
                    key={`${i}-${ii}-${iii}`}
                    defaultLocate={defaultLocate}
                    currentLocalization={localization}
                    element={element}
                    onChange={(e) => {
                      handleChange(i, ii, iii, e);
                    }}
                  />
                );
              });
            });
          })}
        </div>
      </div>
    </>
  );
};

interface ContentLocalizationDetailMainProps {
  locateCode: string;
}

const ContentLocalizationDetailMain = (props: ContentLocalizationDetailMainProps) => {
  const { locateCode } = props;
  const navigator = useNavigate();
  const location = useLocation();
  const { localizationList } = useLocalizationListContext();
  const { contentLocalizationList } = useContentLocalizationListContext();
  const { version } = useContentVersionContext();

  const localization = localizationList
    ? localizationList.find((locate) => locate.locale === locateCode)
    : undefined;
  const contentLocalization = contentLocalizationList.find(
    (cl) => cl.localizationId === localization?.id,
  );
  if (!version?.id || !contentLocalization || !localization) {
    return <></>;
  }

  const localized = contentLocalization.localized as ContentEditorRoot[][];

  return (
    <div className="flex p-14 mt-12 space-x-8 justify-center ">
      <div className="flex flex-col space-y-6 grow  max-w-screen-xl mx-auto">
        <div className="flex flex-row space-x-1 items-center">
          <ArrowLeftIcon
            className="h-4 w-6 cursor-pointer flex-none"
            onClick={() => {
              navigator(location.pathname.replace(`/${localization.locale}`, ''));
            }}
          />
          <h3 className="text-lg font-medium">{localization.name}</h3>
          {!contentLocalization.enabled && <Badge variant={'destructive'}>Disabled</Badge>}
          {contentLocalization.enabled && <Badge variant={'success'}>Enabled</Badge>}
        </div>
        {version?.steps?.map((step, index) => {
          return (
            <ContentLocalizationDetailStep
              currentStep={step}
              index={index}
              key={step.id}
              currentVersion={version}
              localization={localization}
              localizedStepData={localized ? localized[index] : []}
              onChange={() => {}}
            />
          );
        })}
      </div>
    </div>
  );
};

interface ContentLocalizationDetailProps {
  locateCode: string;
}

export const ContentLocalizationDetail = (props: ContentLocalizationDetailProps) => {
  const { locateCode } = props;
  const { version } = useContentVersionContext();

  if (!version?.id) {
    return <></>;
  }

  return (
    <>
      <ContentLocalizationListProvider versionId={version?.id}>
        <ContentLocalizationDetailMain locateCode={locateCode} />
      </ContentLocalizationListProvider>
    </>
  );
};

ContentLocalizationDetail.displayName = 'ContentLocalizationDetail';
