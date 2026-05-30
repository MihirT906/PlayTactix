import { createRoot } from 'react-dom/client';
import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom';
import './index.css';
import App from './App.tsx';
import DataManager from './services/DataManager.ts';
import AnnotationStore from './services/AnnotationStore-optimized.ts';
import TimelineStore from './services/TimelineStore.ts';

const dataManager = new DataManager()
const annotationStore = new AnnotationStore()
const timelineStore = new TimelineStore()

createRoot(document.getElementById('root')!).render(
  <Router>
    <Routes>
      <Route path="/" element={<Navigate to="/app" replace />} />
      <Route path="/app" element={<App dataManager={dataManager} annotationStore={annotationStore} timelineStore={timelineStore} />} />
    </Routes>
  </Router>
);