import { addDoc, collection, getDoc, doc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebase/config";
import { logAuditEvent, AuditEventTypes, triggerWebhook } from "../utils/auditService";
import { error as logError } from "../utils/logger";
import { isValidQuantity } from "../utils/securityValidation";

export default function useProductRequestCreate() {
  const createRequest = async (productData, quantity) => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error("Usuario no autenticado");
      if (!isValidQuantity(quantity)) throw new Error("Cantidad inválida. Debe ser un número entero mayor a cero.");

      const productDoc = await getDoc(doc(db, "products", productData.id));
      if (!productDoc.exists()) throw new Error("Producto no encontrado en la base de datos");

      const productFromDB = productDoc.data();
      const requestData = {
        productId: productData.id,
        productName: productData.description,
        productSku: productData.sku,
        productLocation: productFromDB.location || "No especificada",
        productImage: productFromDB.imageUrl || productData.imageUrl || productData.img_b64 || null,
        warehouseId: productFromDB.warehouseId || productData.warehouseId || "",
        quantity: parseInt(quantity),
        requestedBy: currentUser.displayName || currentUser.email || "Usuario",
        userId: currentUser.uid,
        userEmail: currentUser.email,
        status: "pending",
        createdAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, "productRequests"), requestData);

      await logAuditEvent(AuditEventTypes.REQUEST_CREATED, "productRequest", docRef.id, {
        productId: productData.id,
        productName: productData.description,
        productLocation: requestData.productLocation,
        quantity,
        requestedBy: requestData.requestedBy,
      });

      await triggerWebhook(AuditEventTypes.REQUEST_CREATED, {
        productName: productData.description,
        quantity,
        requestedBy: requestData.requestedBy,
        requestId: docRef.id,
      });

      return { id: docRef.id, ...requestData };
    } catch (error) {
      logError("Error creating request:", error);
      throw error;
    }
  };

  return { createRequest };
}
