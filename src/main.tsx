import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import { I18nProvider } from './i18n/I18nContext.tsx'
import { inOwlbear } from './owlbear/host'
import { connectOwlbear } from './owlbear/owlbearStore'
import './index.css'

function render() {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <I18nProvider>
        <BrowserRouter basename={import.meta.env.BASE_URL}>
          <App />
        </BrowserRouter>
      </I18nProvider>
    </StrictMode>,
  )
}

// Inside Owlbear the SDK has to read the URL before the router rewrites it; elsewhere it isn't loaded at all.
if (inOwlbear) void connectOwlbear().catch(console.error).finally(render)
else render()
