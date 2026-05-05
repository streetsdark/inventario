# 📋 REPORTE DE CÓDIGO NO UTILIZADO - Altadill Inventory

**Fecha:** 4 de mayo de 2026  
**Análisis completado:** Codebase completo

---

## ⚠️ RESUMEN EJECUTIVO

Se han identificado **múltiples elementos no utilizados** que pueden ser eliminados para limpiar el código:

- **Dependencias no usadas:** 1
- **Archivos no importados:** 3
- **Imports dentro de archivos:** 5+
- **Hooks no implementados:** 2
- **Código comentado:** 1 línea importante

---

## 🔍 DETALLE DE PROBLEMAS

### 1. **DEPENDENCIAS NPM NO UTILIZADAS**

#### ❌ `react-switch` (7.1.0)
- **Ubicación:** `package.json`
- **Estado:** Importada pero **NO USADA**
- **Evidencia:**
  - Importada en [Navbar.jsx](src/components/Navbar.jsx#L5): `import Switch from 'react-switch';`
  - Importada en [Sidebar.jsx](src/components/Sidebar.jsx#L4): `import Switch from "react-switch";`
  - **Nunca se renderiza en el JSX** - No aparece en ningún componente
- **Acción:** Eliminar de `package.json` y desinstalar con `pnpm remove react-switch`

---

### 2. **ARCHIVOS NO UTILIZADOS**

#### ❌ [src/components/Password.jsx](src/components/Password.jsx)
- **Importado en:** [ProfileCard.jsx](src/components/ProfileCard.jsx#L10)
- **Renderizado en:** [ProfileCard.jsx](src/components/ProfileCard.jsx#L79)
- **Status:** Se usa pero solo en ProfileCard
- **Nota:** Este archivo está siendo usado, no eliminar

#### ✅ [src/hooks/useMoves.js](src/hooks/useMoves.js)
- **Importado:** No encontrado en búsqueda global
- **Usado por:** Ningún componente
- **Status:** **NO UTILIZADO** - Puede eliminarse

#### ✅ [src/hooks/useProducts.js](src/hooks/useProducts.js)
- **Importado:** No encontrado en búsqueda global
- **Usado por:** Ningún componente
- **Status:** **NO UTILIZADO** - Puede eliminarse

#### ✅ [src/hooks/useRole.js](src/hooks/useRole.js)
- **Importado en:** [useSecureAccess.js](src/hooks/useSecureAccess.js)
- **Usado por:** `useSecureAccess` (que tampoco se utiliza)
- **Status:** **NO UTILIZADO** - Puede eliminarse

---

### 3. **IMPORTS NO UTILIZADOS DENTRO DE ARCHIVOS**

#### [src/components/FormLogin.jsx](src/components/FormLogin.jsx#L11)
```javascript
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  //sendPasswordResetEmail  ← COMENTADO, NUNCA USADO
}
```
- ✅ `sendPasswordResetEmail` - Comentado y no usado
- Acción: Documentar o implementar

#### [src/views/Profile.jsx](src/views/Profile.jsx#L4-L5)
```javascript
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
```
- **Problema:** Usando SDK antiguo (`compat`) mientras otros archivos usan el nuevo
- **Inconsistencia:** Mezcla de `firebase/compat` con Firestore moderno
- **Acción:** Migrar a SDK moderno como en otros archivos

#### [src/components/ProfileCard.jsx](src/components/ProfileCard.jsx#L5-L6)
```javascript
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
```
- **Mismo problema que Profile.jsx**
- **Acción:** Migrar a SDK moderno

#### [src/views/Dashboard.jsx](src/views/Dashboard.jsx#L12-L14)
```javascript
import firebase from 'firebase/compat/app';
import "firebase/compat/firestore";
```
- **Problema:** Usando SDK antiguo
- **Acción:** Migrar a moderno (ya tiene imports de `firebase/firestore`)

#### [src/views/Moves.jsx](src/views/Moves.jsx#L4-L5)
```javascript
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
```
- **Mismo problema**
- **Acción:** Migrar a SDK moderno

#### [src/components/ListProducts.jsx](src/components/ListProducts.jsx#L3-L4)
```javascript
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
```
- **Mismo problema**
- **Acción:** Migrar a SDK moderno

---

### 4. **CÓDIGO COMENTADO/DESHABILITADO**

#### [src/main.jsx](src/main.jsx#L3)
```javascript
//import firebase from 'firebase/compat/app';
```
- **Status:** Comentado innecesariamente
- **Acción:** Eliminar

#### [src/main.jsx](src/main.jsx#L7-L9)
```javascript
//const { VITE_FIREBASE_CONFIG } = import.meta.env
// Iniciamos firebaseApp
//firebase.initializeApp(JSON.parse(VITE_FIREBASE_CONFIG));
```
- **Status:** Deshabilitado - Firebase ya se inicializa en [firebase/config.js](src/firebase/config.js)
- **Acción:** Eliminar

---

### 5. **HOOKS NO UTILIZADOS**

#### ❌ [src/hooks/useSecureAccess.js](src/hooks/useSecureAccess.js)
- **Status:** Importado pero **NUNCA USADO** en la app
- **Usado en:** Búsqueda no encontró referencias
- **Acción:** Eliminar si no se planea implementar

---

### 6. **VISTAS/RUTAS NO COMPLETAMENTE INTEGRADAS**

#### ⚠️ [src/views/SecurityTests.jsx](src/views/SecurityTests.jsx)
- **Status:** Existe y está en Router, pero probablemente es para testing
- **Componentes que usa:**
  - [SecurityTestPanel.jsx](src/components/SecurityTestPanel.jsx)
  - [ProfileCard.jsx](src/components/ProfileCard.jsx)
- **Acción:** Revisar si se necesita en producción

---

## 📊 TABLA RESUMEN

| Elemento | Tipo | Status | Acción |
|----------|------|--------|--------|
| `react-switch` | Dependencia | ❌ No usado | Eliminar |
| `useMoves.js` | Hook | ❌ No usado | Eliminar |
| `useProducts.js` | Hook | ❌ No usado | Eliminar |
| `useRole.js` | Hook | ⚠️ Usado por `useSecureAccess` | Eliminar con `useSecureAccess` |
| `useSecureAccess.js` | Hook | ❌ No usado | Eliminar |
| Firebase compat en 5 archivos | Import | ⚠️ Funciona pero inconsistente | Migrar a moderno |
| `main.jsx` líneas comentadas | Código | ⚠️ Innecesario | Limpiar |

---

## ✅ ARCHIVO ESTÁ BIEN ORGANIZADO

- ✅ [src/hooks/useAuth.js](src/hooks/useAuth.js) - Usado correctamente
- ✅ [src/components/Modal.jsx](src/components/Modal.jsx) - Usado en múltiples lugares
- ✅ [src/components/Layout.jsx](src/components/Layout.jsx) - Usado correctamente
- ✅ [src/routes/Router.jsx](src/routes/Router.jsx) - Bien estructurado

---

## 🚀 RECOMENDACIONES

### Prioridad ALTA
1. **Eliminar `react-switch`** del package.json (no se utiliza)
2. **Eliminar hooks no usados:** `useMoves.js`, `useProducts.js`, `useRole.js`, `useSecureAccess.js`
3. **Limpiar `main.jsx`** - Remover líneas comentadas
4. **Migrar Firebase SDK** de compat a moderno en 5 archivos

### Prioridad MEDIA
5. Revisar si `SecurityTests.jsx` es necesario en producción
6. Consolidar lógica de Firebase en `firebase/config.js`

### Prioridad BAJA
7. Documentar por qué existen `Password.jsx` si solo se usa en un lugar

---

## 📝 NOTAS ADICIONALES

- La app tiene buena estructura general
- Los componentes principales están bien organizados
- Existe inconsistencia en el uso de Firebase SDK (compat vs moderno)
- Hay varias utilidades de seguridad que podrían no estar siendo aprovechadas

