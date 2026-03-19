import { useAppContext } from '@/contexts/app-context';
import { Navigate, RouteObject, createBrowserRouter } from 'react-router-dom';
import config, { CustomRouteConfig } from './config';

const CustomRoute = ({
  loginRequired = true,
  redirectIfLogged = true,
  layout: Layout,
  component: Component,
}: CustomRouteConfig) => {
  const children = Layout ? (
    <Layout>
      <Component />
    </Layout>
  ) : (
    <Component />
  );
  const { userInfo, globalConfig, globalConfigLoading } = useAppContext();
  const isLoggedIn = !!userInfo;
  const currentPath = window.location.pathname;
  const needsSystemAdminSetup = globalConfig?.needsSystemAdminSetup;
  const isSetupAdminPage = currentPath === '/auth/setup-admin';

  if (!loginRequired && !isLoggedIn && globalConfigLoading) {
    return null;
  }

  if (!isLoggedIn && needsSystemAdminSetup && !isSetupAdminPage) {
    return <Navigate to="/auth/setup-admin" replace />;
  }

  if (!isLoggedIn && isSetupAdminPage && needsSystemAdminSetup === false) {
    return <Navigate to="/auth/signin" replace />;
  }

  if (isLoggedIn && isSetupAdminPage) {
    return <Navigate to="/env/1/flows" replace />;
  }

  if (loginRequired) {
    if (isLoggedIn) {
      return children;
    }
    const redirectUri = window.location.pathname + window.location.search;
    return <Navigate to={`/auth/signin?redirect_uri=${encodeURIComponent(redirectUri)}`} replace />;
  }
  return isLoggedIn && redirectIfLogged ? <Navigate to="/env/1/flows" replace /> : children;
};

const combineRoutes = () => {
  return config.map((cfg) => ({
    id: cfg.id,
    path: cfg.path,
    element: <CustomRoute {...cfg} />,
  })) as RouteObject[];
};

const router = createBrowserRouter(combineRoutes(), { basename: '/' });

export default router;
