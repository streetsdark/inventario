import { describe, it, expect } from "vitest";
import {
  slugify,
  isValidAccountName,
  isValidAccountRole,
  isValidAccountPlan,
  isValidAccountStatus,
  canManageMembers,
  canDeleteAccount,
  canTransferOwnership,
  canChangeMemberRole,
  ACCOUNT_ROLES,
} from "../utils/accountUtils";

describe("slugify", () => {
  it("normaliza acentos y deja solo [a-z0-9-]", () => {
    expect(slugify("ACME España S.L.")).toBe("acme-espana-s-l");
    expect(slugify("Hörmann GmbH")).toBe("hormann-gmbh");
  });

  it("recorta a 40 caracteres", () => {
    expect(slugify("a".repeat(80))?.length).toBe(40);
  });

  it("devuelve null si el resultado es < 3 chars", () => {
    expect(slugify("a")).toBeNull();
    expect(slugify("!@#")).toBeNull();
    expect(slugify("")).toBeNull();
  });

  it("devuelve null si input no es string", () => {
    expect(slugify(null)).toBeNull();
    expect(slugify(undefined)).toBeNull();
    expect(slugify(123)).toBeNull();
  });

  it("no deja guiones al principio o al final", () => {
    expect(slugify("--ACME--")).toBe("acme");
  });
});

describe("isValidAccountName", () => {
  it("acepta nombres normales con acentos y símbolos comunes", () => {
    expect(isValidAccountName("ACME S.L.")).toBe(true);
    expect(isValidAccountName("D&L Logistics")).toBe(true);
    expect(isValidAccountName("Hierros Altadill")).toBe(true);
  });

  it("rechaza menos de 2 o más de 80 chars", () => {
    expect(isValidAccountName("a")).toBe(false);
    expect(isValidAccountName("ab")).toBe(true);
    expect(isValidAccountName("a".repeat(80))).toBe(true);
    expect(isValidAccountName("a".repeat(81))).toBe(false);
  });

  it("rechaza caracteres de control e inyección", () => {
    expect(isValidAccountName("ACME\x00")).toBe(false);
    expect(isValidAccountName("<script>")).toBe(false);
    expect(isValidAccountName('ACME"; DROP')).toBe(false);
    expect(isValidAccountName("ACME\nLine")).toBe(false);
  });

  it("rechaza no-strings", () => {
    expect(isValidAccountName(null)).toBe(false);
    expect(isValidAccountName(123)).toBe(false);
    expect(isValidAccountName(undefined)).toBe(false);
  });
});

describe("isValidAccountRole / Plan / Status — whitelists estrictas", () => {
  it("isValidAccountRole solo acepta owner|admin|member", () => {
    expect(ACCOUNT_ROLES).toEqual(["owner", "admin", "member"]);
    ACCOUNT_ROLES.forEach((r) => expect(isValidAccountRole(r)).toBe(true));
    expect(isValidAccountRole("superuser")).toBe(false);
    expect(isValidAccountRole("")).toBe(false);
    expect(isValidAccountRole(null)).toBe(false);
  });

  it("isValidAccountPlan acepta planes definidos", () => {
    ["free", "starter", "pro", "business"].forEach((p) =>
      expect(isValidAccountPlan(p)).toBe(true),
    );
    expect(isValidAccountPlan("enterprise")).toBe(false);
  });

  it("isValidAccountStatus acepta active|suspended|trial", () => {
    ["active", "suspended", "trial"].forEach((s) =>
      expect(isValidAccountStatus(s)).toBe(true),
    );
    expect(isValidAccountStatus("inactive")).toBe(false);
  });
});

describe("canManageMembers / canDeleteAccount / canTransferOwnership", () => {
  it("canManageMembers solo true para owner y admin", () => {
    expect(canManageMembers("owner")).toBe(true);
    expect(canManageMembers("admin")).toBe(true);
    expect(canManageMembers("member")).toBe(false);
    expect(canManageMembers(null)).toBe(false);
  });

  it("canDeleteAccount solo true para owner", () => {
    expect(canDeleteAccount("owner")).toBe(true);
    expect(canDeleteAccount("admin")).toBe(false);
    expect(canDeleteAccount("member")).toBe(false);
  });

  it("canTransferOwnership solo true para owner", () => {
    expect(canTransferOwnership("owner")).toBe(true);
    expect(canTransferOwnership("admin")).toBe(false);
  });
});

describe("canChangeMemberRole — defensa contra escalada de privilegios", () => {
  const base = {
    actorRole: "admin",
    actorUid: "u1",
    targetUid: "u2",
    targetCurrentRole: "member",
    targetNewRole: "admin",
  };

  it("permite a un admin mover a otro miembro a admin", () => {
    expect(canChangeMemberRole(base)).toBe(true);
  });

  it("nadie puede cambiarse el rol a sí mismo", () => {
    expect(canChangeMemberRole({ ...base, targetUid: "u1" })).toBe(false);
  });

  it("member no puede cambiar nada", () => {
    expect(canChangeMemberRole({ ...base, actorRole: "member" })).toBe(false);
  });

  it("nadie puede tocar al owner desde aquí", () => {
    expect(canChangeMemberRole({ ...base, targetCurrentRole: "owner" })).toBe(false);
  });

  it("nadie puede ascender a otro a owner desde aquí (eso es transferOwnership)", () => {
    expect(canChangeMemberRole({ ...base, targetNewRole: "owner" })).toBe(false);
    expect(canChangeMemberRole({ ...base, actorRole: "owner", targetNewRole: "owner" })).toBe(false);
  });

  it("rechaza roles inválidos", () => {
    expect(canChangeMemberRole({ ...base, targetNewRole: "superuser" })).toBe(false);
    expect(canChangeMemberRole({ ...base, actorRole: "x" })).toBe(false);
  });

  it("rechaza UIDs faltantes", () => {
    expect(canChangeMemberRole({ ...base, actorUid: "" })).toBe(false);
    expect(canChangeMemberRole({ ...base, targetUid: null })).toBe(false);
  });
});
