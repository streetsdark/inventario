import { useState, useMemo } from "react";
import { Bar } from "react-chartjs-2";
import { BsBarChart, BsXCircle } from "react-icons/bs";
import useMoves from "../hooks/useMoves";
import useRole from "../hooks/useRole";
import { sanitizeString, isValidNumber, isValidDate } from "../utils/securityValidation";
import { logAuditEvent } from "../utils/auditService";
import "../css/analyticsCard.css";

const PERIODS = [
  { key: "1m",  label: "1 mes"   },
  { key: "3m",  label: "3 meses" },
  { key: "6m",  label: "6 meses" },
  { key: "1a",  label: "1 año"   },
  { key: "all", label: "Todo"    },
];

// Claves prohibidas — prevención de prototype pollution
const FORBIDDEN_KEYS = new Set(["__proto__", "constructor", "prototype"]);

function safeStr(val) {
  return sanitizeString(typeof val === "string" ? val : "");
}

function safeNum(val) {
  const n = Number(val);
  return isValidNumber(n) ? n : 0;
}

function safeAccumulate(obj, key, value) {
  if (!key || FORBIDDEN_KEYS.has(key)) return;
  obj[key] = (obj[key] || 0) + value;
}

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
  // Asume input ya sanitizado en useMemo — React escapa el texto al renderizar
  const s = typeof str === "string" ? str : "";
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

function formatDayLabel(isoDate) {
  const parts = String(isoDate).split("-").map(Number);
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return safeStr(isoDate);
  const [y, m, d] = parts;
  return new Date(y, m - 1, d).toLocaleDateString("es-ES", {
    day: "numeric", month: "short", year: "numeric",
  });
}

// Plugin Chart.js: dibuja el valor de cada barra (sin dependencias externas)
const valueLabelsPlugin = {
  id: "valueLabels",
  afterDatasetsDraw(chart) {
    const { ctx } = chart;
    const horizontal = chart.options.indexAxis === "y";
    chart.data.datasets.forEach((dataset, i) => {
      const meta = chart.getDatasetMeta(i);
      if (meta.hidden) return;
      meta.data.forEach((bar, index) => {
        const value = dataset.data[index];
        if (value == null || value === 0) return;
        ctx.save();
        ctx.font = "700 11px system-ui, -apple-system, sans-serif";
        ctx.textBaseline = "middle";
        if (horizontal) {
          ctx.textAlign = "left";
          ctx.fillStyle = "#e8f4fd";
          ctx.fillText(String(value), bar.x + 6, bar.y);
        } else {
          ctx.textAlign = "center";
          ctx.fillStyle = "#ffffff";
          ctx.fillText(String(value), bar.x, bar.y + 12);
        }
        ctx.restore();
      });
    });
  },
};

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
  const { isSuperUser } = useRole();
  const [open, setOpen]               = useState(false);
  const [period, setPeriod]           = useState("3m");
  const [selectedUser, setSelectedUser] = useState(null);
  const [clickedDetail, setClickedDetail] = useState(null);
  const [kpiDetail, setKpiDetail]     = useState(null); // null | "out" | "in"

  const {
    byMonth, byUser, byProduct,
    byMonthMoves, byProductRequesters, byProductForUser,
    outMovesByDay, inMovesByDay,
    totalOut, totalIn, uniqueUsers, uniqueProducts,
  } = useMemo(() => {
    const start   = getPeriodStart(period);
    const inRange = (date) => {
      if (!start) return true;
      if (!date || !isValidDate(date)) return false;
      return date >= start;
    };

    const outMoves = moves.filter(
      (m) => m.type === "out" && inRange(m.exitDate || m.movementDate)
    );
    const inMoves = moves.filter(
      (m) => m.type === "in" && inRange(m.entryDate || m.movementDate)
    );

    const byMonth = {}, byUser = {}, byProduct = {};
    const byMonthMoves     = {}; // month   → move[]
    const byProductRequesters = {}; // product → { user → qty }
    const byProductForUser = {}; // user    → { product → qty }
    const outMovesByDay = {}; // YYYY-MM-DD → [{ product, qty, user }]
    const inMovesByDay  = {}; // YYYY-MM-DD → [{ product, qty }]

    outMoves.forEach((m) => {
      const month = (m.exitDate || m.movementDate || "").slice(0, 7);
      const qty   = safeNum(m.quantity);
      const user  = safeStr(m.recipientUser) || "Sin asignar";
      const prod  = safeStr(m.description)   || "Sin nombre";

      if (month && !FORBIDDEN_KEYS.has(month)) {
        safeAccumulate(byMonth, month, qty);
        if (!byMonthMoves[month]) byMonthMoves[month] = [];
        byMonthMoves[month].push(m);
      }

      safeAccumulate(byUser, user, qty);
      safeAccumulate(byProduct, prod, qty);

      // producto → quién lo pidió
      if (!byProductRequesters[prod]) byProductRequesters[prod] = {};
      safeAccumulate(byProductRequesters[prod], user, qty);

      // usuario → qué productos pidió
      if (!byProductForUser[user]) byProductForUser[user] = {};
      safeAccumulate(byProductForUser[user], prod, qty);

      // agrupado por día (para detalle de KPI "Unidades salidas")
      const day = (m.exitDate || m.movementDate || "").slice(0, 10);
      if (day && isValidDate(day) && !FORBIDDEN_KEYS.has(day)) {
        if (!outMovesByDay[day]) outMovesByDay[day] = [];
        outMovesByDay[day].push({ product: prod, qty, user });
      }
    });

    inMoves.forEach((m) => {
      const qty  = safeNum(m.quantity);
      const prod = safeStr(m.description) || "Sin nombre";
      const day  = (m.entryDate || m.movementDate || "").slice(0, 10);
      if (day && isValidDate(day) && !FORBIDDEN_KEYS.has(day)) {
        if (!inMovesByDay[day]) inMovesByDay[day] = [];
        inMovesByDay[day].push({ product: prod, qty });
      }
    });

    return {
      byMonth, byUser, byProduct,
      byMonthMoves, byProductRequesters, byProductForUser,
      outMovesByDay, inMovesByDay,
      totalOut: outMoves.reduce((s, m) => s + safeNum(m.quantity), 0),
      totalIn:  inMoves.reduce((s, m) => s + safeNum(m.quantity), 0),
      uniqueUsers:    Object.keys(byUser).filter((u) => u !== "Sin asignar").length,
      uniqueProducts: Object.keys(byProduct).length,
    };
  }, [moves, period]);

  // ── Datos de gráficos ─────────────────────────────────────────────────

  const monthKeys    = Object.keys(byMonth).sort();
  const monthLabels  = monthKeys.map((k) => {
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
  const userColors = topUsers.map(([u]) =>
    u === selectedUser ? "rgba(74,158,138,1)" : "rgba(74,158,138,0.65)"
  );
  const userData = {
    labels: topUsers.map(([u]) => shortLabel(u)),
    datasets: [{ data: topUsers.map(([, v]) => v),
      backgroundColor: userColors, borderColor: "rgba(74,158,138,1)",
      borderWidth: 1, borderRadius: 6, hoverBackgroundColor: "rgba(74,158,138,0.9)" }],
  };

  // Si hay usuario seleccionado, filtra productos por ese usuario
  const topProducts = selectedUser
    ? sortedTop(byProductForUser[selectedUser] || {})
    : sortedTop(byProduct);

  const productData = {
    labels: topProducts.map(([p]) => shortLabel(p)),
    datasets: [{ data: topProducts.map(([, v]) => v),
      backgroundColor: "rgba(194,148,58,0.65)", borderColor: "rgba(194,148,58,1)",
      borderWidth: 1, borderRadius: 6, hoverBackgroundColor: "rgba(194,148,58,0.9)" }],
  };

  // ── Handlers de click ─────────────────────────────────────────────────

  const handleMonthClick = (_, elements) => {
    if (!elements.length) { setClickedDetail(null); return; }
    const index  = elements[0].index;
    const month  = monthKeys[index];
    const monthMoves = byMonthMoves[month] || [];
    const topProds = sortedTop(
      monthMoves.reduce((acc, m) => {
        const prod = safeStr(m.description) || "Sin nombre";
        safeAccumulate(acc, prod, safeNum(m.quantity));
        return acc;
      }, {})
    , 5);
    setClickedDetail({ type: "month", label: monthLabels[index], total: byMonth[month], topProds });
  };

  const handleUserClick = (_, elements) => {
    if (!elements.length) { setSelectedUser(null); setClickedDetail(null); return; }
    const index = elements[0].index;
    const user  = topUsers[index]?.[0];
    if (!user) return;

    if (selectedUser === user) {
      setSelectedUser(null);
      setClickedDetail(null);
      return;
    }

    setSelectedUser(user);
    setClickedDetail(null);

    // Auditoría: superuser viendo detalle de movimientos de un operario
    if (isSuperUser) {
      logAuditEvent("USER_ANALYTICS_VIEWED", "analytics", user, {
        viewedUser: user,
        period,
      });
    }
  };

  const handleProductClick = (_, elements) => {
    if (!elements.length) { setClickedDetail(null); return; }
    const index   = elements[0].index;
    const product = topProducts[index]?.[0];
    if (!product) return;

    const requesters = sortedTop(byProductRequesters[product] || {}, 5);
    setClickedDetail({ type: "product", label: product, total: topProducts[index][1], requesters });
  };

  const noData = monthKeys.length === 0 && topUsers.length === 0;

  return (
    <div className={`analytics-card ${open ? "open" : ""}`}>

      {/* Trigger */}
      <div className="analytics-trigger" onClick={() => setOpen((v) => !v)}>
        <div className="analytics-trigger-left">
          <BsBarChart size={28} className="analytics-icon" />
          <div>
            <h2>Analíticas de movimientos</h2>
            <p className="analytics-subtitle">
              {loading ? "Cargando..." : open ? "Haz clic para cerrar" : "Consumo por período, usuario y producto"}
            </p>
          </div>
        </div>

        {!loading && (
          <div className="analytics-mini-kpis">
            <div className="mini-kpi"><span className="mini-kpi-num kpi-out">{totalOut}</span><span className="mini-kpi-label">Salidas</span></div>
            <div className="mini-kpi"><span className="mini-kpi-num kpi-in">{totalIn}</span><span className="mini-kpi-label">Entradas</span></div>
            <div className="mini-kpi"><span className="mini-kpi-num">{uniqueUsers}</span><span className="mini-kpi-label">Usuarios</span></div>
            <div className="mini-kpi"><span className="mini-kpi-num">{uniqueProducts}</span><span className="mini-kpi-label">Productos</span></div>
          </div>
        )}

        <span className={`analytics-chevron ${open ? "up" : ""}`}>›</span>
      </div>

      {/* Panel */}
      {open && (
        <div className="analytics-panel">

          {/* Período */}
          <div className="analytics-period">
            {PERIODS.map((p) => (
              <button key={p.key} type="button"
                className={`analytics-period-btn ${period === p.key ? "active" : ""}`}
                onClick={(e) => { e.stopPropagation(); setPeriod(p.key); setSelectedUser(null); setClickedDetail(null); setKpiDetail(null); }}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* KPIs */}
          <div className="analytics-kpi-row">
            <button
              type="button"
              className={`analytics-kpi analytics-kpi-clickable ${kpiDetail === "out" ? "active" : ""}`}
              onClick={() => setKpiDetail(kpiDetail === "out" ? null : "out")}
            >
              <span className="kpi-num kpi-out">{totalOut}</span>
              <span className="kpi-label">Unidades salidas</span>
              <span className="kpi-hint">Ver detalle ›</span>
            </button>
            <button
              type="button"
              className={`analytics-kpi analytics-kpi-clickable ${kpiDetail === "in" ? "active" : ""}`}
              onClick={() => setKpiDetail(kpiDetail === "in" ? null : "in")}
            >
              <span className="kpi-num kpi-in">{totalIn}</span>
              <span className="kpi-label">Unidades entradas</span>
              <span className="kpi-hint">Ver detalle ›</span>
            </button>
            <div className="analytics-kpi"><span className="kpi-num">{uniqueUsers}</span><span className="kpi-label">Usuarios activos</span></div>
            <div className="analytics-kpi"><span className="kpi-num">{uniqueProducts}</span><span className="kpi-label">Productos movidos</span></div>
          </div>

          {/* Detalle de KPI clickable (salidas / entradas por día) */}
          {kpiDetail && (() => {
            const isOut    = kpiDetail === "out";
            const dataMap  = isOut ? outMovesByDay : inMovesByDay;
            const total    = isOut ? totalOut : totalIn;
            const title    = isOut ? "Unidades salidas por día" : "Unidades entradas por día";
            const days     = Object.keys(dataMap).sort((a, b) => b.localeCompare(a));
            return (
              <div className={`analytics-kpi-detail ${isOut ? "out" : "in"}`}>
                <div className="analytics-detail-header">
                  <span><b>{title}</b> — {total} unidades totales</span>
                  <button type="button" className="analytics-detail-close" onClick={() => setKpiDetail(null)}>
                    <BsXCircle size={16} />
                  </button>
                </div>
                {days.length === 0 ? (
                  <div className="analytics-empty">Sin movimientos registrados en este período.</div>
                ) : (
                  <ul className="analytics-day-list">
                    {days.map((day) => {
                      const items = dataMap[day];
                      const dayTotal = items.reduce((s, it) => s + safeNum(it.qty), 0);
                      return (
                        <li key={day} className="analytics-day-block">
                          <div className="analytics-day-header">
                            <span className="analytics-day-date">{formatDayLabel(day)}</span>
                            <span className="analytics-day-total">{dayTotal} u. en total</span>
                          </div>
                          <ul className="analytics-day-items">
                            {items.map((it, idx) => (
                              <li key={idx}>
                                <span className="detail-name">{it.product}</span>
                                <span className="detail-qty">{safeNum(it.qty)} u.</span>
                                {isOut && <span className="detail-user">— {it.user}</span>}
                              </li>
                            ))}
                          </ul>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })()}

          {noData ? (
            <div className="analytics-empty-full">Sin movimientos registrados en este período.</div>
          ) : (
            <>
              {/* Salidas por mes */}
              {monthKeys.length > 0 && (
                <div className="analytics-section">
                  <h3 className="analytics-section-title">Salidas por mes <span className="analytics-hint">— haz clic en una barra</span></h3>
                  <div className="analytics-chart-full">
                    <Bar data={monthData} options={{ ...BASE_OPTIONS, onClick: handleMonthClick }} plugins={[valueLabelsPlugin]} />
                  </div>
                  {clickedDetail?.type === "month" && (
                    <div className="analytics-detail-panel">
                      <div className="analytics-detail-header">
                        <span><b>{clickedDetail.label}</b> — {clickedDetail.total} unidades salidas</span>
                        <button type="button" className="analytics-detail-close" onClick={() => setClickedDetail(null)}><BsXCircle size={16} /></button>
                      </div>
                      <p className="analytics-detail-subtitle">Top productos ese mes:</p>
                      <ul className="analytics-detail-list">
                        {clickedDetail.topProds.map(([prod, qty]) => (
                          <li key={prod}><span className="detail-name">{prod}</span><span className="detail-qty">{qty} u.</span></li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Top usuarios + Productos */}
              <div className="analytics-two-col">
                <div className="analytics-section">
                  <h3 className="analytics-section-title">Top usuarios (unidades) <span className="analytics-hint">— haz clic para filtrar</span></h3>
                  {topUsers.length > 0
                    ? <div className="analytics-chart-horiz"><Bar data={userData} options={{ ...HORIZ_OPTIONS, onClick: handleUserClick }} plugins={[valueLabelsPlugin]} /></div>
                    : <div className="analytics-empty">Sin datos en este período</div>}
                </div>

                <div className="analytics-section">
                  <div className="analytics-section-title-row">
                    <h3 className="analytics-section-title">
                      Productos más solicitados
                      {selectedUser && <span className="analytics-filter-badge"> · {shortLabel(selectedUser, 18)}</span>}
                    </h3>
                    {selectedUser && (
                      <button type="button" className="analytics-clear-btn" onClick={() => { setSelectedUser(null); setClickedDetail(null); }}>
                        <BsXCircle size={13} /> Ver todos
                      </button>
                    )}
                  </div>
                  {topProducts.length > 0
                    ? <div className="analytics-chart-horiz"><Bar data={productData} options={{ ...HORIZ_OPTIONS, onClick: handleProductClick }} plugins={[valueLabelsPlugin]} /></div>
                    : <div className="analytics-empty">{selectedUser ? `${shortLabel(selectedUser)} no tiene productos registrados en este período` : "Sin datos en este período"}</div>}

                  {clickedDetail?.type === "product" && (
                    <div className="analytics-detail-panel">
                      <div className="analytics-detail-header">
                        <span><b>{clickedDetail.label}</b> — {clickedDetail.total} unidades totales</span>
                        <button type="button" className="analytics-detail-close" onClick={() => setClickedDetail(null)}><BsXCircle size={16} /></button>
                      </div>
                      <p className="analytics-detail-subtitle">Solicitado por:</p>
                      <ul className="analytics-detail-list">
                        {clickedDetail.requesters.map(([user, qty]) => (
                          <li key={user}><span className="detail-name">{user}</span><span className="detail-qty">{qty} u.</span></li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
