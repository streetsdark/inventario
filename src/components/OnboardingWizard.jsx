import { useState } from "react";
import { BsCheck, BsArrowRight, BsXCircle, BsBuilding, BsArchive, BsBriefcase } from "react-icons/bs";
import { addDoc, collection, doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import { useAccountContext } from "../context/AccountContext";
import { useWarehouseContext } from "../context/WarehouseContext";
import useOnboarding from "../hooks/useOnboarding";
import { sanitizeString, isValidSKU } from "../utils/securityValidation";
import { isValidWarehouseName } from "../utils/warehouseFilter";
import { logAuditEvent } from "../utils/auditService";
import "../css/onboardingWizard.css";

const SECTORS = [
  "Ferretería / DIY",
  "Taller mecánico / automoción",
  "Mantenimiento industrial",
  "Clínica / consumibles sanitarios",
  "Construcción",
  "Hostelería",
  "Otro",
];

const SIZES = ["1-5 personas", "6-20 personas", "21-50 personas", "50+ personas"];

export default function OnboardingWizard() {
  const { account, accountId, accountRole } = useAccountContext();
  const { warehouses, defaultWarehouseId, createWarehouse } = useWarehouseContext();
  const { completed, loading, complete, skip } = useOnboarding();

  const [step, setStep]               = useState(1);
  const [busy, setBusy]               = useState(false);
  const [error, setError]             = useState(null);

  // Paso 1
  const [sector, setSector]           = useState("");
  const [size, setSize]               = useState("");
  const [location, setLocation]       = useState("");

  // Paso 2
  const [warehouseName, setWarehouseName] = useState("Almacén Principal");
  const [warehouseLoc, setWarehouseLoc]   = useState("");

  // Paso 3
  const [sku, setSku]                 = useState("");
  const [description, setDescription] = useState("");
  const [stock, setStock]             = useState("");

  // Solo se muestra al owner que no ha completado el onboarding.
  if (loading || completed || !accountId || accountRole !== "owner") return null;

  const safeComplete = async () => {
    setBusy(true);
    try { await complete(); }
    catch (err) { setError(err?.message || "Error al cerrar el asistente"); }
    finally { setBusy(false); }
  };

  const handleSkip = async () => {
    setBusy(true);
    try { await skip(); }
    catch (err) { setError(err?.message || "Error al saltar"); }
    finally { setBusy(false); }
  };

  const handleStep1 = async (e) => {
    e.preventDefault();
    setError(null);
    if (!sector) { setError("Elige un sector."); return; }
    setBusy(true);
    try {
      await updateDoc(doc(db, "accounts", accountId), {
        metadata: {
          sector: sanitizeString(sector),
          size:   sanitizeString(size),
          location: sanitizeString(location).slice(0, 120),
        },
      });
      setStep(2);
    } catch (err) {
      setError(err?.message || "No se pudo guardar");
    } finally {
      setBusy(false);
    }
  };

  const handleStep2 = async (e) => {
    e.preventDefault();
    setError(null);

    // Si ya hay almacenes (auto-default), no creamos otro a menos que el
    // usuario cambie el nombre. Esto evita duplicados involuntarios.
    const alreadyExists = warehouses.some(
      (w) => w.name.trim().toLowerCase() === warehouseName.trim().toLowerCase(),
    );
    if (alreadyExists) { setStep(3); return; }

    if (!isValidWarehouseName(warehouseName)) {
      setError("Nombre de almacén inválido.");
      return;
    }
    setBusy(true);
    try {
      await createWarehouse({ name: warehouseName, location: warehouseLoc });
      setStep(3);
    } catch (err) {
      setError(err?.message || "No se pudo crear el almacén");
    } finally {
      setBusy(false);
    }
  };

  const handleStep3 = async (e) => {
    e.preventDefault();
    setError(null);

    // Skip simple si el usuario no rellena nada.
    if (!sku && !description && !stock) {
      await safeComplete();
      return;
    }

    if (!isValidSKU(sku)) { setError("SKU inválido (alfanumérico, sin símbolos raros)."); return; }
    const stockNum = Number(stock);
    if (!Number.isFinite(stockNum) || stockNum < 0) { setError("Stock inválido."); return; }
    if (!description || description.trim().length < 2) { setError("Descripción muy corta."); return; }

    setBusy(true);
    try {
      const wId = defaultWarehouseId || warehouses[0]?.id || "";
      await addDoc(collection(db, "products"), {
        sku: sku.trim(),
        description: description.trim(),
        stock: stockNum,
        pending: 0,
        cost: 0,
        location: "",
        product_Unit: "u",
        warehouseId: wId,
        accountId,
        createdAt: serverTimestamp(),
      });
      await logAuditEvent("PRODUCT_CREATED", "product", sku, {
        via: "onboarding",
        accountId,
      });
      await safeComplete();
    } catch (err) {
      setError(err?.message || "No se pudo crear el producto");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="onb-overlay">
      <div className="onb-box">

        <div className="onb-header">
          <div>
            <h2>Bienvenido a {account?.name || "Altadill"}</h2>
            <p>Tres pasos rápidos para tener tu inventario operativo.</p>
          </div>
          <button type="button" className="onb-skip" onClick={handleSkip} disabled={busy}>
            Saltar todo
          </button>
        </div>

        <div className="onb-progress">
          {[1, 2, 3].map((n) => (
            <div key={n} className={`onb-progress-step ${step >= n ? "active" : ""} ${step > n ? "done" : ""}`}>
              {step > n ? <BsCheck size={14} /> : n}
            </div>
          ))}
        </div>

        {error && <div className="onb-error"><BsXCircle size={14} /> {error}</div>}

        {step === 1 && (
          <form onSubmit={handleStep1} className="onb-form">
            <h3><BsBriefcase /> Paso 1 — Cuéntanos de tu negocio</h3>
            <label>
              Sector
              <select value={sector} onChange={(e) => setSector(e.target.value)} disabled={busy} required>
                <option value="">— Selecciona uno —</option>
                {SECTORS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            <label>
              Tamaño del equipo
              <select value={size} onChange={(e) => setSize(e.target.value)} disabled={busy}>
                <option value="">— Selecciona uno —</option>
                {SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            <label>
              Ubicación principal (opcional)
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                maxLength={120}
                placeholder="Madrid, España"
                disabled={busy}
              />
            </label>
            <button type="submit" className="onb-btn primary" disabled={busy}>
              Siguiente <BsArrowRight size={14} />
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleStep2} className="onb-form">
            <h3><BsBuilding /> Paso 2 — Tu primer almacén</h3>
            <p className="onb-hint">
              Si ya tienes uno creado, te lo saltamos. Si no, te creamos uno
              ahora con el nombre que elijas.
            </p>
            <label>
              Nombre
              <input
                type="text"
                value={warehouseName}
                onChange={(e) => setWarehouseName(e.target.value)}
                maxLength={60}
                disabled={busy}
                required
              />
            </label>
            <label>
              Ubicación (opcional)
              <input
                type="text"
                value={warehouseLoc}
                onChange={(e) => setWarehouseLoc(e.target.value)}
                maxLength={120}
                placeholder="Nave 2, planta baja"
                disabled={busy}
              />
            </label>
            <div className="onb-actions">
              <button type="button" className="onb-btn ghost" onClick={() => setStep(3)} disabled={busy}>
                Ya tengo, saltar
              </button>
              <button type="submit" className="onb-btn primary" disabled={busy}>
                Crear y seguir <BsArrowRight size={14} />
              </button>
            </div>
          </form>
        )}

        {step === 3 && (
          <form onSubmit={handleStep3} className="onb-form">
            <h3><BsArchive /> Paso 3 — Tu primer producto</h3>
            <p className="onb-hint">
              Opcional. Puedes saltar y crear productos más tarde desde la
              sección "Productos".
            </p>
            <label>
              SKU
              <input
                type="text"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="TOR-001"
                maxLength={50}
                disabled={busy}
              />
            </label>
            <label>
              Descripción
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Tornillo M8"
                maxLength={120}
                disabled={busy}
              />
            </label>
            <label>
              Stock inicial
              <input
                type="number"
                min="0"
                step="1"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                placeholder="0"
                disabled={busy}
              />
            </label>
            <div className="onb-actions">
              <button type="button" className="onb-btn ghost" onClick={safeComplete} disabled={busy}>
                Saltar y terminar
              </button>
              <button type="submit" className="onb-btn primary" disabled={busy}>
                Finalizar <BsCheck size={14} />
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
}
