import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/tokens.css'
import './styles/global.css'
import './styles/layout.css'
import { AuthProvider } from './context/AuthContext.jsx'
import App from './App.jsx'
import { watchForUpdates } from './utils/swUpdate.js'

watchForUpdates()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
)
