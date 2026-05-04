import { useEffect, useState } from "react";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
} from "chart.js";
import { Bar, Doughnut } from "react-chartjs-2";
import { BsImages } from "react-icons/bs";
import { FcDatabase, FcInspection } from "react-icons/fc";
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

import Modal from "../components/Modal";
import { auth, db } from "../firebase/config";
import useRole from "../hooks/useRole";
import "../css/dashboard.css";

ChartJS.register(
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
);

const EMPTY_PENDING_FORM = {
  sku: "",
  description: "",
  quantity: "",
  requestNote: "",
};
const PENDING_STATUS = "pendiente";

const buildPendingNotification = ({
  producto,
  cantidad,
  usuario,
  estado,
}) => {
  if (estado !== PENDING_STATUS) {
    return {
      sendNotification: false,
      title: "",
      message: "",
    };
  }

  return {
    sendNotification: true,
    title: "Nueva solicitud de material",
    message: `${usuario} solicito ${cantidad} unidades de ${producto}`,
  };
};

const buildDashboardData = (docs) => {
  const newProducts = [];
  const newLabels = [];
  const newStocks = [];
  const newPending = [];

  docs.forEach((snapshotDoc) => {
    const data = snapshotDoc.data();
    const product = {
      id: snapshotDoc.id,
      data,
    };

    newProducts.push(product);
    newLabels.push(data.description);
    newStocks.push(parseInt(data.stock || 0));
    newPending.push(parseInt(data.pending || 0));
  });

  return {
    newProducts,
    newLabels,
    newStocks,
    newPending,
  };
};

const Dashboard = () => {
  const { isSuperUser } = useRole();
  const [products, setProducts] = useState([]);
  const [labels, setLabels] = useState([]);
  const [stocks, setStocks] = useState([]);
  // const [costs, setCosts] = useState([]);
  const [pending, setPending] = useState([]);
  const [showPendingForm, setShowPendingForm] = useState(false);
  const [showPendingList, setShowPendingList] = useState(false);
  const [selectedPendingMaterial, setSelectedPendingMaterial] = useState(null);
  const [pendingForm, setPendingForm] = useState(EMPTY_PENDING_FORM);
  const [modalConfig, setModalConfig] = useState({
    show: false,
    text: "",
    type: "",
    showButton: true,
    handleClick: null,
  });
  const colors = [
    "rgba(255, 99, 132, 1)",
    "rgba(54, 162, 235, 1)",
    "rgba(255, 206, 86, 1)",
    "rgba(75, 192, 192, 1)",
    "rgba(153, 102, 255, 1)",
    "rgba(255, 159, 64, 1)",
  ];

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "products"), (snapshot) => {
      const { newProducts, newLabels, newStocks, newPending } =
        buildDashboardData(snapshot.docs);

      setProducts(newProducts);
      setLabels(newLabels);
      setStocks(newStocks);
      setPending(newPending);
    });

    return () => unsubscribe();
  }, []);

  const handlePendingChange = (e) => {
    const { name, value } = e.target;
    setPendingForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const resetPendingForm = () => {
    setPendingForm(EMPTY_PENDING_FORM);
    setShowPendingForm(false);
  };

  const handlePendingSubmit = async (e) => {
    e.preventDefault();

    const sku = pendingForm.sku.trim();
    const description = pendingForm.description.trim();
    const quantity = Number(pendingForm.quantity);
    const requestNote = pendingForm.requestNote.trim();
    const currentUser =
      auth.currentUser?.displayName ||
      auth.currentUser?.email ||
      "Usuario del sistema";

    if (!sku || !description || !quantity || quantity <= 0) {
      setModalConfig({
        show: true,
        text: "Completa codigo, nombre y cantidad para registrar unidades pendientes.",
        type: "error",
        showButton: true,
        handleClick: null,
      });
      return;
    }

    const product = products.find((item) => {
      const productSku = String(item.data.sku || "").trim().toLowerCase();
      const productDescription = String(item.data.description || "")
        .trim()
        .toLowerCase();

      return (
        productSku === sku.toLowerCase() &&
        productDescription === description.toLowerCase()
      );
    });

    if (!product) {
      setModalConfig({
        show: true,
        text: "No encontramos un producto que coincida con ese codigo y nombre.",
        type: "error",
        showButton: true,
        handleClick: null,
      });
      return;
    }

    try {
      await updateDoc(doc(db, "products", product.id), {
        pending: Number(product.data.pending || 0) + quantity,
        pendingDescription: requestNote,
      });

      const notification = buildPendingNotification({
        producto: product.data.description,
        cantidad: quantity,
        usuario: currentUser,
        estado: PENDING_STATUS,
      });

      if (notification.sendNotification) {
        await addDoc(collection(db, "notifications"), {
          ...notification,
          producto: product.data.description,
          cantidad: quantity,
          usuario: currentUser,
          estado: PENDING_STATUS,
          productId: product.id,
          sku: product.data.sku || "",
          createdAt: serverTimestamp(),
        });
      }

      setModalConfig({
        show: true,
        text: notification.sendNotification
          ? `${notification.title}: ${notification.message}`
          : `Se agregaron ${quantity} unidades pendientes a '${product.data.description}'.`,
        type: "success",
        showButton: true,
        handleClick: null,
      });
      resetPendingForm();
    } catch (error) {
      setModalConfig({
        show: true,
        text: `No se pudo guardar la solicitud pendiente. ${error.message}`,
        type: "error",
        showButton: true,
        handleClick: null,
      });
    }
  };

  const totalPending = products.reduce((acc, product) => {
    return acc + parseInt(product.data.pending || 0);
  }, 0);

  const normalizedSku = pendingForm.sku.trim().toLowerCase();
  const pendingPreviewProduct = normalizedSku
    ? products.find((product) => {
        const productSku = String(product.data.sku || "").trim().toLowerCase();

        return (
          productSku === normalizedSku || productSku.startsWith(normalizedSku)
        );
      })
    : null;

  const pendingMaterials = products.filter(
    (product) => Number(product.data.pending || 0) > 0,
  );

  const configStock = {
    labels,
    datasets: [
      {
        data: stocks,
        backgroundColor: colors,
        borderWidth: 1,
      },
    ],
  };

  // const configCost = {
  //   labels,
  //   datasets: [
  //     {
  //       data: costs,
  //       backgroundColor: colors,
  //       borderWidth: 1,
  //     },
  //   ],
  // };

  const configPending = {
    labels,
    datasets: [
      {
        data: pending,
        backgroundColor: colors,
        borderWidth: 1,
      },
    ],
  };

  const configOptions = {
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
    },
  };

  return (
    <div className="content">
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "1.8rem" }}>Dashboard de Almacen</h1>
        <p style={{ opacity: 0.6 }}>
          Control de stock, costes y movimientos en tiempo real
        </p>
      </div>
      <div className="container-cards">
        <div className="card">
          <FcDatabase size={50} />
          <div>
            <h1>{products.length}</h1>
            <h3>Total de productos</h3>
          </div>
        </div>
        {/* <div className="card">
          <FcCalculator size={50} />
          <div>
            <h1>
              ${" "}
              {products.reduce(
                (acc, p) =>
                  acc + Number(p.data.stock || 0) * Number(p.data.cost || 0),
                0,
              )}
            </h1>
            <h3>Total de costo</h3>
          </div>
        </div> */}
        <button
          type="button"
          className={`card pending-card-button ${showPendingForm ? "active" : ""}`}
          onClick={() => isSuperUser && setShowPendingForm((prev) => !prev)}
          disabled={!isSuperUser}
          style={{ opacity: isSuperUser ? 1 : 0.5, cursor: isSuperUser ? 'pointer' : 'not-allowed' }}
        >
          <FcInspection size={50} />
          <div>
            <h1>{totalPending}</h1>
            <h3>Unidades pendientes</h3>
            <p>{isSuperUser ? 'Haz clic para agregar piezas solicitadas' : '(Solo admin)'}</p>
          </div>
        </button>
      </div>

      {showPendingForm && isSuperUser ? (
        <div className="pending-form-panel">
          <div className="pending-form-copy">
            <h2>Registrar unidades pendientes</h2>
            <p>
              Agrega las piezas solicitadas usando el codigo y el nombre exactos
              del producto.
            </p>
          </div>

          <form className="pending-form-grid" onSubmit={handlePendingSubmit}>
            <input
              type="text"
              name="sku"
              placeholder="Codigo"
              value={pendingForm.sku}
              onChange={handlePendingChange}
            />
            <input
              type="text"
              name="description"
              placeholder="Nombre"
              value={pendingForm.description}
              onChange={handlePendingChange}
            />
            <input
              type="number"
              name="quantity"
              min="1"
              placeholder="Cantidad"
              value={pendingForm.quantity}
              onChange={handlePendingChange}
            />
            <input
              type="text"
              name="requestNote"
              placeholder="Descripcion opcional"
              value={pendingForm.requestNote}
              onChange={handlePendingChange}
            />
            <div className="pending-form-actions">
              <button
                type="button"
                className="pending-secondary-btn"
                onClick={resetPendingForm}
              >
                Cancelar
              </button>
              <button type="submit" className="pending-primary-btn">
                Agregar pendiente
              </button>
            </div>
          </form>

          {normalizedSku ? (
            <div className="pending-preview-card">
              <div className="pending-preview-image">
                {pendingPreviewProduct?.data?.img_b64 ? (
                  <img
                    src={pendingPreviewProduct.data.img_b64}
                    alt={pendingPreviewProduct.data.description || "Producto"}
                  />
                ) : (
                  <div className="pending-preview-empty">
                    <BsImages size={42} />
                  </div>
                )}
              </div>
              <div className="pending-preview-copy">
                {pendingPreviewProduct ? (
                  <>
                    <h3>Previsualizacion del producto</h3>
                    <p>
                      <b>Codigo:</b> {pendingPreviewProduct.data.sku}
                    </p>
                    <p>
                      <b>Nombre:</b> {pendingPreviewProduct.data.description}
                    </p>
                    <p>
                      <b>Stock:</b> {pendingPreviewProduct.data.stock}{" "}
                      {pendingPreviewProduct.data.product_Unit}
                    </p>
                    <p>
                      <b>Pendientes actuales:</b>{" "}
                      {pendingPreviewProduct.data.pending || 0}
                    </p>
                    <p>
                      <b>Descripcion actual:</b>{" "}
                      {pendingPreviewProduct.data.pendingDescription || "-"}
                    </p>
                  </>
                ) : (
                  <>
                    <h3>Sin coincidencias</h3>
                    <p>
                      No encontramos un producto con ese codigo todavia. Revisa
                      el valor antes de guardar.
                    </p>
                  </>
                )}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="container-cards">
        <div className="card-chart">
          <h2 style={{ marginBottom: "1rem" }}>Stock actual por producto</h2>
          <div className="container-chart">
            <div style={{ width: "70%", marginRight: "10px" }}>
              <Bar data={configStock} options={configOptions} />
            </div>
            <div style={{ width: "30%" }}>
              <Doughnut data={configStock} options={configOptions} />
            </div>
          </div>
        </div>

        {/* <div className="card-chart">
          <h2 style={{ marginBottom: "1rem" }}>Costo total por producto</h2>
          <div className="container-chart">
            <div style={{ width: "70%", marginRight: "10px" }}>
              <Bar data={configCost} options={configOptions} />
            </div>
            <div style={{ width: "30%" }}>
              <Doughnut data={configCost} options={configOptions} />
            </div>
          </div>
        </div> */}

        <div
          className={`card-chart pending-chart-card ${showPendingList ? "active" : ""}`}
          onClick={() => setShowPendingList((prev) => !prev)}
        >
          <h2 style={{ marginBottom: "1rem" }}>
            Unidades pendientes por producto
          </h2>
          <p className="pending-chart-hint">
            Haz clic para ver la lista de materiales solicitados
          </p>
          <div className="container-chart">
            <div style={{ width: "70%", marginRight: "10px" }}>
              <Bar data={configPending} options={configOptions} />
            </div>
            <div style={{ width: "30%" }}>
              <Doughnut data={configPending} options={configOptions} />
            </div>
          </div>
        </div>
      </div>
      {showPendingList ? (
        <div className="pending-list-panel">
          <div className="pending-list-header">
            <h2>Materiales solicitados</h2>
            <button
              type="button"
              className="pending-secondary-btn"
              onClick={() => setShowPendingList(false)}
            >
              Cerrar lista
            </button>
          </div>
          {pendingMaterials.length ? (
            <div className="pending-list-grid">
              {pendingMaterials.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  className={`pending-list-item ${selectedPendingMaterial?.id === product.id ? "active" : ""}`}
                  onClick={() => setSelectedPendingMaterial(product)}
                >
                  <div className="pending-list-media">
                    {product.data.img_b64 ? (
                      <img
                        src={product.data.img_b64}
                        alt={product.data.description || "Producto solicitado"}
                      />
                    ) : (
                      <div className="pending-list-empty-image">
                        <BsImages size={34} />
                      </div>
                    )}
                  </div>
                  <div className="pending-list-info">
                    <h3>{product.data.description}</h3>
                    <p>
                      <b>Codigo:</b> {product.data.sku}
                    </p>
                    <p>
                      <b>Solicitadas:</b> {product.data.pending}
                    </p>
                    <p>
                      <b>Stock actual:</b> {product.data.stock}{" "}
                      {product.data.product_Unit}
                    </p>
                    <p>
                      <b>Descripcion:</b>{" "}
                      {product.data.pendingDescription || "-"}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <p className="pending-list-empty">
              No hay materiales pendientes en este momento.
            </p>
          )}
        </div>
      ) : null}
      {selectedPendingMaterial ? (
        <div
          className="pending-detail-overlay"
          onClick={() => setSelectedPendingMaterial(null)}
        >
          <div
            className="pending-detail-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="pending-detail-close"
              onClick={() => setSelectedPendingMaterial(null)}
            >
              Cerrar
            </button>
            <div className="pending-detail-image">
              {selectedPendingMaterial.data.img_b64 ? (
                <img
                  src={selectedPendingMaterial.data.img_b64}
                  alt={
                    selectedPendingMaterial.data.description ||
                    "Material solicitado"
                  }
                />
              ) : (
                <div className="pending-detail-empty">
                  <BsImages size={52} />
                </div>
              )}
            </div>
            <div className="pending-detail-copy">
              <h3>Previsualizacion del material solicitado</h3>
              <p>
                <b>Codigo:</b> {selectedPendingMaterial.data.sku}
              </p>
              <p>
                <b>Nombre:</b> {selectedPendingMaterial.data.description}
              </p>
              <p>
                <b>Solicitadas:</b> {selectedPendingMaterial.data.pending}
              </p>
              <p>
                <b>Stock actual:</b> {selectedPendingMaterial.data.stock}{" "}
                {selectedPendingMaterial.data.product_Unit}
              </p>
              <p>
                <b>Marca:</b> {selectedPendingMaterial.data.brand || "-"}
              </p>
              <p>
                <b>Descripcion:</b>{" "}
                {selectedPendingMaterial.data.pendingDescription || "-"}
              </p>
            </div>
          </div>
        </div>
      ) : null}
      <Modal modalConfig={modalConfig} setModalConfig={setModalConfig} />
    </div>
  );
};

export default Dashboard;
