import { useState } from 'react';
import { BsDownload } from "react-icons/bs";
import { validateMove } from "../utils/securityValidation";

import useMoves from "../hooks/useMoves";
import useProducts from "../hooks/useProducts";
import useRole from "../hooks/useRole";
import useUsers from "../hooks/useUsers";
import ProfileCard from "../components/ProfileCard";
import MoveForm from "../components/MoveForm";
import ProductSelector from "../components/ProductSelector";
import OutputPreviewSection from "../components/OutputPreviewSection";
import Modal from "../components/Modal";
import exportInventorySummary from "../utils/exportInventorySummary";
import "../css/moves.css";

const getTodayDate = () => new Date().toISOString().slice(0, 10);

const Moves = () => {
    const { isSuperUser } = useRole();
    const [modalConfig, setModalConfig] = useState({ show: false, text: '', type: '', showButton: true, handleClick: null });
    const [query, setQuery] = useState('');
    const [editProduct, setEditProduct] = useState({});
    const [typeIn, setTypeIn] = useState(true);
    const [quantity, setQuantity] = useState(0);
    const [moveDate, setMoveDate] = useState(getTodayDate());
    const [recipientUser, setRecipientUser] = useState('');
    const [outputStatus, setOutputStatus] = useState('entregado');
    const [outputUserFilter, setOutputUserFilter] = useState('');
    const [selectedReturnMove, setSelectedReturnMove] = useState(null);

    const { products = [], loading, clearPending } = useProducts(query);
    const { moves = [], loading: loadingMoves, createMove } = useMoves();
    const { users = [] } = useUsers();

    const aliasMap = {};
    users.forEach((u) => {
        if (!u.alias) return;
        if (u.email) aliasMap[u.email.toLowerCase()] = u.alias;
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

    const showModal = (text, type, showButton = true, handleClick = null) => {
        setModalConfig({ show: true, text, type, showButton, handleClick });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!editProduct?.id) {
            showModal('Selecciona un producto antes de guardar el movimiento.', 'info');
            return;
        }

        const parsedQuantity = Number(quantity);

        if (!parsedQuantity || parsedQuantity <= 0) {
            showModal('La cantidad debe ser mayor a cero.', 'error');
            return;
        }

        if (!moveDate) {
            showModal(typeIn ? 'Selecciona una fecha de ingreso.' : 'Selecciona una fecha de salida.', 'error');
            return;
        }

        if (!typeIn && !recipientUser.trim()) {
            showModal('Indica para quien fue la salida.', 'error');
            return;
        }

        const currentStock = Number(editProduct.stock || 0);
        const quantityFinal = typeIn ? currentStock + parsedQuantity : currentStock - parsedQuantity;

        if (quantityFinal < 0) {
            showModal('Lo siento pero la cantidad final debe ser igual o mayor a cero.', 'error');
            return;
        }

        const { isValid, errors } = validateMove({ quantity: parsedQuantity, date: moveDate, type: typeIn ? 'in' : 'out' });
        if (!isValid) {
            showModal(errors.join(' '), 'error');
            return;
        }

        try {
            const savedProductId = editProduct.id;
            const savedProductDescription = editProduct.description;

            const { currentPending } = await createMove({
                product: editProduct,
                quantity: parsedQuantity,
                typeIn,
                moveDate,
                recipientUser,
                outputStatus,
                returnMoveId: selectedReturnMove,
            });

            if (typeIn && currentPending > 0) {
                resetMovementForm();
                const handleRemovePending = async () => {
                    try {
                        await clearPending(savedProductId);
                        setTimeout(() => showModal(`El producto '${savedProductDescription}' se quito de unidades pendientes correctamente.`, 'success'), 0);
                    } catch (error) {
                        setTimeout(() => showModal(`La entrada se guardo, pero no se pudo quitar el pendiente. ${error.message}`, 'error'), 0);
                    }
                };
                showModal(
                    `La entrada del producto '${savedProductDescription}' se guardo correctamente. Deseas quitar este producto actual de unidades pendientes por producto?`,
                    'info', true, handleRemovePending
                );
                return;
            }

            if (selectedReturnMove && typeIn) {
                showModal(
                    `✓ Devolución registrada correctamente.\n\nEl producto '${editProduct.description}' cambió de estado a "DEVUELTO" y el stock se incrementó en ${parsedQuantity} ${editProduct.product_Unit || 'unidades'}.`,
                    'success', false
                );
                setTimeout(() => {
                    setModalConfig({ show: false, text: '', type: '', showButton: true, handleClick: null });
                    resetMovementForm();
                }, 2500);
                return;
            }

            showModal(`El movimiento del producto '${editProduct.description}' se ha guardado correctamente.`, 'success', false);
            setTimeout(() => {
                setModalConfig({ show: false, text: '', type: '', showButton: true, handleClick: null });
                resetMovementForm();
            }, 2000);

        } catch (error) {
            const message = error.message === 'negative-stock'
                ? 'Lo siento pero la cantidad final debe ser igual o mayor a cero.'
                : error.message === 'not-found'
                    ? 'El producto seleccionado ya no existe.'
                    : `Lo siento ha ocurrido un error. ${error.message}`;
            showModal(message, 'error');
        }
    };

    const handleExportSummary = (exportType) => {
        if (loadingMoves) { showModal('Todavia estamos cargando los movimientos. Intenta de nuevo en unos segundos.', 'info'); return; }
        if (!moves.length) { showModal('No hay movimientos para exportar en este momento.', 'info'); return; }

        const filteredMoves = moves.filter((move) => exportType === 'entries' ? move.type === 'in' : move.type === 'out');
        if (!filteredMoves.length) {
            showModal(exportType === 'entries' ? 'No hay ingresos para exportar.' : 'No hay salidas para exportar.', 'info');
            return;
        }

        exportInventorySummary(filteredMoves, exportType, users);
        showModal(exportType === 'entries' ? 'Se descargo el excel de ingresos.' : 'Se descargo el excel de salidas.', 'success');
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
        if (move.deliveryStatus !== 'pendiente por devolver') return;

        const isDeselecting = move.id === selectedReturnMove;
        setSelectedReturnMove(isDeselecting ? null : move.id);

        if (!isDeselecting) {
            const matchedProduct = products.find((p) => p.id === move.productId);
            setEditProduct(matchedProduct || { id: move.productId, sku: move.sku, description: move.description, stock: 0, product_Unit: move.unit });
            setTypeIn(true);
            setQuantity(0);
            setMoveDate(getTodayDate());
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
                            <BsDownload size={18} /> Exportar entradas
                        </button>
                        <button type="button" className="export-summary-btn" onClick={() => handleExportSummary('exits')}>
                            <BsDownload size={18} /> Exportar salidas
                        </button>
                    </div>
                )}
            </div>

            {!isSuperUser && (
                <div style={{ textAlign: 'center', padding: '40px', color: '#FF6B6B' }}>
                    <h2>⛔ Acceso restringido</h2>
                    <p>Solo el administrador puede crear y editar movimientos de inventario.</p>
                    <p>Puedes ver el historial de salidas a continuación:</p>
                </div>
            )}

            {isSuperUser && (
                <div className="container-move">
                    <MoveForm
                        editProduct={editProduct}
                        typeIn={typeIn}
                        setTypeIn={setTypeIn}
                        quantity={quantity}
                        setQuantity={setQuantity}
                        moveDate={moveDate}
                        setMoveDate={setMoveDate}
                        recipientUser={recipientUser}
                        setRecipientUser={setRecipientUser}
                        outputStatus={outputStatus}
                        setOutputStatus={setOutputStatus}
                        selectedReturnMove={selectedReturnMove}
                        onSubmit={handleSubmit}
                        onCancel={resetMovementForm}
                    />
                    <ProductSelector
                        loading={loading}
                        products={products}
                        setQuery={setQuery}
                        onSelectProduct={handleSelectProduct}
                    />
                </div>
            )}

            <OutputPreviewSection
                filteredOutputMoves={filteredOutputMoves}
                loadingMoves={loadingMoves}
                outputUserFilter={outputUserFilter}
                setOutputUserFilter={setOutputUserFilter}
                normalizedOutputUserFilter={normalizedOutputUserFilter}
                selectedReturnMove={selectedReturnMove}
                onSelectReturnMove={handleSelectReturnMove}
                aliasMap={aliasMap}
            />

            <Modal modalConfig={modalConfig} setModalConfig={setModalConfig} />
        </div>
    );
};

export default Moves;
