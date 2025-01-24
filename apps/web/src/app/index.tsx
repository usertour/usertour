import { RouterProvider } from "react-router-dom";

import router from "@/routes/index";
import { useAppContext } from "@/contexts/app-context";

const App = () => {
  const { userInfo } = useAppContext();
  if (userInfo === undefined) {
    return <></>;
  }
  return <RouterProvider router={router} />;
};

export default App;
