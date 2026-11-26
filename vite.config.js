import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(),tailwindcss()],
  build: {
    // exceljs (~950 kB) va en su propio chunk y sólo se descarga al exportar a Excel
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // Librerías base en archivos propios: cambian poco, así que el
        // navegador las conserva en caché entre despliegues.
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (/node_modules\/(react|react-dom|react-router|react-router-dom|scheduler)\//.test(id)) return 'react';
          if (id.includes('node_modules/@supabase/')) return 'supabase';
        },
      },
    },
  },
})
