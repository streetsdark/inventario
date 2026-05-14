import { BsCheck, BsX } from "react-icons/bs";

const MoveForm = ({
  editProduct,
  typeIn,
  setTypeIn,
  quantity,
  setQuantity,
  moveDate,
  setMoveDate,
  recipientUser,
  setRecipientUser,
  outputStatus,
  setOutputStatus,
  selectedReturnMove,
  onSubmit,
  onCancel,
}) => {
  const minimo = Number(editProduct.stockMinimo || 0);
  const stockFinal = !typeIn && editProduct.stock
    ? parseInt(editProduct.stock) - parseInt(quantity || 0)
    : null;
  const showStockWarning = !typeIn && minimo > 0 && stockFinal !== null && stockFinal <= minimo;

  return (
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
          gap: '8px',
        }}>
          ✓ Registrando devolución - Ingresa la cantidad devuelta
        </div>
      )}

      <form className="form-move" onSubmit={onSubmit}>
        <div className="form-group">
          <label htmlFor="move-sku">Código</label>
          <input id="move-sku" type="text" value={editProduct.sku || ''} disabled />
        </div>

        <div className="form-group">
          <label htmlFor="move-description">Descripción</label>
          <input id="move-description" type="text" value={editProduct.description || ''} disabled />
        </div>

        <div className="form-group">
          <label htmlFor="move-stock">Stock actual</label>
          <input
            id="move-stock"
            type="text"
            value={editProduct.stock ? `${editProduct.stock} ${editProduct.product_Unit}` : ''}
            disabled
          />
        </div>

        <div className="form-group">
          <label>Tipo de movimiento</label>
          <div className="container-type">
            <button type="button" onClick={() => setTypeIn(true)} style={!typeIn ? { background: 'gray' } : null}>Entrada</button>
            <button type="button" onClick={() => setTypeIn(false)} style={typeIn ? { background: 'gray' } : null}>Salida</button>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="move-quantity">Cantidad</label>
          <input
            id="move-quantity"
            type="number"
            min="0"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
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

        {!typeIn && (
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
              <select id="output-status" value={outputStatus} onChange={(e) => setOutputStatus(e.target.value)}>
                <option value="pendiente por devolver">Pendiente por devolver</option>
                <option value="entregado">Entregado</option>
              </select>
            </div>
          </>
        )}

        <div className="form-group">
          <label htmlFor="move-final-quantity">Cantidad final</label>
          <input
            id="move-final-quantity"
            type="text"
            value={
              editProduct.stock
                ? (typeIn
                    ? parseInt(editProduct.stock) + parseInt(quantity || 0)
                    : parseInt(editProduct.stock) - parseInt(quantity || 0)
                  ) + ' ' + (editProduct.product_Unit || '')
                : ''
            }
            disabled
          />
        </div>

        {showStockWarning && (
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
            ⚠ Esta salida dejará el stock{stockFinal <= 0 ? ' en cero' : ` en ${stockFinal}`},{' '}
            {stockFinal <= 0 ? 'por debajo' : 'igual o por debajo'} del mínimo configurado ({minimo}).
          </div>
        )}

        <div className="container-button">
          <button type="button" onClick={onCancel} style={{ backgroundColor: 'red' }}>
            <BsX size={22} style={{ marginRight: 5 }} color="#FFFFFF" />
            <b>Cancelar</b>
          </button>
          <button type="submit">
            <BsCheck size={22} style={{ marginRight: 5 }} />
            <b>Guardar</b>
          </button>
        </div>
      </form>
    </div>
  );
};

export default MoveForm;
