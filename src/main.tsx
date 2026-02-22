import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { InstitutionProvider } from './contexts/InstitutionContext.tsx'
import { RefreshProvider } from './contexts/RefreshContext.tsx'
import App from './App.tsx'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <InstitutionProvider>
        <RefreshProvider>
          <App />
        </RefreshProvider>
      </InstitutionProvider>
    </BrowserRouter>
  </React.StrictMode>,
)

