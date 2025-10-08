// astro.config.mjs
import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";

// https://astro.build/config
export default defineConfig({
  // URL de tu sitio en GitHub Pages
  site: "https://EstudiaGit.github.io",
  
  // Base path - debe coincidir con el nombre del repositorio
  base: "/eventotickets",
  
  // Output estático para GitHub Pages
  output: "static",
  
  // Integraciones
  integrations: [
    tailwind({
      applyBaseStyles: true,
    }),
  ],

  // Excluir rutas de API de la compilación estática
  exclude: ['src/pages/api/**'],
  
  // Configuración del servidor de desarrollo local
  server: {
    host: "0.0.0.0",
    port: 4321,
  },
  
  // Configuración de Vite para desarrollo en Docker
  vite: {
    server: {
      watch: {
        usePolling: true,
        interval: 1000,
      },
      hmr: {
        overlay: true,
      },
    },
  },
});
