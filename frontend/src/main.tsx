import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import DataManager from './services/DataManager.ts'
import AnnotationStore from './services/AnnotationStore-optimized.ts'

// createRoot(document.getElementById('root')!).render(
//   <StrictMode>
//     <App dataManager={new DataManager()} annotationStore={new AnnotationStore()}/>
//   </StrictMode>,
// )
createRoot(document.getElementById('root')!).render(
  <App dataManager={new DataManager()} annotationStore={new AnnotationStore()}/>
)
