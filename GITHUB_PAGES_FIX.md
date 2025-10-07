# 🔧 Solución de Problemas - GitHub Pages

## ✅ Cambios Realizados

### 1. **astro.config.mjs** - Limpiado y optimizado
- ✅ Configuración correcta de `site` y `base`
- ✅ `output: "static"` para GitHub Pages
- ✅ Código comentado eliminado

### 2. **deploy.yml** - Workflow mejorado
- ✅ Formato correcto sin líneas problemáticas
- ✅ Configuración explícita de Node 20
- ✅ Path especificado correctamente

## 🚨 IMPORTANTE: Configuración de GitHub Pages

Debes verificar que GitHub Pages esté configurado correctamente en tu repositorio:

### Pasos para Configurar GitHub Pages:

1. Ve a tu repositorio: `https://github.com/EstudiaGit/eventotickets`

2. Haz clic en **Settings** (Configuración)

3. En el menú lateral izquierdo, busca **Pages**

4. En la sección **Build and deployment**:
   - **Source**: Debe estar en **"GitHub Actions"** (NO "Deploy from a branch")
   - Si aparece "Deploy from a branch", cámbialo a "GitHub Actions"

### Captura de pantalla de referencia:
```
Source: GitHub Actions ✓
```

## 🔍 Verificar Errores en GitHub Actions

1. Ve a la pestaña **Actions** de tu repositorio
2. Busca el último workflow que se ejecutó
3. Si hay errores, haz clic en el workflow fallido para ver los logs

### Errores Comunes:

#### Error 1: "Repository not found" o permisos
**Solución**: Verifica que GitHub Actions tenga permisos de escritura
- Settings → Actions → General → Workflow permissions
- Selecciona "Read and write permissions"

#### Error 2: 404 después del deploy
**Causa**: Base path incorrecto o GitHub Pages no configurado
**Solución**: Ya está corregido en `astro.config.mjs`

#### Error 3: Build falla por dependencias
**Solución**: Asegúrate de que todas las dependencias estén en `package.json`

## 🧪 Probar Localmente Antes de Subir

```bash
# Instalar dependencias
npm install

# Construir el sitio estático
npm run build

# Previsualizar el build (simula GitHub Pages)
npm run preview
```

El preview debería estar en: `http://localhost:4321/eventotickets/`

## 📤 Subir los Cambios

```bash
# Ver cambios
git status

# Añadir archivos modificados
git add astro.config.mjs .github/workflows/deploy.yml

# Commit
git commit -m "fix: Corregir configuración de GitHub Pages"

# Subir a GitHub
git push origin main
```

## ⏱️ Tiempo de Despliegue

- Después del push, GitHub Actions tardará **2-5 minutos** en construir y desplegar
- Puedes ver el progreso en la pestaña "Actions"

## 🌐 URL Final

Tu sitio debería estar disponible en:
```
https://EstudiaGit.github.io/eventotickets/
```

## 🆘 Si Sigue Sin Funcionar

Revisa:
1. ✅ GitHub Pages está en modo "GitHub Actions" (no "Deploy from a branch")
2. ✅ El workflow se ejecuta sin errores (pestaña Actions)
3. ✅ El nombre del repositorio es exactamente "eventotickets"
4. ✅ La rama principal se llama "main" (no "master")

## 📝 Notas Adicionales

- El sitio NO estará en `https://EstudiaGit.github.io/` directamente
- DEBE incluir `/eventotickets/` al final
- Todos los enlaces internos en tu código deben usar rutas relativas o el helper de Astro

### Ejemplo de enlaces correctos en Astro:
```astro
<!-- ❌ Incorrecto -->
<a href="/about">Sobre nosotros</a>

<!-- ✅ Correcto -->
<a href="/eventotickets/about">Sobre nosotros</a>

<!-- ✅ Mejor: Usar el helper de Astro -->
<a href={import.meta.env.BASE_URL + 'about'}>Sobre nosotros</a>
```

---
**Última actualización**: 2025-10-07
