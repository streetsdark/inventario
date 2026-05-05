import React, { useState } from "react";
import { BsXCircle, BsCheckCircle } from "react-icons/bs";
import useProductRequests from "../hooks/useProductRequests";
import "../css/productRequests.css";

const ProductRequestsCard = () => {
  const { requests, loading, deleteRequest, approveRequest, getRequestsByStatus } =
    useProductRequests();
  const [expandedRequest, setExpandedRequest] = useState(null);
  const [showAll, setShowAll] = useState(false);
  const [processingId, setProcessingId] = useState(null);
  const [message, setMessage] = useState({ type: "", text: "" });

  const pendingRequests = getRequestsByStatus("pending");
  const displayedRequests = showAll ? pendingRequests : pendingRequests.slice(0, 3);

  const handleApproveRequest = async (request) => {
    if (!window.confirm(`¿Aprobar solicitud de ${request.requestedBy}?`)) {
      return;
    }

    setProcessingId(request.id);
    try {
      await approveRequest(request.id, request.productId, request.quantity);
      setMessage({
        type: "success",
        text: `✓ Solicitud aprobada. Stock reducido en ${request.quantity} unidades.`,
      });
      setExpandedRequest(null);
      setTimeout(() => setMessage({ type: "", text: "" }), 4000);
    } catch (error) {
      setMessage({
        type: "error",
        text: `Error al aprobar: ${error.message}`,
      });
      setTimeout(() => setMessage({ type: "", text: "" }), 4000);
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeleteRequest = async (requestId, userName) => {
    if (window.confirm(`¿Rechazar solicitud de ${userName}?`)) {
      setProcessingId(requestId);
      try {
        await deleteRequest(requestId);
        setMessage({
          type: "success",
          text: "✓ Solicitud rechazada.",
        });
        setExpandedRequest(null);
        setTimeout(() => setMessage({ type: "", text: "" }), 3000);
      } catch (error) {
        setMessage({
          type: "error",
          text: `Error al rechazar: ${error.message}`,
        });
        setTimeout(() => setMessage({ type: "", text: "" }), 3000);
      } finally {
        setProcessingId(null);
      }
    }
  };

  if (loading) {
    return <p>Cargando solicitudes...</p>;
  }

  return (
    <div className="product-requests-card">
      {message.text && (
        <div className={`notification notification-${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="requests-header">
        <h2>
          Solicitudes de Productos
          <span className="requests-badge">{pendingRequests.length}</span>
        </h2>
        <p className="requests-subtitle">
          Usuarios solicitando productos del inventario
        </p>
      </div>

      {pendingRequests.length === 0 ? (
        <div className="requests-empty">
          <p>No hay solicitudes pendientes en este momento</p>
        </div>
      ) : (
        <>
          <div className="requests-list">
            {displayedRequests.map((request) => (
              <div
                key={request.id}
                className={`request-item ${
                  expandedRequest?.id === request.id ? "expanded" : ""
                }`}
              >
                <div
                  className="request-header-row"
                  onClick={() =>
                    setExpandedRequest(
                      expandedRequest?.id === request.id
                        ? null
                        : { id: request.id }
                    )
                  }
                >
                  <div className="request-product-info">
                    <h4>{request.productName}</h4>
                    <p className="request-user">Por: {request.requestedBy}</p>
                  </div>
                  <div className="request-quantity">
                    <span className="quantity-badge">{request.quantity}</span>
                    <span className="quantity-unit">unidades</span>
                  </div>
                </div>

                {expandedRequest?.id === request.id && (
                  <div className="request-details">
                    <div className="detail-row">
                      <label>Código:</label>
                      <span>{request.productSku}</span>
                    </div>
                    <div className="detail-row">
                      <label>📍 Ubicación:</label>
                      <span className="location-value">{request.productLocation}</span>
                    </div>
                    <div className="detail-row">
                      <label>Email:</label>
                      <span>{request.userEmail}</span>
                    </div>
                    <div className="detail-row">
                      <label>Cantidad solicitada:</label>
                      <span>{request.quantity}</span>
                    </div>
                    <div className="detail-row">
                      <label>Fecha:</label>
                      <span>
                        {request.createdAt
                          ? new Date(
                              request.createdAt.seconds * 1000
                            ).toLocaleDateString("es-ES", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "Recientemente"}
                      </span>
                    </div>
                    <div className="request-actions">
                      <button
                        className="btn-approve"
                        onClick={() => handleApproveRequest(request)}
                        disabled={processingId === request.id}
                        title="Aprobar solicitud"
                      >
                        <BsCheckCircle size={18} />
                        {processingId === request.id ? "Aprobando..." : "Aprobar"}
                      </button>
                      <button
                        className="btn-reject"
                        onClick={() =>
                          handleDeleteRequest(request.id, request.requestedBy)
                        }
                        disabled={processingId === request.id}
                        title="Rechazar solicitud"
                      >
                        <BsXCircle size={18} />
                        {processingId === request.id ? "Rechazando..." : "Rechazar"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {pendingRequests.length > 3 && (
            <button
              className="btn-show-more"
              onClick={() => setShowAll(!showAll)}
            >
              {showAll
                ? "Ver menos"
                : `Ver más (${pendingRequests.length - 3})`}
            </button>
          )}
        </>
      )}
    </div>
  );
};

export default ProductRequestsCard;
