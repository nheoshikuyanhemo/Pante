import { Component, type ReactNode } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { PanteHeader } from './components/PanteHeader'
import { HomePage } from './pages/HomePage'
import { DexPage } from './pages/DexPage'

// ── Error Boundary — prevents blank black screen on runtime crash ──────────
class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { error: null }
  }
  static getDerivedStateFromError(error: Error) {
    return { error }
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{
          minHeight: '100vh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          background: '#0d0d1a', color: '#ff9500',
          fontFamily: 'Courier New, monospace', padding: '2rem', gap: '1rem',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '2rem' }}>⚠</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>Pante failed to load</div>
          <div style={{ fontSize: '0.8rem', color: '#888', maxWidth: 480 }}>
            {this.state.error.message}
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: '1rem', background: '#ff9500', color: '#000',
              border: 'none', borderRadius: 6, padding: '0.5rem 1.5rem',
              fontFamily: 'Courier New, monospace', cursor: 'pointer', fontWeight: 700,
            }}
          >
            Reload
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

// ── App ───────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <PanteHeader />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/dex" element={<DexPage />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
