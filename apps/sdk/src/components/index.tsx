import React, { useSyncExternalStore } from 'react';
import ReactDOM from 'react-dom/client';
import { ErrorBoundary } from 'react-error-boundary';
import { ExternalStore } from '../utils/store';
import { UsertourTour } from '../core/usertour-tour';
import { UsertourChecklist } from '../core/usertour-checklist';
import { UsertourLauncher } from '@/core/usertour-launcher';
import { UsertourBanner } from '@/core/usertour-banner';
import { UsertourEmbed } from '@/core/usertour-embed';
import { UsertourResourceCenter } from '@/core/usertour-resource-center';
import { logger } from '@/utils';
import '../index.css';

const log = logger.scope('widget');
/**
 * Error handler for widget errors
 * Logs the error but does not crash the customer's site
 */
const handleWidgetError = (error: Error, info: React.ErrorInfo) => {
  log.error('A widget threw while rendering', error, info.componentStack);
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
  Banner: React.lazy(() =>
    import('./banner').then((module) => ({
      default: module.BannerWidget,
    })),
  ),
  Embed: React.lazy(() =>
    import('./embed').then((module) => ({
      default: module.EmbedWidget,
    })),
  ),
  ResourceCenter: React.lazy(() =>
    import('./resource-center').then((module) => ({
      default: module.ResourceCenterWidget,
    })),
  ),
};

interface AppProps {
  toursStore: ExternalStore<UsertourTour[]>;
  checklistsStore: ExternalStore<UsertourChecklist[]>;
  launchersStore: ExternalStore<UsertourLauncher[]>;
  bannersStore: ExternalStore<UsertourBanner[]>;
  embedsStore: ExternalStore<UsertourEmbed[]>;
  resourceCentersStore: ExternalStore<UsertourResourceCenter[]>;
}

// App component with error boundaries to prevent crashes on customer sites
const App = ({
  toursStore,
  checklistsStore,
  launchersStore,
  bannersStore,
  embedsStore,
  resourceCentersStore,
}: AppProps) => {
  // Use custom hook to reduce repetition
  const useStore = <T,>(store: ExternalStore<T>) =>
    useSyncExternalStore(store.subscribe, store.getSnapshot);

  const tours = useStore(toursStore);
  const checklists = useStore(checklistsStore);
  const launchers = useStore(launchersStore);
  const banners = useStore(bannersStore);
  const embeds = useStore(embedsStore);
  const resourceCenters = useStore(resourceCentersStore);

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
          {banners?.map((banner) => (
            <ErrorBoundary
              key={banner.getId()}
              fallbackRender={() => null}
              onError={handleWidgetError}
            >
              <WIDGETS.Banner banner={banner} />
            </ErrorBoundary>
          ))}
          {embeds?.map((embed) => (
            <ErrorBoundary
              key={embed.getId()}
              fallbackRender={() => null}
              onError={handleWidgetError}
            >
              <WIDGETS.Embed embed={embed} />
            </ErrorBoundary>
          ))}
          {resourceCenters?.map((rc) => (
            <ErrorBoundary key={rc.getId()} fallbackRender={() => null} onError={handleWidgetError}>
              <WIDGETS.ResourceCenter resourceCenter={rc} />
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
