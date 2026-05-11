import { useEffect, useState } from "react";
import {
  collection,
  addDoc,
  onSnapshot,
  deleteDoc,
  doc,
  serverTimestamp,
  updateDoc,
  getDoc,
  runTransaction,
} from "firebase/firestore";
import { auth, db } from "../firebase/config";
import { logAuditEvent, AuditEventTypes, triggerWebhook } from "../utils/auditService";

export default function useProductRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  // Obtener todas las solicitudes (para super usuario)
  useEffect(() => {
    setLoading(true);
    const unsubscribe = onSnapshot(
      collection(db, "productRequests"),
      (snapshot) => {
        const requestsList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setRequests(requestsList);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching requests:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Crear una nueva solicitud
  const createRequest = async (productData, quantity) => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error("Usuario no autenticado");
      }

      // Obtener el producto desde Firestore para asegurar datos actualizados
      const productRef = doc(db, "products", productData.id);
      const productDoc = await getDoc(productRef);
      
      if (!productDoc.exists()) {
        throw new Error("Producto no encontrado en la base de datos");
      }

      const productFromDB = productDoc.data();
      const productLocation = productFromDB.location || "No especificada";
      const productImage =
        productFromDB.imageUrl || productData.imageUrl || productData.img_b64 || null;

      const requestData = {
        productId: productData.id,
        productName: productData.description,
        productSku: productData.sku,
        productLocation: productLocation,
        productImage,
        quantity: parseInt(quantity),
        requestedBy: currentUser.displayName || currentUser.email || "Usuario",
        userId: currentUser.uid,
        userEmail: currentUser.email,
        status: "pending", // pending, approved, rejected, completed
        createdAt: serverTimestamp(),
      };

      const docRef = await addDoc(
        collection(db, "productRequests"),
        requestData
      );

      // Registrar en auditoría
      await logAuditEvent(
        AuditEventTypes.REQUEST_CREATED,
        "productRequest",
        docRef.id,
        {
          productId: productData.id,
          productName: productData.description,
          productLocation: productLocation,
          quantity: quantity,
          requestedBy: currentUser.displayName || currentUser.email,
        }
      );

      // Ejecutar webhook
      await triggerWebhook(AuditEventTypes.REQUEST_CREATED, {
        productName: productData.description,
        quantity: quantity,
        requestedBy: currentUser.displayName || currentUser.email,
        requestId: docRef.id,
      });

      return { id: docRef.id, ...requestData };
    } catch (error) {
      console.error("Error creating request:", error);
      throw error;
    }
  };

  // Eliminar una solicitud
  const deleteRequest = async (requestId) => {
    try {
      await deleteDoc(doc(db, "productRequests", requestId));

      // Registrar en auditoría
      await logAuditEvent(
        AuditEventTypes.REQUEST_REJECTED,
        "productRequest",
        requestId,
        { action: "deleted_by_admin" }
      );
    } catch (error) {
      console.error("Error deleting request:", error);
      throw error;
    }
  };

  // Obtener solicitudes pendientes de un usuario específico
  const getUserRequests = (userId) => {
    return requests.filter((req) => req.userId === userId);
  };

  // Obtener solicitudes por estado
  const getRequestsByStatus = (status) => {
    return requests.filter((req) => req.status === status);
  };

  // Aprobar solicitud: descuenta stock y crea movimiento de salida
  // moveType: 'definitiva' | 'pendiente'
  const approveRequest = async (requestId, productId, quantity, moveType = 'definitiva', requestData = {}) => {
    const today = new Date().toISOString().slice(0, 10);
    const deliveryStatus = moveType === 'pendiente' ? 'pendiente por devolver' : 'entregado';

    const requestRef = doc(db, "productRequests", requestId);
    const productRef = doc(db, "products", productId);
    const moveRef = doc(collection(db, "moves"));

    let prevStock = 0;
    let newStock = 0;
    let productData = {};

    try {
      await runTransaction(db, async (transaction) => {
        const productSnap = await transaction.get(productRef);
        if (!productSnap.exists()) throw new Error("Producto no encontrado");

        productData = productSnap.data();
        prevStock = parseInt(productData.stock || 0);
        newStock = Math.max(0, prevStock - parseInt(quantity));

        // 1. Marcar solicitud como aprobada
        transaction.update(requestRef, {
          status: "approved",
          approvedAt: serverTimestamp(),
          approvedBy: auth.currentUser?.email || "admin",
          moveType,
        });

        // 2. Restar stock
        transaction.update(productRef, {
          stock: newStock,
          totalOut: Number(productData.totalOut || 0) + parseInt(quantity),
          lastExitDate: today,
          lastModified: serverTimestamp(),
        });

        // 3. Crear movimiento de salida
        transaction.set(moveRef, {
          productId,
          sku: productData.sku || requestData.productSku || "",
          description: productData.description || requestData.productName || "",
          unit: productData.product_Unit || "",
          quantity: parseInt(quantity),
          type: "out",
          movementDate: today,
          exitDate: today,
          entryDate: "",
          recipientUser: requestData.requestedBy || requestData.userEmail || "",
          deliveryStatus,
          createdAt: serverTimestamp(),
          sourceRequestId: requestId,
        });
      });

      // 4. Auditoría
      await logAuditEvent(
        AuditEventTypes.REQUEST_APPROVED,
        "productRequest",
        requestId,
        {
          productId,
          quantity,
          moveType,
          deliveryStatus,
          previousStock: prevStock,
          newStock,
          approvedBy: auth.currentUser?.email,
        }
      );

      // 5. Webhook
      await triggerWebhook(AuditEventTypes.REQUEST_APPROVED, {
        requestId,
        productId,
        quantity,
        moveType,
        stockReduction: parseInt(quantity),
        approvedBy: auth.currentUser?.email,
      });

      return true;
    } catch (error) {
      console.error("Error approving request:", error);
      throw error;
    }
  };

  return {
    requests,
    loading,
    createRequest,
    deleteRequest,
    approveRequest,
    getUserRequests,
    getRequestsByStatus,
  };
}
