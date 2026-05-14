import { useEffect, useState } from "react";
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "../firebase/config";
import { logAuditEvent, AuditEventTypes, triggerWebhook } from "../utils/auditService";
import { error as logError } from "../utils/logger";
import { isValidQuantity } from "../utils/securityValidation";

export default function useProductRequestAdmin() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "productRequests"),
      (snapshot) => {
        setRequests(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
        setLoading(false);
      },
      (error) => {
        logError("Error fetching requests:", error);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const getRequestsByStatus = (status) => requests.filter((req) => req.status === status);

  const deleteRequest = async (requestId) => {
    try {
      await deleteDoc(doc(db, "productRequests", requestId));
      await logAuditEvent(AuditEventTypes.REQUEST_REJECTED, "productRequest", requestId, { action: "deleted_by_admin" });
    } catch (error) {
      logError("Error deleting request:", error);
      throw error;
    }
  };

  const approveRequest = async (requestId, productId, quantity, moveType = "definitiva", requestData = {}) => {
    if (!isValidQuantity(quantity)) throw new Error("Cantidad inválida. Debe ser un número entero mayor a cero.");

    const today = new Date().toISOString().slice(0, 10);
    const deliveryStatus = moveType === "pendiente" ? "pendiente por devolver" : "entregado";

    const requestRef = doc(db, "productRequests", requestId);
    const productRef = doc(db, "products", productId);
    const moveRef = doc(collection(db, "moves"));

    let prevStock = 0;
    let newStock = 0;
    let productSnapshotData = {};

    try {
      await runTransaction(db, async (transaction) => {
        const productSnap = await transaction.get(productRef);
        if (!productSnap.exists()) throw new Error("Producto no encontrado");

        productSnapshotData = productSnap.data();
        prevStock = parseInt(productSnapshotData.stock || 0);
        newStock = Math.max(0, prevStock - parseInt(quantity));

        transaction.update(requestRef, {
          status: "approved",
          approvedAt: serverTimestamp(),
          approvedBy: auth.currentUser?.email || "admin",
          moveType,
        });

        transaction.update(productRef, {
          stock: newStock,
          totalOut: Number(productSnapshotData.totalOut || 0) + parseInt(quantity),
          lastExitDate: today,
          lastModified: serverTimestamp(),
        });

        transaction.set(moveRef, {
          productId,
          sku: productSnapshotData.sku || requestData.productSku || "",
          description: productSnapshotData.description || requestData.productName || "",
          unit: productSnapshotData.product_Unit || "",
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

      await logAuditEvent(AuditEventTypes.REQUEST_APPROVED, "productRequest", requestId, {
        productId, quantity, moveType, deliveryStatus,
        previousStock: prevStock, newStock,
        approvedBy: auth.currentUser?.email,
      });

      await triggerWebhook(AuditEventTypes.REQUEST_APPROVED, {
        requestId, productId, quantity, moveType,
        stockReduction: parseInt(quantity),
        approvedBy: auth.currentUser?.email,
      });

      return true;
    } catch (error) {
      logError("Error approving request:", error);
      throw error;
    }
  };

  return { requests, loading, getRequestsByStatus, deleteRequest, approveRequest };
}
