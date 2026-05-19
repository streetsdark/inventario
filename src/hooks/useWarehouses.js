import { useEffect, useState, useMemo } from "react";
import {
  collection,
  onSnapshot,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { db } from "../firebase/config";
import { error as logError } from "../utils/logger";
import { sanitizeString } from "../utils/securityValidation";
import { isValidWarehouseName } from "../utils/warehouseFilter";
import { filterByAccount, attachedAccountId } from "../utils/accountFilter";
import { useAccountContext } from "../context/AccountContext";
import useRole from "./useRole";

export default function useWarehouses() {
  const { isAdmin, loading: roleLoading } = useRole();
  const { accountId: currentAccountId } = useAccountContext();
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ensureDefaultDone, setEnsureDefaultDone] = useState(false);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "warehouses"),
      (snapshot) => {
        const list = snapshot.docs.map((d) => {
          const data = d.data() || {};
          const createdAtMs =
            data.createdAt?.toMillis?.() ??
            (typeof data.createdAtMs === "number" ? data.createdAtMs : 0);
          return {
            id: d.id,
            name: sanitizeString(data.name || ""),
            location: sanitizeString(data.location || ""),
            isDefault: !!data.isDefault,
            accountId: typeof data.accountId === "string" ? data.accountId : "",
            createdAtMs,
          };
        });
        setWarehouses(list);
        setLoading(false);
      },
      (err) => {
        logError("useWarehouses error:", err);
        setLoading(false);
      },
    );
    return () => unsubscribe();
  }, []);

  // Auto-crear "Almacén Principal" si no existe ninguno y el usuario tiene permisos.
  // Los usuarios básicos no pueden escribir en /warehouses (regla Firestore) → no se intenta.
  useEffect(() => {
    if (loading || roleLoading || ensureDefaultDone) return;
    if (warehouses.length > 0) {
      setEnsureDefaultDone(true);
      return;
    }
    if (!isAdmin) return; // espera a que un superuser/admin entre por primera vez
    (async () => {
      try {
        await addDoc(collection(db, "warehouses"), {
          name: "Almacén Principal",
          location: "",
          isDefault: true,
          accountId: currentAccountId || "",
          createdAt: serverTimestamp(),
        });
      } catch (err) {
        logError("useWarehouses: no se pudo crear almacén por defecto", err);
      } finally {
        setEnsureDefaultDone(true);
      }
    })();
  }, [loading, roleLoading, isAdmin, warehouses, ensureDefaultDone, currentAccountId]);

  const createWarehouse = async ({ name, location = "" }) => {
    if (!isValidWarehouseName(name)) {
      throw new Error("Nombre de almacén inválido");
    }
    await addDoc(collection(db, "warehouses"), {
      name: name.trim(),
      location: typeof location === "string" ? location.trim().slice(0, 120) : "",
      isDefault: false,
      accountId: attachedAccountId("", currentAccountId),
      createdAt: serverTimestamp(),
    });
  };

  const updateWarehouse = async (id, patch) => {
    if (!id || typeof id !== "string") throw new Error("ID inválido");
    const clean = {};
    if (patch?.name !== undefined) {
      if (!isValidWarehouseName(patch.name)) throw new Error("Nombre de almacén inválido");
      clean.name = patch.name.trim();
    }
    if (patch?.location !== undefined) {
      clean.location = String(patch.location).trim().slice(0, 120);
    }
    if (patch?.isDefault !== undefined) {
      clean.isDefault = !!patch.isDefault;
    }
    if (Object.keys(clean).length === 0) return;
    await updateDoc(doc(db, "warehouses", id), clean);
  };

  const deleteWarehouse = async (id) => {
    if (!id || typeof id !== "string") throw new Error("ID inválido");
    const target = warehouses.find((w) => w.id === id);
    if (target?.isDefault) {
      throw new Error("No se puede eliminar el almacén por defecto");
    }
    await deleteDoc(doc(db, "warehouses", id));
  };

  /**
   * Borra el almacén por defecto promoviendo otro como default ANTES.
   * Necesario porque las reglas Firestore protegen contra borrar isDefault=true.
   *
   * Flujo:
   *  1. Batch atómico: marca newDefaultId como default y desmarca el viejo.
   *  2. Borra el viejo (que ya no es default → la regla lo permite).
   *
   * Si el paso 2 falla, queda al menos un default válido (inconsistencia
   * recuperable: el viejo sigue existiendo, el nuevo es default).
   */
  const deleteWarehouseWithReassign = async (oldId, newDefaultId) => {
    if (!oldId || typeof oldId !== "string") throw new Error("ID inválido");
    if (!newDefaultId || typeof newDefaultId !== "string") {
      throw new Error("Debes elegir qué almacén pasa a ser el nuevo default");
    }
    if (oldId === newDefaultId) {
      throw new Error("El nuevo default no puede ser el mismo que vas a borrar");
    }
    const newDefault = warehouses.find((w) => w.id === newDefaultId);
    if (!newDefault) throw new Error("El almacén destino no existe");

    // 1) Promover y desmarcar (atómico)
    const batch = writeBatch(db);
    batch.update(doc(db, "warehouses", newDefaultId), { isDefault: true });
    batch.update(doc(db, "warehouses", oldId),       { isDefault: false });
    await batch.commit();

    // 2) Ahora el viejo NO es default → la regla permite borrarlo
    await deleteDoc(doc(db, "warehouses", oldId));
  };

  // Aislamos lo que ve el resto de la app por la cuenta actual (los datos sin
  // accountId del periodo pre-tenant caen bajo la cuenta del propio usuario).
  const visibleWarehouses = useMemo(
    () => filterByAccount(warehouses, currentAccountId, currentAccountId),
    [warehouses, currentAccountId],
  );

  return {
    warehouses: visibleWarehouses,
    loading,
    createWarehouse,
    updateWarehouse,
    deleteWarehouse,
    deleteWarehouseWithReassign,
  };
}
