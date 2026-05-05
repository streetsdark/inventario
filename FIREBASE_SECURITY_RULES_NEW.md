# Firebase Firestore Security Rules

## INSTRUCCIONES:
1. Ve a Firebase Console → tu proyecto
2. Ve a Firestore Database → Rules
3. Copia TODO el contenido de abajo (desde `rules_version` hasta el último `}`)
4. Pega en Firebase Console
5. Publica las reglas

⚠️ IMPORTANTE: Verifica que el email sea: `mdavidcha@gmail.com`

---

## REGLAS DE SEGURIDAD (COPIAR Y PEGAR EN FIREBASE)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    function isSuperUser() {
      return request.auth.token.email == "mdavidcha@gmail.com";
    }
    
    function isAuthenticated() {
      return request.auth != null;
    }
    
    match /products/{product_id} {
      allow read: if isAuthenticated();
      allow write: if isAuthenticated() && isSuperUser();
    }
    
    match /moves/{move_id} {
      allow read: if isAuthenticated();
      allow write: if isAuthenticated() && isSuperUser();
    }
    
    match /notifications/{notification_id} {
      allow read: if isAuthenticated() && isSuperUser();
      allow create: if isAuthenticated();
      allow update, delete: if isAuthenticated() && isSuperUser();
    }
    
    match /productRequests/{request_id} {
      allow read: if isAuthenticated() && 
                     (isSuperUser() || request.auth.uid == resource.data.userId);
      allow create: if isAuthenticated() && 
                       request.resource.data.userId == request.auth.uid;
      allow update: if isAuthenticated() && isSuperUser();
      allow delete: if isAuthenticated() && isSuperUser();
    }
    
    match /auditLogs/{log_id} {
      allow read: if isAuthenticated() && isSuperUser();
      allow create: if isAuthenticated();
      allow write: if false;
    }
    
    match /users/{user_id} {
      allow read: if isAuthenticated() && (request.auth.uid == user_id || isSuperUser());
      allow write: if isAuthenticated() && (request.auth.uid == user_id || isSuperUser());
    }
    
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

---

## Explicación de las Reglas:

### Colección: `productRequests`
- **Leer**: Super usuario ve todas, usuarios normales solo ven las suyas
- **Crear**: Todos los usuarios autenticados pueden crear solicitudes
- **Actualizar**: Solo super usuario
- **Eliminar**: Solo super usuario

### Colección: `auditLogs`
- **Leer**: Solo super usuario (logs de auditoría sensibles)
- **Crear**: Todos los usuarios autenticados (registran sus acciones)
- **Escribir**: Nadie puede editar logs (inmutables)

### Otras colecciones:
- **products**: Leer para todos, escribir solo super usuario
- **moves**: Leer para todos, escribir solo super usuario
- **notifications**: Leer solo super usuario, crear para todos, editar/eliminar solo super usuario
- **users**: Cada usuario ve/edita sus datos o si es super usuario

---

## ¿Cómo actualizar en Firebase?

1. Abre https://console.firebase.google.com
2. Selecciona proyecto: **almacen-e14cc**
3. Ve a: **Firestore Database** → **Rules**
4. Borra todo el contenido actual
5. Copia el código de arriba (desde `rules_version` hasta el último `}`)
6. Pega en el editor
7. Haz clic en **Publicar**
8. Espera confirmación ✓

Listo! Ahora los usuarios pueden hacer solicitudes sin error de permisos.
