import { BsBuilding } from "react-icons/bs";
import { useWarehouseContext } from "../context/WarehouseContext";
import useRole from "../hooks/useRole";
import { ALL_WAREHOUSES } from "../utils/warehouseFilter";
import "../css/warehouseSwitcher.css";

export default function WarehouseSwitcher() {
  const { warehouses, loading, selectedId, setSelectedId } = useWarehouseContext();
  const { isSuperUser } = useRole();

  if (loading) return null;
  if (warehouses.length === 0) return null;

  const handleChange = (e) => {
    setSelectedId(e.target.value);
  };

  return (
    <div className="warehouse-switcher">
      <BsBuilding size={16} className="warehouse-switcher-icon" />
      <label htmlFor="warehouse-selector" className="warehouse-switcher-label">
        Almacén:
      </label>
      <select
        id="warehouse-selector"
        className="warehouse-switcher-select"
        value={selectedId || ""}
        onChange={handleChange}
      >
        {warehouses.map((w) => (
          <option key={w.id} value={w.id}>
            {w.name}{w.isDefault ? " ★" : ""}
          </option>
        ))}
        {isSuperUser && (
          <option value={ALL_WAREHOUSES}>— Todos (admin) —</option>
        )}
      </select>
    </div>
  );
}
