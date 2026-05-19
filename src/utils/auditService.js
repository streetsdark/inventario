import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
  Timestamp,
} from "firebase/firestore";
import { db, auth } from "../firebase/config";
import { log, warn, error as logError } from "./logger";

/**
 * Sistema de Auditoría y Webhooks
 * Registra todas las acciones sensibles en la base de datos
 */

export const AuditEventTypes = {
  // Solicitudes de Productos
  REQUEST_CREATED: "REQUEST_CREATED",
  REQUEST_APPROVED: "REQUEST_APPROVED",
  REQUEST_REJECTED: "REQUEST_REJECTED",

  // Productos
  PRODUCT_CREATED: "PRODUCT_CREATED",
  PRODUCT_UPDATED: "PRODUCT_UPDATED",
  PRODUCT_DELETED: "PRODUCT_DELETED",

  // Movimientos
  MOVE_CREATED: "MOVE_CREATED",
  MOVE_DELETED: "MOVE_DELETED",

  // Autenticación
  LOGIN: "LOGIN",
  LOGOUT: "LOGOUT",
  FAILED_LOGIN: "FAILED_LOGIN",

  // Seguridad
  SUSPICIOUS_ACTIVITY: "SUSPICIOUS_ACTIVITY",
  RATE_LIMIT_EXCEEDED: "RATE_LIMIT_EXCEEDED",
  UNAUTHORIZED_ACCESS: "UNAUTHORIZED_ACCESS",
};

/**
 * Registra un evento en la colección de auditoría
 * @param {string} eventType - Tipo de evento
 * @param {string} resource - Recurso afectado (ej: "product", "request")
 * @param {string} resourceId - ID del recurso
 * @param {object} details - Detalles adicionales
 */
export async function logAuditEvent(
  eventType,
  resource,
  resourceId,
  details = {}
) {
  try {
    const currentUser = auth.currentUser;

    const auditEntry = {
      eventType,
      resource,
      resourceId,
      userId: currentUser?.uid || "anonymous",
      userEmail: currentUser?.email || "unknown",
      userName: currentUser?.displayName || "Unknown User",
      details,
      timestamp: serverTimestamp(),
      userAgent: navigator.userAgent,
    };

    // Guardar en colección de auditoría
    const docRef = await addDoc(collection(db, "auditLogs"), auditEntry);

    // Verificar si hay actividad sospechosa
    await checkForSuspiciousActivity(currentUser?.uid, eventType);

    return docRef.id;
  } catch (err) {
    logError("auditService: logAuditEvent", err);
  }
}

/**
 * Detecta actividad sospechosa basada en patrones
 */
async function checkForSuspiciousActivity(userId, eventType) {
  // Evitar recursión: si ya estamos registrando actividad sospechosa, no volver a revisar
  if (eventType === AuditEventTypes.SUSPICIOUS_ACTIVITY) return;
  if (!userId) return;

  try {
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

    const q = query(
      collection(db, "auditLogs"),
      where("userId", "==", userId),
      where("timestamp", ">=", Timestamp.fromDate(fifteenMinutesAgo))
    );

    const snapshot = await getDocs(q);
    const eventCount = snapshot.size;

    if (eventCount > 50) {
      // Escribir directamente a Firestore sin pasar por logAuditEvent para evitar recursión
      await addDoc(collection(db, "auditLogs"), {
        eventType: AuditEventTypes.SUSPICIOUS_ACTIVITY,
        resource: "user",
        resourceId: userId,
        userId,
        userEmail: auth.currentUser?.email || "unknown",
        userName: auth.currentUser?.displayName || "Unknown User",
        details: { reason: "Excessive events", eventCount, window: "15 minutes" },
        timestamp: serverTimestamp(),
        ipAddress: "n/a",
        userAgent: navigator.userAgent,
      });

      warn(`⚠️ Actividad sospechosa detectada para usuario: ${userId}`);
    }
  } catch (err) {
    logError("auditService: checkForSuspiciousActivity", err);
  }
}

/**
 * Obtiene eventos de auditoría con filtros
 * @param {object} filters - { eventType, userId, resource, startDate, endDate }
 */
export async function getAuditEvents(filters = {}) {
  try {
    let constraints = [];

    if (filters.eventType) {
      constraints.push(where("eventType", "==", filters.eventType));
    }

    if (filters.userId) {
      constraints.push(where("userId", "==", filters.userId));
    }

    if (filters.resource) {
      constraints.push(where("resource", "==", filters.resource));
    }

    if (filters.startDate) {
      constraints.push(
        where("timestamp", ">=", Timestamp.fromDate(filters.startDate))
      );
    }

    if (filters.endDate) {
      constraints.push(
        where("timestamp", "<=", Timestamp.fromDate(filters.endDate))
      );
    }

    const q =
      constraints.length > 0
        ? query(collection(db, "auditLogs"), ...constraints)
        : collection(db, "auditLogs");

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (err) {
    logError("auditService: getAuditEvents", err);
    return [];
  }
}

/**
 * Obtiene estadísticas de auditoría por tipo de evento
 */
export async function getAuditStatistics(days = 7) {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const events = await getAuditEvents({ startDate });

    const stats = {
      totalEvents: events.length,
      byType: {},
      byResource: {},
      byUser: {},
      suspiciousActivities: events.filter(
        (e) => e.eventType === AuditEventTypes.SUSPICIOUS_ACTIVITY
      ).length,
    };

    events.forEach((event) => {
      // Por tipo
      stats.byType[event.eventType] = (stats.byType[event.eventType] || 0) + 1;

      // Por recurso
      stats.byResource[event.resource] =
        (stats.byResource[event.resource] || 0) + 1;

      // Por usuario
      stats.byUser[event.userEmail] = (stats.byUser[event.userEmail] || 0) + 1;
    });

    return stats;
  } catch (err) {
    logError("auditService: getAuditStatistics", err);
    return null;
  }
}

/**
 * Webhook que se ejecuta después de ciertos eventos
 * Aquí puedes agregar lógica como enviar emails, notificaciones, etc.
 */
export async function triggerWebhook(eventType, data) {
  try {
    // Ejemplo: Notificar al admin si hay solicitudes
    if (eventType === AuditEventTypes.REQUEST_CREATED) {
      log(`🔔 Nueva solicitud: ${data.productName} por ${data.requestedBy}`);
      // Aquí podrías:
      // - Enviar email
      // - Enviar notificación push
      // - Llamar a una API externa
    }

    // Ejemplo: Alertar si hay actividad sospechosa
    if (eventType === AuditEventTypes.SUSPICIOUS_ACTIVITY) {
      warn(`🚨 Actividad sospechosa: ${JSON.stringify(data)}`);
      // Aquí podrías: Bloquear usuario, enviar alerta, etc.
    }

    // Ejemplo: Registrar eliminación de productos
    if (eventType === AuditEventTypes.PRODUCT_DELETED) {
      log(`⚠️ Producto eliminado: ${data.productName}`);
    }
  } catch (err) {
    logError("auditService: triggerWebhook", err);
  }
}
