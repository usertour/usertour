import { Component, ErrorInfo, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

interface EditorErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface EditorErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

// Default fallback lives in a function component so it can use the
// translation hook — the class boundary itself cannot.
const EditorErrorFallback = () => {
  const { t } = useTranslation();
  return (
    <div className="p-4 text-sm text-destructive bg-destructive/10 rounded-md">
      <p className="font-medium">{t('contentBuilder.editor.errorBoundary.title')}</p>
      <p className="text-xs mt-1 opacity-80">
        {t('contentBuilder.editor.errorBoundary.description')}
      </p>
    </div>
  );
};

/**
 * Error boundary for Slate editor to handle crashes gracefully
 * Prevents the entire application from crashing when editor encounters an error
 */
export class EditorErrorBoundary extends Component<
  EditorErrorBoundaryProps,
  EditorErrorBoundaryState
> {
  constructor(props: EditorErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): EditorErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error for debugging
    console.error('Editor error:', error, errorInfo);

    // Call optional error handler
    this.props.onError?.(error, errorInfo);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      // Render fallback UI if provided, otherwise show default error message
      return this.props.fallback ?? <EditorErrorFallback />;
    }

    return this.props.children;
  }
}

export default EditorErrorBoundary;
