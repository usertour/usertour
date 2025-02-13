import { useComposedRefs } from '@usertour-ui/react-compose-refs';
import {
  LinkHTMLAttributes,
  ReactNode,
  ScriptHTMLAttributes,
  createContext,
  forwardRef,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

interface FrameContentValue {
  document: Document;
  window: Window | null;
  setStyle: (style: any) => void;
}

type AssetTagType = 'link' | 'script';

export interface AssetAttributes extends LinkHTMLAttributes<any>, ScriptHTMLAttributes<any> {
  tagName: AssetTagType;
  isCheckLoaded: boolean;
}

const FrameContext = createContext<FrameContentValue | undefined>(undefined);
// export const useFrame = () => useContext(FrameContext);

export function useFrame(): FrameContentValue {
  const context = useContext(FrameContext);
  if (!context) {
    throw new Error('useFrame must be used within a FrameContext');
  }
  return context;
}

interface FrameProps {
  children: ReactNode;
  mountTarget?: any;
  head?: any;
  assets?: AssetAttributes[];
  defaultStyle?: any;
  initialContent?: string;
  className?: string;
}

export const Frame = forwardRef<HTMLIFrameElement, any>((props: FrameProps, ref) => {
  const {
    children,
    mountTarget,
    head,
    assets = [],
    defaultStyle = {},
    initialContent = '',
    className = '',
  } = props;
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [assetsLoaded, setAssetsLoaded] = useState(assets.length === 0);
  const nodeRef = useRef<HTMLIFrameElement>(null);
  const [contentDocument, setContentDocument] = useState<Document>();
  const [_, setContentWindow] = useState<Window>();
  const [container, setContainer] = useState<Element | DocumentFragment>();
  const composedRefs = useComposedRefs(ref, nodeRef);
  // const defaultContent =
  //   '<!DOCTYPE html><html><head></head><body></body></html>';

  const handleLoad = () => {
    if (!iframeLoaded) {
      setIframeLoaded(true);
    }
  };

  const getDoc = () => {
    return nodeRef.current ? nodeRef.current.contentDocument : null; // eslint-disable-line
  };

  useEffect(() => {
    const doc = getDoc();
    const win = nodeRef.current?.contentWindow;

    if (doc && win) {
      win.addEventListener('DOMContentLoaded', handleLoad);
    }
    return () => {
      win?.removeEventListener('DOMContentLoaded', handleLoad);
    };
  }, [nodeRef]);

  useEffect(() => {
    if (iframeLoaded && nodeRef.current) {
      const doc = getDoc();
      const win = nodeRef.current.contentWindow;
      if (doc && win) {
        setContentWindow(win);
        setContentDocument(doc);
      }
    }
  }, [iframeLoaded, nodeRef.current]);

  useEffect(() => {
    if (contentDocument) {
      const target = mountTarget
        ? contentDocument.querySelector(mountTarget)
        : contentDocument.body;
      if (target) {
        setContainer(target);
      }
    }
  }, [contentDocument, mountTarget]);

  const setStyle = (style: any) => {
    if (nodeRef.current) {
      nodeRef.current.style.cssText = style;
    }
  };

  const loaded: AssetAttributes[] = [];
  const handleOnload = (asset: AssetAttributes, isCheckLoaded: boolean) => {
    if (isCheckLoaded) {
      loaded.push(asset);
    }
    const checkLoadedCount = assets.filter((as: AssetAttributes) => as.isCheckLoaded).length;
    if (checkLoadedCount === loaded.length) {
      setAssetsLoaded(true);
    }
  };
  const header = () => {
    const nodes: ReactNode[] = [];
    assets.forEach((asset: AssetAttributes, index: number) => {
      const { tagName: TagName, isCheckLoaded, ...attrs } = asset;
      nodes.push(
        <TagName
          {...attrs}
          key={index}
          onLoad={() => {
            handleOnload(asset, isCheckLoaded);
          }}
        />,
      );
    });
    return nodes;
  };

  return (
    <>
      <iframe
        srcDoc={initialContent}
        className={className}
        style={{ ...defaultStyle }}
        ref={composedRefs}
        onLoad={handleLoad}
        title="Content Frame"
      />
      {iframeLoaded && contentDocument && head && createPortal(head, contentDocument.head)}
      {iframeLoaded &&
        contentDocument &&
        contentDocument.head &&
        createPortal(header(), contentDocument.head)}
      {assetsLoaded &&
        contentDocument &&
        contentDocument.defaultView &&
        container &&
        createPortal(
          <FrameContext.Provider
            value={{
              document: contentDocument,
              window: contentDocument.defaultView,
              setStyle,
            }}
          >
            {children}
          </FrameContext.Provider>,
          container,
        )}
    </>
  );
});

Frame.displayName = 'Frame';
