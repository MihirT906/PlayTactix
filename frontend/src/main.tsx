import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'; // Import React Router components
import './index.css';
import App from './App.tsx';
import DataManager from './services/DataManager.ts';
import AnnotationStore from './services/AnnotationStore-optimized.ts';
import HomeScreen from './components/HomeScreen.tsx';

// Set up routing
createRoot(document.getElementById('root')!).render(
  <Router>
    <Routes>
      <Route path="/" element={<HomeScreen />} />
      <Route path="/app" element={<App dataManager={new DataManager()} annotationStore={new AnnotationStore()} />} />
    </Routes>
  </Router>
);