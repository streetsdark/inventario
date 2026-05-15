# Prompt: Multi-tenant Fase 1 — base no destructiva

> Pega este bloque entero en una sesión NUEVA de Claude Code dentro de este
> proyecto. Está diseñado para ejecutarse sin romper el código actual.

---

# Tarea: Convertir mi app de inventario en multi-tenant (Fase 1 — no destructiva)

Eres un ingeniero senior con experiencia en SaaS B2B sobre Firebase. Vas a
implementar la **base de multi-tenancy** en una app React + Firebase ya en
producción, **sin romper nada** y siguiendo las reglas de este documento.

---

## Contexto del proyecto

- **Stack:** React 19 + Vite 7 + Firebase Firestore + Firebase Auth +
  Firebase Hosting. CSS modular por componente. Sin TypeScript.
- **Working dir:** `inventory/` (todo lo demás es root del repo).
- **Default branch:** `main`. Crea una rama nueva para esta tarea.
- **Estado actual:** single-tenant. Una instancia Firebase = un cliente.
- **Tests:** Vitest. 168 tests passing. `npm run test:run` debe seguir
  pasando al final.
- **Seguridad ya en sitio:**
  - `src/utils/securityValidation.js` (sanitizeString, isValidQuantity,
    isValidDate, isValidEmail, validateProduct, etc.)
  - `src/utils/auditService.js` (logAuditEvent, AuditEventTypes, triggerWebhook)
  - `src/utils/rateLimiter.js` (RateLimiter clase con tests)
  - `firestore.rules` con helpers `isAuth()`, `userRole()`, `isPrivileged()`,
    `isSuperuser()`
- **Patrón de contexto a seguir:** mira `src/context/WarehouseContext.jsx` y
  `src/hooks/useWarehouses.js`. Replica esa estructura.
- **Patrón de hook con CRUD a Firestore:** `src/hooks/useWarehouses.js`.
- **Patrón de card admin en Dashboard:** mira `src/components/WarehouseManager.jsx`.
- **Patrón de helper puro testeable:** `src/utils/warehouseFilter.js` +
  `src/test/warehouseFilter.test.js`.

---

## Colecciones Firestore actuales (a respetar)

```
/users/{uid}                  → { email, displayName, role, createdAt }
/products/{id}                → { sku, description, stock, warehouseId, ... }
/moves/{id}                   → { productId, type, quantity, warehouseId, ... }
/warehouses/{id}              → { name, location, isDefault, createdAt }
/productRequests/{id}         → { productId, userId, status, warehouseId, ... }
/notifications/{id}           → { title, message, ... }
/auditLogs/{id}               → { eventType, actor, resource, payload, ts }
```

Reglas Firestore actuales en `inventory/firestore.rules` — léelas antes de
tocar nada.

---

## Lo que tienes que construir (Fase 1)

**Objetivo:** introducir el concepto de `Account` (organización/empresa) sin
romper la app que ya funciona. Al final de esta fase:
- Los nuevos registros traen `accountId` en cada documento.
- Los datos antiguos (sin `accountId`) siguen funcionando bajo una "cuenta
  legacy" que se crea automáticamente la primera vez.
- Los queries empiezan a filtrar por `accountId` cuando éste existe.
- Las reglas Firestore **NO se endurecen todavía** (eso es Fase 4). Aquí
  solo habilitamos lectura/escritura de `/accounts`.
- Hay UI para crear cuenta nueva (signup), ver miembros y rol por cuenta.

### Entregables concretos

1. **Modelo de datos**
   - Nueva colección `/accounts/{accountId}` con shape:
     ```js
     {
       name: string,            // "ACME S.L."
       slug: string,            // "acme" (único, derivado de name, validado)
       ownerId: string,         // uid del owner
       plan: "free" | "starter" | "pro" | "business",
       status: "active" | "suspended" | "trial",
       trialEndsAt: timestamp | null,
       createdAt: serverTimestamp,
       memberCount: number,     // denormalizado, mantenido por hook
     }
     ```
   - Extender `/users/{uid}`:
     ```js
     {
       ...campos actuales,
       accountId: string | null,           // nuevo
       accountRole: "owner" | "admin" | "member" | null,  // nuevo, distinto de role global
     }
     ```
   - **NO toques** las colecciones de datos (`products`, `moves`, etc.) en esta
     fase — eso es Fase 2.

2. **Helpers puros (`src/utils/accountUtils.js`)**
   - `slugify(name)` → string seguro `[a-z0-9-]{3,40}`
   - `isValidAccountName(name)` → bool (whitelist regex, 2-80 chars)
   - `isValidAccountRole(role)` → bool (whitelist `["owner", "admin", "member"]`)
   - `canManageMembers(accountRole)` → bool
   - `canDeleteAccount(accountRole)` → bool (solo `owner`)
   - **Cada uno con tests unitarios.** Replica el estilo de
     `src/test/warehouseFilter.test.js`.

3. **Hook `src/hooks/useAccount.js`**
   - Lee el `accountId` del usuario logueado (de `users/{uid}`).
   - Si el usuario no tiene `accountId`, suscribe a la cuenta legacy
     (`accounts` con `slug == "legacy"`) y la crea si no existe (solo
     superuser puede crearla — gating por rol).
   - Expone: `account`, `accountRole`, `loading`, `members[]`,
     `createAccount({name})`, `inviteMember({email, role})`,
     `removeMember(uid)`, `updateMemberRole(uid, role)`, `transferOwnership(uid)`.
   - **NO mezcla la lógica de roles globales con la de roles por cuenta** — son
     dos dimensiones independientes (SOLID: Single Responsibility).

4. **Contexto `src/context/AccountContext.jsx`**
   - Wrap del hook. Patrón idéntico a `WarehouseContext`.
   - Devuelve defaults neutros si no hay provider (para no romper tests
     existentes).
   - Persiste `selectedAccountId` en `localStorage` (clave
     `altadill.selectedAccountId`) — solo relevante para superusers que
     pertenecen a varias cuentas.

5. **Componentes UI**
   - `src/components/SignupAccountForm.jsx` — formulario de "Crear cuenta nueva".
     Solo accesible si el usuario logueado **no** tiene `accountId` ya. Una
     vez creado, lo asigna como owner de la nueva cuenta.
   - `src/components/AccountMembersCard.jsx` — card admin en Dashboard (solo
     visible si `canManageMembers`). Lista miembros, cambia roles, invita por
     email, transfiere ownership, elimina miembros.
   - **NO crees** una página entera nueva — encaja todo en el Dashboard
     existente como card colapsable, mismo patrón que `WarehouseManager`.

6. **Reglas Firestore**
   - Añadir bloque `match /accounts/{id}` con:
     - `read`: si `request.auth.uid` aparece en la lista de miembros
       (o si `isSuperuser()`).
     - `create`: cualquier usuario autenticado, **solo si** está creando una
       cuenta donde él es el `ownerId` y no tiene cuenta previa.
     - `update`: solo el owner o admin de esa cuenta. Inmutables: `slug`,
       `ownerId` (a menos que sea transferencia desde el propio owner),
       `createdAt`.
     - `delete`: solo el owner.
   - Añadir validación inline (string types, longitudes).
   - **Despliega las reglas** con `firebase deploy --only firestore:rules` y
     verifica que no rompe lo existente.

7. **Tests**
   - **Unitarios** para `accountUtils.js` (mínimo 12 tests cubriendo todos
     los helpers y casos límite).
   - **Hook `useAccount.js`** con mocks de Firestore: crear cuenta, invitar
     miembro, cambiar rol, error si rol inválido, error si no eres owner al
     transferir.
   - Mismo patrón que `src/test/useProductRequestAdmin.test.js`.
   - Al final: `npm run test:run` debe pasar al **100%** (168 anteriores +
     los nuevos).

8. **Auditoría**
   - `logAuditEvent` en cada acción sensible: `ACCOUNT_CREATED`,
     `MEMBER_INVITED`, `MEMBER_REMOVED`, `MEMBER_ROLE_CHANGED`,
     `OWNERSHIP_TRANSFERRED`, `ACCOUNT_DELETED`.

---

## Reglas duras — el incumplimiento es razón de rechazo

### NO toques (sin pedirme permiso explícito)
- `src/hooks/useProducts.js`, `useMoves.js`, `usePendingStock.js`,
  `useProductRequest*.js` (eso es Fase 2 cuando sepamos que la base sólida)
- `src/components/AnalyticsCard.jsx`, `ExportCard.jsx`, `ScannerCard.jsx`,
  `QrLabelsCard.jsx`, `BulkReassignCard.jsx`, `WarehouseManager.jsx`,
  `WarehouseSwitcher.jsx`
- Tests existentes (`src/test/*.test.js`) — solo añade nuevos
- `vite.config.js`, `package.json` (a menos que necesites una dep nueva —
  pídeme permiso primero, prefiero CSV o nativo)
- `firebase.json`
- `index.html` (CSP ya está configurada)

### SÍ puedes tocar
- `src/App.jsx` — para añadir `<AccountProvider>` envolviendo a
  `<WarehouseProvider>`
- `src/views/Dashboard.jsx` — para montar `AccountMembersCard` y
  `SignupAccountForm`
- `firestore.rules` — añadir el bloque `accounts` (sin alterar los demás)
- `src/context/AuthContext.jsx` — **solo** si necesitas exponer el
  `accountId` al cargar el user. Si lo haces, mantén compatibilidad: el resto
  de hooks no debe romperse si `accountId == null`.

---

## Principios SOLID aplicables aquí

- **SRP:** `useAccount` no hace billing, no hace warehouses, no hace auth.
  Solo gestiona la cuenta y sus miembros.
- **OCP:** la nueva funcionalidad se añade por composición (provider, hook,
  card) — no se modifican abstracciones existentes.
- **LSP:** `AccountContext` debe ofrecer un default neutro válido cuando no
  hay provider, para que los tests existentes (que no lo montan) no exploten.
- **ISP:** separa `useAccount` (datos del account + miembros) de un
  hipotético futuro `useBilling` (Stripe). No metas todo en un mega-hook.
- **DIP:** los componentes no importan `firebase/firestore` directamente.
  Toda escritura va a través del hook. Mira cómo lo hacen `useMoves` y
  `useProducts`.

---

## Capa de seguridad — exigencias

1. **Validación de input en CADA escritura:**
   - `name` de cuenta → `isValidAccountName` (whitelist regex, 2-80 chars,
     sin caracteres de control)
   - `slug` → derivado server-side cuando posible, validado siempre
   - `email` para invitaciones → `isValidEmail` ya existente
   - `role` → whitelist estricta
2. **Defensa en profundidad:** valida en cliente Y en reglas Firestore.
   Nunca confíes en el cliente.
3. **Rate limiting:** envuelve `inviteMember` con el `RateLimiter` existente
   (máx 5 invitaciones/minuto por usuario) para evitar abuso.
4. **Inmutabilidad:** `accountId` y `slug` no deben poder modificarse
   después de creados (ni en UI ni en reglas).
5. **Privilege escalation:** un `member` no puede ascenderse a `admin` ni
   ascender a otros. Solo `owner`/`admin` pueden cambiar roles, y solo
   `owner` puede crear otros owners (transferencia).
6. **Logs:** cada cambio sensible con `logAuditEvent`, incluyendo actor,
   target y diff (rol antes/después).
7. **Sanitización al renderizar:** todo lo que viene de Firestore pasa por
   `sanitizeString` UNA SOLA VEZ al leerlo en el hook. En el JSX se renderiza
   directo (React escapa). NO doble-codifiques.

---

## Plan de ejecución que debes seguir

1. **Lee primero** estos archivos para entender el patrón existente:
   - `src/context/WarehouseContext.jsx`
   - `src/hooks/useWarehouses.js`
   - `src/utils/warehouseFilter.js`
   - `src/test/warehouseFilter.test.js`
   - `src/components/WarehouseManager.jsx`
   - `firestore.rules`
2. **Crea rama** `feat/multi-tenant-phase-1`.
3. **Implementa en este orden** (un commit por bloque):
   - 3.1. `accountUtils.js` + tests
   - 3.2. `useAccount.js` + tests
   - 3.3. `AccountContext.jsx`
   - 3.4. `SignupAccountForm.jsx`
   - 3.5. `AccountMembersCard.jsx` + CSS
   - 3.6. Wire en `App.jsx` y `Dashboard.jsx`
   - 3.7. Reglas Firestore + deploy
4. **Verifica al final:**
   - `npm run test:run` → 100% passing
   - `npm run build` → sin errores
   - `npm audit` → 0 vulnerabilidades nuevas
   - Pruebas manuales:
     - Crear cuenta nueva → debes ser owner
     - Invitar miembro → aparece en la lista
     - Cambiar rol miembro → cambio visible y auditado
     - Transferir ownership → el viejo owner pasa a admin
     - Borrar cuenta como member → debe fallar con error claro

---

## Restricciones operativas

- Habla en español en commits y comentarios (consistencia con el repo).
- Comentarios mínimos — solo el "por qué", no el "qué" (mira el resto del
  código como referencia).
- Mensajes de commit en formato `feat(scope): descripción` o
  `fix(scope): descripción`. Cada commit debe pasar tests por sí mismo.
- Si algo no está claro, **pregunta antes de inventar**. No tomes decisiones
  arquitectónicas fuera de las que están listadas aquí.
- **Reporta al final** un resumen con: archivos creados, archivos
  modificados (lista exacta), tests añadidos, y cualquier desviación del plan
  con su justificación.

---

## Lo que NO hacemos en esta fase (para que no caigas en la tentación)

- ❌ Stripe / billing
- ❌ Refactor de `useProducts`, `useMoves` para meter `accountId` en queries
- ❌ Migración masiva de datos existentes
- ❌ Endurecer reglas Firestore en colecciones existentes
- ❌ Email transaccional
- ❌ Onboarding wizard
- ❌ Landing page
- ❌ TypeScript

Eso será Fase 2-6. Esta fase es **solo la base**: el modelo Account funciona,
los usuarios pueden pertenecer a una cuenta, los miembros se pueden gestionar.

¿Listo? Empieza leyendo los archivos del paso 1 antes de escribir nada.
