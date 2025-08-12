import React, { useSyncExternalStore } from 'react';
import ReactDOM from 'react-dom/client';
import { ExternalStore } from '../utils/store';
import { UsertourTour } from '../core/usertour-tour';
import '../index.css';

// Extract widgets into a constant to improve readability
const WIDGETS = {
  Tour: React.lazy(() =>
    import('./tour').then((module) => ({
      default: module.TourWidget,
    })),
  ),
};

interface AppProps {
  toursStore: ExternalStore<UsertourTour[]>;
}

// Optimize App component with better type safety and error boundaries
const App = ({ toursStore }: AppProps) => {
  // Use custom hook to reduce repetition
  const useStore = <T,>(store: ExternalStore<T>) =>
    useSyncExternalStore(store.subscribe, store.getSnapshot);

  const tours = useStore(toursStore);

  return (
    <React.StrictMode>
      <React.Suspense fallback={null}>
        {tours?.map((tour) => (
          <WIDGETS.Tour tour={tour} key={tour.getId()} />
        ))}
      </React.Suspense>
    </React.StrictMode>
  );
};

// Update render function to use the App component
export const render = async (
  root: ReactDOM.Root,
  props: {
    toursStore: ExternalStore<UsertourTour[]>;
  },
) => {
  return root.render(<App {...props} />);
};
