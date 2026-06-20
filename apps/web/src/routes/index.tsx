import { createBrowserRouter } from 'react-router-dom';
import config from './config';
import { RouteErrorBoundary } from './route-error-boundary';

// Wrap every route in one pathless root whose errorElement catches errors that
// bubble up — notably stale-chunk lazy-import failures after a deploy, which it
// recovers from by reloading instead of showing the raw error page.
const router = createBrowserRouter([{ errorElement: <RouteErrorBoundary />, children: config }], {
  basename: '/',
});

export default router;
