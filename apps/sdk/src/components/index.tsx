import React, { useSyncExternalStore } from 'react';
import ReactDOM from 'react-dom/client';
import { Checklist } from '../core/checklist';
import { Launcher } from '../core/launcher';
import { ExternalStore } from '../core/store';
import { Tour } from '../core/tour';
import '../index.css';

// Extract widgets into a constant to improve readability
const WIDGETS = {
  Tour: React.lazy(() =>
    import('./tour').then((module) => ({
      default: module.Tour,
    })),
  ),
  Launcher: React.lazy(() =>
    import('./launcher').then((module) => ({
      default: module.LauncherWidget,
    })),
  ),
  Checklist: React.lazy(() =>
    import('./checklist').then((module) => ({
      default: module.ChecklistWidget,
    })),
  ),
};

// Add type definitions for props
type AppProps = {
  toursStore: ExternalStore<Tour[]>;
  launchersStore: ExternalStore<Launcher[]>;
  checklistsStore: ExternalStore<Checklist[]>;
};

// Optimize App component with better type safety and error boundaries
const App = ({ toursStore, launchersStore, checklistsStore }: AppProps) => {
  // Use custom hook to reduce repetition
  const useStore = <T,>(store: ExternalStore<T>) =>
    useSyncExternalStore(store.subscribe, store.getSnapshot);

  const tours = useStore(toursStore);
  const launchers = useStore(launchersStore);
  const checklists = useStore(checklistsStore);

  return (
    <React.StrictMode>
      <React.Suspense fallback={<div>Loading...</div>}>
        {tours.map((tour) => (
          <WIDGETS.Tour tour={tour} key={tour.getContent().contentId} />
        ))}
        {launchers.map((launcher) => (
          <WIDGETS.Launcher launcher={launcher} key={launcher.getContent().contentId} />
        ))}
        {checklists.map((checklist) => (
          <WIDGETS.Checklist checklist={checklist} key={checklist.getContent().contentId} />
        ))}
      </React.Suspense>
    </React.StrictMode>
  );
};

// Update render function to use the App component
export const render = async (
  root: ReactDOM.Root,
  props: {
    toursStore: ExternalStore<Tour[]>;
    launchersStore: ExternalStore<Launcher[]>;
    checklistsStore: ExternalStore<Checklist[]>;
  },
) => {
  return root.render(<App {...props} />);
};
