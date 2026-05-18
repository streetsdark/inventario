import { useState, useRef, useEffect } from "react";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { collection, query, where, orderBy, limit, onSnapshot } from "firebase/firestore";
import { auth, db } from "../firebase/config";
import useAuth from "../hooks/useAuth";
import useProducts from "../hooks/useProducts";
import useFreeRequest from "../hooks/useFreeRequest";
import useProductRequestCreate from "../hooks/useProductRequestCreate";
import { useAccountContext } from "../context/AccountContext";
import { error as logError } from "../utils/logger";
import Modal from "../components/Modal";
import { BsBoxArrowRight, BsClockHistory, BsSearch } from "react-icons/bs";
import "../css/solicitar.css";

const MAX_DROPDOWN_RESULTS = 6;
const MIN_SEARCH_LENGTH = 2;
const MY_REQUESTS_LIMIT = 30;

// Sincroniza el tema (dark/light) desde localStorage al html raíz
function useThemeSync() {
  useEffect(() => {
    const saved = localStorage.getItem("theme");
    const html = document.documentElement;
    if (saved === "dark") {
      html.classList.add("dark");
      html.classList.remove("light");
    } else {
      html.classList.add("light");
      html.classList.remove("dark");
    }
  }, []);
}

function formatDate(ts) {
  if (!ts) return "—";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function Solicitar() {
  useThemeSync();

  const { user } = useAuth();
  const { accountId } = useAccountContext();
  const { createFreeRequest } = useFreeRequest();
  const { createRequest } = useProductRequestCreate();
  const navigate = useNavigate();

  /* ── Buscador ─────────────────────────────────────── */
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const searchTerm = description.length >= MIN_SEARCH_LENGTH ? description : "";
  const { products } = useProducts(searchTerm);
  const results = searchTerm && !selectedProduct ? products.slice(0, MAX_DROPDOWN_RESULTS) : [];

  useEffect(() => {
    setDropdownOpen(results.length > 0 && formOpen);
  }, [results, formOpen]);

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* ── Mis solicitudes (filtradas por accountId actual) ── */
  const [myRequests, setMyRequests] = useState([]);
  useEffect(() => {
    if (!user?.uid || !accountId) { setMyRequests([]); return; }
    const q = query(
      collection(db, "productRequests"),
      where("userId", "==", user.uid),
      where("accountId", "==", accountId),
      orderBy("createdAt", "desc"),
      limit(MY_REQUESTS_LIMIT)
    );
    const unsub = onSnapshot(
      q,
      (snap) => setMyRequests(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (err) => logError("Solicitar: myRequests subscribe", err),
    );
    return unsub;
  }, [user?.uid, accountId]);

  /* ── Handlers ─────────────────────────────────────── */
  const displayName = user?.displayName || user?.email?.split("@")[0] || "Usuario";

  function selectProduct(p) {
    setSelectedProduct(p);
    setDescription(p.description);
    setDropdownOpen(false);
  }

  function resetForm() {
    setDescription("");
    setQuantity(1);
    setNote("");
    setSelectedProduct(null);
    setFormOpen(false);
    setDropdownOpen(false);
  }

  const [modal, setModal] = useState({ show: false, text: "", type: "success", showButton: true });

  async function handleSignOut() {
    await signOut(auth);
    navigate("/");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!description.trim()) return;
    setSubmitting(true);
    try {
      if (selectedProduct) {
        await createRequest(selectedProduct, quantity);
      } else {
        await createFreeRequest({ description, quantity, note });
      }
      setModal({ show: true, text: "¡Solicitud enviada! El equipo administrativo la gestionará pronto.", type: "success", showButton: true });
      resetForm();
    } catch (err) {
      logError("Solicitar: handleSubmit", err);
      setModal({ show: true, text: err?.message || "No se pudo enviar la solicitud. Inténtalo de nuevo.", type: "error", showButton: true });
    } finally {
      setSubmitting(false);
    }
  }

  /* ── Render ───────────────────────────────────────── */
  return (
    <div className="sol-root">

      {/* Header */}
      <header className="sol-header">
        <span className="sol-brand">ALTADILL</span>
        <div className="sol-header-right">
          <span className="sol-username">{displayName}</span>
          <button className="sol-signout" onClick={handleSignOut}>
            <BsBoxArrowRight size={16} />
            Salir
          </button>
        </div>
      </header>

      <main className="sol-main">

        {/* Card principal de solicitud */}
        <section className="sol-card">
          <h1 className="sol-title">Portal de Solicitudes</h1>
          <p className="sol-subtitle">
            Busca lo que necesitas del almacén y envía tu pedido. El equipo
            administrativo lo gestionará.
          </p>

          {!formOpen ? (
            <button className="sol-btn-primary sol-cta" onClick={() => setFormOpen(true)}>
              <BsSearch size={18} />
              Solicitar Producto
            </button>
          ) : (
            <form className="sol-form" onSubmit={handleSubmit}>

              {/* Campo de búsqueda */}
              <div className="sol-field" ref={dropdownRef}>
                <label className="sol-label">¿Qué necesitas?</label>
                <div className="sol-search-wrap">
                  <BsSearch className="sol-search-icon" size={16} />
                  <input
                    className="sol-input sol-input--search"
                    type="text"
                    placeholder="Escribe el nombre del producto o herramienta..."
                    value={description}
                    onChange={(e) => {
                      setDescription(e.target.value);
                      if (selectedProduct) setSelectedProduct(null);
                    }}
                    required
                    autoComplete="off"
                  />
                  {selectedProduct && (
                    <button type="button" className="sol-clear" onClick={() => { setSelectedProduct(null); setDescription(""); }}>✕</button>
                  )}
                </div>

                {/* Badge del producto seleccionado */}
                {selectedProduct && (
                  <div className="sol-selected-badge">
                    <span className={`sol-stock-dot ${selectedProduct.stock > 0 ? "available" : "out"}`} />
                    {selectedProduct.stock > 0 ? "Disponible en almacén" : "Sin stock actualmente"}
                  </div>
                )}

                {/* Dropdown de resultados */}
                {dropdownOpen && (
                  <ul className="sol-dropdown">
                    {results.map((p) => {
                      const img = p.imageUrl || p.img_b64 || null;
                      const available = p.stock > 0;
                      return (
                        <li key={p.id} className="sol-dropdown-item" onMouseDown={() => selectProduct(p)}>
                          <div className="sol-dd-img">
                            {img
                              ? <img src={img} alt={p.description} />
                              : <span className="sol-dd-img-placeholder">📦</span>
                            }
                          </div>
                          <div className="sol-dd-info">
                            <span className="sol-dd-name">{p.description}</span>
                          </div>
                          <span className={`sol-badge ${available ? "sol-badge--ok" : "sol-badge--out"}`}>
                            {available ? "Disponible" : "Sin stock"}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              {/* Cantidad */}
              <div className="sol-field">
                <label className="sol-label">Cantidad</label>
                <input
                  className="sol-input sol-input--qty"
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                />
              </div>

              {/* Nota — solo en solicitud libre */}
              {!selectedProduct && (
                <div className="sol-field">
                  <label className="sol-label">Nota adicional (opcional)</label>
                  <textarea
                    className="sol-input"
                    placeholder="Motivo, urgencia, especificaciones..."
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={3}
                  />
                </div>
              )}

              <div className="sol-form-actions">
                <button type="button" className="sol-btn-ghost" onClick={resetForm}>Cancelar</button>
                <button type="submit" className="sol-btn-primary" disabled={submitting}>
                  {submitting ? "Enviando..." : "Enviar solicitud"}
                </button>
              </div>
            </form>
          )}
        </section>

        {/* Lista de solicitudes propias */}
        {myRequests.length > 0 && (
          <section className="sol-history">
            <h2 className="sol-history-title">
              <BsClockHistory size={18} />
              Mis solicitudes
            </h2>
            <div className="sol-history-list">
              {myRequests.map((r) => (
                <div key={r.id} className="sol-history-item">
                  <div className="sol-history-name">
                    {r.productName || r.description || "Producto"}
                  </div>
                  <div className="sol-history-meta">
                    <span className="sol-history-qty">× {r.quantity}</span>
                    <span className="sol-history-date">{formatDate(r.createdAt)}</span>
                    <span className={`sol-status-chip sol-status--${r.status || "pending"}`}>
                      {r.status === "approved" ? "Aprobada"
                        : r.status === "rejected" ? "Rechazada"
                        : r.status === "completed" ? "Completada"
                        : "Pendiente"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

      </main>

      <Modal modalConfig={modal} setModalConfig={setModal} />
    </div>
  );
}
