import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import './index.css';
import App from './App.tsx';
import DataManager from './services/DataManager.ts';
import AnnotationStore from './services/AnnotationStore-optimized.ts';
import TimelineStore from './services/TimelineStore.ts';

const dataManager = new DataManager()
const annotationStore = new AnnotationStore()
const timelineStore = new TimelineStore()

// App owns the match session for every page, so it matches every path and routes its pages itself.
// A data router (rather than BrowserRouter) is needed for useBlocker, which guards unsaved work on Back/Forward.
const router = createBrowserRouter([
  {
    path: '*',
    element: (
      <App
        dataManager={dataManager}
        annotationStore={annotationStore}
        timelineStore={timelineStore}
      />
    ),
  },
])

createRoot(document.getElementById('root')!).render(<RouterProvider router={router} />);
