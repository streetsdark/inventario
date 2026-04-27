import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import firebase from 'firebase/compat/app'
import 'firebase/compat/auth'
import 'firebase/compat/firestore'
import App from './App.jsx'

const config = import.meta.env.VITE_FIREBASE_CONFIG

if (!config) {
  throw new Error("❌ Falta VITE_FIREBASE_CONFIG en .env")
}

let firebaseConfig

try {
  firebaseConfig = JSON.parse(config)
} catch (error) {
  throw new Error("❌ VITE_FIREBASE_CONFIG no es JSON válido")
}

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig)
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
)