// astro.config.local.mjs
// Configuración para desarrollo local con Docker + Stripe
import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";
import node from "@astrojs/node";

// https://astro.build/config
export default defineConfig({
  // NO usar site/base en local (solo para GitHub Pages)
  
  // Modo SSR (Server-Side Rendering)
  // Necesario para API routes y llamadas a base de datos
  output: "server",

  // Adaptador Node.js
  adapter: node({
    mode: "standalone",
  }),

  // Integraciones
  integrations: [
    tailwind({
      applyBaseStyles: true,
    }),
  ],

  // Configuración del servidor de desarrollo
  server: {
    host: "0.0.0.0", // Escucha en todas las interfaces (necesario para Docker)
    port: 4321,
  },

  // Configuración de Vite (el bundler que usa Astro)
  vite: {
    server: {
      watch: {
        // CRÍTICO para Docker en Windows/Mac
        // Sin esto, los cambios no se detectan
        usePolling: true,
        interval: 1000, // Chequear cambios cada segundo
      },
      // Hot Module Replacement
      hmr: {
        overlay: true, // Mostrar errores en pantalla
      },
    },
  },
});
