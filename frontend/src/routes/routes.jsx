import { createBrowserRouter } from 'react-router-dom';
import App from '../App';
import Error from '../pages/Error';
import Home from '../pages/Home';
import Scanner from '../pages/Scanner';
import Community from '../pages/Community';
import MainLayout from '../layouts/MainLayout';
import Welcome from '../pages/Welcome';
import NotFound from '../pages/NotFound';
import Resources from '../pages/Resources';
import Events from '../pages/Events';
import SavedItems from '../pages/SavedItems'
import Settings from '../pages/Settings'

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
        path: 'scanner',
        element: <Scanner />,
      },
      {
        path: 'resources',
        element: <Resources />,
      },
      {
        path: 'community',
        element: <Community />,
      },
      {
        path: 'events',
        element: <Events />,
      },
      {
        path: 'saved',
        element: <SavedItems />,
      },
      {
        path: 'settings',
        element: <Settings />,
      }
    ],
  },
  {
    path: '*',
    element: <NotFound />,
  },
])


export default router;
