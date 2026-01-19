import { Component, ErrorInfo, ReactNode } from 'react';

interface EditorErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface EditorErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

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
      return (
        this.props.fallback ?? (
          <div className="p-4 text-sm text-destructive bg-destructive/10 rounded-md">
            <p className="font-medium">Editor failed to load</p>
            <p className="text-xs mt-1 opacity-80">
              {this.state.error?.message ?? 'An unexpected error occurred'}
            </p>
          </div>
        )
      );
    }

    return this.props.children;
  }
}

export default EditorErrorBoundary;
