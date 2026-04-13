import { Routes, Route, Navigate } from 'react-router-dom'
import { HomeScreen } from './pages/HomeScreen'
import { GameScreen } from './pages/GameScreen'

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeScreen />} />
      <Route path="/game/:roomId" element={<GameScreen />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
