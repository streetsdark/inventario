import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase/config";
import { error as logError } from "../utils/logger";
import { sanitizeString } from "../utils/securityValidation";
import { isValidWarehouseName } from "../utils/warehouseFilter";
import useRole from "./useRole";

export default function useWarehouses() {
  const { isAdmin, loading: roleLoading } = useRole();
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
          createdAt: serverTimestamp(),
        });
      } catch (err) {
        logError("useWarehouses: no se pudo crear almacén por defecto", err);
      } finally {
        setEnsureDefaultDone(true);
      }
    })();
  }, [loading, roleLoading, isAdmin, warehouses, ensureDefaultDone]);

  const createWarehouse = async ({ name, location = "" }) => {
    if (!isValidWarehouseName(name)) {
      throw new Error("Nombre de almacén inválido");
    }
    await addDoc(collection(db, "warehouses"), {
      name: name.trim(),
      location: typeof location === "string" ? location.trim().slice(0, 120) : "",
      isDefault: false,
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

  return { warehouses, loading, createWarehouse, updateWarehouse, deleteWarehouse };
}
