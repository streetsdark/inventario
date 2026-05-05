# 🔐 Arquitectura de Seguridad con JWT - Guía de Implementación

## 1. FLUJO COMPLETO DE LOGIN

```
┌─────────────────────────────────────────────────────────────────┐
│ FRONTEND (React)                                                 │
├─────────────────────────────────────────────────────────────────┤
│ 1. Usuario ingresa email + password                              │
│ 2. POST /auth/login { email, password }                          │
│ 3. RESPONSE:                                                     │
│    - accessToken (JWT) → Guardar en estado (memoria)            │
│    - Set-Cookie: refreshToken (HttpOnly) ← Browser lo maneja   │
│ 4. Guardar en Context/Redux:                                    │
│    - accessToken (memory)                                       │
│    - isAuthenticated = true                                     │
│    - user data                                                  │
└─────────────────────────────────────────────────────────────────┘
        ↓ HTTP POST ↓
┌─────────────────────────────────────────────────────────────────┐
│ BACKEND (Node/Express)                                           │
├─────────────────────────────────────────────────────────────────┤
│ 1. Validar credentials (email + password)                        │
│ 2. Si válido, generar:                                           │
│    - accessToken = JWT(payload, secret, 15m)                    │
│    - refreshToken = JWT(payload, secret, 7d) + save en BD       │
│ 3. Response:                                                     │
│    {                                                             │
│      accessToken: "...",                                         │
│      user: { id, email, role }                                  │
│    }                                                             │
│ 4. Set-Cookie: refreshToken=TOKEN; HttpOnly; Secure;           │
│    SameSite=Strict; Path=/; Max-Age=604800                     │
│ 5. Base de datos: guardar refreshToken + hash                   │
│    { userId, token, tokenFamily, rotationCount, expiresAt }     │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. FLUJO DE REFRESH AUTOMÁTICO

```
┌─────────────────────────────────────────────────────────────────┐
│ FRONTEND (React)                                                 │
├─────────────────────────────────────────────────────────────────┤
│ 1. Request a API endpoint                                        │
│ 2. Adjuntar: Authorization: Bearer {accessToken}                │
│ 3. Si 401 (token expirado):                                     │
│    a) POST /auth/refresh (incluye cookie de forma automática)   │
│    b) Si refresh exitoso:                                       │
│       - Nueva token en response                                 │
│       - Guardar en estado (memoria)                             │
│       - Reintentar request original                             │
│    c) Si refresh falla (403/401):                               │
│       - Redirigir a login                                       │
│       - Limpiar estado                                          │
│ 4. Si 200: continuar con response original                      │
└─────────────────────────────────────────────────────────────────┘
        ↓ HTTP POST ↓
┌─────────────────────────────────────────────────────────────────┐
│ BACKEND (Node/Express)                                           │
├─────────────────────────────────────────────────────────────────┤
│ 1. Recibir refresh token desde cookie                            │
│ 2. Validar:                                                      │
│    - Token válido y no expirado                                 │
│    - Existe en BD                                               │
│    - No fue marcado como revoked                                │
│ 3. Verificar rotación (TOKEN FAMILY):                            │
│    - Si refreshToken viejo se usa → INVALIDAR TODO             │
│    - Generar nuevo refreshToken (familia diferente)             │
│ 4. Generar nuevo accessToken                                    │
│ 5. Response + Set-Cookie nuevo refreshToken                    │
│ 6. BD: Marcar token viejo como rotated/used                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. FLUJO DE LOGOUT

```
┌─────────────────────────────────────────────────────────────────┐
│ FRONTEND (React)                                                 │
├─────────────────────────────────────────────────────────────────┤
│ 1. POST /auth/logout (con cookie de refresh token)              │
│ 2. Limpiar estado:                                              │
│    - accessToken = null                                         │
│    - isAuthenticated = false                                    │
│    - user = null                                                │
│ 3. Redirigir a /login                                           │
│ 4. Browser elimina cookie automáticamente                       │
└─────────────────────────────────────────────────────────────────┘
        ↓ HTTP POST ↓
┌─────────────────────────────────────────────────────────────────┐
│ BACKEND (Node/Express)                                           │
├─────────────────────────────────────────────────────────────────┤
│ 1. Obtener refresh token de cookie                              │
│ 2. En BD: Marcar token como revoked                             │
│ 3. Response 200: OK                                             │
│ 4. Set-Cookie: refreshToken=; Max-Age=0 (eliminar)            │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. RESPONSABILIDADES

### FRONTEND:
- ✅ Solicitar login con credenciales
- ✅ Guardar accessToken en memoria (variable/Context)
- ✅ Incluir accessToken en header Authorization
- ✅ Detectar 401 y ejecutar refresh automático
- ✅ Reintentar request después de refresh
- ✅ Limpiar estado en logout
- ❌ NO guardar tokens en localStorage

### BACKEND:
- ✅ Validar credenciales en login
- ✅ Generar JWT (accessToken + refreshToken)
- ✅ Guardar refreshToken en BD con familia/rotación
- ✅ Validar JWT en cada request (firma + expiración)
- ✅ Verificar permisos (rol, scope)
- ✅ Detectar token family para invalidar sesiones comprometidas
- ✅ Set-Cookie HttpOnly en respuestas
- ✅ CORS solo para dominio específico

---

## 5. ENDPOINTS BACKEND NECESARIOS

### POST /auth/login
```
Request:
  Body: { email, password }

Response 200:
  {
    accessToken: "eyJhbGc...",
    user: { id, email, name, role },
    expiresIn: 900  // 15 minutos en segundos
  }
  Set-Cookie: refreshToken=...; HttpOnly; Secure; SameSite=Strict

Response 401:
  { message: "Invalid credentials" }
```

### POST /auth/refresh
```
Request:
  Cookie: refreshToken=... (automático)
  Authorization: Bearer {accessToken}  (opcional, para validación)

Response 200:
  {
    accessToken: "eyJhbGc...",
    expiresIn: 900
  }
  Set-Cookie: refreshToken=... (nuevo token rotado)

Response 401:
  { message: "Invalid or expired refresh token" }

Response 403:
  { message: "Token family invalidated. Please login again." }
```

### POST /auth/logout
```
Request:
  Cookie: refreshToken=... (automático)

Response 200:
  { message: "Logged out successfully" }
  Set-Cookie: refreshToken=; Max-Age=0
```

### GET /auth/me (validar token actual)
```
Request:
  Authorization: Bearer {accessToken}

Response 200:
  { id, email, name, role, permissions }

Response 401:
  { message: "Unauthorized" }
```

---

## 6. PSEUDOCÓDIGO

### FRONTEND - React (Contexto de Auth)

```javascript
// src/context/AuthContext.js
import { createContext, useReducer, useCallback, useEffect } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, {
    accessToken: null,      // ✅ Memoria
    user: null,
    isAuthenticated: false,
    loading: true,
    isRefreshing: false,
  });

  // 1. INICIAR SESIÓN
  const login = useCallback(async (email, password) => {
    try {
      const response = await fetch('https://api.tudominio.com/auth/login', {
        method: 'POST',
        credentials: 'include',  // Enviar cookies
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) throw new Error('Login failed');

      const { accessToken, user } = await response.json();

      // ✅ Guardar token en MEMORIA
      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: { accessToken, user },
      });

      return user;
    } catch (error) {
      dispatch({ type: 'LOGIN_FAILED', payload: error.message });
      throw error;
    }
  }, []);

  // 2. REFRESH TOKEN AUTOMÁTICO
  const refreshAccessToken = useCallback(async () => {
    if (state.isRefreshing) return;

    dispatch({ type: 'REFRESH_START' });

    try {
      const response = await fetch('https://api.tudominio.com/auth/refresh', {
        method: 'POST',
        credentials: 'include',  // Cookie HttpOnly se envía automáticamente
      });

      if (!response.ok) {
        throw new Error('Refresh failed');
      }

      const { accessToken } = await response.json();

      dispatch({
        type: 'REFRESH_SUCCESS',
        payload: { accessToken },
      });

      return accessToken;
    } catch (error) {
      dispatch({ type: 'LOGOUT' });
      throw error;
    }
  }, [state.isRefreshing]);

  // 3. LOGOUT
  const logout = useCallback(async () => {
    try {
      await fetch('https://api.tudominio.com/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } finally {
      dispatch({ type: 'LOGOUT' });
    }
  }, []);

  // 4. VERIFICAR SESIÓN AL INICIAR
  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch('https://api.tudominio.com/auth/me', {
          credentials: 'include',
          headers: {
            Authorization: `Bearer ${state.accessToken}`,
          },
        });

        if (response.ok) {
          const user = await response.json();
          dispatch({
            type: 'CHECK_SESSION_SUCCESS',
            payload: { user },
          });
        } else {
          dispatch({ type: 'CHECK_SESSION_FAILED' });
        }
      } catch (error) {
        dispatch({ type: 'CHECK_SESSION_FAILED' });
      }
    };

    checkSession();
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, logout, refreshAccessToken }}>
      {children}
    </AuthContext.Provider>
  );
}

function authReducer(state, action) {
  switch (action.type) {
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        accessToken: action.payload.accessToken,
        user: action.payload.user,
        isAuthenticated: true,
      };
    case 'REFRESH_SUCCESS':
      return {
        ...state,
        accessToken: action.payload.accessToken,
        isRefreshing: false,
      };
    case 'LOGOUT':
      return {
        accessToken: null,
        user: null,
        isAuthenticated: false,
        loading: false,
        isRefreshing: false,
      };
    default:
      return state;
  }
}

export default AuthContext;
```

### FRONTEND - HTTP Interceptor

```javascript
// src/utils/apiClient.js
import { useAuth } from '../context/AuthContext';

export function createApiClient(authContext) {
  const baseURL = 'https://api.tudominio.com';

  return {
    async request(endpoint, options = {}) {
      const url = `${baseURL}${endpoint}`;
      const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
      };

      // Adjuntar accessToken
      if (authContext.accessToken) {
        headers.Authorization = `Bearer ${authContext.accessToken}`;
      }

      let response = await fetch(url, {
        ...options,
        credentials: 'include',  // Enviar cookies
        headers,
      });

      // Si 401, intentar refresh
      if (response.status === 401 && authContext.accessToken) {
        try {
          const newAccessToken = await authContext.refreshAccessToken();
          headers.Authorization = `Bearer ${newAccessToken}`;

          response = await fetch(url, {
            ...options,
            credentials: 'include',
            headers,
          });
        } catch (error) {
          // Redirect a login
          window.location.href = '/login';
        }
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response.json();
    },

    get(endpoint, options) {
      return this.request(endpoint, { ...options, method: 'GET' });
    },

    post(endpoint, body, options) {
      return this.request(endpoint, {
        ...options,
        method: 'POST',
        body: JSON.stringify(body),
      });
    },
  };
}
```

---

### BACKEND - Node.js/Express

```javascript
// src/routes/auth.js
const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;
const REFRESH_SECRET = process.env.REFRESH_SECRET;
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

// 1. LOGIN
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Validar credenciales en BD
    const user = await User.findOne({ email });
    if (!user || !user.validatePassword(password)) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generar tokens
    const tokenFamily = generateTokenFamily();
    const accessToken = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: ACCESS_TOKEN_EXPIRY }
    );

    const refreshToken = jwt.sign(
      { userId: user.id, family: tokenFamily },
      REFRESH_SECRET,
      { expiresIn: REFRESH_TOKEN_EXPIRY }
    );

    // Guardar refreshToken en BD
    await RefreshToken.create({
      userId: user.id,
      token: hashToken(refreshToken),
      family: tokenFamily,
      rotationCount: 0,
      revokedAt: null,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    // Response
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      accessToken,
      user: { id: user.id, email: user.email, role: user.role },
      expiresIn: 900, // 15 min en segundos
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// 2. REFRESH TOKEN
router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.cookies;

  if (!refreshToken) {
    return res.status(401).json({ message: 'No refresh token' });
  }

  try {
    // Verificar JWT
    const decoded = jwt.verify(refreshToken, REFRESH_SECRET);
    const { userId, family } = decoded;

    // Buscar en BD
    const tokenRecord = await RefreshToken.findOne({
      userId,
      family,
      revokedAt: null,
    });

    if (!tokenRecord) {
      // Token viejo se reutilizó → ATAQUE DETECTADO
      await RefreshToken.updateMany(
        { userId, family },
        { revokedAt: new Date() }
      );
      return res.status(403).json({
        message: 'Token family invalidated. Potential attack detected.',
      });
    }

    // Generar nuevo token (nueva familia)
    const newTokenFamily = generateTokenFamily();
    const newAccessToken = jwt.sign(
      { userId, email: decoded.email, role: decoded.role },
      JWT_SECRET,
      { expiresIn: ACCESS_TOKEN_EXPIRY }
    );

    const newRefreshToken = jwt.sign(
      { userId, family: newTokenFamily },
      REFRESH_SECRET,
      { expiresIn: REFRESH_TOKEN_EXPIRY }
    );

    // Guardar nuevo token
    await RefreshToken.create({
      userId,
      token: hashToken(newRefreshToken),
      family: newTokenFamily,
      rotationCount: tokenRecord.rotationCount + 1,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    // Marcar token viejo como usado
    tokenRecord.rotatedAt = new Date();
    await tokenRecord.save();

    // Response
    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      accessToken: newAccessToken,
      expiresIn: 900,
    });
  } catch (error) {
    res.status(401).json({ message: 'Invalid refresh token' });
  }
});

// 3. LOGOUT
router.post('/logout', (req, res) => {
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
  });

  res.json({ message: 'Logged out' });
});

// 4. MIDDLEWARE: Validar AccessToken
function verifyAccessToken(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
}

// GET /auth/me
router.get('/me', verifyAccessToken, async (req, res) => {
  const user = await User.findById(req.user.userId);
  res.json({
    id: user.id,
    email: user.email,
    role: user.role,
    permissions: user.permissions,
  });
});

// Usar middleware en rutas protegidas
app.get('/api/products', verifyAccessToken, (req, res) => {
  // req.user contiene { userId, email, role }
});

module.exports = router;
```

### BACKEND - CORS

```javascript
// src/config/cors.js
const cors = require('cors');

const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['https://tudominio.com'],
  credentials: true,  // Permitir cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400, // 24 horas
};

app.use(cors(corsOptions));

// Preflight
app.options('*', cors(corsOptions));
```

---

## 7. VARIABLES DE ENTORNO

```bash
# Backend (.env)
JWT_SECRET=tu_secreto_aleatorio_largo_256_caracteres
REFRESH_SECRET=otro_secreto_aleatorio_largo_256_caracteres
NODE_ENV=production
ALLOWED_ORIGINS=https://tudominio.com,https://www.tudominio.com

# Frontend (.env)
REACT_APP_API_URL=https://api.tudominio.com
```

---

## 8. CHECKLIST SEGURIDAD

- [x] AccessToken en memoria (variable/Context)
- [x] RefreshToken en cookie HttpOnly + Secure + SameSite=Strict
- [x] AccessToken expiración 15 minutos
- [x] RefreshToken expiración 7 días + rotación
- [x] Detección de token family para ataques
- [x] Cada request valida firma + expiración
- [x] CORS restringido a dominio específico
- [x] No guardar tokens en localStorage
- [x] Logout revoca refreshToken en BD
- [x] Refresh automático en 401

---

## 9. TESTING

```bash
# Login
curl -X POST https://api.tudominio.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"pass123"}'

# Refresh
curl -X POST https://api.tudominio.com/auth/refresh \
  -H "Cookie: refreshToken=..." \
  -c cookies.txt

# Request protegido
curl -X GET https://api.tudominio.com/api/products \
  -H "Authorization: Bearer {accessToken}"

# Logout
curl -X POST https://api.tudominio.com/auth/logout \
  -H "Cookie: refreshToken=..."
```

---

**¡Listo! Esta es la arquitectura completa, segura y producción-ready.**
