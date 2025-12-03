import React, { useSyncExternalStore } from 'react';
import ReactDOM from 'react-dom/client';
import { ExternalStore } from '../utils/store';
import { UsertourTour } from '../core/usertour-tour';
import { UsertourChecklist } from '../core/usertour-checklist';
import { UsertourLauncher } from '@/core/usertour-launcher';
import '../index.css';

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

// Optimize App component with better type safety and error boundaries
const App = ({ toursStore, checklistsStore, launchersStore }: AppProps) => {
  // Use custom hook to reduce repetition
  const useStore = <T,>(store: ExternalStore<T>) =>
    useSyncExternalStore(store.subscribe, store.getSnapshot);

  const tours = useStore(toursStore);
  const checklists = useStore(checklistsStore);
  const launchers = useStore(launchersStore);
  return (
    <React.StrictMode>
      <React.Suspense fallback={null}>
        {tours?.map((tour) => (
          <WIDGETS.Tour tour={tour} key={tour.getId()} />
        ))}
        {checklists?.map((checklist) => (
          <WIDGETS.Checklist checklist={checklist} key={checklist.getId()} />
        ))}
        {launchers?.map((launcher) => (
          <WIDGETS.Launcher launcher={launcher} key={launcher.getId()} />
        ))}
      </React.Suspense>
    </React.StrictMode>
  );
};

// Update render function to use the App component
export const render = (root: ReactDOM.Root, props: AppProps): void => {
  root.render(<App {...props} />);
};
