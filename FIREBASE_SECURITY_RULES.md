/**
 * 🔐 Reglas de Seguridad Firebase Firestore
 * 
 * INSTRUCCIONES:
 * 1. Ve a Firebase Console → tu proyecto
 * 2. Ve a Firestore Database → Rules
 * 3. Reemplaza el contenido con el código de abajo
 * 4. Publica las reglas
 * 
 * ⚠️ IMPORTANTE: Cambia "tu_admin_email@gmail.com" por tu email (mdavidcha@gmail.com)
 */

// ============================================================
// 🔒 FIREBASE FIRESTORE SECURITY RULES - COPIAR TODO ESTO
// ============================================================

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
    
    match /users/{user_id} {
      allow read: if isAuthenticated() && (request.auth.uid == user_id || isSuperUser());
      allow write: if isAuthenticated() && (request.auth.uid == user_id || isSuperUser());
    }
    
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
    
    // � COLECCIÓN: notifications
    match /notifications/{notification_id} {
      // ✅ Leer: Solo super usuario
      allow read: if isAuthenticated() && isSuperUser();
      
      // ✏️ Crear: Todos los autenticados (cualquier usuario puede crear solicitudes)
      allow create: if isAuthenticated();
      
      // ❌ Editar/Eliminar: Solo super usuario
      allow update, delete: if isAuthenticated() && isSuperUser();
    }
    
    // �👤 COLECCIÓN: users (si la creas)
    match /users/{user_id} {
      // ✅ Leer: Solo el usuario propietario o super usuario
      allow read: if isAuthenticated() && 
                     (request.auth.uid == user_id || isSuperUser());
      
      // ✏️ Escribir: Solo el usuario propietario o super usuario
      allow write: if isAuthenticated() && 
                      (request.auth.uid == user_id || isSuperUser());
    }
    
    // � COLECCIÓN: productRequests (Solicitudes de productos)
    match /productRequests/{request_id} {
      // ✅ Leer: Super usuario puede ver todas, usuarios ven las suyas
      allow read: if isAuthenticated() && 
                     (isSuperUser() || request.auth.uid == resource.data.userId);
      
      // ✏️ Crear: Todos los autenticados pueden solicitar
      allow create: if isAuthenticated() && 
                       request.resource.data.userId == request.auth.uid;
      
      // ❌ Editar: Solo super usuario (cambiar estado de solicitud)
      allow update: if isAuthenticated() && isSuperUser();
      
      // ❌ Eliminar: Solo super usuario
      allow delete: if isAuthenticated() && isSuperUser();
    }
    
    // �🚫 Denegar todo por defecto (no lo cambies)
    match /{document=**} {
      allow read, write: if false;
    }
  }
}

// ============================================================
// ⚠️ ALTERNATIVA: REGLAS MÁS RESTRICTIVAS (Producción)
// ============================================================

/*
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    function isSuperUser() {
      return request.auth.token.email == "mdavidcha@gmail.com";
    }
    
    function isAuthenticated() {
      return request.auth != null;
    }
    
    // Validaciones adicionales
    function isValidProduct(data) {
      return data.sku is string && data.sku.size() > 0 &&
             data.description is string && data.description.size() > 0 &&
             data.stock is number && data.stock >= 0 &&
             data.cost is number && data.cost >= 0;
    }
    
    match /products/{product_id} {
      allow read: if isAuthenticated();
      
      // Crear: Solo super usuario, con validación
      allow create: if isAuthenticated() && isSuperUser() && 
                       isValidProduct(request.resource.data);
      
      // Editar: Solo super usuario, con validación
      allow update: if isAuthenticated() && isSuperUser() && 
                       isValidProduct(request.resource.data);
      
      // Eliminar: Solo super usuario
      allow delete: if isAuthenticated() && isSuperUser();
    }
    
    match /moves/{move_id} {
      allow read: if isAuthenticated();
      allow write: if isAuthenticated() && isSuperUser();
    }
    
    match /notifications/{notification_id} {
      // Leer: Solo super usuario
      allow read: if isAuthenticated() && isSuperUser();
      
      // Crear: Todos los autenticados
      allow create: if isAuthenticated();
      
      // Editar/Eliminar: Solo super usuario
      allow update, delete: if isAuthenticated() && isSuperUser();
    }
    
    match /productRequests/{request_id} {
      // Leer: Super usuario puede ver todas, usuarios ven las suyas
      allow read: if isAuthenticated() && 
                     (isSuperUser() || request.auth.uid == resource.data.userId);
      
      // Crear: Todos los autenticados pueden solicitar
      allow create: if isAuthenticated() && 
                       request.resource.data.userId == request.auth.uid;
      
      // Editar: Solo super usuario
      allow update: if isAuthenticated() && isSuperUser();
      
      // Eliminar: Solo super usuario
      allow delete: if isAuthenticated() && isSuperUser();
    }
    
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
*/

// ============================================================
// 🔐 FIREBASE AUTHENTICATION RULES - RECOMENDACIONES
// ============================================================

/*
En Firebase Console → Authentication → Settings:

1. ✅ Habilitar Email/Password
2. ✅ Habilitar Google Sign-in
3. ❌ Deshabilitar Anonymous Sign-in
4. ✅ Habilitar Email Verification
5. ✅ Configurar Password Policy: 
   - Mínimo: 8 caracteres
   - Complejidad: Media o Alta

Multi-factor Authentication:
1. Ve a Authentication → Multi-factor Authentication
2. Habilita: SMS provider, App authenticator
3. Requiere para: Cuentas administrativas

Acceso Autorizado:
1. Ve a Authentication → Authorized domains
2. Agrega: tu-dominio.com
3. Esto previene que otros usen tu API key
*/

// ============================================================
// 📋 INSTRUCCIONES PASO A PASO
// ============================================================

/*
1. CONFIGURAR FIREBASE RULES:
   a) Abre https://console.firebase.google.com
   b) Selecciona tu proyecto "almacen-e14cc"
   c) Ve a Firestore Database → Rules
   d) Copia el código de "FIREBASE FIRESTORE SECURITY RULES"
   e) Reemplaza TODO el contenido actual
   f) ⚠️ CAMBIA "mdavidcha@gmail.com" si usas otro email
   g) Click en "Publicar"

2. VERIFICAR CONFIGURACIÓN:
   a) Ve a Authentication → Settings
   b) Habilita Email/Password y Google Sign-in
   c) En "Authorized domains", agrega tu hosting domain

3. PROBAR:
   a) Inicia sesión con tu email super usuario
   b) Intenta crear un producto (debe funcionar)
   c) Inicia sesión con otro email
   d) Intenta crear un producto (debe fallar)
   e) Revisa Firestore Console → Logs para ver denegaciones

4. PRODUCCIÓN:
   a) Implementa Rate Limiting en backend
   b) Configura CORS en backend
   c) Usa webhooks para auditoría
   d) Monitorea accesos irregulares
*/
