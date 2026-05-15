import { useState } from "react";
import { BsBuilding, BsCheck, BsXCircle } from "react-icons/bs";
import { useAccountContext } from "../context/AccountContext";
import { isValidAccountName, slugify } from "../utils/accountUtils";
import "../css/signupAccountForm.css";

/**
 * Card de "Crear tu cuenta" que aparece SOLO si el usuario logueado
 * todavía no pertenece a ninguna cuenta. Una vez creada, se asigna
 * automáticamente como owner.
 */
export default function SignupAccountForm() {
  const { accountId, loading, createAccount } = useAccountContext();

  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  if (loading) return null;
  if (accountId) return null;

  const previewSlug = slugify(name);
  const nameOk = isValidAccountName(name);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!nameOk) {
      setError("Nombre inválido (2-80 caracteres, sin caracteres raros).");
      return;
    }
    setBusy(true);
    try {
      await createAccount({ name });
      setName("");
    } catch (err) {
      setError(err?.message || "No se pudo crear la cuenta");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="signup-account-card">
      <div className="signup-account-header">
        <BsBuilding size={28} className="signup-account-icon" />
        <div>
          <h2>Crea tu cuenta</h2>
          <p>
            Estás en una sesión sin cuenta. Crea una para gestionar tu
            inventario y compartirlo con tu equipo.
          </p>
        </div>
      </div>

      <form className="signup-account-form" onSubmit={handleSubmit}>
        <label className="signup-account-field">
          Nombre de la empresa o equipo
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="ACME S.L."
            maxLength={80}
            disabled={busy}
            autoFocus
            required
          />
        </label>

        {previewSlug && (
          <p className="signup-account-slug">
            URL/identificador: <code>{previewSlug}</code>
          </p>
        )}

        {error && (
          <div className="signup-account-error">
            <BsXCircle size={14} /> {error}
          </div>
        )}

        <button
          type="submit"
          className="signup-account-btn"
          disabled={busy || !nameOk}
        >
          <BsCheck size={16} /> {busy ? "Creando..." : "Crear cuenta"}
        </button>
      </form>
    </div>
  );
}
