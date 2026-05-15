# Prompt: Multi-tenant Fase 6 — Onboarding, Landing y Legal/GDPR

> Pega este bloque entero en una sesión NUEVA de Claude Code dentro de este
> proyecto. **Pre-requisito:** Fases 1-4 completadas y mergeadas a `main`.

---

# Tarea: Preparar el lanzamiento SaaS (Landing + Onboarding + Legal)

Eres un ingeniero senior con experiencia en SaaS B2B y diseño de producto.
Vas a preparar la app para lanzamiento público, en 3 sub-fases que se
ejecutan en orden y se commitean independientemente.

---

## Contexto del proyecto

- **Stack:** React 19 + Vite + Firebase Firestore + Firebase Auth +
  Firebase Hosting + React Router 7.
- **Working dir:** `inventory/`.
- **Default branch:** `main`.
- **Tests:** 230 passing. Deben seguir verdes al final.

### Estado actual

- Fases 1-4 (multi-tenant + aislamiento real) ✅
- Auth con email+Google, roles globales y por cuenta
- `AccountContext` y `WarehouseContext` listos
- Auditoría completa en `auditLogs`

---

## Sub-fase 6a — Landing page pública

### Objetivo
Tener una página `/` accesible sin login que sirva como punto de entrada
de leads. Si el usuario está logueado, redirige al Dashboard.

### Entregables

1. **`src/views/Landing.jsx`** — componente público con secciones:
   - `LandingHero` con propuesta de valor + CTA "Empieza gratis"
   - `LandingFeatures` con 6 features destacadas (analíticas interactivas,
     escáner QR, multi-almacén, exportación, multi-tenant, auditoría)
   - `LandingPricing` con 3 planes (Starter €29, Pro €79, Business €149)
     y nota "14 días gratis"
   - `LandingFAQ` con 6 preguntas comunes
   - `LandingFooter` con links a /terms, /privacy y al GitHub
2. **`src/css/landing.css`** estilizado con la paleta existente
3. **Routing:** modificar `src/routes/Router.jsx` para que:
   - `/` sin login → `<Landing />`
   - `/` con login → redirige a `/dashboard`
   - Las rutas existentes intactas
4. **SEO:** actualizar `index.html` con meta description, OG image, title
   sin tocar la CSP

### Reglas duras 6a
- No modificar componentes existentes del Dashboard.
- No añadir dependencias nuevas (CSS puro, no Tailwind nuevo).
- Mantener compatibilidad con el routing actual.

---

## Sub-fase 6b — Onboarding wizard

### Objetivo
Guiar al usuario nuevo en sus primeros 3 pasos críticos. Reduce drop-off.

### Entregables

1. **Extender `users/{uid}` con `onboardingCompleted: boolean`** (default
   `false` para nuevos; los existentes lo ven como `true` para no molestar).
2. **`src/hooks/useOnboarding.js`** — lee/escribe el flag y devuelve
   `{ completed, complete(), skip() }`.
3. **`src/components/OnboardingWizard.jsx`** — modal-fullscreen con 3 pasos:
   - **Paso 1:** "Cuéntanos de tu negocio" (campos: sector, tamaño equipo,
     ubicación principal). Guarda en `accounts/{accountId}.metadata`.
   - **Paso 2:** "Tu primer almacén" — pre-rellenado con "Almacén
     Principal", botón "Crear" o "Saltar".
   - **Paso 3:** "Tu primer producto" — formulario simplificado (SKU, nombre,
     stock) o botón "Cargar 5 productos de ejemplo" o "Saltar".
4. **Lógica de presentación:**
   - Aparece automáticamente cuando user.accountRole == "owner" y
     !onboardingCompleted Y user.accountId existe.
   - Solo se muestra una vez. Hay un botón "Saltar todo" en cada paso.
   - Se marca `onboardingCompleted = true` al finalizar o saltar.
5. **`src/components/OnboardingProgress.jsx`** — barra de progreso 1/3, 2/3, 3/3

### Reglas duras 6b
- No bloquear el Dashboard si el usuario saltea. El wizard es opcional.
- Datos del wizard sanitizados con `sanitizeString` antes de guardar.
- `logAuditEvent("ONBOARDING_COMPLETED" o "ONBOARDING_SKIPPED")` al final.

---

## Sub-fase 6c — Legal + GDPR

### Objetivo
Cumplir mínimos legales para operar en UE: TOS, privacy, cookies, derechos
GDPR (export + delete).

### Entregables

1. **Páginas estáticas (markdown-like):**
   - `src/views/Terms.jsx` — términos y condiciones (plantilla genérica
     SaaS para España, adaptable, comentario indicando "revisar con abogado")
   - `src/views/Privacy.jsx` — política de privacidad mencionando
     subprocesadores (Firebase, Cloudinary, Stripe-futuro)
   - `src/views/Cookies.jsx` — qué cookies se usan (auth, preferencias)
2. **`src/components/CookieBanner.jsx`** — banner inferior con botones
   "Aceptar" / "Rechazar" / "Configurar". Guarda decisión en localStorage
   con clave `altadill.cookieConsent`. Solo Firebase Auth si rechaza.
3. **`src/components/AccountSettingsCard.jsx`** — card admin (solo owner)
   con dos secciones:
   - **Exportar mis datos** — botón que genera JSON con todo lo del
     `accountId` actual (products, moves, warehouses, productRequests,
     notifications, account info, members) y lo descarga
   - **Borrar mi cuenta** — botón rojo con triple confirmación:
     1. Modal: "¿Estás seguro? Esto borra TODOS tus datos."
     2. Modal: "Escribe el nombre de tu cuenta para confirmar: ___"
     3. Modal: "Última oportunidad. Borrar permanentemente."
     - Tras confirmar: cascade delete (products + moves + warehouses +
       productRequests + notifications con su accountId) + delete account +
       desvincular user.
4. **`src/utils/dataExport.js`** — helper puro: agrupa los datos y
   produce el blob JSON.
5. **`src/utils/dataDelete.js`** — helper que itera colecciones por
   accountId y borra en chunks (writeBatch, 500 max).
6. **Footer global** con links a /terms, /privacy, /cookies (en Landing y
   en Dashboard).

### Reglas duras 6c
- Tests para `dataExport.js` y `dataDelete.js` (helpers puros con mocks).
- Auditoría: `logAuditEvent("DATA_EXPORTED")`, `logAuditEvent("ACCOUNT_DELETED")`.
- Si el cookie banner se rechaza, no cargar Cloudinary/analytics. Solo
  Firebase Auth (legítimo interés).
- Triple confirmación con nombre exacto de cuenta antes de delete (anti
  destructive mistake).

---

## Reglas duras globales

### NO toques
- Componentes existentes del Dashboard salvo para añadir el footer global
  o el botón "Salir" si no existe.
- Hooks existentes (useProducts, useMoves, etc.) salvo si necesitas saber
  conteo para el export.
- Tests existentes — añade nuevos.
- `firestore.rules` salvo si necesitas ajustar `auditLogs` o `accounts`
  para soportar export/delete (lo más probable: nada).

### SÍ puedes tocar
- `src/routes/Router.jsx` (Sub-fase 6a)
- `src/App.jsx` (montar CookieBanner global)
- `src/views/Dashboard.jsx` (montar OnboardingWizard y AccountSettingsCard)
- `index.html` (SEO meta tags, sin CSP)
- `src/hooks/useAccount.js` SOLO si necesitas añadir un método para borrar
  cuenta (cascade)

---

## Plan de ejecución

Tres ramas, una por sub-fase, mergeadas a `main` con squash al final:

### Rama `feat/landing-page` (6a)
1. Crear Landing.jsx + sus sub-componentes
2. Modificar Router para `/` público
3. Build + tests + commit + merge a main

### Rama `feat/onboarding-wizard` (6b)
1. Extender users con onboardingCompleted
2. Crear useOnboarding + OnboardingWizard
3. Montar en Dashboard
4. Build + tests + commit + merge a main

### Rama `feat/legal-gdpr` (6c)
1. Crear dataExport.js y dataDelete.js + tests
2. Crear views Terms / Privacy / Cookies
3. Crear CookieBanner y AccountSettingsCard
4. Añadir rutas y footer
5. Build + tests + commit + merge a main

---

## Verificación final

- `npm run test:run` → todos verdes
- `npm run build` → sin errores
- `npm audit` → 0 vulnerabilidades
- Pruebas manuales:
  - Visitar `/` sin login → landing
  - Visitar `/` con login → dashboard
  - Crear cuenta nueva → wizard aparece, completarlo o saltarlo
  - Cookie banner aparece en primera visita
  - Botón "Exportar datos" descarga JSON con todo
  - Botón "Borrar cuenta" requiere escribir nombre exacto

---

## Lo que NO hacemos en Fase 6

- ❌ Stripe / billing (es Fase 5, hazla después si decides cobrar)
- ❌ Email transaccional (Resend, Postmark — lo añades cuando tengas
  primer cliente real)
- ❌ Multi-idioma (i18n) — añadible más tarde
- ❌ TypeScript

---

## Reportar al final

Para cada sub-fase: archivos creados/modificados, tests añadidos,
desviaciones justificadas.

¿Listo? Empieza por 6a (Landing). Cuando termines, sigue con 6b. Después
6c. Un commit por sub-fase, squash al hacer merge a main.
