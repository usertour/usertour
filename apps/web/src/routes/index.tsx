import { createBrowserRouter } from 'react-router-dom';
import config from './config';

const router = createBrowserRouter(config, { basename: '/' });

export default router;
