import { RouterProvider } from 'react-router-dom';

import { useAppContext } from '@/contexts/app-context';
import { useZodLocale } from '@/i18n/use-zod-locale';
import router from '@/routes/index';

const App = () => {
  const { userInfo } = useAppContext();
  useZodLocale();
  if (userInfo === undefined) {
    return <></>;
  }
  return <RouterProvider router={router} />;
};

export default App;
