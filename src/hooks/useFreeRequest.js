import { addDoc, collection, serverTimestamp, doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase/config";

/**
 * Hook para solicitudes "libres" (texto + cantidad + nota) que no apuntan
 * a un producto del catálogo.
 *
 * Las reglas Firestore (Fase 4) exigen accountId al crear productRequests,
 * así que lo leemos del doc del usuario antes de escribir.
 */
export default function useFreeRequest() {
  async function createFreeRequest({ description, quantity, note }) {
    const user = auth.currentUser;
    if (!user) throw new Error("No authenticated user");

    // Leer accountId del user actual (las rules lo requieren en create)
    const userSnap = await getDoc(doc(db, "users", user.uid));
    const accountId = userSnap.exists() ? (userSnap.data()?.accountId || "") : "";
    if (!accountId) {
      throw new Error("Tu usuario no está asociado a ninguna cuenta. Pide al administrador que te invite.");
    }

    await addDoc(collection(db, "productRequests"), {
      type: "free",
      description: description.trim(),
      quantity: Math.max(1, quantity),
      note: note?.trim() || "",
      userId: user.uid,
      requestedBy: user.displayName || user.email,
      requestedByEmail: user.email,
      accountId,
      status: "pending",
      createdAt: serverTimestamp(),
    });
  }

  return { createFreeRequest };
}
