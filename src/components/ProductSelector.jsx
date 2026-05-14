import { BsSearch, BsImages } from "react-icons/bs";

const ProductSelector = ({ loading, products, setQuery, onSelectProduct }) => (
  <div className="container-item">
    <h2>Productos actuales</h2>

    <div className="searchContainer">
      <BsSearch size={22} />
      <input
        type="text"
        placeholder="Buscar producto..."
        onChange={(e) => setQuery(e.target.value.length >= 3 ? e.target.value : "")}
      />
    </div>

    <div style={{ overflowY: 'scroll', maxHeight: '31rem' }}>
      {loading && <p>Cargando productos...</p>}
      {!loading && products.length > 0
        ? products.map((p) => (
            <div
              key={p.id}
              className="product-item"
              onClick={() => onSelectProduct(p)}
              style={p.stock <= 0 ? { backgroundColor: '#EC7063' } : null}
            >
              <div>
                {p.imageUrl
                  ? <img src={p.imageUrl} alt="Producto" />
                  : <div className="emptyImg"><BsImages size={60} /></div>
                }
              </div>
              <div style={{ marginLeft: '10px' }}>
                <h3>{p.description}</h3>
                <p><b>Código: </b>{p.sku}</p>
                <p><b>Stock actual: </b>{p.stock} {p.product_Unit}</p>
                <p><b>Pendiente: </b>{p.pending}</p>
              </div>
            </div>
          ))
        : !loading && <h2>Lo siento, pero no se ha encontrado ningun producto.</h2>
      }
    </div>
  </div>
);

export default ProductSelector;
