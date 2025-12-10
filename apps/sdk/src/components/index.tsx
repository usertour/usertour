import React, { useSyncExternalStore } from 'react';
import ReactDOM from 'react-dom/client';
import { ErrorBoundary } from 'react-error-boundary';
import { ExternalStore } from '../utils/store';
import { UsertourTour } from '../core/usertour-tour';
import { UsertourChecklist } from '../core/usertour-checklist';
import { UsertourLauncher } from '@/core/usertour-launcher';
import { logger } from '@/utils';
import '../index.css';

/**
 * Error handler for widget errors
 * Logs the error but does not crash the customer's site
 */
const handleWidgetError = (error: Error, info: React.ErrorInfo) => {
  logger.error('Widget error:', error, info.componentStack);
};

// Extract widgets into a constant to improve readability
const WIDGETS = {
  Tour: React.lazy(() =>
    import('./tour').then((module) => ({
      default: module.TourWidget,
    })),
  ),
  Checklist: React.lazy(() =>
    import('./checklist').then((module) => ({
      default: module.ChecklistWidget,
    })),
  ),
  Launcher: React.lazy(() =>
    import('./launcher').then((module) => ({
      default: module.LauncherWidget,
    })),
  ),
};

interface AppProps {
  toursStore: ExternalStore<UsertourTour[]>;
  checklistsStore: ExternalStore<UsertourChecklist[]>;
  launchersStore: ExternalStore<UsertourLauncher[]>;
}

// App component with error boundaries to prevent crashes on customer sites
const App = ({ toursStore, checklistsStore, launchersStore }: AppProps) => {
  // Use custom hook to reduce repetition
  const useStore = <T,>(store: ExternalStore<T>) =>
    useSyncExternalStore(store.subscribe, store.getSnapshot);

  const tours = useStore(toursStore);
  const checklists = useStore(checklistsStore);
  const launchers = useStore(launchersStore);

  return (
    <React.StrictMode>
      <ErrorBoundary fallbackRender={() => null} onError={handleWidgetError}>
        <React.Suspense fallback={null}>
          {tours?.map((tour) => (
            <ErrorBoundary
              key={tour.getId()}
              fallbackRender={() => null}
              onError={handleWidgetError}
            >
              <WIDGETS.Tour tour={tour} />
            </ErrorBoundary>
          ))}
          {checklists?.map((checklist) => (
            <ErrorBoundary
              key={checklist.getId()}
              fallbackRender={() => null}
              onError={handleWidgetError}
            >
              <WIDGETS.Checklist checklist={checklist} />
            </ErrorBoundary>
          ))}
          {launchers?.map((launcher) => (
            <ErrorBoundary
              key={launcher.getId()}
              fallbackRender={() => null}
              onError={handleWidgetError}
            >
              <WIDGETS.Launcher launcher={launcher} />
            </ErrorBoundary>
          ))}
        </React.Suspense>
      </ErrorBoundary>
    </React.StrictMode>
  );
};

// Update render function to use the App component
export const render = (root: ReactDOM.Root, props: AppProps): void => {
  root.render(<App {...props} />);
};
