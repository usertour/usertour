import { RouterProvider } from 'react-router-dom';

import { useAppContext } from '@/contexts/app-context';
import router from '@/routes/index';

const App = () => {
  const { userInfo } = useAppContext();
  if (userInfo === undefined) {
    return <></>;
  }
  return <RouterProvider router={router} />;
};

export default App;
