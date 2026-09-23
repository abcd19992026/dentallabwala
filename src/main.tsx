import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import { App } from './app/App'

// Registered here (not via vite-plugin-pwa's HTML injection) so the service
// worker only activates for the app shell (app.html), never the static
// landing page (index.html) at "/", which never loads this bundle.
registerSW({ immediate: true })

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Root element not found. Make sure index.html has <div id="root">.')
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>
)
