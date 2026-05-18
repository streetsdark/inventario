import { Link } from "react-router-dom";
import "../css/legalPage.css";

// Plantilla genérica SaaS adaptada a España. REVISAR CON ABOGADO antes de
// usar comercialmente — esto es un punto de partida, no consejo legal.
export default function Terms() {
  return (
    <div className="legal-root">
      <header className="legal-header">
        <Link to="/" className="legal-logo">Altadill</Link>
        <nav><Link to="/login">Iniciar sesión</Link></nav>
      </header>

      <main className="legal-main">
        <h1>Términos y Condiciones de Uso</h1>
        <p className="legal-meta">Última actualización: enero 2026</p>

        <section>
          <h2>1. Aceptación de los términos</h2>
          <p>
            Al registrarte en Altadill ("el Servicio") aceptas estos términos
            en su totalidad. Si no estás de acuerdo con alguno, no utilices
            el Servicio.
          </p>
        </section>

        <section>
          <h2>2. Descripción del Servicio</h2>
          <p>
            Altadill es una aplicación SaaS de gestión de inventario para
            PYMES. Proporciona stock en tiempo real, multi-almacén, escáner
            QR, analíticas y auditoría.
          </p>
        </section>

        <section>
          <h2>3. Cuenta y responsabilidades</h2>
          <p>
            Eres responsable de mantener la confidencialidad de tus
            credenciales y de las acciones realizadas bajo tu cuenta. Debes
            notificarnos inmediatamente de cualquier uso no autorizado.
          </p>
        </section>

        <section>
          <h2>4. Uso aceptable</h2>
          <p>
            No puedes: (a) usar el Servicio para fines ilegales; (b) intentar
            acceder a datos de otras cuentas; (c) realizar ingeniería inversa
            del software; (d) sobrecargar nuestra infraestructura mediante
            scraping o tráfico anómalo.
          </p>
        </section>

        <section>
          <h2>5. Datos del cliente</h2>
          <p>
            Los datos que introduces en el Servicio son de tu propiedad.
            Concedemos a Altadill una licencia limitada para procesar dichos
            datos exclusivamente con el fin de prestarte el Servicio.
            Puedes exportar o borrar todos tus datos en cualquier momento
            desde la sección "Ajustes de cuenta".
          </p>
        </section>

        <section>
          <h2>6. Suscripción y pagos</h2>
          <p>
            El Servicio puede ofrecerse en planes de pago. Los precios y
            condiciones de cada plan figuran en la página de precios. La
            facturación es mensual y se renueva automáticamente salvo
            cancelación previa.
          </p>
        </section>

        <section>
          <h2>7. Garantías y limitación de responsabilidad</h2>
          <p>
            El Servicio se proporciona "tal cual". No garantizamos que esté
            libre de errores ni que se ajuste a usos específicos no
            documentados. Nuestra responsabilidad se limita al importe
            pagado en los últimos 12 meses.
          </p>
        </section>

        <section>
          <h2>8. Modificaciones</h2>
          <p>
            Podemos modificar estos términos. Los cambios significativos te
            serán notificados con 30 días de antelación.
          </p>
        </section>

        <section>
          <h2>9. Jurisdicción</h2>
          <p>
            Estos términos se rigen por la ley española. Cualquier
            controversia se someterá a los juzgados y tribunales de Madrid.
          </p>
        </section>

        <section>
          <h2>10. Contacto</h2>
          <p>
            Para cualquier consulta sobre estos términos: soporte@altadill.com
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
