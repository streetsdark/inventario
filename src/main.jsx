import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import firebase from 'firebase/compat/app';
import App from './App.jsx'

const { VITE_FIREBASE_CONFIG } = import.meta.env

// Iniciamos firebaseApp
firebase.initializeApp(JSON.parse(VITE_FIREBASE_CONFIG));

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
