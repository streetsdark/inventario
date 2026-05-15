/**
 * Helpers puros para el modelo Account (multi-tenant Fase 1).
 *
 * Sin dependencias de Firebase/React → testeables al 100%.
 * Replicar el estilo de warehouseFilter.js.
 */

export const ACCOUNT_ROLES = Object.freeze(["owner", "admin", "member"]);
export const ACCOUNT_PLANS = Object.freeze(["free", "starter", "pro", "business"]);
export const ACCOUNT_STATUSES = Object.freeze(["active", "suspended", "trial"]);

const NAME_REGEX = /^[A-Za-z0-9ÁÉÍÓÚÜÑáéíóúüñ.,&'°\-_/() ]+$/;

/**
 * Convierte un nombre arbitrario en un slug seguro.
 * Resultado: [a-z0-9-]{3,40}, sin guiones al principio o al final.
 * Devuelve null si no se puede generar uno válido.
 */
export function slugify(name) {
  if (typeof name !== "string") return null;
  const slug = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")   // quita acentos
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  if (slug.length < 3) return null;
  return slug;
}

/** Whitelist + tope para nombres de cuenta (2-80 chars). */
export function isValidAccountName(name) {
  if (typeof name !== "string") return false;
  const trimmed = name.trim();
  if (trimmed.length < 2 || trimmed.length > 80) return false;
  if (/[\x00-\x1F\x7F]/.test(trimmed)) return false;
  return NAME_REGEX.test(trimmed);
}

export function isValidAccountRole(role) {
  return typeof role === "string" && ACCOUNT_ROLES.includes(role);
}

export function isValidAccountPlan(plan) {
  return typeof plan === "string" && ACCOUNT_PLANS.includes(plan);
}

export function isValidAccountStatus(status) {
  return typeof status === "string" && ACCOUNT_STATUSES.includes(status);
}

/** Owner y admin pueden gestionar miembros. Member no. */
export function canManageMembers(accountRole) {
  return accountRole === "owner" || accountRole === "admin";
}

/** Solo el owner puede borrar la cuenta entera. */
export function canDeleteAccount(accountRole) {
  return accountRole === "owner";
}

/** Solo el owner puede transferir ownership. */
export function canTransferOwnership(accountRole) {
  return accountRole === "owner";
}

/**
 * Valida una transición de rol respetando el principio de menor privilegio.
 *  - Solo owner puede crear nuevos owners (transferencia).
 *  - admin puede mover entre admin/member pero no tocar al owner.
 *  - member nunca cambia roles.
 *  - Nadie puede cambiarse el rol a sí mismo (evita race conditions de privesc).
 */
export function canChangeMemberRole({ actorRole, actorUid, targetUid, targetCurrentRole, targetNewRole }) {
  if (!isValidAccountRole(actorRole) || !isValidAccountRole(targetNewRole)) return false;
  if (!actorUid || !targetUid) return false;
  if (actorUid === targetUid) return false;
  if (!canManageMembers(actorRole)) return false;
  if (targetCurrentRole === "owner") return false;          // al owner solo se llega por transferencia
  if (targetNewRole === "owner") return false;              // ascender a owner solo por transferencia
  if (actorRole === "admin" && targetNewRole === "owner") return false;
  return true;
}
