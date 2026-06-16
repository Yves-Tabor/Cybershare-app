import { createBrowserRouter } from 'react-router-dom';
import App from '../App';
import Error from '../pages/Error';
import Home from '../pages/Home';
import Scanner from '../pages/Scanner';
import Community from '../pages/Community';
import MainLayout from '../layouts/MainLayout';
import Welcome from '../pages/Welcome';
import NotFound from '../pages/NotFound';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Welcome />,
    errorElement: <Error/>,
  },
  {
    path: '/main',
    element: <MainLayout />,
    children: [
      {
        index: true,
        element: <Home />,
      },
      {
        path: 'Scanner',
        element: <Scanner />,
      },
      {
        path: 'Community',
        element: <Community />,
      },
    ],
  },
  {
    path: '*',
    element: <NotFound />,
  },
])


export default router;
