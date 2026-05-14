const formatMoveDate = (move) => {
  const explicitDate = move.exitDate || move.entryDate || move.movementDate;
  if (explicitDate) return explicitDate;
  if (move.createdAt?.toDate) return move.createdAt.toDate().toISOString().slice(0, 10);
  return '-';
};

const OutputPreviewSection = ({
  filteredOutputMoves,
  loadingMoves,
  outputUserFilter,
  setOutputUserFilter,
  normalizedOutputUserFilter,
  selectedReturnMove,
  onSelectReturnMove,
  aliasMap,
}) => (
  <div className="container-item output-preview-card">
    <div className="output-preview-header">
      <div>
        <h2>Previsualizacion de salidas</h2>
        <p>
          Consulta aqui las salidas registradas por usuario con fecha, material, destinatario y estado.
          <br />
          <b style={{ color: '#f4d03f' }}>✓ Click en items "Pendiente por devolver"</b> para registrar rápidamente su devolución.
          <br />
          <b style={{ color: '#6c63ff', fontSize: '0.95rem' }}>• Estados: Pendiente (Amarillo) | Entregado (Verde) | Devuelto (Azul)</b>
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

      {loadingMoves && <p>Cargando salidas...</p>}

      {!loadingMoves && filteredOutputMoves.length > 0 &&
        filteredOutputMoves.map((move) => {
          const isPending = move.deliveryStatus === 'pendiente por devolver';
          const isReturned = move.deliveryStatus === 'devuelto';
          const isSelected = selectedReturnMove === move.id;
          const alias = aliasMap[(move.recipientUser || '').toLowerCase()];

          return (
            <div
              key={move.id}
              className={`output-preview-item ${isPending ? 'is-selectable' : ''} ${isSelected ? 'is-selected' : ''}`}
              onClick={() => isPending && onSelectReturnMove(move)}
              style={{ cursor: isPending ? 'pointer' : 'default', opacity: isPending ? 1 : 0.7 }}
            >
              <div className="output-preview-main">
                <h3>{move.description || 'Material sin nombre'}</h3>
                <p><b>Codigo:</b> {move.sku || '-'}</p>
                <p><b>Fecha de salida:</b> {formatMoveDate(move)}</p>
                <p><b>Cantidad:</b> {move.quantity || 0} {move.unit || ''}</p>
                <p><b>Entregado a:</b> {move.recipientUser || '-'}</p>
                {alias && (
                  <p>
                    <b>Alias:</b>{' '}
                    <span style={{ color: 'var(--contrast)', fontWeight: 700 }}>{alias}</span>
                  </p>
                )}
              </div>
              <div className="output-preview-side">
                <span className={`output-status-badge ${isPending ? 'is-pending' : isReturned ? 'is-returned' : 'is-delivered'}`}>
                  {move.deliveryStatus || 'entregado'}
                </span>
              </div>
            </div>
          );
        })
      }

      {!loadingMoves && !filteredOutputMoves.length && (
        <p>
          {normalizedOutputUserFilter
            ? `No hay salidas registradas para '${outputUserFilter}'.`
            : 'No hay salidas registradas todavia.'}
        </p>
      )}
    </div>
  </div>
);

export default OutputPreviewSection;
