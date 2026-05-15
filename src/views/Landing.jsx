import { Link } from "react-router-dom";
import {
  BsBarChart, BsCamera, BsBuilding, BsDownload, BsShield, BsClipboardData,
  BsCheck, BsArrowRight,
} from "react-icons/bs";
import "../css/landing.css";

const FEATURES = [
  { icon: BsBarChart,     title: "Analíticas interactivas",  text: "Gráficas clickables por usuario, producto y período. Detecta consumos anómalos en segundos." },
  { icon: BsCamera,       title: "Escáner QR / código de barras", text: "Inventario directo desde el móvil del operario. Entrada, salida y solicitudes en 3 toques." },
  { icon: BsBuilding,     title: "Multi-almacén real",       text: "Aísla stock por sedes, naves o zonas. Selector global y reasignación masiva entre almacenes." },
  { icon: BsDownload,     title: "Exportación CSV / PDF",    text: "Histórico de movimientos y stock listos para Excel, contabilidad o cumplimiento." },
  { icon: BsShield,       title: "Aislamiento multi-tenant", text: "Cada cliente con sus datos completamente separados a nivel de base de datos. Reglas blindadas." },
  { icon: BsClipboardData, title: "Auditoría completa",       text: "Cada acción sensible queda registrada con actor, fecha y diff. Soporte y compliance cubiertos." },
];

const PLANS = [
  {
    name: "Starter",
    price: "29",
    bullets: ["500 productos", "5 usuarios", "2 almacenes", "Exportación CSV / PDF", "Soporte por email"],
    cta: "Empezar gratis",
  },
  {
    name: "Pro",
    price: "79",
    featured: true,
    bullets: ["5.000 productos", "20 usuarios", "10 almacenes", "Escáner QR ilimitado", "Auditoría completa", "Soporte prioritario"],
    cta: "Empezar gratis",
  },
  {
    name: "Business",
    price: "149",
    bullets: ["Productos ilimitados", "Usuarios ilimitados", "Almacenes ilimitados", "API + webhooks", "SLA 99.9%", "Soporte dedicado"],
    cta: "Hablar con ventas",
  },
];

const FAQS = [
  { q: "¿Cuánto tarda en estar operativo?",           a: "5 minutos. Te registras, creas tu cuenta y ya estás añadiendo productos. El asistente te guía en los primeros pasos." },
  { q: "¿Mis datos están seguros?",                   a: "Sí. Aislamiento multi-tenant a nivel de Firestore, auditoría de cada acción, reglas de seguridad blindadas y 0 vulnerabilidades en npm audit." },
  { q: "¿Funciona en el móvil del almacén?",          a: "Sí. La interfaz es responsive y el escáner usa la cámara del móvil. Operario apunta al QR y registra entrada/salida en 3 toques." },
  { q: "¿Puedo exportar mis datos?",                  a: "Cuando quieras. Tienes un botón en ajustes para exportar todo en JSON y otro para borrar tu cuenta entera (GDPR)." },
  { q: "¿Puedo invitar a mi equipo?",                 a: "Sí. Como owner, invitas a miembros por email y les asignas rol (admin o miembro). Cada uno solo ve los datos de la cuenta." },
  { q: "¿Puedo probar antes de pagar?",               a: "Sí. 14 días de prueba gratis con todas las funciones del plan Pro. Sin tarjeta de crédito." },
];

export default function Landing() {
  return (
    <div className="landing-root">

      {/* Header */}
      <header className="landing-header">
        <div className="landing-header-inner">
          <Link to="/" className="landing-logo">Altadill</Link>
          <nav className="landing-nav">
            <a href="#features">Funciones</a>
            <a href="#pricing">Precios</a>
            <a href="#faq">FAQ</a>
            <Link to="/login" className="landing-nav-cta">Iniciar sesión</Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="landing-hero">
        <div className="landing-hero-inner">
          <h1>
            El inventario serio<br/>
            <span className="landing-hero-accent">sin la complejidad de un ERP.</span>
          </h1>
          <p className="landing-hero-sub">
            Stock en tiempo real, escáner QR, multi-almacén y analíticas
            interactivas. Pensado para PYMES con almacén que necesitan
            trazabilidad de verdad.
          </p>
          <div className="landing-hero-ctas">
            <Link to="/login" className="landing-btn primary">
              Empieza gratis <BsArrowRight size={16} />
            </Link>
            <a href="#features" className="landing-btn ghost">Ver funciones</a>
          </div>
          <p className="landing-hero-note">14 días gratis · sin tarjeta · cancelas cuando quieras</p>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="landing-section">
        <div className="landing-section-inner">
          <h2 className="landing-section-title">Todo lo que necesita un almacén PYME</h2>
          <p className="landing-section-sub">
            Construido tras meses observando talleres, ferreterías y depósitos
            industriales reales.
          </p>
          <div className="landing-features-grid">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <div key={title} className="landing-feature">
                <Icon size={28} className="landing-feature-icon" />
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="landing-section landing-pricing">
        <div className="landing-section-inner">
          <h2 className="landing-section-title">Precios simples, sin sorpresas</h2>
          <p className="landing-section-sub">
            Todos los planes incluyen aislamiento multi-tenant, auditoría completa
            y export GDPR.
          </p>
          <div className="landing-pricing-grid">
            {PLANS.map((plan) => (
              <div key={plan.name} className={`landing-plan ${plan.featured ? "featured" : ""}`}>
                {plan.featured && <span className="landing-plan-badge">Más popular</span>}
                <h3>{plan.name}</h3>
                <p className="landing-plan-price">
                  <span className="landing-plan-currency">€</span>
                  <span className="landing-plan-amount">{plan.price}</span>
                  <span className="landing-plan-period">/mes</span>
                </p>
                <ul>
                  {plan.bullets.map((b) => (
                    <li key={b}><BsCheck size={16} /> {b}</li>
                  ))}
                </ul>
                <Link to="/login" className={`landing-btn ${plan.featured ? "primary" : "ghost"} full`}>
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="landing-section">
        <div className="landing-section-inner narrow">
          <h2 className="landing-section-title">Preguntas frecuentes</h2>
          <div className="landing-faq-list">
            {FAQS.map(({ q, a }) => (
              <details key={q} className="landing-faq-item">
                <summary>{q}</summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="landing-section landing-cta-final">
        <div className="landing-section-inner narrow center">
          <h2>¿Listo para dejar de pelear con Excel?</h2>
          <p>Tu inventario en tiempo real en menos de 5 minutos.</p>
          <Link to="/login" className="landing-btn primary big">
            Crear cuenta gratis <BsArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <div>
            <Link to="/" className="landing-logo">Altadill</Link>
            <p className="landing-footer-tag">Inventario para PYMES con almacén.</p>
          </div>
          <nav className="landing-footer-nav">
            <Link to="/terms">Términos</Link>
            <Link to="/privacy">Privacidad</Link>
            <Link to="/cookies">Cookies</Link>
            <a href="https://github.com/streetsdark/inventario" target="_blank" rel="noopener noreferrer">GitHub</a>
          </nav>
          <p className="landing-footer-copy">© {new Date().getFullYear()} Altadill. Todos los derechos reservados.</p>
        </div>
      </footer>

    </div>
  );
}
