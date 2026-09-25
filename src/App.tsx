import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { PanteHeader } from './components/PanteHeader'
import { HomePage } from './pages/HomePage'
import { DexPage } from './pages/DexPage'

export default function App() {
  return (
    <BrowserRouter>
      <PanteHeader />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/dex" element={<DexPage />} />
      </Routes>
    </BrowserRouter>
  )
}
