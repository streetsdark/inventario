import { Link } from "react-router-dom";
import "../css/legalPage.css";

export default function Privacy() {
  return (
    <div className="legal-root">
      <header className="legal-header">
        <Link to="/" className="legal-logo">Altadill</Link>
        <nav><Link to="/login">Iniciar sesión</Link></nav>
      </header>

      <main className="legal-main">
        <h1>Política de Privacidad</h1>
        <p className="legal-meta">Última actualización: enero 2026</p>

        <section>
          <h2>1. Responsable del tratamiento</h2>
          <p>
            Altadill, con CIF [pendiente], domicilio en España. Email de
            contacto: privacidad@altadill.com.
          </p>
        </section>

        <section>
          <h2>2. Datos que recogemos</h2>
          <ul>
            <li><b>Identificación:</b> email, nombre, foto de perfil.</li>
            <li><b>Datos de uso:</b> productos, movimientos, almacenes, solicitudes que introduces.</li>
            <li><b>Técnicos:</b> dirección IP, navegador, registros de errores.</li>
            <li><b>Auditoría:</b> registro de cada acción sensible (creación, modificación, borrado).</li>
          </ul>
        </section>

        <section>
          <h2>3. Finalidades del tratamiento</h2>
          <ul>
            <li>Prestar el Servicio que has contratado.</li>
            <li>Gestionar tu cuenta, soporte y facturación.</li>
            <li>Cumplir obligaciones legales (fiscales, contables).</li>
            <li>Mejorar el Servicio en base a uso agregado y anonimizado.</li>
          </ul>
        </section>

        <section>
          <h2>4. Base legal</h2>
          <p>
            Ejecución del contrato (prestación del Servicio), cumplimiento
            de obligaciones legales y, en su caso, consentimiento (para
            comunicaciones comerciales).
          </p>
        </section>

        <section>
          <h2>5. Conservación</h2>
          <p>
            Conservamos tus datos mientras tu cuenta esté activa. Tras la
            cancelación, los datos personales se eliminan en un máximo de 30
            días. Los datos de facturación se conservan 6 años (obligación
            legal).
          </p>
        </section>

        <section>
          <h2>6. Subprocesadores</h2>
          <p>
            Para prestar el Servicio utilizamos los siguientes proveedores
            que pueden tratar tus datos en nuestro nombre:
          </p>
          <ul>
            <li><b>Google Firebase</b> (Google Ireland Ltd) — hosting,
              autenticación, base de datos. Servidores en la UE (eur3).</li>
            <li><b>Cloudinary</b> (Cloudinary Ltd) — almacenamiento de
              imágenes de productos.</li>
            <li><b>Stripe</b> (Stripe Payments Europe Ltd) — procesamiento
              de pagos (cuando aplique).</li>
          </ul>
          <p>
            Todos los subprocesadores cumplen GDPR y han firmado los
            correspondientes contratos de tratamiento de datos.
          </p>
        </section>

        <section>
          <h2>7. Tus derechos (GDPR)</h2>
          <p>Tienes derecho a:</p>
          <ul>
            <li><b>Acceso:</b> obtener una copia de tus datos. Disponible
              desde "Ajustes de cuenta → Exportar mis datos".</li>
            <li><b>Rectificación:</b> editar tus datos desde tu perfil.</li>
            <li><b>Supresión:</b> "Ajustes de cuenta → Borrar mi cuenta".</li>
            <li><b>Portabilidad:</b> el export se genera en JSON estándar.</li>
            <li><b>Oposición y limitación:</b> escríbenos a
              privacidad@altadill.com.</li>
            <li><b>Reclamación:</b> ante la AEPD (www.aepd.es).</li>
          </ul>
        </section>

        <section>
          <h2>8. Transferencias internacionales</h2>
          <p>
            Los datos se procesan principalmente en la UE. En casos en que
            un subprocesador opere fuera de la UE, aplicamos las cláusulas
            contractuales tipo aprobadas por la Comisión Europea.
          </p>
        </section>

        <section>
          <h2>9. Seguridad</h2>
          <p>
            Aplicamos cifrado en tránsito (TLS), aislamiento multi-tenant a
            nivel de base de datos, auditoría de cada acción y revisiones
            de seguridad regulares.
          </p>
        </section>

        <section>
          <h2>10. Cambios en esta política</h2>
          <p>
            Notificaremos cualquier cambio significativo con al menos 30
            días de antelación por email o dentro de la aplicación.
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
