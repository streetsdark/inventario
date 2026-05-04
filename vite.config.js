import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

export default defineConfig({
  plugins: [react()],
  
  build: {
    chunkSizeWarningLimit: 800, // evita warning molesto (opcional)

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