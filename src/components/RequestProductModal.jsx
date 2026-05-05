import React, { useState } from "react";
import { BsXCircle } from "react-icons/bs";
import useProductRequests from "../hooks/useProductRequests";
import { useRateLimitedAction, formatResetTime } from "../hooks/useRateLimitedAction";
import "../css/requestProductModal.css";

const RequestProductModal = ({ product, isOpen, onClose, onSuccess }) => {
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const { createRequest } = useProductRequests();
  
  // Rate limiting: máximo 10 solicitudes por minuto
  const { checkRateLimit, isBlocked, remaining } = useRateLimitedAction(
    "product-request",
    10,
    60000
  );

  const handleQuantityChange = (e) => {
    const value = parseInt(e.target.value) || 1;
    setQuantity(Math.max(1, value));
  };

  const handleIncrement = () => {
    setQuantity((prev) => prev + 1);
  };

  const handleDecrement = () => {
    setQuantity((prev) => (prev > 1 ? prev - 1 : 1));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Verificar rate limit
      const rateLimitCheck = checkRateLimit();
      if (!rateLimitCheck.allowed) {
        throw new Error(
          `Has alcanzado el límite de solicitudes. Intenta nuevamente en unos momentos.`
        );
      }

      if (!quantity || quantity < 1) {
        throw new Error("Ingresa una cantidad válida");
      }

      await createRequest(product, quantity);
      setSuccess(true);

      // Reset form after 2 seconds
      setTimeout(() => {
        setSuccess(false);
        setQuantity(1);
        onClose();
        if (onSuccess) onSuccess();
      }, 2000);
    } catch (err) {
      setError(err.message || "Error al solicitar el producto");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !product) return null;

  return (
    <div className="request-modal-overlay" onClick={onClose}>
      <div
        className="request-modal-container"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="request-modal-close" onClick={onClose}>
          <BsXCircle size={24} />
        </button>

        <div className="request-modal-content">
          {success ? (
            <div className="request-success">
              <div className="success-icon">✓</div>
              <h2>¡Solicitud enviada!</h2>
              <p>
                Tu solicitud de {quantity} unidades de{" "}
                <strong>{product.description}</strong> ha sido registrada
              </p>
              <p className="success-message">
                El administrador revisará tu solicitud pronto
              </p>
            </div>
          ) : (
            <>
              <h2>Solicitar Producto</h2>

              <div className="request-product-preview">
                {product.img_b64 ? (
                  <img src={product.img_b64} alt={product.description} />
                ) : (
                  <div className="request-preview-empty">📦</div>
                )}
              </div>

              <div className="request-product-details">
                <h3>{product.description}</h3>
                <p className="detail-item">
                  <span className="label">Código:</span>
                  <span className="value">{product.sku}</span>
                </p>
                <p className="detail-item">
                  <span className="label">Stock disponible:</span>
                  <span className="value">
                    {product.stock} {product.product_Unit}
                  </span>
                </p>
                <p className="detail-item">
                  <span className="label">Marca:</span>
                  <span className="value">{product.brand}</span>
                </p>

                 <p className="detail-item">
                  <span className="label">Ubicacion:</span>
                  <span className="value">{product.location}</span>
                </p>
              </div>

              <form onSubmit={handleSubmit} className="request-form">
                <div className="form-group">
                  <label htmlFor="quantity">Cantidad a solicitar:</label>
                  <div className="quantity-input-group">
                    <button
                      type="button"
                      className="qty-btn"
                      onClick={handleDecrement}
                    >
                      −
                    </button>
                    <input
                      id="quantity"
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={handleQuantityChange}
                      className="qty-input"
                    />
                    <button
                      type="button"
                      className="qty-btn"
                      onClick={handleIncrement}
                    >
                      +
                    </button>
                  </div>
                  <p className="hint-text">
                    Máximo sugerido: {Math.min(10, product.stock)}
                  </p>
                </div>

                {error && <div className="error-message">{error}</div>}

                {isBlocked && (
                  <div className="rate-limit-warning">
                    ⏱️ Límite de solicitudes alcanzado. Puedes hacer{" "}
                    <strong>{remaining}</strong> solicitudes por minuto.
                  </div>
                )}

                <div className="form-actions">
                  <button
                    type="button"
                    className="btn-cancel"
                    onClick={onClose}
                    disabled={loading}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn-submit"
                    disabled={loading || isBlocked}
                  >
                    {loading ? "Enviando..." : "Enviar solicitud"}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default RequestProductModal;
