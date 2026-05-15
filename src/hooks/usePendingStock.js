import { addDoc, collection, doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "../firebase/config";

const PENDING_STATUS = "pendiente";

const buildNotification = (product, quantity, currentUser) => ({
  sendNotification: true,
  title: "Nueva solicitud de material",
  message: `${currentUser} solicito ${quantity} unidades de ${product.description}`,
  producto: product.description,
  cantidad: quantity,
  usuario: currentUser,
  estado: PENDING_STATUS,
  productId: product.id,
  sku: product.sku || "",
  warehouseId: product.warehouseId || "",
  accountId: product.accountId || "",
});

export default function usePendingStock() {
  const submitPending = async (product, quantity, requestNote, currentUser) => {
    await updateDoc(doc(db, "products", product.id), {
      pending: Number(product.pending || 0) + quantity,
      pendingDescription: requestNote,
    });

    const notification = buildNotification(product, quantity, currentUser);

    await addDoc(collection(db, "notifications"), {
      ...notification,
      createdAt: serverTimestamp(),
    });

    return { title: notification.title, message: notification.message };
  };

  return { submitPending };
}
