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
  useMemo,
  useCallback,
} from 'react';
import { createPortal } from 'react-dom';

/**
 * Context value for Frame component
 * Provides access to iframe document, window and style setter
 */
interface FrameContentValue {
  document: Document;
  window: Window | null;
  setStyle: (style: string) => void;
}

type AssetTagType = 'link' | 'script';

/**
 * Asset attributes for loading external resources in iframe
 * Extends both link and script HTML attributes
 */
export interface AssetAttributes extends LinkHTMLAttributes<any>, ScriptHTMLAttributes<any> {
  tagName: AssetTagType;
  isCheckLoaded: boolean;
}

const FrameContext = createContext<FrameContentValue | undefined>(undefined);

/**
 * Hook to access Frame context
 * Must be used within a Frame component
 */
export function useFrame(): FrameContentValue {
  const context = useContext(FrameContext);
  if (!context) {
    throw new Error('useFrame must be used within a FrameContext');
  }
  return context;
}

/**
 * Props for Frame component
 */
interface FrameProps {
  children: ReactNode;
  mountTarget?: string; // CSS selector for mounting point in iframe
  head?: ReactNode; // Content to inject into iframe head
  assets?: AssetAttributes[]; // External resources to load
  defaultStyle?: React.CSSProperties; // Default iframe styles
  initialContent?: string; // Initial HTML content for iframe
  className?: string; // CSS class for iframe element
}

/**
 * Frame component that creates an isolated iframe environment
 * Allows rendering React components inside an iframe with custom head content
 */
export const Frame = forwardRef<HTMLIFrameElement, FrameProps>((props, ref) => {
  const {
    children,
    mountTarget,
    head,
    assets = [],
    defaultStyle = {},
    initialContent = '',
    className = '',
  } = props;

  // State management for iframe lifecycle
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [assetsLoaded, setAssetsLoaded] = useState(assets.length === 0);
  const nodeRef = useRef<HTMLIFrameElement>(null);
  const [contentDocument, setContentDocument] = useState<Document>();
  const [container, setContainer] = useState<Element | DocumentFragment>();
  const composedRefs = useComposedRefs(ref, nodeRef);

  // Use ref to persist loaded assets across renders and prevent memory leaks
  const assetsRef = useRef<AssetAttributes[]>(assets);
  const assetLoadMapRef = useRef<Map<string, boolean>>(new Map());

  // Combined state to ensure all conditions are met
  const isReadyToRender = useMemo(() => {
    return (
      iframeLoaded &&
      assetsLoaded &&
      !!contentDocument &&
      !!contentDocument.defaultView &&
      !!container
    );
  }, [iframeLoaded, assetsLoaded, contentDocument, container]);

  // Check if head content should be rendered
  const shouldRenderHead = useMemo(() => {
    return iframeLoaded && contentDocument && head;
  }, [iframeLoaded, contentDocument, head]);

  // Check if assets should be rendered
  const shouldRenderAssets = useMemo(() => {
    return iframeLoaded && contentDocument && contentDocument.head;
  }, [iframeLoaded, contentDocument]);

  // Update assets ref when assets prop changes
  useEffect(() => {
    assetsRef.current = assets;
    // Reset loaded assets when assets change
    assetLoadMapRef.current.clear();
    checkAndUpdateAssetsLoaded();
  }, [assets]);

  // Handle iframe load event
  const handleLoad = useCallback(() => {
    if (!iframeLoaded) {
      setIframeLoaded(true);
    }
  }, [iframeLoaded]);

  // Get iframe document safely with cross-origin handling
  const getDocument = useCallback(() => {
    try {
      return nodeRef.current ? nodeRef.current.contentDocument : null;
    } catch {
      // Cross-origin access blocked
      console.warn('Cross-origin access blocked for iframe');
      return null;
    }
  }, []);

  // Handle asset load error
  const handleAssetError = useCallback((asset: AssetAttributes, index: number) => {
    console.error('Asset failed to load:', asset, 'at index:', index);
    // Could add error state management here if needed
  }, []);

  // Set up DOMContentLoaded listener for iframe
  useEffect(() => {
    const doc = getDocument();
    const win = nodeRef.current?.contentWindow;

    if (doc && win) {
      win.addEventListener('DOMContentLoaded', handleLoad);
    }
    return () => {
      win?.removeEventListener('DOMContentLoaded', handleLoad);
    };
  }, [nodeRef, getDocument, handleLoad]);

  // Initialize iframe document and window when loaded
  useEffect(() => {
    if (iframeLoaded && nodeRef.current) {
      const doc = getDocument();
      const win = nodeRef.current.contentWindow;
      if (doc && win) {
        setContentDocument(doc);
      }
    }
  }, [iframeLoaded, nodeRef.current, getDocument]);

  // Set up container element for mounting React components
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

  // Style setter for iframe element
  const setStyle = (style: string) => {
    if (nodeRef.current) {
      nodeRef.current.style.cssText = style;
    }
  };

  // Check and update assets loaded state
  const checkAndUpdateAssetsLoaded = useCallback(() => {
    const checkLoadedAssets = assetsRef.current.filter((asset) => asset.isCheckLoaded);
    const checkLoadedCount = checkLoadedAssets.length;
    const loadedCount = assetLoadMapRef.current.size;

    if (checkLoadedCount === 0) {
      // No assets need loading check
      setAssetsLoaded(true);
    } else if (checkLoadedCount === loadedCount) {
      // All assets that need loading check are loaded
      setAssetsLoaded(true);
    } else {
      // Some assets still loading
      setAssetsLoaded(false);
    }
  }, []);

  // Track loaded assets and trigger content rendering when all assets are loaded
  const handleAssetLoad = useCallback(
    (assetItem: AssetAttributes, isCheckLoaded: boolean, assetIndex: number) => {
      // Early return if this asset doesn't need loading check
      if (!isCheckLoaded) {
        return;
      }

      // Create a unique key for the asset using its properties and index
      const assetKey = assetItem.href || assetItem.src || `${assetItem.tagName}-${assetIndex}`;

      // Mark this specific asset as loaded
      assetLoadMapRef.current.set(assetKey, true);

      // Check and update assets loaded state
      checkAndUpdateAssetsLoaded();
    },
    [checkAndUpdateAssetsLoaded],
  );

  // Render asset elements (links/scripts) to inject into iframe head
  const renderHeaderAssets = useMemo(() => {
    const nodes: ReactNode[] = [];
    assets.forEach((asset: AssetAttributes, index: number) => {
      const { tagName: TagName, isCheckLoaded, ...attrs } = asset;
      nodes.push(
        <TagName
          {...attrs}
          key={`${asset.tagName}-${index}`}
          onLoad={() => {
            handleAssetLoad(asset, isCheckLoaded, index);
          }}
          onError={() => {
            handleAssetError(asset, index);
          }}
        />,
      );
    });
    return nodes;
  }, [assets, handleAssetLoad, handleAssetError]);

  return (
    <>
      {/* Main iframe element */}
      <iframe
        srcDoc={initialContent}
        className={className}
        style={{ ...defaultStyle }}
        ref={composedRefs}
        onLoad={handleLoad}
        title="Content Frame"
      />

      {/* Inject head content into iframe */}
      {shouldRenderHead && createPortal(head, contentDocument!.head)}

      {/* Inject assets (CSS/JS) into iframe head */}
      {shouldRenderAssets && createPortal(renderHeaderAssets, contentDocument!.head)}

      {/* Render main content when all assets are loaded */}
      {isReadyToRender &&
        createPortal(
          <FrameContext.Provider
            value={{
              document: contentDocument!,
              window: contentDocument!.defaultView,
              setStyle,
            }}
          >
            {children}
          </FrameContext.Provider>,
          container!,
        )}
    </>
  );
});

Frame.displayName = 'Frame';
