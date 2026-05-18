import { useEffect, useState } from 'react';
import { BsImages, BsCheck, BsX } from "react-icons/bs";

import { uploadImage } from "../lib/cloudinary"
import { db } from "../firebase/config";
import { collection, addDoc, getDoc, doc, setDoc } from "firebase/firestore";
import { validateProduct } from "../utils/securityValidation";
import { useWarehouseContext } from "../context/WarehouseContext";
import { useAccountContext } from "../context/AccountContext";
import { attachedAccountId } from "../utils/accountFilter";
import { error as logError } from "../utils/logger";

import "../css/formProduct.css";
import Modal from "./Modal";

const FormProduct = ({ setNewProduct, editProduct, setEditProduct, setQuery, isSuperUser = false }) => {

    const { selectedId, defaultWarehouseId } = useWarehouseContext();
    const { accountId: currentAccountId } = useAccountContext();
    const [submitting, setSubmitting] = useState(false);

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
        stockMinimo: 0,
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
                    logError("FormProduct: item no encontrado", { id: editProduct.id });
                }
            } catch (error) {
                logError("FormProduct: getData", error);
            }
        }

        if (editProduct?.status && editProduct?.id) {
            getData();
        }

    }, [editProduct]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (submitting) return;

        // Defensa en profundidad: las rules ya lo exigen, pero validamos en
        // cliente para evitar el round-trip si falta accountId.
        const resolvedAccountId = attachedAccountId(product.accountId, currentAccountId);
        if (!resolvedAccountId) {
            setModalConfig({
                show: true,
                text: 'Tu usuario no está asociado a ninguna cuenta. Pide al administrador que te invite o crea una desde el Dashboard.',
                type: 'error',
                showButton: true,
            });
            return;
        }

        setSubmitting(true);

        try {
            const cleanProduct = {
                ...product,
                imageUrl: product.imageUrl || "",
                cost: Number(product.cost),
                stock: Number(product.stock),
                pending: Number(product.pending),
                stockMinimo: Number(product.stockMinimo || 0),
                totalIn: Number(product.totalIn || 0),
                totalOut: Number(product.totalOut || 0),
                warehouseId: product.warehouseId || selectedId || defaultWarehouseId || "",
                accountId: resolvedAccountId,
            };

            const { isValid, errors } = validateProduct(cleanProduct);
            if (!isValid) {
                setModalConfig({
                    show: true,
                    text: errors.join(' '),
                    type: 'error',
                    showButton: true
                });
                setSubmitting(false);
                return;
            }

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
                setSubmitting(false);
            }, 1500);

        } catch (error) {
            logError("FormProduct: handleSubmit", error);
            setSubmitting(false);
            setModalConfig({
                show: true,
                text: error.message,
                type: 'error',
                showButton: true
            });
        }
    };

    // Manejo de inputs
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
        logError("FormProduct: subir imagen", error);

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

                    <div className="form-group">
                        <label>Stock mínimo:</label>
                        <input
                            type="number"
                            name="stockMinimo"
                            value={product.stockMinimo ?? 0}
                            onChange={handleChange}
                            min="0"
                            step="1"
                            disabled={!isSuperUser}
                            title={isSuperUser ? "Cantidad mínima que debe mantenerse en inventario" : "Solo el superusuario puede modificar el stock mínimo"}
                        />
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
                <button type="button" onClick={handleCancel} disabled={submitting} style={{ backgroundColor: 'red', opacity: submitting ? 0.6 : 1 }}>
                    <BsX size={22} color="#fff" /> Cancelar
                </button>

                <button type="submit" disabled={submitting} style={{ opacity: submitting ? 0.6 : 1, cursor: submitting ? 'wait' : 'pointer' }}>
                    <BsCheck size={22} />
                    {submitting
                        ? (editProduct.status ? "Actualizando..." : "Creando...")
                        : (editProduct.status ? "Actualizar datos" : "Crear producto")}
                </button>
            </div>

            <Modal modalConfig={modalConfig} setModalConfig={setModalConfig} />
        </form>
    );
};

export default FormProduct;
