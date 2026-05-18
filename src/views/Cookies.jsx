import { Link } from "react-router-dom";
import "../css/legalPage.css";

export default function Cookies() {
  return (
    <div className="legal-root">
      <header className="legal-header">
        <Link to="/" className="legal-logo">Altadill</Link>
        <nav><Link to="/login">Iniciar sesión</Link></nav>
      </header>

      <main className="legal-main">
        <h1>Política de Cookies</h1>
        <p className="legal-meta">Última actualización: enero 2026</p>

        <section>
          <h2>1. ¿Qué son las cookies?</h2>
          <p>
            Las cookies son pequeños archivos de texto que un sitio web
            almacena en tu navegador para recordar información sobre tu
            visita.
          </p>
        </section>

        <section>
          <h2>2. Cookies que usamos</h2>

          <h3>Estrictamente necesarias (sin consentimiento)</h3>
          <ul>
            <li><b>Firebase Auth</b> — mantiene tu sesión iniciada.
              Imprescindibles para que la app funcione.</li>
            <li><b>localStorage</b> — guarda tus preferencias (almacén
              seleccionado, idioma, consentimiento de cookies).</li>
          </ul>

          <h3>Funcionales (con consentimiento)</h3>
          <ul>
            <li><b>Cloudinary</b> — sirve las imágenes de productos. Si
              rechazas, las imágenes no se mostrarán.</li>
          </ul>

          <h3>Analíticas y marketing</h3>
          <p>
            <b>No usamos cookies de terceros para analítica ni publicidad
            en esta versión.</b> Si lo añadimos en el futuro, te lo
            notificaremos y pediremos consentimiento explícito.
          </p>
        </section>

        <section>
          <h2>3. Gestionar tu consentimiento</h2>
          <p>
            Puedes aceptar o rechazar las cookies no esenciales desde el
            banner inferior que aparece en tu primera visita. Para cambiar
            tu decisión, borra el almacenamiento local del sitio en tu
            navegador y refresca la página.
          </p>
        </section>

        <section>
          <h2>4. Cookies del navegador</h2>
          <p>
            Puedes configurar tu navegador para rechazar todas las cookies
            o avisarte cuando se establezcan. Ten en cuenta que esto puede
            afectar al funcionamiento del Servicio.
          </p>
        </section>

        <section>
          <h2>5. Más información</h2>
          <p>
            Para consultas sobre cookies o privacidad: privacidad@altadill.com
          </p>
        </section>
      </main>

      <footer className="legal-footer">
        <Link to="/terms">Términos</Link> ·
        <Link to="/privacy"> Privacidad</Link> ·
        <Link to="/cookies"> Cookies</Link>
      </footer>
    </div>
  );
}
