import { useState } from 'react';
import { BsSearch, BsImages, BsCheck, BsX, BsDownload } from "react-icons/bs";
import {
    collection,
    doc,
    runTransaction,
    updateDoc,
    serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase/config";
import { validateMove } from "../utils/securityValidation";

import useMoves from "../hooks/useMoves";
import useProducts from "../hooks/useProducts";
import useRole from "../hooks/useRole";
import useUsers from "../hooks/useUsers";
import ProfileCard from "../components/ProfileCard";
import "../css/moves.css";
import Modal from "../components/Modal";
import exportInventorySummary from "../utils/exportInventorySummary";



const getTodayDate = () => new Date().toISOString().slice(0, 10);
const formatMoveDate = (move) => {
    const explicitDate = move.exitDate || move.entryDate || move.movementDate;
    if (explicitDate) return explicitDate;
    
    if (move.createdAt?.toDate) {
        return move.createdAt.toDate().toISOString().slice(0, 10);
    }
    
    return '-';
};

const Moves = () => {
    
    const { isSuperUser } = useRole();
    const [modalConfig, setModalConfig] = useState({show: false, text: '', type: '', showButton: true, handleClick: null})
    const [query, setQuery] = useState('');
    const [editProduct, setEditProduct] = useState({});
    const [typeIn, setTypeIn] = useState(true);
    const [quantity, setQuantity] = useState(0);
    const [moveDate, setMoveDate] = useState(getTodayDate());
    const [recipientUser, setRecipientUser] = useState('');
    const [outputStatus, setOutputStatus] = useState('entregado');
    const [outputUserFilter, setOutputUserFilter] = useState('');
    const [selectedReturnMove, setSelectedReturnMove] = useState(null);
    
    const { products = [], loading } = useProducts(query);
    const { moves = [], loading: loadingMoves } = useMoves();
    const { users = [] } = useUsers();

    // mapa recipientUser (email o displayName) → alias
    const aliasMap = {};
    users.forEach((u) => {
        if (!u.alias) return;
        if (u.email)       aliasMap[u.email.toLowerCase()]       = u.alias;
        if (u.displayName) aliasMap[u.displayName.toLowerCase()] = u.alias;
    });


    const outputMoves = moves.filter((move) => move.type === 'out');
    const normalizedOutputUserFilter = outputUserFilter.trim().toLowerCase();
    const filteredOutputMoves = normalizedOutputUserFilter
        ? outputMoves.filter((move) =>
            String(move.recipientUser || '').toLowerCase().includes(normalizedOutputUserFilter)
        )
        : outputMoves;

    const resetMovementForm = () => {
        setEditProduct({});
        setQuantity(0);
        setTypeIn(true);
        setMoveDate(getTodayDate());
        setRecipientUser('');
        setOutputStatus('entregado');
        setSelectedReturnMove(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!editProduct?.id) {
            setModalConfig({
                show: true,
                text: 'Selecciona un producto antes de guardar el movimiento.',
                type: 'info',
                showButton: true
            });
            return;
        }

        const parsedQuantity = Number(quantity);

        if (!parsedQuantity || parsedQuantity <= 0) {
            setModalConfig({
                show: true,
                text: 'La cantidad debe ser mayor a cero.',
                type: 'error',
                showButton: true
            });
            return;
        }

        if (!moveDate) {
            setModalConfig({
                show: true,
                text: typeIn ? 'Selecciona una fecha de ingreso.' : 'Selecciona una fecha de salida.',
                type: 'error',
                showButton: true
            });
            return;
        }

        if (!typeIn && !recipientUser.trim()) {
            setModalConfig({
                show: true,
                text: 'Indica para quien fue la salida.',
                type: 'error',
                showButton: true
            });
            return;
        }

        const currentStock = Number(editProduct.stock || 0);
        const quantityFinal = typeIn
            ? currentStock + parsedQuantity
            : currentStock - parsedQuantity;

        if (quantityFinal < 0) {
            setModalConfig({
                show: true,
                text: 'Lo siento pero la cantidad final debe ser igual o mayor a cero.',
                type: 'error',
                showButton: true
            });
        } else {
            const { isValid, errors } = validateMove({
                quantity: parsedQuantity,
                date: moveDate,
                type: typeIn ? 'in' : 'out',
            });
            if (!isValid) {
                setModalConfig({
                    show: true,
                    text: errors.join(' '),
                    type: 'error',
                    showButton: true
                });
                return;
            }

            try {
                const productRef = doc(db, "products", editProduct.id);
                const moveRef = doc(collection(db, "moves"));
                const savedProductId = editProduct.id;
                const savedProductDescription = editProduct.description;
                let currentPending = 0;
                
                // Referencia al movimiento de devolución si existe
                const returnMoveRef = selectedReturnMove ? doc(db, "moves", selectedReturnMove) : null;

                await runTransaction(db, async (transaction) => {
                    const productSnapshot = await transaction.get(productRef);

                    if (!productSnapshot.exists()) {
                        throw new Error('not-found');
                    }

                    const currentProduct = productSnapshot.data();
                    currentPending = Number(currentProduct.pending || 0);
                    const liveStock = Number(currentProduct.stock || 0);
                    const nextStock = typeIn
                        ? liveStock + parsedQuantity
                        : liveStock - parsedQuantity;

                    if (nextStock < 0) {
                        throw new Error('negative-stock');
                    }

                    transaction.update(productRef, {
                        stock: nextStock,
                        totalIn: Number(currentProduct.totalIn || 0) + (typeIn ? parsedQuantity : 0),
                        totalOut: Number(currentProduct.totalOut || 0) + (!typeIn ? parsedQuantity : 0),
                        lastEntryDate: typeIn ? moveDate : currentProduct.lastEntryDate || '',
                        lastExitDate: !typeIn ? moveDate : currentProduct.lastExitDate || '',
                    });

                    transaction.set(moveRef, {
                        productId: productSnapshot.id,
                        sku: currentProduct.sku || editProduct.sku || '',
                        description: currentProduct.description || editProduct.description || '',
                        unit: currentProduct.product_Unit || editProduct.product_Unit || '',
                        quantity: parsedQuantity,
                        type: typeIn ? 'in' : 'out',
                        movementDate: moveDate,
                        entryDate: typeIn ? moveDate : '',
                        exitDate: !typeIn ? moveDate : '',
                        recipientUser: typeIn ? '' : recipientUser.trim(),
                        deliveryStatus: typeIn ? '' : outputStatus,
                        createdAt: serverTimestamp(),
                    });
                    
                    // Si es una devolución, actualizar el movimiento original a "devuelto"
                    if (returnMoveRef) {
                        transaction.update(returnMoveRef, {
                            deliveryStatus: 'devuelto',
                            returnDate: moveDate,
                            returnQuantity: parsedQuantity,
                        });
                    }
                });

                if (typeIn && currentPending > 0) {
                    resetMovementForm();

                    const handleRemovePending = async () => {
                        try {
                            await updateDoc(doc(db, "products", savedProductId), {
                                pending: 0,
                            });

                            setTimeout(() => {
                                setModalConfig({
                                    show: true,
                                    text: `El producto '${savedProductDescription}' se quito de unidades pendientes correctamente.`,
                                    type: 'success',
                                    showButton: true,
                                    handleClick: null,
                                });
                            }, 0);
                        } catch (error) {
                            setTimeout(() => {
                                setModalConfig({
                                    show: true,
                                    text: `La entrada se guardo, pero no se pudo quitar el pendiente. ${error.message}`,
                                    type: 'error',
                                    showButton: true,
                                    handleClick: null,
                                });
                            }, 0);
                        }
                    };

                    setModalConfig({
                        show: true,
                        text: `La entrada del producto '${savedProductDescription}' se guardo correctamente. Deseas quitar este producto actual de unidades pendientes por producto?`,
                        type: 'info',
                        showButton: true,
                        handleClick: handleRemovePending,
                    });
                    return;
                }

                // Si fue una devolución registrada desde el preview
                if (selectedReturnMove && typeIn) {
                    setModalConfig({
                        show: true,
                        text: `✓ Devolución registrada correctamente.\n\nEl producto '${editProduct.description}' cambió de estado a "DEVUELTO" y el stock se incrementó en ${parsedQuantity} ${editProduct.product_Unit || 'unidades'}.`,
                        type: 'success',
                        showButton: false
                    });

                    setTimeout(() => {
                        setModalConfig({show: false, text: '', type: '', showButton: true, handleClick: null});
                        resetMovementForm();
                    }, 2500);
                    return;
                }

                setModalConfig({
                    show: true,
                    text: `El movimiento del producto '${editProduct.description}' se ha guardado correctamente.`,
                    type: 'success',
                    showButton: false
                });

                setTimeout(() => {
                    setModalConfig({show: false, text: '', type: '', showButton: true, handleClick: null});
                    resetMovementForm();
                }, 2000);
            } catch (error) {
                const message = error.message === 'negative-stock'
                    ? 'Lo siento pero la cantidad final debe ser igual o mayor a cero.'
                    : error.message === 'not-found'
                        ? 'El producto seleccionado ya no existe.'
                        : `Lo siento ha ocurrido un error. ${error.message}`;

                setModalConfig({
                    show: true,
                    text: message,
                    type: 'error',
                    showButton: true
                });
            }
        }
    };

    const handleExportSummary = (exportType) => {
        if (loadingMoves) {
            setModalConfig({
                show: true,
                text: 'Todavia estamos cargando los movimientos. Intenta de nuevo en unos segundos.',
                type: 'info',
                showButton: true
            });
            return;
        }

        if (!moves.length) {
            setModalConfig({
                show: true,
                text: 'No hay movimientos para exportar en este momento.',
                type: 'info',
                showButton: true
            });
            return;
        }

        const filteredMoves = moves.filter((move) =>
            exportType === 'entries' ? move.type === 'in' : move.type === 'out'
        );

        if (!filteredMoves.length) {
            setModalConfig({
                show: true,
                text: exportType === 'entries'
                    ? 'No hay ingresos para exportar en este momento.'
                    : 'No hay salidas para exportar en este momento.',
                type: 'info',
                showButton: true
            });
            return;
        }

        exportInventorySummary(filteredMoves, exportType, users);

        setModalConfig({
            show: true,
            text: exportType === 'entries'
                ? 'Se descargo el excel de ingresos.'
                : 'Se descargo el excel de salidas.',
            type: 'success',
            showButton: true
        });
    };

    const handleSelectProduct = (product) => {
        setEditProduct(product);
        setQuantity(0);
        setMoveDate(getTodayDate());
        setRecipientUser('');
        setOutputStatus('entregado');
        setSelectedReturnMove(null);
    };

    const handleSelectReturnMove = (move) => {
        // Si está pendiente por devolver, permite seleccionarlo
        if (move.deliveryStatus === 'pendiente por devolver') {
            setSelectedReturnMove(move.id === selectedReturnMove ? null : move.id);
            
            // Si lo selecciona, llena el formulario como entrada
            if (move.id !== selectedReturnMove) {
                const matchedProduct = products.find(p => p.id === move.productId);
                if (matchedProduct) {
                    setEditProduct(matchedProduct);
                } else {
                    // Si no encuentra el producto en los actuales, crea uno temporal
                    setEditProduct({
                        id: move.productId,
                        sku: move.sku,
                        description: move.description,
                        stock: 0,
                        product_Unit: move.unit
                    });
                }
                setTypeIn(true); // Siempre es entrada (devolución)
                setQuantity(0); // Cantidad a devolver (debe ingresar el usuario)
                setMoveDate(getTodayDate());
            }
        }
    };

    return (
        <div className="content">
            <ProfileCard />
            <div className="moves-header">
                <h1>Movimientos</h1>
                {isSuperUser && (
                    <div className="export-actions">
                        <button type="button" className="export-summary-btn" onClick={() => handleExportSummary('entries')}>
                            <BsDownload size={18} />
                            Exportar entradas
                        </button>
                        <button type="button" className="export-summary-btn" onClick={() => handleExportSummary('exits')}>
                            <BsDownload size={18} />
                            Exportar salidas
                        </button>
                    </div>
                )}
            </div>

            {!isSuperUser && (
                <div style={{textAlign: 'center', padding: '40px', color: '#FF6B6B'}}>
                    <h2>⛔ Acceso restringido</h2>
                    <p>Solo el administrador puede crear y editar movimientos de inventario.</p>
                    <p>Puedes ver el historial de salidas a continuación:</p>
                </div>
            )}

            {isSuperUser && (
                <div className="container-move">
                   <div className="container-item">
                    <h2>Generar nuevo movimiento</h2>
                    <p>Por favor selecciona el producto del listado derecho al que deseas generar el movimiento de stock.</p>
                    
                    {selectedReturnMove && (
                        <div style={{
                            backgroundColor: '#f4d03f',
                            color: '#5d4600',
                            padding: '12px 16px',
                            borderRadius: '8px',
                            marginBottom: '1rem',
                            fontWeight: 'bold',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}>
                            ✓ Registrando devolución - Ingresa la cantidad devuelta
                        </div>
                    )}

                    <form className="form-move" onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label htmlFor="move-sku">Código</label>
                            <input id="move-sku" type="text" value={editProduct.sku || ''} disabled/>
                        </div>

                        <div className="form-group">
                            <label htmlFor="move-description">Descripción</label>
                            <input id="move-description" type="text" value={editProduct.description || ''} disabled/>
                        </div>

                        <div className="form-group">
                            <label htmlFor="move-stock">Stock actual</label>
                            <input id="move-stock" type="text" value={editProduct.stock ? `${editProduct.stock} ${editProduct.product_Unit}` : ''} disabled/>
                        </div>

                        <div className="form-group">
                            <label htmlFor="">Tipo de movimiento</label>
                            <div className="container-type">
                                <button type="button" onClick={ () => setTypeIn(true)} style={ !typeIn ? { background: 'gray' } : null }>Entrada</button>
                                <button type="button" onClick={ () => setTypeIn(false)} style={ typeIn ? { background: 'gray' } : null }>Salida</button>
                            </div>
                        </div>

                        <div className="form-group">
                            <label htmlFor="move-quantity">Cantidad</label>
                            <input id="move-quantity" type="number" min="0" value={quantity} onChange={(e) => setQuantity(e.target.value)}/>
                        </div>

                        <div className="form-group">
                            <label htmlFor="move-date">{typeIn ? 'Fecha de ingreso' : 'Fecha de salida'}</label>
                            <input
                                id="move-date"
                                type="date"
                                value={moveDate}
                                onChange={(e) => setMoveDate(e.target.value)}
                            />
                        </div>

                        {
                            !typeIn ? (
                                <>
                                    <div className="form-group">
                                        <label htmlFor="recipient-user">Usuario / Para quien fue</label>
                                        <input
                                            id="recipient-user"
                                            type="text"
                                            value={recipientUser}
                                            onChange={(e) => setRecipientUser(e.target.value)}
                                            placeholder="Ej: Juan Perez, Produccion, Cliente"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor="output-status">Estado del material</label>
                                        <select
                                            id="output-status"
                                            value={outputStatus}
                                            onChange={(e) => setOutputStatus(e.target.value)}
                                        >
                                            <option value="pendiente por devolver">Pendiente por devolver</option>
                                            <option value="entregado">Entregado</option>
                                        </select>
                                    </div>
                                </>
                            ) : null
                        }

                        <div className="form-group">
                            <label htmlFor="move-final-quantity">Cantidad final</label>
                            <input id="move-final-quantity" type="text" value={
                                editProduct.stock
                                ? ( typeIn
                                    ? parseInt(editProduct.stock) + parseInt(quantity || 0)
                                    : parseInt(editProduct.stock) - parseInt(quantity || 0) ) + ' ' + (editProduct.product_Unit || '')
                                : '' }  disabled/>
                        </div>

                        {(() => {
                            const minimo = Number(editProduct.stockMinimo || 0);
                            const stockFinal = !typeIn && editProduct.stock
                                ? parseInt(editProduct.stock) - parseInt(quantity || 0)
                                : null;
                            if (!typeIn && minimo > 0 && stockFinal !== null && stockFinal <= minimo) {
                                return (
                                    <div style={{
                                        backgroundColor: 'rgba(194,148,58,0.15)',
                                        border: '1px solid rgba(194,148,58,0.5)',
                                        color: '#c2943a',
                                        padding: '10px 14px',
                                        borderRadius: '10px',
                                        fontSize: '0.85rem',
                                        fontWeight: 600,
                                        marginBottom: '0.5rem',
                                    }}>
                                        ⚠ Esta salida dejará el stock{stockFinal <= 0 ? " en cero" : ` en ${stockFinal}`}, {stockFinal <= 0 ? "por debajo" : "igual o por debajo"} del mínimo configurado ({minimo}).
                                    </div>
                                );
                            }
                            return null;
                        })()}

                        <div className="container-button">
                            <button
                                type="button"
                                onClick={() => {
                                    resetMovementForm();
                                }}
                                style={{backgroundColor: 'red'}}
                            >
                                <BsX size={22} style={{ marginRight: 5}} color="#FFFFFF"/>
                                <b>Cancelar</b>
                            </button>
                            <button type="submit">
                                <BsCheck size={22} style={{ marginRight: 5 }}/>
                                <b>Guardar</b>
                            </button>
                        </div>
                    </form>
                 </div>
                 <div className="container-item">
                    <h2>Productos actuales</h2>

                    <div className="searchContainer">
                        <BsSearch size={22}/>
                        <input type="text" placeholder="Buscar producto..."
                            onChange={(e) => e.target.value.length >= 3 ? setQuery(e.target.value) : setQuery("")}
                        />
                    </div>

                    <div style={{overflowY: 'scroll', maxHeight: '31rem'}}>
                    {loading && <p>Cargando productos...</p>}
                    {
                        !loading && products.length > 0 ?
                        (products.map((p)=> {
                            return <div key={p.id} className="product-item" onClick={ () => handleSelectProduct(p)} style={ p.stock <= 0 ? {backgroundColor:'#EC7063'} : null}>
                                <div>
                                    {p.imageUrl || p.img_b64 ? <img src={p.imageUrl || p.img_b64} alt="Products"/> : <div className="emptyImg"><BsImages size={60}/></div>}
                                </div>
                                <div style={{ marginLeft: '10px', }}>
                                    <h3>{p.description}</h3>
                                    <p><b>Código: </b>{p.sku}</p>
                                    <p><b>Stock actual: </b>{p.stock} {p.product_Unit}</p>
                                    <p><b>Pendiente: </b>{p.pending}</p>
                                </div>
                            </div>
                        })
                        ):
                        !loading && <h2>Lo siento, pero no se ha encontrado ningun producto.</h2>
                    }
                    </div>
                 </div>
              </div>
            )}
            
            <div className="container-item output-preview-card">
                <div className="output-preview-header">
                    <div>
                        <h2>Previsualizacion de salidas</h2>
                        <p>
                            Consulta aqui las salidas registradas por usuario con fecha, material, destinatario y estado.
                            <br/>
                            <b style={{color: '#f4d03f'}}>✓ Click en items "Pendiente por devolver"</b> para registrar rápidamente su devolución.
                            <br/>
                            <b style={{color: '#6c63ff', fontSize: '0.95rem'}}>• Estados: Pendiente (Amarillo) | Entregado (Verde) | Devuelto (Azul)</b>
                        </p>
                    </div>
                </div>

                <div className="output-preview-list">
                    <div className="output-preview-filter">
                        <label htmlFor="output-user-filter">Filtrar por usuario</label>
                        <input
                            id="output-user-filter"
                            type="text"
                            value={outputUserFilter}
                            onChange={(e) => setOutputUserFilter(e.target.value)}
                            placeholder="Ej: David"
                        />
                    </div>
                    {loadingMoves ? <p>Cargando salidas...</p> : null}
                    {!loadingMoves && filteredOutputMoves.length ? (
                        filteredOutputMoves.map((move) => (
                            <div 
                                key={move.id} 
                                className={`output-preview-item ${move.deliveryStatus === 'pendiente por devolver' ? 'is-selectable' : ''} ${selectedReturnMove === move.id ? 'is-selected' : ''}`}
                                onClick={() => {
                                    if (move.deliveryStatus === 'pendiente por devolver') {
                                        handleSelectReturnMove(move);
                                    }
                                }}
                                style={{ 
                                    cursor: move.deliveryStatus === 'pendiente por devolver' ? 'pointer' : 'default',
                                    opacity: move.deliveryStatus === 'pendiente por devolver' ? 1 : 0.7
                                }}
                            >
                                <div className="output-preview-main">
                                    <h3>{move.description || 'Material sin nombre'}</h3>
                                    <p><b>Codigo:</b> {move.sku || '-'}</p>
                                    <p><b>Fecha de salida:</b> {formatMoveDate(move)}</p>
                                    <p><b>Cantidad:</b> {move.quantity || 0} {move.unit || ''}</p>
                                    <p><b>Entregado a:</b> {move.recipientUser || '-'}</p>
                                    {aliasMap[(move.recipientUser || '').toLowerCase()] && (
                                        <p>
                                            <b>Alias:</b>{' '}
                                            <span style={{ color: 'var(--contrast)', fontWeight: 700 }}>
                                                {aliasMap[(move.recipientUser || '').toLowerCase()]}
                                            </span>
                                        </p>
                                    )}
                                </div>
                                <div className="output-preview-side">
                                    <span className={`output-status-badge ${move.deliveryStatus === 'pendiente por devolver' ? 'is-pending' : move.deliveryStatus === 'devuelto' ? 'is-returned' : 'is-delivered'}`}>
                                        {move.deliveryStatus || 'entregado'}
                                    </span>
                                </div>
                            </div>
                        ))
                    ) : null}
                    {!loadingMoves && !filteredOutputMoves.length ? (
                        <p>
                            {normalizedOutputUserFilter
                                ? `No hay salidas registradas para '${outputUserFilter}'.`
                                : 'No hay salidas registradas todavia.'}
                        </p>
                    ) : null}
                </div>
            </div>
            <Modal modalConfig={modalConfig} setModalConfig={setModalConfig}/>
        </div>
    )
}

export default Moves
