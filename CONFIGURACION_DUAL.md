# 🔄 Configuración Dual: Local vs GitHub Pages

## 📋 **Resumen del Problema**

Tienes **DOS configuraciones diferentes** según dónde trabajes:

| Entorno | Configuración | Output | Características |
|---|---|---|---|
| **Local (Docker)** | `astro.config.local.mjs` | `server` (SSR) | ✅ API Routes<br>✅ Base de datos<br>✅ Stripe |
| **GitHub Pages** | `astro.config.mjs` | `static` | ❌ Solo HTML/CSS/JS<br>❌ Sin backend |

---

## 🚀 **Cambiar entre Configuraciones**

### **Opción 1: Renombrar archivos (Manual)**

```bash
# Para trabajar LOCAL con Stripe:
mv astro.config.mjs astro.config.pages.mjs     # Guardar config de Pages
mv astro.config.local.mjs astro.config.mjs     # Activar config local

# Para desplegar a GitHub Pages:
mv astro.config.mjs astro.config.local.mjs     # Guardar config local
mv astro.config.pages.mjs astro.config.mjs     # Activar config de Pages
```

### **Opción 2: Usar Scripts de NPM (Automático)** ⭐ RECOMENDADO

Agrega estos scripts a `package.json`:

```json
{
  "scripts": {
    "dev": "astro dev",
    "dev:local": "astro dev --config astro.config.local.mjs",
    "build": "astro build",
    "build:local": "astro build --config astro.config.local.mjs",
    "build:pages": "astro build --config astro.config.mjs",
    "preview": "astro preview"
  }
}
```

**Uso:**
```bash
# Desarrollo local con Stripe
npm run dev:local

# Build para producción local
npm run build:local

# Build para GitHub Pages
npm run build:pages
```

---

## 🐳 **Actualizar Dockerfile**

Para que Docker use la configuración correcta, modifica el `Dockerfile`:

```dockerfile
# En la sección de CMD, cambia:
CMD ["npm", "run", "dev"]

# Por:
CMD ["npm", "run", "dev:local"]
```

O mejor, usa una variable de entorno:

```dockerfile
ENV ASTRO_CONFIG=astro.config.local.mjs
CMD ["npm", "run", "dev", "--", "--config", "${ASTRO_CONFIG}"]
```

---

## ⚙️ **Configuración Recomendada**

### **Mantén 3 archivos:**

1. **`astro.config.mjs`** - Para GitHub Pages (static)
   ```js
   output: "static",
   site: "https://EstudiaGit.github.io",
   base: "/eventotickets",
   ```

2. **`astro.config.local.mjs`** - Para desarrollo local (SSR)
   ```js
   output: "server",
   adapter: node({ mode: "standalone" }),
   // Sin site/base
   ```

3. **`.gitignore`** - NO ignorar ninguno
   ```
   # Mantener ambas configuraciones en git
   # NO agregar astro.config*.mjs aquí
   ```

---

## 📦 **Flujo de Trabajo Completo**

### **Desarrollo Local con Stripe:**

```bash
# 1. Levantar Docker con config local
docker compose up -d

# 2. Usar la configuración SSR
docker compose exec app npm run dev:local

# 3. Crear API routes, probar Stripe, etc.
# Acceder a: http://localhost:4321
```

### **Desplegar a GitHub Pages:**

```bash
# 1. Asegurarte de usar la config correcta
npm run build:pages  # Prueba local primero

# 2. Commit y push
git add .
git commit -m "Update: ready for GitHub Pages"
git push origin main

# GitHub Actions usará automáticamente astro.config.mjs
```

---

## 🎯 **Mejor Solución: Variable de Entorno**

Crea una **única configuración** que se adapte según el entorno:

**`astro.config.mjs`** (único archivo):
```js
import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";
import node from "@astrojs/node";

const isLocal = process.env.NODE_ENV === 'development';

export default defineConfig({
  // Solo para GitHub Pages
  ...(isLocal ? {} : {
    site: "https://EstudiaGit.github.io",
    base: "/eventotickets",
  }),

  // SSR en local, estático en Pages
  output: isLocal ? "server" : "static",

  // Adapter solo en SSR
  ...(isLocal ? {
    adapter: node({ mode: "standalone" }),
  } : {}),

  integrations: [tailwind({ applyBaseStyles: true })],

  server: {
    host: "0.0.0.0",
    port: 4321,
  },

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
```

**docker-compose.yml:**
```yaml
environment:
  - NODE_ENV=development  # ← Ya lo tienes
```

Con esto, **un solo archivo** funciona en ambos entornos automáticamente. 🎉

---

## ✅ **Recomendación Final**

**Para tu caso**, te recomiendo:

1. **Mantener dos archivos separados** (más claro y explícito):
   - `astro.config.mjs` → GitHub Pages
   - `astro.config.local.mjs` → Docker local

2. **Usar scripts de NPM** para cambiar entre ellos:
   ```json
   "dev:local": "astro dev --config astro.config.local.mjs"
   ```

3. **Actualizar Dockerfile** para usar `dev:local`:
   ```dockerfile
   CMD ["npm", "run", "dev:local"]
   ```

Esto te da control total y evita confusiones. 🚀

---

**¿Quieres que implemente alguna de estas opciones ahora?**
