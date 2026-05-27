import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    hmr: {
      overlay: true,
      // Use a specific port for HMR WebSocket to avoid conflicts
      // clientPort: 5173, // Or any other available port, e.g., 24678
    },
  },
})
