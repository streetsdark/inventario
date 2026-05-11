import React, { useEffect, useState } from 'react';
import { BsImages, BsCheck, BsX } from "react-icons/bs";

// CON ESTO SUBO LAS IMAGENES A CLAUDINARY, ES IMPORTANTE PARA HACER SUBIDAS DE IMAGENES A LA APP
import { uploadImage } from "../lib/cloudinary"

//otra importacion para las imagenes

// ✅ Firebase moderno
import { db } from "../firebase/config";
import { collection, addDoc, getDoc, doc, setDoc } from "firebase/firestore";

import "../css/formProduct.css";
import Modal from "./Modal";

const FormProduct = ({ setNewProduct, editProduct, setEditProduct, setQuery }) => {

    const [modalConfig, setModalConfig] = useState({
        show: false,
        text: '',
        type: '',
    showButton: true
    });

    const [product, setProduct] = useState({
        sku: '',
        description: '',
        cost: 0,
        brand: '',
        width: { size: 0, unit: '-' },
        height: { size: 0, unit: '-' },
        weight: { size: 0, unit: '-' },
        thickness: { size: 0, unit: '-' },
        color: '',
        product_Unit: '-',
        stock: 0,
        pending: 0,
        location: '',
        imageUrl: ''
    });

    // 🔍 Obtener producto para editar
    useEffect(() => {
        async function getData() {
            try {
                const docRef = doc(db, "products", editProduct.id);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    setProduct(docSnap.data());
                } else {
                    console.log("No se encontró el item seleccionado");
                }
            } catch (error) {
                console.log(`Error: ${error}`);
            }
        }

        if (editProduct?.status && editProduct?.id) {
            getData();
        }

    }, [editProduct]);

    // 💾 Guardar / actualizar
    /*const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            if (!editProduct.status) {
                // ➕ Crear
                await addDoc(collection(db, "products"), product);

                setModalConfig({
                    show: true,
                    text: 'El producto ha sido registrado exitosamente.',
                    type: 'success',
                    showButton: false
                });

                setTimeout(() => {
                    setNewProduct(false);
                    setQuery("");
                }, 2000);

            } else {
                // ✏️ Actualizar
                await setDoc(doc(db, "products", editProduct.id), product);

                setModalConfig({
                    show: true,
                    text: 'El producto ha sido actualizado exitosamente.',
                    type: 'success',
                    showButton: false
                });

                setTimeout(() => {
                    setEditProduct({ status: false, id: null });
                    setQuery("");
                }, 2000);
            }

        } catch (error) {
            setModalConfig({
                show: true,
                text: `Error: ${error.message}`,
                type: 'error',
                showButton: true
            });
        }*/

            const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            const cleanProduct = {
                ...product,
                imageUrl: product.imageUrl || "",
                cost: Number(product.cost),
                stock: Number(product.stock),
                pending: Number(product.pending),
                totalIn: Number(product.totalIn || 0),
                totalOut: Number(product.totalOut || 0),
            };

            if (!editProduct.status) {
                await addDoc(collection(db, "products"), cleanProduct);
            } else {
                await setDoc(doc(db, "products", editProduct.id), cleanProduct);
            }

            setModalConfig({
                show: true,
                text: 'Guardado correctamente',
                type: 'success',
                showButton: false
            });

            setTimeout(() => {
                setNewProduct(false);
                setEditProduct({ status: false, id: null });
                setQuery("");
            }, 1500);

        } catch (error) {
            console.error(error);

            setModalConfig({
                show: true,
                text: error.message,
                type: 'error',
                showButton: true
            });
        }
    
    }

    

    // 🧠 Manejo de inputs
    const handleChange = (e) => {
        const { name, value } = e.target;

        if (['height', 'weight', 'thickness', 'width'].includes(name)) {
            if (!isNaN(value) && value !== '') {
                setProduct({
                    ...product,
                    [name]: { ...product[name], size: Number(value) }
                });
            } else {
                setProduct({
                    ...product,
                    [name]: { ...product[name], unit: value }
                });
            }
        } else {
            setProduct({
                ...product,
                [name]: value
            });
        }
    };

    // 🖼️ Imagen CLOUDINARY muy importante para hacer subidads de imagen a la app
const handleImage = async (e) => {
    const file = e.target.files[0];

    if (!file) return;

    try {
        const url = await uploadImage(file);

       setProduct(prev => ({
    ...prev,
    imageUrl: url
}));

    } catch (error) {
        console.error("Error subiendo imagen:", error);

        setModalConfig({
            show: true,
            text: "Error subiendo imagen",
            type: "error",
            showButton: true
        });
    }
};

    // ❌ Cancelar
    const handleCancel = (e) => {
        e.preventDefault();
        setNewProduct(false);
        setEditProduct({ status: false, id: null });
        setQuery("");
    };

    return (
        <form className="containerFormProducts" onSubmit={handleSubmit}>

            <div className="container-column">
                <div className="column">

                    <div className="img-container">

    {product.imageUrl ? (
        <img src={product.imageUrl} alt="product" />
    ) : (
        <BsImages size={60} />
    )}

    <input
        type="file"
        accept="image/*"
        onChange={handleImage}
    />

</div>

                    <div className="form-group">
                        <label>Código:</label>
                        <input type="text" name="sku" value={product.sku} onChange={handleChange} required />
                    </div>

                    <div className="form-group">
                        <label>Descripción:</label>
                        <input type="text" name="description" value={product.description} onChange={handleChange} required />
                    </div>

                    <div className="form-group">
                        <label>Unidad de medida:</label>
                        <select name="product_Unit" value={product.product_Unit} onChange={handleChange} required>
                            <option value="-">-</option>
                            <option value="mm">mm</option>
                            <option value="cm">cm</option>
                            <option value="m">m</option>
                            <option value="Litro">Litro</option>
                            <option value="Unidad">Unidad</option>
                            <option value="Rollo">Rollo</option>
                            <option value="m2">m2</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Costo:</label>
                        <input type="number" name="cost" value={product.cost} onChange={handleChange} required />
                    </div>

                    <div className="form-group">
                        <label>Stock actual:</label>
                        <input type="number" name="stock" value={product.stock} disabled />
                    </div>

                    <div className="form-group">
                        <label>Pendiente:</label>
                        <input type="number" name="pending" value={product.pending} disabled />
                    </div>

                </div>

                <div className="column">

                    <div className="form-group">
                        <label>Marca:</label>
                        <input type="text" name="brand" value={product.brand} onChange={handleChange} required />
                    </div>

                    <div className="form-group">
                        <label>Ubicación en almacén:</label>
                        <input type="text" name="location" value={product.location} onChange={handleChange} required placeholder="Ej: Pasillo A, Estante 3" />
                    </div>

                    <div className="form-group">
                        <label>Color:</label>
                        <input type="text" name="color" value={product.color} onChange={handleChange} required />
                    </div>

                    {["height", "width", "thickness", "weight"].map((field) => (
                        <div className="form-group" key={field}>
                            <label>{field}:</label>
                            <input
                                type="number"
                                name={field}
                                value={product[field].size}
                                onChange={handleChange}
                                required
                            />
                            <select
                                name={field}
                                value={product[field].unit}
                                onChange={handleChange}
                            >
                                <option value="-">-</option>
                                <option value="mm">mm</option>
                                <option value="cm">cm</option>
                                <option value="m">m</option>
                                {field === "weight" && (
                                    <>
                                        <option value="g">g</option>
                                        <option value="KG">KG</option>
                                        <option value="Ton">Ton</option>
                                    </>
                                )}
                            </select>
                        </div>
                    ))}

                </div>
            </div>

            <div className="container-button">
                <button type="button" onClick={handleCancel} style={{ backgroundColor: 'red' }}>
                    <BsX size={22} color="#fff" /> Cancelar
                </button>

                <button>
                    <BsCheck size={22} />
                    {editProduct.status ? "Actualizar datos" : "Crear producto"}
                </button>
            </div>

            <Modal modalConfig={modalConfig} setModalConfig={setModalConfig} />
        </form>
    );
};

export default FormProduct;
