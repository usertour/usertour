import { Button } from '@usertour/ui';
import posthog from 'posthog-js';
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { isStaleChunkError, reloadForStaleChunkOnce } from '@/utils/stale-chunk';

interface FallbackProps {
  onReset: () => void;
}

const Fallback = (props: FallbackProps) => {
  const { onReset } = props;
  const { t } = useTranslation('ui');
  return (
    <div className="flex h-full min-h-[40vh] w-full flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-sm text-muted-foreground">{t('appError.description')}</p>
      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={onReset}>
          {t('appError.tryAgain')}
        </Button>
        <Button type="button" onClick={() => window.location.reload()}>
          {t('appError.reload')}
        </Button>
      </div>
    </div>
  );
};

Fallback.displayName = 'RegionErrorBoundary.Fallback';

interface BoundaryProps {
  children: ReactNode;
}

interface BoundaryState {
  failed: boolean;
}

// Catches a render crash inside one region of the shell — a settings page, a
// builder panel — so the sidebar and the other regions stay up (ADR 0021 §6).
// A stale chunk after a deploy reloads once; anything else is reported and
// offered a reset, which re-mounts the children.
class Boundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { failed: false };

  static getDerivedStateFromError(): BoundaryState {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    if (isStaleChunkError(error)) {
      reloadForStaleChunkOnce();
      return;
    }
    if (posthog.__loaded) {
      posthog.captureException(error, { componentStack: info.componentStack });
    }
  }

  reset = (): void => {
    this.setState({ failed: false });
  };

  render(): ReactNode {
    if (this.state.failed) {
      return <Fallback onReset={this.reset} />;
    }
    return this.props.children;
  }
}

export interface RegionErrorBoundaryProps {
  children: ReactNode;
}

/** A region boundary that also resets when the route changes, so navigating away from a crashed page recovers it. */
export const RegionErrorBoundary = (props: RegionErrorBoundaryProps) => {
  const { children } = props;
  const { pathname } = useLocation();
  return <Boundary key={pathname}>{children}</Boundary>;
};

RegionErrorBoundary.displayName = 'RegionErrorBoundary';
