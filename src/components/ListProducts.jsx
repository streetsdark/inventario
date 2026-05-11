import React, { useState } from "react";
import { BsTrash, BsPencil, BsImages, BsCheckCircle, BsXCircle } from "react-icons/bs";

import useProducts from "../hooks/useProducts";
import "../css/listProduct.css";
import Modal from "./Modal";
import RequestProductModal from "./RequestProductModal";

const ListProducts = ({ query, stockFilter = "all", setEditProduct, isSuperUser = false }) => {
  const { products, loading, removeProduct } = useProducts(query);
  const [modalConfig, setModalConfig] = useState({
    show: false,
    text: "",
    type: "",
    showButton: true,
    handleClick: null,
  });
  const [selectedProductForRequest, setSelectedProductForRequest] =
    useState(null);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedProductPreview, setSelectedProductPreview] = useState(null);

  const getStockStatusClass = (stock) => {
    const stockValue = Number(stock || 0);

    if (stockValue <= 0) return "is-out-of-stock";
    if (stockValue <= 5) return "is-low-stock";
    return "is-in-stock";
  };

  const getStockStatusLabel = (stock) => {
    const stockValue = Number(stock || 0);

    if (stockValue <= 0) return "Sin stock";
    if (stockValue <= 5) return "Stock bajo";
    return "Stock alto";
  };

  const editProduct = (id) => {
    setEditProduct({ status: true, id: `${id}` });
  };

  const requestProduct = (product) => {
    setSelectedProductForRequest(product);
    setShowRequestModal(true);
  };

  const openProductPreview = (product) => {
    setSelectedProductPreview(product);
  };

  const closeProductPreview = () => {
    setSelectedProductPreview(null);
  };

  const requestProductFromPreview = (product) => {
    closeProductPreview();
    requestProduct(product);
  };

  const editProductFromPreview = (id) => {
    closeProductPreview();
    editProduct(id);
  };

  const deleteProductFromPreview = (id, description) => {
    closeProductPreview();
    deleteProduct(id, description);
  };

  const deleteProduct = (id, description) => {
    async function modalClik() {
      try {
        await removeProduct(id);

        setModalConfig({
          show: true,
          text: `El producto '${description}' ha sido eliminado correctamente.`,
          type: "success",
          showButton: true,
        });
      } catch (error) {
        console.error(error);
        setModalConfig({
          show: true,
          text: "Error al eliminar el producto.",
          type: "error",
          showButton: true,
        });
      }
    }

    setModalConfig({
      show: true,
      text: `Desea eliminar el producto '${description}' del inventario?`,
      type: "info",
      showButton: true,
      handleClick: modalClik,
    });
  };

  const filteredProducts = products.filter((product) => {
    const stockValue = Number(product.stock || 0);

    if (stockFilter === "high") {
      return stockValue > 5;
    }

    if (stockFilter === "low") {
      return stockValue > 0 && stockValue <= 5;
    }

    if (stockFilter === "out") {
      return stockValue <= 0;
    }

    return true;
  });

  return (
    <div className="containerListProducts">
      {loading && <p>Cargando productos...</p>}

      {!loading && filteredProducts.length > 0
        ? filteredProducts.map((p) => {
            return (
              <div
                key={p.id}
                className="cardProduct card-clickable"
                onClick={() => openProductPreview(p)}
              >
                <div className="product-image-shell">
                  {p.imageUrl ? (
                    <img src={p.imageUrl} alt={p.description} />
                  ) : (
                    <div className="emptyImg">
                      <BsImages size={60} />
                    </div>
                  )}
                </div>

                <div className="product-card-body">
                  <div className="product-card-header">
                    <h3>{p.description}</h3>
                    <span
                      className={`product-stock-badge ${getStockStatusClass(p.stock)}`}
                    >
                      {getStockStatusLabel(p.stock)} · {p.stock} {p.product_Unit}
                    </span>
                  </div>

                  <div className="product-meta-list">
                    <p>
                      <b>Ubicacion</b>
                      <span>{p.location}</span>
                    </p>
                    <p>
                      <b>Codigo</b>
                      <span>{p.sku}</span>
                    </p>
                    <p>
                      <b>Marca</b>
                      <span>{p.brand}</span>
                    </p>
                    <p>
                      <b>Pendiente</b>
                      <span>{p.pending}</span>
                    </p>
                  </div>
                </div>

                {isSuperUser ? (
                  <div className="containerBtnAction">
                    <button
                      type="button"
                      title="Editar"
                      className="btnAction product-action-button"
                      onClick={(event) => {
                        event.stopPropagation();
                        editProduct(p.id);
                      }}
                    >
                      <BsPencil size={18} />
                      <span className="product-action-label">Editar</span>
                    </button>
                    <button
                      type="button"
                      title="Eliminar"
                      className="btnAction product-action-button danger"
                      onClick={(event) => {
                        event.stopPropagation();
                        deleteProduct(p.id, p.description);
                      }}
                    >
                      <BsTrash size={18} />
                      <span className="product-action-label">Eliminar</span>
                    </button>
                  </div>
                ) : (
                  <button
                    className="btnRequestProduct"
                    onClick={(event) => {
                      event.stopPropagation();
                      requestProduct(p);
                    }}
                    title="Solicitar este producto"
                  >
                    <BsCheckCircle size={18} />
                    Solicitar
                  </button>
                )}
              </div>
            );
          })
        : !loading && (
            <div style={{ height: "100vh" }}>
              <h1>Lo siento, pero no se ha encontrado ningun producto.</h1>
            </div>
          )}
      {selectedProductPreview ? (
        <div className="product-preview-overlay" onClick={closeProductPreview}>
          <div
            className="product-preview-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="product-preview-close"
              onClick={closeProductPreview}
              title="Cerrar vista previa"
            >
              <BsXCircle size={24} />
            </button>

            <div className="product-preview-media">
              {selectedProductPreview.imageUrl ? (
                <img
                  src={selectedProductPreview.imageUrl}
                  alt={selectedProductPreview.description}
                />
              ) : (
                <div className="product-preview-empty">
                  <BsImages size={60} />
                </div>
              )}
            </div>

            <div className="product-preview-copy">
              <div className="product-preview-header">
                <div>
                  <p className="product-preview-eyebrow">Vista del producto</p>
                  <h2>{selectedProductPreview.description}</h2>
                </div>
                <span
                  className={`product-preview-stock ${getStockStatusClass(
                    selectedProductPreview.stock
                  )}`}
                >
                  {getStockStatusLabel(selectedProductPreview.stock)} ·{" "}
                  {selectedProductPreview.stock}{" "}
                  {selectedProductPreview.product_Unit}
                </span>
              </div>

              <div className="product-preview-grid">
                <p>
                  <b>Codigo</b>
                  <span>{selectedProductPreview.sku}</span>
                </p>
                <p>
                  <b>Marca</b>
                  <span>{selectedProductPreview.brand}</span>
                </p>
                <p>
                  <b>Ubicacion</b>
                  <span>{selectedProductPreview.location}</span>
                </p>
                <p>
                  <b>Pendiente</b>
                  <span>{selectedProductPreview.pending}</span>
                </p>
              </div>

              {isSuperUser ? (
                <div className="product-preview-actions">
                  <button
                    type="button"
                    className="product-preview-btn secondary"
                    onClick={() => editProductFromPreview(selectedProductPreview.id)}
                  >
                    <BsPencil size={18} />
                    Editar
                  </button>
                  <button
                    type="button"
                    className="product-preview-btn danger"
                    onClick={() =>
                      deleteProductFromPreview(
                        selectedProductPreview.id,
                        selectedProductPreview.description
                      )
                    }
                  >
                    <BsTrash size={18} />
                    Eliminar
                  </button>
                </div>
              ) : (
                <div className="product-preview-actions">
                  <button
                    type="button"
                    className="product-preview-btn"
                    onClick={() => requestProductFromPreview(selectedProductPreview)}
                  >
                    <BsCheckCircle size={18} />
                    Solicitar producto
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
      <Modal modalConfig={modalConfig} setModalConfig={setModalConfig} />
      <RequestProductModal
        product={selectedProductForRequest}
        isOpen={showRequestModal}
        onClose={() => setShowRequestModal(false)}
        onSuccess={() => {
          setModalConfig({
            show: true,
            text: "Tu solicitud ha sido registrada exitosamente. Almacen la revisara pronto.",
            type: "success",
            showButton: true,
          });
        }}
      />
    </div>
  );
};

export default ListProducts;
