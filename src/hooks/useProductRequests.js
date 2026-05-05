import { useEffect, useState } from "react";
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  where,
  deleteDoc,
  doc,
  serverTimestamp,
  updateDoc,
  getDoc,
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

      const requestData = {
        productId: productData.id,
        productName: productData.description,
        productSku: productData.sku,
        productLocation: productLocation,
        productImage: productData.img_b64 || null,
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

  // Aprobar solicitud y restar del stock
  const approveRequest = async (requestId, productId, quantity) => {
    try {
      // 1. Actualizar estado de la solicitud
      await updateDoc(doc(db, "productRequests", requestId), {
        status: "approved",
        approvedAt: serverTimestamp(),
        approvedBy: auth.currentUser?.email || "admin",
      });

      // 2. Actualizar stock del producto (restar cantidad)
      const productRef = doc(db, "products", productId);
      const productDoc = await getDoc(productRef);

      if (productDoc.exists()) {
        const currentStock = parseInt(productDoc.data().stock || 0);
        const newStock = Math.max(0, currentStock - quantity);

        await updateDoc(productRef, {
          stock: newStock,
          lastModified: serverTimestamp(),
        });

        // 3. Registrar en auditoría
        await logAuditEvent(
          AuditEventTypes.REQUEST_APPROVED,
          "productRequest",
          requestId,
          {
            productId,
            quantity,
            previousStock: currentStock,
            newStock: newStock,
            approvedBy: auth.currentUser?.email,
          }
        );

        // 4. Ejecutar webhook
        await triggerWebhook(AuditEventTypes.REQUEST_APPROVED, {
          requestId,
          productId,
          quantity,
          stockReduction: quantity,
          approvedBy: auth.currentUser?.email,
        });
      } else {
        throw new Error("Producto no encontrado");
      }

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
