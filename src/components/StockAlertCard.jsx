import { useState } from "react";
import { BsExclamationTriangle, BsChevronRight } from "react-icons/bs";
import useProducts from "../hooks/useProducts";
import "../css/stockAlert.css";

export default function StockAlertCard() {
  const [open, setOpen] = useState(false);
  const { products, loading } = useProducts();

  const alertProducts = products.filter(
    (p) => Number(p.stockMinimo || 0) > 0 && Number(p.stock || 0) <= Number(p.stockMinimo || 0)
  );

  const count = alertProducts.length;

  return (
    <div className={`stock-alert-card ${open ? "open" : ""} ${count > 0 ? "has-alerts" : ""}`}>
      <div className="stock-alert-trigger" onClick={() => setOpen((o) => !o)}>
        <div className="stock-alert-trigger-left">
          <BsExclamationTriangle size={22} className="stock-alert-icon" />
          <div>
            <h2>Alertas de stock mínimo</h2>
            <p className="stock-alert-subtitle">
              {loading
                ? "Cargando..."
                : count === 0
                ? "Todos los productos sobre el mínimo"
                : `${count} producto${count !== 1 ? "s" : ""} por debajo del mínimo`}
            </p>
          </div>
        </div>
        {count > 0 && <span className="stock-alert-badge">{count}</span>}
        <BsChevronRight
          size={18}
          className="stock-alert-chevron"
          style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.22s ease" }}
        />
      </div>

      {open && (
        <div className="stock-alert-panel">
          {count === 0 ? (
            <p className="stock-alert-empty">No hay productos por debajo del stock mínimo.</p>
          ) : (
            <div className="stock-alert-list">
              {alertProducts.map((p) => {
                const stock = Number(p.stock || 0);
                const minimo = Number(p.stockMinimo || 0);
                const isOut = stock <= 0;
                return (
                  <div key={p.id} className={`stock-alert-row ${isOut ? "out" : "low"}`}>
                    <div className="stock-alert-row-info">
                      <span className="stock-alert-row-name">{p.description}</span>
                      <span className="stock-alert-row-sku">{p.sku}</span>
                    </div>
                    <div className="stock-alert-row-stocks">
                      <span className="stock-alert-current">
                        Stock: <b>{stock} {p.product_Unit || ""}</b>
                      </span>
                      <span className="stock-alert-min">
                        Mín: <b>{minimo}</b>
                      </span>
                      {isOut ? (
                        <span className="stock-alert-tag out">Sin stock</span>
                      ) : (
                        <span className="stock-alert-tag low">Bajo mínimo</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
