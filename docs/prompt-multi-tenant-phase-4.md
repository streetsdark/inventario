# Prompt: Multi-tenant Fase 4 — endurecer reglas Firestore

> Pega este bloque entero en una sesión NUEVA de Claude Code dentro de este
> proyecto. **Pre-requisito:** Fases 1, 2 y 3 completadas y mergeadas a `main`,
> y la migración legacy ejecutada al menos una vez (botón "Migrar datos
> legacy" en Dashboard).

---

# Tarea: Endurecer reglas Firestore para aislamiento real multi-tenant

Eres un ingeniero senior con experiencia en seguridad de aplicaciones web y
SaaS sobre Firebase. Vas a **endurecer** las reglas de seguridad de Firestore
para que el aislamiento entre cuentas sea real a nivel de base de datos —
hoy es solo client-side filtering, lo cual no protege contra un atacante que
haga queries directas desde DevTools.

---

## Contexto del proyecto

- **Stack:** React 19 + Vite + Firebase Firestore + Firebase Auth.
- **Working dir:** `inventory/`.
- **Default branch:** `main`. Crea rama `feat/multi-tenant-phase-4`.
- **Tests:** Vitest. 230 tests passing. Deben seguir pasando al final.
- **Despliegue:** `firebase deploy --only firestore:rules` (proyecto
  `inventario-altadill`).

### Estado actual de las fases

- **Fase 1 ✅** — Modelo `Account` + miembros + reglas para `/accounts`.
- **Fase 2 ✅** — Hooks adjuntan `accountId` al escribir y filtran al leer.
- **Fase 3 ✅** — `LegacyMigrationCard` permite asignar `accountId` a docs
  sin él.
- **Fase 4 ←** — esta tarea.

### Helpers existentes en `firestore.rules`

```
isAuth(), userRole(), isPrivileged(), isSuperuser()
userAccountId(), userAccountRole()
isAccountOwner(id), isAccountAdmin(id), isAccountMember(id)
```

Las **vas a usar** sin reescribirlas. Si necesitas helpers nuevos, los
añades **arriba**, junto a los demás.

---

## Lo que tienes que construir

Endurecer las siguientes colecciones. **Solo se toca `firestore.rules`** y,
si encuentras incompatibilidad, los hooks o componentes mínimos para que
las reglas sigan permitiendo el flujo (auto-default warehouse, migración,
bulk reassign).

### Colecciones a endurecer

| Colección       | Read                                   | Create                                         | Update                                            | Delete                                |
|-----------------|----------------------------------------|------------------------------------------------|---------------------------------------------------|---------------------------------------|
| `products`      | mismo accountId o superuser            | privileged && resource.accountId == user.accountId | privileged && accountId inmutable               | privileged && mismo accountId         |
| `moves`         | mismo accountId o superuser            | privileged && resource.accountId == user.accountId | privileged && accountId inmutable               | privileged && mismo accountId         |
| `warehouses`    | mismo accountId o superuser            | privileged && resource.accountId == user.accountId | privileged && accountId inmutable (ver excepción) | privileged && mismo accountId, no isDefault |
| `productRequests` | propio (userId == auth.uid) O privileged del mismo accountId | auth && resource.accountId == user.accountId | privileged del mismo accountId, accountId inmutable | privileged del mismo accountId       |
| `notifications` | privileged del mismo accountId         | auth && resource.accountId == user.accountId   | privileged del mismo accountId                    | privileged del mismo accountId        |

### Excepciones / casos límite críticos

1. **Migración legacy:** la regla de `update` debe permitir asignar
   `accountId` por primera vez (de "" → un valor) si el actor es
   admin/owner de la cuenta destino. Una vez asignado, **no se puede
   cambiar**. Patrón:
   ```
   // Inmutable salvo migración legacy (de vacío a la cuenta del actor)
   (request.resource.data.accountId == resource.data.accountId
     || (resource.data.accountId == null
         || resource.data.accountId == ''))
   ```

2. **BulkReassignCard:** ya respeta este patrón (asigna accountId solo si el
   producto no lo tiene). No debería romperse.

3. **Auto-creación del "Almacén Principal":** `useWarehouses` lo crea con
   `accountId` del usuario actual cuando no existe ninguno. El usuario debe
   ser admin/owner de su cuenta.

4. **Superuser global:** mantiene acceso total a todas las colecciones para
   soporte. Usa `isSuperuser()`.

5. **Reads cruzados de `users`:** ya están permitidos en Fase 1 entre
   miembros de la misma cuenta. **No tocar.**

6. **`auditLogs`:** mantener la regla actual (cualquier auth puede crear,
   solo superuser lee). No requiere `accountId` enforcement porque no
   contiene datos de negocio sensibles.

---

## Reglas duras

### NO tocar (sin pedir permiso)
- Helpers ya existentes (`isAuth`, `userRole`, `isAccountAdmin`, etc.)
- Bloques `/accounts`, `/users`, `/auditLogs` salvo que sean estrictamente
  necesarios para no romper nada.
- Cualquier archivo fuera de `firestore.rules` salvo si encuentras una
  incompatibilidad real al testear.
- Tests existentes (`src/test/*.test.js`).

### SÍ puedes tocar
- `firestore.rules` (este es el archivo principal).
- `src/hooks/useWarehouses.js` SOLO si la auto-creación del default
  warehouse falla con las nuevas reglas.
- `src/components/LegacyMigrationCard.jsx` SOLO si necesitas pequeño ajuste
  para que el patch incluya `accountId` correctamente.
- `src/components/BulkReassignCard.jsx` SOLO si el patch combinado
  (warehouseId + accountId) tropieza con la regla de inmutabilidad.

---

## Plan de ejecución

1. **Lee primero** `firestore.rules` actual para entender la estructura.
2. **Lee** `src/hooks/useWarehouses.js`, `useMoves.js`, `useProducts.js`,
   `useProductRequestCreate.js`, `useProductRequestAdmin.js`,
   `usePendingStock.js`, `LegacyMigrationCard.jsx`, `BulkReassignCard.jsx`,
   `FormProduct.jsx` para verificar que escriben `accountId`. Ya lo hacen
   desde Fase 2 — solo confirmas.
3. **Crea rama** `feat/multi-tenant-phase-4`.
4. **Modifica `firestore.rules`** colección por colección, en este orden:
   - 4.1 `products`
   - 4.2 `moves`
   - 4.3 `warehouses`
   - 4.4 `productRequests`
   - 4.5 `notifications`
5. **Despliega** con `firebase deploy --only firestore:rules`.
6. **Verifica manualmente** en el navegador:
   - Como owner de tu cuenta: ves tus productos / movimientos.
   - Crea un producto nuevo: éxito.
   - Edita un producto existente: éxito.
   - DevTools → Firestore SDK → intenta query directa a una cuenta ajena:
     debe fallar con `permission-denied`.
7. **`npm run test:run`** — todo verde.
8. **`npm run build`** — sin errores.
9. **`npm audit`** — 0 vulnerabilidades.
10. **Commit + push + squash merge a `main`** + cleanup ramas.

---

## Plantilla de regla por colección (tipo `products`)

```
match /products/{id} {
  // Lectura: superuser o miembro de la cuenta dueña del doc.
  allow read: if isSuperuser()
    || (isAuth() && resource.data.accountId == userAccountId());

  // Crear: privileged y el doc nace con el accountId del usuario.
  allow create: if isPrivileged()
    && request.resource.data.accountId == userAccountId();

  // Actualizar: privileged del mismo accountId. accountId inmutable salvo
  // migración legacy (de '' a la cuenta del actor).
  allow update: if isPrivileged()
    && resource.data.accountId == userAccountId()
    && (request.resource.data.accountId == resource.data.accountId
        || resource.data.accountId == null
        || resource.data.accountId == '');

  // Eliminar: privileged del mismo accountId.
  allow delete: if isPrivileged()
    && resource.data.accountId == userAccountId();
}
```

Adapta esta plantilla a las particularidades de cada colección (ver tabla
arriba: `productRequests` permite read al propio creador, `notifications`
solo a privileged, `warehouses` no se borra el isDefault).

---

## Capa de seguridad — exigencias adicionales

1. **Defensa en profundidad:** las reglas son la capa final. No confíes en
   que el cliente filtra: las reglas validan **siempre**.
2. **Inmutabilidad:** `accountId` no se puede cambiar después de asignado
   (excepción explícita: legacy de vacío a un valor real).
3. **No exposición de docs ajenos:** un `read` que no cumpla la regla debe
   devolver `permission-denied`, nunca lista vacía silenciosa que pueda
   confundirse con "no hay datos".
4. **Superuser:** mantiene acceso pero **TODA acción suya queda en
   `auditLogs`** (no toques esto, ya está implementado).
5. **No aceptar accountId arbitrario en create:** la regla obliga a que el
   accountId del nuevo doc coincida con `userAccountId()`. Eso impide que
   un usuario malicioso cree un doc en cuenta ajena.

---

## Verificación post-deploy (obligatoria)

Después del deploy, abre DevTools en la app y prueba:

```js
// En Console del navegador (sesión iniciada como user normal):
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "./src/firebase/config";

// Test 1: leer mis propios productos → debe funcionar
const myDocs = await getDocs(collection(db, "products"));
console.log("mis productos:", myDocs.size);

// Test 2: intentar leer una cuenta ajena por queryFilter → debe lanzar
try {
  const otherDocs = await getDocs(
    query(collection(db, "products"), where("accountId", "==", "OTRO_ACC_ID"))
  );
  console.error("FALLO: pude leer cuenta ajena:", otherDocs.size);
} catch (e) {
  console.log("OK: bloqueado correctamente:", e.code);
}
```

Esperado: Test 1 funciona, Test 2 devuelve `permission-denied`.

---

## Plan de rollback

Si algo se rompe en producción:

```bash
git revert HEAD       # revierte el commit que endureció reglas
firebase deploy --only firestore:rules   # restaura reglas anteriores
```

Las reglas anteriores son las de Fase 1 (cualquier auth lee/escribe en
products/moves) — permisivas pero funcionales.

---

## Lo que NO hacemos en esta fase

- ❌ Stripe / billing
- ❌ Email transaccional
- ❌ Onboarding wizard
- ❌ Landing page
- ❌ Migrar datos a otro motor (sigue siendo Firestore)

---

## Reportar al final

Resumen con:
- Diff resumido de `firestore.rules`
- Cualquier hook/componente modificado y por qué
- Resultado de pruebas manuales (Test 1 y Test 2 de arriba)
- Tests al 100%
- Vulnerabilidades npm: 0

¿Listo? Empieza leyendo `firestore.rules` y los hooks para confirmar que
todos escriben `accountId` antes de tocar nada.
