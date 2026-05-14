import { useState, useMemo } from "react";
import { Bar } from "react-chartjs-2";
import { BsBarChart } from "react-icons/bs";
import useMoves from "../hooks/useMoves";
import "../css/analyticsCard.css";

const PERIODS = [
  { key: "1m",  label: "1 mes"   },
  { key: "3m",  label: "3 meses" },
  { key: "6m",  label: "6 meses" },
  { key: "1a",  label: "1 año"   },
  { key: "all", label: "Todo"    },
];

function getPeriodStart(period) {
  if (period === "all") return null;
  const d = new Date();
  if (period === "1m") d.setMonth(d.getMonth() - 1);
  if (period === "3m") d.setMonth(d.getMonth() - 3);
  if (period === "6m") d.setMonth(d.getMonth() - 6);
  if (period === "1a") d.setFullYear(d.getFullYear() - 1);
  return d.toISOString().slice(0, 10);
}

function sortedTop(obj, limit = 8) {
  return Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, limit);
}

function shortLabel(str, max = 20) {
  return str.length > max ? str.slice(0, max - 1) + "…" : str;
}

const tooltipStyle = {
  backgroundColor: "rgba(11,24,41,0.96)",
  borderColor: "rgba(77,184,240,0.3)",
  borderWidth: 1,
  titleColor: "#e8f4fd",
  bodyColor: "#8fb3cc",
  padding: 10,
  cornerRadius: 8,
};

const scaleStyle = {
  grid: { color: "rgba(77,184,240,0.08)" },
  ticks: { color: "#8fb3cc", font: { size: 11 } },
  border: { color: "transparent" },
};

const BASE_OPTIONS = {
  maintainAspectRatio: false,
  plugins: { legend: { display: false }, tooltip: tooltipStyle },
  scales: { x: scaleStyle, y: scaleStyle },
};

const HORIZ_OPTIONS = { ...BASE_OPTIONS, indexAxis: "y" };

export default function AnalyticsCard() {
  const { moves, loading } = useMoves();
  const [open, setOpen] = useState(false);
  const [period, setPeriod] = useState("3m");

  const { byMonth, byUser, byProduct, totalOut, totalIn, uniqueUsers, uniqueProducts } =
    useMemo(() => {
      const start = getPeriodStart(period);
      const inRange = (date) => !start || (date && date >= start);

      const outMoves = moves.filter(
        (m) => m.type === "out" && inRange(m.exitDate || m.movementDate)
      );
      const inMoves = moves.filter(
        (m) => m.type === "in" && inRange(m.entryDate || m.movementDate)
      );

      const byMonth = {}, byUser = {}, byProduct = {};

      outMoves.forEach((m) => {
        const month = (m.exitDate || m.movementDate || "").slice(0, 7);
        const qty = Number(m.quantity || 0);
        if (month) byMonth[month] = (byMonth[month] || 0) + qty;

        const user = (m.recipientUser || "Sin asignar").trim();
        byUser[user] = (byUser[user] || 0) + qty;

        const prod = m.description || "Sin nombre";
        byProduct[prod] = (byProduct[prod] || 0) + qty;
      });

      return {
        byMonth,
        byUser,
        byProduct,
        totalOut: outMoves.reduce((s, m) => s + Number(m.quantity || 0), 0),
        totalIn:  inMoves.reduce((s, m) => s + Number(m.quantity || 0), 0),
        uniqueUsers:    Object.keys(byUser).filter((u) => u !== "Sin asignar").length,
        uniqueProducts: Object.keys(byProduct).length,
      };
    }, [moves, period]);

  const monthKeys = Object.keys(byMonth).sort();
  const monthLabels = monthKeys.map((k) => {
    const [y, m] = k.split("-");
    return new Date(Number(y), Number(m) - 1).toLocaleDateString("es-ES", {
      month: "short", year: "2-digit",
    });
  });

  const monthData = {
    labels: monthLabels,
    datasets: [{ label: "Unidades salidas", data: monthKeys.map((k) => byMonth[k]),
      backgroundColor: "rgba(77,184,240,0.65)", borderColor: "rgba(77,184,240,1)",
      borderWidth: 1, borderRadius: 6, hoverBackgroundColor: "rgba(77,184,240,0.9)" }],
  };

  const topUsers = sortedTop(byUser);
  const userData = {
    labels: topUsers.map(([u]) => shortLabel(u)),
    datasets: [{ data: topUsers.map(([, v]) => v),
      backgroundColor: "rgba(74,158,138,0.65)", borderColor: "rgba(74,158,138,1)",
      borderWidth: 1, borderRadius: 6, hoverBackgroundColor: "rgba(74,158,138,0.9)" }],
  };

  const topProducts = sortedTop(byProduct);
  const productData = {
    labels: topProducts.map(([p]) => shortLabel(p)),
    datasets: [{ data: topProducts.map(([, v]) => v),
      backgroundColor: "rgba(194,148,58,0.65)", borderColor: "rgba(194,148,58,1)",
      borderWidth: 1, borderRadius: 6, hoverBackgroundColor: "rgba(194,148,58,0.9)" }],
  };

  const noData = monthKeys.length === 0 && topUsers.length === 0;

  return (
    <div className={`analytics-card ${open ? "open" : ""}`}>

      {/* Clickable trigger row */}
      <div className="analytics-trigger" onClick={() => setOpen((v) => !v)}>
        <div className="analytics-trigger-left">
          <BsBarChart size={28} className="analytics-icon" />
          <div>
            <h2>Analíticas de movimientos</h2>
            <p className="analytics-subtitle">
              {loading
                ? "Cargando..."
                : open
                ? "Haz clic para cerrar"
                : "Consumo por período, usuario y producto"}
            </p>
          </div>
        </div>

        {/* Mini KPIs siempre visibles */}
        {!loading && (
          <div className="analytics-mini-kpis">
            <div className="mini-kpi">
              <span className="mini-kpi-num kpi-out">{totalOut}</span>
              <span className="mini-kpi-label">Salidas</span>
            </div>
            <div className="mini-kpi">
              <span className="mini-kpi-num kpi-in">{totalIn}</span>
              <span className="mini-kpi-label">Entradas</span>
            </div>
            <div className="mini-kpi">
              <span className="mini-kpi-num">{uniqueUsers}</span>
              <span className="mini-kpi-label">Usuarios</span>
            </div>
            <div className="mini-kpi">
              <span className="mini-kpi-num">{uniqueProducts}</span>
              <span className="mini-kpi-label">Productos</span>
            </div>
          </div>
        )}

        <span className={`analytics-chevron ${open ? "up" : ""}`}>›</span>
      </div>

      {/* Panel expandible */}
      {open && (
        <div className="analytics-panel">

          {/* Selector de período */}
          <div className="analytics-period">
            {PERIODS.map((p) => (
              <button
                key={p.key}
                type="button"
                className={`analytics-period-btn ${period === p.key ? "active" : ""}`}
                onClick={(e) => { e.stopPropagation(); setPeriod(p.key); }}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* KPIs grandes */}
          <div className="analytics-kpi-row">
            <div className="analytics-kpi">
              <span className="kpi-num kpi-out">{totalOut}</span>
              <span className="kpi-label">Unidades salidas</span>
            </div>
            <div className="analytics-kpi">
              <span className="kpi-num kpi-in">{totalIn}</span>
              <span className="kpi-label">Unidades entradas</span>
            </div>
            <div className="analytics-kpi">
              <span className="kpi-num">{uniqueUsers}</span>
              <span className="kpi-label">Usuarios activos</span>
            </div>
            <div className="analytics-kpi">
              <span className="kpi-num">{uniqueProducts}</span>
              <span className="kpi-label">Productos movidos</span>
            </div>
          </div>

          {noData ? (
            <div className="analytics-empty-full">
              Sin movimientos registrados en este período.
            </div>
          ) : (
            <>
              {monthKeys.length > 0 && (
                <div className="analytics-section">
                  <h3 className="analytics-section-title">Salidas por mes</h3>
                  <div className="analytics-chart-full">
                    <Bar data={monthData} options={BASE_OPTIONS} />
                  </div>
                </div>
              )}

              <div className="analytics-two-col">
                <div className="analytics-section">
                  <h3 className="analytics-section-title">Top usuarios (unidades)</h3>
                  {topUsers.length > 0
                    ? <div className="analytics-chart-horiz"><Bar data={userData} options={HORIZ_OPTIONS} /></div>
                    : <div className="analytics-empty">Sin datos en este período</div>}
                </div>
                <div className="analytics-section">
                  <h3 className="analytics-section-title">Productos más solicitados</h3>
                  {topProducts.length > 0
                    ? <div className="analytics-chart-horiz"><Bar data={productData} options={HORIZ_OPTIONS} /></div>
                    : <div className="analytics-empty">Sin datos en este período</div>}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
