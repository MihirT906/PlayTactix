// import { useEffect, useState } from 'react'
// import './App.css'
// import DataManager from './services/DataManager'
// import AnnotationStore from './services/AnnotationStore-optimized'
// import PlotComponent from './components/PlotComponent'
// import Controls from './components/Controls'
// import { APP_CONFIG, CHUNK_SIZE, SLEEP_INTERVAL, THEME_CSS_VARIABLES } from './config'
// import AnnotationDisplay from './components/AnnotationDisplay'

// function App({dataManager, annotationStore}: {dataManager: DataManager, annotationStore: AnnotationStore}) {
//   const [currentFrame, setCurrentFrame] = useState(1)
//   const [isPlaying, setIsPlaying] = useState(false) // Start with paused state
//   const [isFetching, setIsFetching] = useState(false) // State to track if data is being fetched
//   const [currentFrameData, setCurrentFrameData] = useState<{ x: number[]; y: number[] }>({ x: [], y: [] })
//   const [chunkRange, setChunkRange] = useState({ start: 1, end: 100 })
//   const [annotationUpdateEvent, setAnnotationUpdateEvent] = useState(false) // State to trigger re-render on annotation updates

//   const chunkSize = CHUNK_SIZE // Fixed chunk size

//   useEffect(() => {
//     const root = document.documentElement

//     Object.entries(THEME_CSS_VARIABLES).forEach(([variable, value]) => {
//       root.style.setProperty(variable, value)
//     })

//     document.title = APP_CONFIG.brand.title
//   }, [])

//   // Fetch data for the current chunk range only when playing
//   useEffect(() => {
//     console.log(`useEffect triggered: currentFrame=${currentFrame}, isPlaying=${isPlaying}`);
//     if (!isPlaying || isFetching) return;

//     const fetchData = async () => {
//       setIsFetching(true); // Start fetching
//       const start = Math.floor((currentFrame - 1) / chunkSize) * chunkSize + 1;
//       const end = start + chunkSize - 1;
//       setChunkRange({ start, end });

//       await dataManager.fetchChunk(start, end);
//       const frameData = await dataManager.getFrameData(currentFrame);

//       if (frameData) {
//         setCurrentFrameData({
//           x: frameData.players.x,
//           y: frameData.players.y,
//         });
//       }
//       setIsFetching(false); // End fetching
//     };

//     fetchData();
//   }, [currentFrame, isPlaying]); // Fetch data only when playing

//   // Animation timer: auto-increment frame every second when playing, loop back to 1 after frame 50
//   useEffect(() => {
//     if (!isPlaying) return
//     if (isFetching) return

//     console.log('Incrementing frame', isFetching)
//     const interval = setInterval(() => {
//       if (!isFetching) {
//         setCurrentFrame(prev => (prev >= 50 ? 1 : prev + 1))
//       }
//     }, SLEEP_INTERVAL)

//     return () => clearInterval(interval)
//   }, [isPlaying, isFetching])

//   const handlePlayPause = () => {
//     setIsPlaying(!isPlaying)
//   }

//   const handleFrameChange = (frame: number) => {
//     setCurrentFrame(frame)
//     setIsPlaying(false) // Pause the animation when the user moves the slider
//   }

//   return (
//     <div className="app-shell">
//       <header className="app-header">
//         <h1 className="app-title">{APP_CONFIG.brand.title}</h1>
//         <div className="frame-status">Frame {currentFrame} / 50</div>
//       </header>

//       <div className="app-container">
//         <div className="main-content">
//           <Controls
//             isPlaying={isPlaying}
//             onPlayPause={handlePlayPause}
//             currentFrame={currentFrame}
//             onFrameChange={handleFrameChange}
//             chunkRange={chunkRange} // Pass chunkRange to Controls
//             annotationStore={annotationStore}
//           />
//           <PlotComponent currentFrame={currentFrame} x={currentFrameData.x} y={currentFrameData.y} annotationStore={annotationStore} onAnnotationUpdate={() => setAnnotationUpdateEvent(!annotationUpdateEvent)} />
//         </div>
//         <div className="right-panel">
//           <AnnotationDisplay annotationStore={annotationStore} currentFrame={currentFrame} annotationUpdateEvent={annotationUpdateEvent} />
//         </div>
//       </div>
//     </div>
//   )
// }

// export default App