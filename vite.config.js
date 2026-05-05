import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

export default defineConfig({
  plugins: [react()],
  
  server: {
    // Configuración de desarrollo
    cors: {
      origin: [
        'http://localhost:5173',
        'http://localhost:3000',
        'http://127.0.0.1:5173',
      ],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    }
  },
  
  build: {
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          firebase: ['firebase/app', 'firebase/firestore'],
          icons: ['react-icons']
        }
      }
    }
  }
})