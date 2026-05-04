import React, { useState } from 'react';
import { BsTrash, BsPencil, BsImages } from "react-icons/bs";

import useProducts from "../hooks/useProducts";
import "../css/listProduct.css";
import Modal from "./Modal";

const ListProducts = ({ query, setEditProduct }) => {

    const { products, loading, removeProduct } = useProducts(query);
    const [modalConfig, setModalConfig] = useState({show: false, text: '', type: '', showButton: true, handleClick: null})

    const editProduct = (id) => {
        setEditProduct({status: true, id: `${id}`})
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
                        <div key={p.id} className="cardProduct">
                            {p.img_b64 ? (
                                <img src={p.img_b64} alt="Products"/>
                            ) : (
                                <div className="emptyImg">
                                    <BsImages size={60}/>
                                </div>
                            )}
                            <h3>{p.description}</h3>
                            <p><b>Código: </b>{p.sku}</p>
                            <p><b>Stock actual: </b>{p.stock} {p.product_Unit}</p>
                            <p><b>Marca: </b>{p.brand}</p>
                            <p><b>Pendiente: </b>{p.pending}</p>
                            <div className="containerBtnAction">
                                <BsPencil title="Editar" className="btnAction" size={24} style={{ color: 'var(--text)' }} onClick={() => editProduct(p.id)}/>
                                <BsTrash title="Eliminar" className="btnAction" size={24} style={{ color: 'var(--text)' }} onClick={() => deleteProduct(p.id, p.description)}/>
                            </div>
                        </div>
                    )
                })
            ) : (
                !loading && <div style={{ height: '100vh' }}><h1>Lo siento, pero no se ha encontrado ningun producto.</h1></div>
            )}
            <Modal modalConfig={modalConfig} setModalConfig={setModalConfig}/>
        </div>
    )
}

export default ListProducts