import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { PanteHeader } from './components/PanteHeader'
import { HomePage } from './pages/HomePage'
import { DexPage } from './pages/DexPage'
import { PresalePage } from './pages/PresalePage'
import { DevPage } from './pages/DevPage'

export default function App() {
  return (
    <BrowserRouter>
      <PanteHeader />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/dex" element={<DexPage />} />
        <Route path="/presale" element={<PresalePage />} />
        {/* /dev is intentionally hidden from public nav */}
        <Route path="/dev" element={<DevPage />} />
      </Routes>
    </BrowserRouter>
  )
}
