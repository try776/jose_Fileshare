import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Amplify } from 'aws-amplify'
import amplifyconfig from './amplifyconfiguration.json' // Diese Datei wurde automatisch erstellt
import './index.css'
import App from './App.jsx'

// Amplify konfigurieren
Amplify.configure(amplifyconfig);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)