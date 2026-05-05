import React, { useState } from 'react';
import { BsTrash, BsPencil, BsImages, BsCheckCircle } from "react-icons/bs";

import useProducts from "../hooks/useProducts";
import "../css/listProduct.css";
import Modal from "./Modal";
import RequestProductModal from "./RequestProductModal";

const ListProducts = ({ query, setEditProduct, isSuperUser = false }) => {

    const { products, loading, removeProduct } = useProducts(query);
    const [modalConfig, setModalConfig] = useState({show: false, text: '', type: '', showButton: true, handleClick: null})
    const [selectedProductForRequest, setSelectedProductForRequest] = useState(null);
    const [showRequestModal, setShowRequestModal] = useState(false);

    const editProduct = (id) => {
        setEditProduct({status: true, id: `${id}`})
    }

    const requestProduct = (product) => {
        setSelectedProductForRequest(product);
        setShowRequestModal(true);
    }

    const deleteProduct = (id, description) => {
        async function modalClik() {
            try {
                await removeProduct(id);

                setModalConfig({
                    show: true,
                    text: `El producto '${description}' ha sido eliminado correctamente.`,
                    type: 'success',
                    showButton: true
                });

            } catch (error) {
                console.error(error);
                setModalConfig({
                    show: true,
                    text: `Error al eliminar el producto.`,
                    type: 'error',
                    showButton: true
                });
            }
        }

        setModalConfig({
            show: true,
            text: `¿Desea eliminar el producto: '${description}', del inventario?`,
            type: 'info',
            showButton: true,
            handleClick: modalClik
        });
    };

    return (
        <div className="containerListProducts">
            {loading && <p>Cargando productos...</p>}
            
            {!loading && products.length > 0 ? (
                products.map((p) => {
                    return (
                        <div key={p.id} className={`cardProduct ${!isSuperUser ? 'card-clickable' : ''}`}>
                            {p.img_b64 ? (
                                <img src={p.img_b64} alt="Products"/>
                            ) : (
                                <div className="emptyImg">
                                    <BsImages size={60}/>
                                </div>
                            )}
                            <h3>{p.description}</h3>
                            <p><b>Ubicación: </b>{p.location}</p>
                            <p><b>Código: </b>{p.sku}</p>
                            <p><b>Stock actual: </b>{p.stock} {p.product_Unit}</p>
                            <p><b>Marca: </b>{p.brand}</p>
                            <p><b>Pendiente: </b>{p.pending}</p>
                            
                            {isSuperUser ? (
                                <div className="containerBtnAction">
                                    <BsPencil title="Editar" className="btnAction" size={24} style={{ color: 'var(--text)' }} onClick={() => editProduct(p.id)}/>
                                    <BsTrash title="Eliminar" className="btnAction" size={24} style={{ color: 'var(--text)' }} onClick={() => deleteProduct(p.id, p.description)}/>
                                </div>
                            ) : (
                                <button 
                                    className="btnRequestProduct"
                                    onClick={() => requestProduct(p)}
                                    title="Solicitar este producto"
                                >
                                    <BsCheckCircle size={18} />
                                    Solicitar
                                </button>
                            )}
                        </div>
                    )
                })
            ) : (
                !loading && <div style={{ height: '100vh' }}><h1>Lo siento, pero no se ha encontrado ningun producto.</h1></div>
            )}
            <Modal modalConfig={modalConfig} setModalConfig={setModalConfig}/>
            <RequestProductModal 
                product={selectedProductForRequest}
                isOpen={showRequestModal}
                onClose={() => setShowRequestModal(false)}
                onSuccess={() => {
                    setModalConfig({
                        show: true,
                        text: "Tu solicitud ha sido registrada exitosamente. Almacen la revisará pronto.",
                        type: "success",
                        showButton: true
                    });
                }}
            />
        </div>
    )
}

export default ListProducts