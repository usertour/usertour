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
  const { userInfo } = useAppContext();
  const isLoggedIn = !!userInfo;

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
