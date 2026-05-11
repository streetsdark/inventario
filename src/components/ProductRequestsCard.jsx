import React, { useState, useEffect, useRef } from "react";
import { BsXCircle, BsCheckCircle, BsImages, BsArrowRight, BsArrowReturnLeft } from "react-icons/bs";
import useProductRequests from "../hooks/useProductRequests";
import { useNotificationSound } from "../hooks/useNotificationSound";
import "../css/productRequests.css";

const formatRequestDate = (createdAt) => {
  if (!createdAt?.seconds) {
    return "Recientemente";
  }

  return new Date(createdAt.seconds * 1000).toLocaleDateString("es-ES", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const ProductRequestsCard = () => {
  const { loading, deleteRequest, approveRequest, getRequestsByStatus } =
    useProductRequests();
  const { playNotificationSound } = useNotificationSound();
  const [expandedRequest, setExpandedRequest] = useState(null);
  const [showAll, setShowAll] = useState(false);
  const [processingId, setProcessingId] = useState(null);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [moveType, setMoveType] = useState("definitiva");
  const previousRequestCountRef = useRef(0);

  const pendingRequests = getRequestsByStatus("pending");
  const displayedRequests = showAll
    ? pendingRequests
    : pendingRequests.slice(0, 3);

  const handleApproveRequest = async (request) => {
    setProcessingId(request.id);
    try {
      await approveRequest(request.id, request.productId, request.quantity, moveType, request);
      const label = moveType === "pendiente" ? "pendiente por devolver" : "salida definitiva";
      setMessage({
        type: "success",
        text: `Solicitud aprobada como ${label}. Stock reducido en ${request.quantity} unidades.`,
      });
      setExpandedRequest(null);
      setMoveType("definitiva");
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
    if (window.confirm(`Rechazar solicitud de ${userName}?`)) {
      setProcessingId(requestId);
      try {
        await deleteRequest(requestId);
        setMessage({
          type: "success",
          text: "Solicitud rechazada.",
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

  useEffect(() => {
    const currentRequestCount = pendingRequests.length;

    if (
      currentRequestCount > previousRequestCountRef.current &&
      previousRequestCountRef.current > 0
    ) {
      playNotificationSound();
      setMessage({
        type: "success",
        text: `Nueva solicitud recibida de ${pendingRequests[0]?.requestedBy}`,
      });
      setTimeout(() => setMessage({ type: "", text: "" }), 3000);
    }

    previousRequestCountRef.current = currentRequestCount;
  }, [pendingRequests, playNotificationSound]);

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
        <div>
          <h2>
            Solicitudes de Productos
            <span className="requests-badge">{pendingRequests.length}</span>
          </h2>
          <p className="requests-subtitle">
            Revision centralizada de materiales pendientes por aprobar.
          </p>
        </div>
      </div>

      {pendingRequests.length === 0 ? (
        <div className="requests-empty">
          <p>No hay solicitudes pendientes en este momento.</p>
        </div>
      ) : (
        <>
          <div className="requests-list">
            {displayedRequests.map((request) => {
              const isExpanded = expandedRequest?.id === request.id;

              return (
                <div
                  key={request.id}
                  className={`request-item ${isExpanded ? "expanded" : ""}`}
                >
                  <div
                    className="request-header-row"
                    onClick={() => {
                      if (isExpanded) {
                        setExpandedRequest(null);
                        setMoveType("definitiva");
                      } else {
                        setExpandedRequest({ id: request.id });
                        setMoveType("definitiva");
                      }
                    }}
                  >
                    <div className="request-header-main">
                      <div className="request-thumb">
                        {request.productImage ? (
                          <img
                            src={request.productImage}
                            alt={request.productName}
                          />
                        ) : (
                          <div className="request-thumb-empty">
                            <BsImages size={24} />
                          </div>
                        )}
                      </div>

                      <div className="request-product-info">
                        <h4>{request.productName}</h4>
                        <p className="request-user">Solicita: {request.requestedBy}</p>
                        <p className="request-meta-inline">
                          Codigo {request.productSku} · {request.productLocation}
                        </p>
                      </div>
                    </div>

                    <div className="request-summary-meta">
                      <span className="request-status-pill">Pendiente</span>
                      <div className="request-quantity">
                        <span className="quantity-badge">{request.quantity}</span>
                        <span className="quantity-unit">unidades</span>
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="request-details">
                      <div className="request-details-hero">
                        <div className="request-image-container">
                          {request.productImage ? (
                            <img
                              src={request.productImage}
                              alt={request.productName}
                            />
                          ) : (
                            <div className="request-image-empty">
                              <BsImages size={42} />
                            </div>
                          )}
                        </div>

                        <div className="request-details-grid">
                          <div className="detail-row">
                            <label>Codigo</label>
                            <span>{request.productSku}</span>
                          </div>
                          <div className="detail-row">
                            <label>Ubicacion</label>
                            <span className="location-value">
                              {request.productLocation}
                            </span>
                          </div>
                          <div className="detail-row">
                            <label>Email</label>
                            <span>{request.userEmail}</span>
                          </div>
                          <div className="detail-row">
                            <label>Cantidad solicitada</label>
                            <span>{request.quantity}</span>
                          </div>
                          <div className="detail-row">
                            <label>Fecha</label>
                            <span>{formatRequestDate(request.createdAt)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Selector de tipo de salida */}
                      <div className="move-type-selector">
                        <span className="move-type-label">Tipo de salida al aprobar</span>
                        <div className="move-type-options">
                          <button
                            type="button"
                            className={`move-type-btn ${moveType === "definitiva" ? "active" : ""}`}
                            onClick={() => setMoveType("definitiva")}
                          >
                            <BsArrowRight size={15} />
                            Salida definitiva
                          </button>
                          <button
                            type="button"
                            className={`move-type-btn move-type-btn--return ${moveType === "pendiente" ? "active" : ""}`}
                            onClick={() => setMoveType("pendiente")}
                          >
                            <BsArrowReturnLeft size={15} />
                            Pendiente por devolver
                          </button>
                        </div>
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
              );
            })}
          </div>

          {pendingRequests.length > 3 && (
            <button
              className="btn-show-more"
              onClick={() => setShowAll(!showAll)}
            >
              {showAll ? "Ver menos" : `Ver mas (${pendingRequests.length - 3})`}
            </button>
          )}
        </>
      )}
    </div>
  );
};

export default ProductRequestsCard;
