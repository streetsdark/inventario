# Altadill — Inventario en tiempo real para PYMES

App SaaS multi-tenant para gestión de inventario con escáner QR,
multi-almacén, analíticas interactivas, auditoría completa y export GDPR.

> **Stack:** React 19 + Vite 7 + Firebase (Firestore + Auth + Hosting) +
> Cloudinary (imágenes) + Chart.js (analíticas) + html5-qrcode + jsPDF.

---

## ✨ Features

- 📊 **Analíticas interactivas** — clic en barras filtra por usuario/producto/período
- 📷 **Escáner QR/barcode** — usa la cámara del móvil; entrada/salida/solicitud inline
- 🏷️ **Generador de etiquetas QR** — individual o PDF masivo A4 (12-40 por hoja)
- 🏢 **Multi-almacén** — selector global + reasignación masiva entre almacenes
- 👥 **Multi-tenant** — aislamiento real a nivel de base de datos por `accountId`
- 📤 **Exportación CSV/PDF** — movimientos y stock listos para Excel y contabilidad
- 📥 **Importación CSV con staging** — revisa fila por fila antes de cargar al catálogo, con columnas virtuales editables
- 🛡️ **Auditoría completa** — cada acción sensible queda registrada
- 🔐 **GDPR** — export JSON de tus datos + borrar cuenta con triple confirmación
- 🎯 **Onboarding wizard** — 3 pasos guiados para nuevos owners
- 🔥 **Zona de peligro** — wipe completo de la app con triple confirmación (solo superuser)

---

## 🚀 Setup local

### 1. Requisitos
- Node.js 20+
- npm 10+
- Cuenta en [Firebase](https://console.firebase.google.com)
- (Opcional) Cuenta en [Cloudinary](https://cloudinary.com) para imágenes

### 2. Instalación
```bash
cd inventory
npm install
```

### 3. Variables de entorno
Crea `inventory/.env` siguiendo `.env.example`:
```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_SUPER_USER_EMAIL=tu-email@dominio.com
VITE_CLOUDINARY_CLOUD_NAME=...
VITE_CLOUDINARY_UPLOAD_PRESET=...
```
El email en `VITE_SUPER_USER_EMAIL` será promocionado automáticamente a
rol `superuser` la primera vez que inicie sesión.

### 4. Desarrollo
```bash
npm run dev          # http://localhost:5173
npm run test         # tests en watch
npm run test:run     # tests una vez (CI)
npm run lint         # ESLint
npm run verify       # tests + build + audit
```

---

## 🏗️ Arquitectura

### Capas
```
src/
├── views/          → Páginas (rutas top-level, lazy-loaded)
├── components/     → Componentes y cards del Dashboard
├── hooks/          → Lógica de datos (un hook por colección Firestore)
├── context/        → Estado global (Auth, Account, Warehouse)
├── utils/          → Helpers puros testeables (sin React ni Firebase)
├── routes/         → Router con lazy-loading por ruta
├── css/            → Estilos por componente
└── test/           → Vitest, ~250 tests
```

### Modelo multi-tenant
```
/accounts/{accountId}      → Organización/empresa (tenant)
/users/{uid}               → Perfil + accountId + accountRole
/products/{id}             → accountId + warehouseId
/moves/{id}                → accountId + warehouseId
/warehouses/{id}           → accountId
/productRequests/{id}      → accountId + userId
/notifications/{id}        → accountId
/auditLogs/{id}            → eventos globales (solo superuser lee)
```

Las **reglas de Firestore** (`firestore.rules`) refuerzan que
`doc.accountId === user.accountId` en cada lectura/escritura. Sin esto,
sería filtrado solo en cliente — vulnerable a DevTools.

### Roles
- **Roles globales:** `basic` / `admin` / `superuser` (en `users.role`)
- **Roles por cuenta:** `owner` / `admin` / `member` (en `users.accountRole`)

Cada usuario pertenece a **una sola cuenta** a la vez. El `superuser`
global tiene acceso de soporte a todas las cuentas.

---

## 🚢 Deploy

### Primera vez
```bash
firebase login
firebase use --add        # selecciona inventario-altadill (o tu proyecto)
```

### Deploys
```bash
npm run deploy            # build + hosting + firestore rules
npm run deploy:hosting    # solo hosting
npm run deploy:rules      # solo firestore rules (rápido)
```

### Configuración Firebase recomendada
1. **Auth providers**: Email/Password + Google
2. **Firestore region**: `eur3` (Europa) si tu mercado es EU
3. **Hosting**: configurar dominio custom desde la consola
4. **Plan Spark (gratis)** es suficiente hasta ~1000 cuentas activas

---

## 🛡️ Seguridad

- ✅ **0 vulnerabilidades** en `npm audit` (xlsx descartado por CVE sin fix)
- ✅ **CSP** estricto en `index.html`
- ✅ **Sanitización** centralizada en `utils/securityValidation.js`
- ✅ **Rate limiting** en login, invitaciones y acciones sensibles
- ✅ **Audit log** inmutable de cada acción privilegiada
- ✅ **Multi-tenant enforcement** a nivel Firestore rules
- ✅ **Triple confirmación** + cascade delete para borrado de cuenta
- ✅ **No `console.log` en producción** — uso de `utils/logger.js`

Reportar vulnerabilidades: **soporte@altadill.com**

---

## 🧪 Testing

### Unit + componentes (Vitest)
```bash
npm run test:run    # ejecuta toda la suite (~320 tests)
npm run test        # modo watch
```

Cobertura:
- ✅ Utils puros (sanitización, filtros, helpers de export/QR/scan)
- ✅ Hooks de datos (mocks de Firestore)
- ✅ Servicios (export, scan, qr, migraciones)
- ✅ Componentes críticos (CookieBanner, Modal, SignupAccountForm,
  WarehouseSwitcher, ListProducts, ExportCard, OnboardingWizard,
  AccountSettingsCard, Landing)

### E2E smoke (Playwright)
```bash
npm run e2e:install  # primera vez: descarga Chromium (~120 MB)
npm run e2e          # ejecuta la suite (lanza dev server auto)
npm run e2e:ui       # UI interactiva para depurar
npm run e2e:report   # ver reporte HTML del último run
```

Cobertura E2E:
- ✅ Landing carga, navega, FAQ se expande
- ✅ Páginas legales (/terms, /privacy, /cookies) renderizan
- ✅ Login muestra formulario sin sesión
- ✅ Cookie banner aparece, acepta, persiste y links a /cookies
- ✅ 404 amable + rutas protegidas redirigen a /login

---

## 📥 Importación CSV

Flujo no destructivo para cargar inventarios desde archivos CSV.

### Características
- **Staging area**: los datos se guardan en `/importStaging` separados de
  `/products`. Nada se añade al catálogo real hasta que el admin lo apruebe.
- **Editable celda por celda** antes de importar (corregir typos, ajustar valores).
- **Columnas virtuales insertables** entre cualquier par de columnas del CSV
  (útil para añadir info que no estaba en el origen).
- **Mapeo de columnas → campos de producto** (SKU, Descripción, Ubicación,
  Marca, Stock, Unidad).
- **Validación de mapeo con sample** — avisa si la columna mapeada a
  "Descripción" está vacía antes de importar.
- **Bulk import por batches** de 200 filas con barra de progreso en tiempo
  real.

### Flujo
1. **Card "Importar CSV"** (admin): seleccionas archivo (.csv, máx 5 MB,
   máx 1000 filas). Autodetect de separador `;` / `,` / `\t` / `|`.
2. **Card "Revisar import (staging)"**: ves la tabla completa, renombras
   cabeceras, insertas columnas virtuales, mapeas tus campos, editas celdas.
3. Por fila: ✅ importar como producto · ❌ descartar.
4. **Bulk**: botón "Importar TODAS las pendientes (N)" lanza todo en batches.

### Modelo de datos
```
/importStaging/{id}
  ├─ importId         (agrupa filas de la misma carga)
  ├─ accountId        (aislamiento multi-tenant)
  ├─ fileName
  ├─ rowIndex         (orden original en el CSV)
  ├─ cells[]          (array de strings tal cual)
  ├─ headerRow[] | null
  ├─ status           ("pending" | "imported" | "discarded")
  ├─ importedProductId  (si status=imported, ref al producto creado)
  └─ createdAt
```

### Persistencia local
Para evitar sobrecargar Firestore, estos datos viven solo en localStorage
del navegador (clave por `accountId`):
- Nombres custom de columnas originales
- Columnas virtuales insertadas + sus valores
- Mapeo de columnas configurado

Si cambias de dispositivo, se reinician (es solo metadata de revisión).

### Seguridad
- Solo `superuser` ve las cards de import.
- Reglas Firestore: write solo si `accountId == userAccountId()`.
- writeBatch atómico por chunk: si falla a la mitad, las filas anteriores
  ya están a salvo y las que faltan quedan en `pending` para reintentar.
- Audit log: `IMPORT_STAGED` al subir CSV, `STAGING_ROW_IMPORTED` por fila
  individual, `STAGING_BULK_IMPORTED` al final del bulk.

---

## 📋 Roadmap

- [x] Fase 1-4 — Multi-tenant con aislamiento real
- [x] Fase 6a — Landing pública
- [x] Fase 6b — Onboarding wizard
- [x] Fase 6c — Legal + GDPR
- [ ] **Fase 5** — Stripe + planes con límites
- [ ] Email transaccional (Resend / Postmark)
- [ ] App móvil nativa (React Native)
- [ ] API pública + webhooks

Los prompts detallados de cada fase están en `docs/prompt-*.md` para
poder reproducirlos en sesiones nuevas de Claude.

---

## 🤝 Contribuir

Trabajo en ramas `feat/<scope>` o `fix/<scope>`, squash-merge a `main`,
mensajes en español tipo `feat(scope): descripción`.

Antes de PR:
```bash
npm run verify      # tests + build + audit
```

---

## 📄 Licencia

Propietario. Todos los derechos reservados.
