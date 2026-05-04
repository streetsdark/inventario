# 🔐 Sistema de Permisos y Roles

## Descripción

Este sistema permite que solo tú (super usuario) tengas acceso completo para:
- ✅ Crear, editar y eliminar productos
- ✅ Crear movimientos de inventario (entradas y salidas)
- ✅ Registrar unidades pendientes

Mientras que los otros usuarios solo pueden:
- 👁️ Ver productos y su disponibilidad
- 👁️ Ver el historial de salidas
- 👁️ Ver información del almacén

## Configuración

### 1. Establece tu email como super usuario

En el archivo `.env`, agrega tu email:

```env
VITE_SUPER_USER_EMAIL=tu_email@dominio.com
```

### 2. Componentes protegidos

- **Products.jsx** - Solo el super usuario ve el botón "Añadir producto"
- **ListProducts.jsx** - Solo el super usuario ve los botones de "Editar" y "Eliminar"
- **Moves.jsx** - Solo el super usuario puede crear movimientos
- **Dashboard.jsx** - Solo el super usuario puede registrar unidades pendientes

### 3. Hook useRole()

El hook `useRole()` verifica si el usuario actual es el super usuario comparando su email con `VITE_SUPER_USER_EMAIL`.

```javascript
import useRole from "../hooks/useRole";

const Component = () => {
  const { user, isSuperUser, loading } = useRole();
  
  if (isSuperUser) {
    // Mostrar funcionalidades administrativas
  }
};
```

## Pruebas

1. **Como super usuario:**
   - Login con tu email
   - Deberías ver todos los botones de crear, editar, eliminar

2. **Como usuario normal:**
   - Login con otro email
   - Solo verás la información
   - No verás los botones de editar/eliminar
   - No podrás acceder a Movimientos
   - No podrás agregar unidades pendientes

## Notas importantes

⚠️ Este sistema usa autenticación de Firebase. Asegúrate de que:
- Todos los usuarios estén registrados en Firebase
- El email del super usuario sea exacto (sensible a mayúsculas/minúsculas)
- La variable de entorno esté correctamente configurada
