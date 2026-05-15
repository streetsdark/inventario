import { createContext, useContext, useEffect, useMemo, useState } from "react";
import useWarehouses from "../hooks/useWarehouses";
import { pickDefaultWarehouse, ALL_WAREHOUSES } from "../utils/warehouseFilter";

const STORAGE_KEY = "altadill.selectedWarehouseId";

const WarehouseContext = createContext(null);

export function WarehouseProvider({ children }) {
  const { warehouses, loading, createWarehouse, updateWarehouse, deleteWarehouse } = useWarehouses();

  const [selectedId, setSelectedIdState] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || null;
    } catch {
      return null;
    }
  });

  // Si el id guardado ya no existe (almacén borrado) → caer a default.
  useEffect(() => {
    if (loading || warehouses.length === 0) return;
    if (selectedId === ALL_WAREHOUSES) return;
    const stillExists = warehouses.some((w) => w.id === selectedId);
    if (!stillExists) {
      const def = pickDefaultWarehouse(warehouses);
      setSelectedIdState(def?.id || null);
    }
  }, [warehouses, loading, selectedId]);

  // Si nunca se ha elegido nada, elegir el default cuando cargue.
  useEffect(() => {
    if (loading || selectedId) return;
    const def = pickDefaultWarehouse(warehouses);
    if (def) setSelectedIdState(def.id);
  }, [warehouses, loading, selectedId]);

  const setSelectedId = (id) => {
    setSelectedIdState(id);
    try {
      if (id) localStorage.setItem(STORAGE_KEY, id);
      else    localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  };

  const defaultWarehouse = useMemo(() => pickDefaultWarehouse(warehouses), [warehouses]);
  const selectedWarehouse = useMemo(
    () => warehouses.find((w) => w.id === selectedId) || null,
    [warehouses, selectedId],
  );

  const value = useMemo(
    () => ({
      warehouses,
      loading,
      selectedId,
      setSelectedId,
      selectedWarehouse,
      defaultWarehouseId: defaultWarehouse?.id || null,
      defaultWarehouse,
      createWarehouse,
      updateWarehouse,
      deleteWarehouse,
    }),
    [warehouses, loading, selectedId, selectedWarehouse, defaultWarehouse, createWarehouse, updateWarehouse, deleteWarehouse],
  );

  return <WarehouseContext.Provider value={value}>{children}</WarehouseContext.Provider>;
}

/**
 * Hook seguro: si no hay provider (p.ej. tests legados, herramientas) devuelve
 * valores neutros que no rompen la lógica existente.
 */
export function useWarehouseContext() {
  return useContext(WarehouseContext) || {
    warehouses: [],
    loading: false,
    selectedId: null,
    setSelectedId: () => {},
    selectedWarehouse: null,
    defaultWarehouseId: null,
    defaultWarehouse: null,
    createWarehouse: async () => {},
    updateWarehouse: async () => {},
    deleteWarehouse: async () => {},
  };
}
