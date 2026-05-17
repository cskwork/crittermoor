import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App'
import { ErrorBoundary } from './app/ErrorBoundary'
import './app/index.css'

const rootEl = document.getElementById('root')
if (!rootEl) throw new Error('#root not found')

window.addEventListener('unhandledrejection', (e) => {
  console.error('[Crittermoor] unhandled promise rejection', e.reason)
})

createRoot(rootEl).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
