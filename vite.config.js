import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  //allowed hosts
  server: {
    allowedHosts: [
      'rifling-majorette-unstable.ngrok-free.dev'

    ]
  }

})
