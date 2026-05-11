import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebase/config";

export default function useFreeRequest() {
  async function createFreeRequest({ description, quantity, note }) {
    const user = auth.currentUser;
    if (!user) throw new Error("No authenticated user");

    await addDoc(collection(db, "productRequests"), {
      type: "free",
      description: description.trim(),
      quantity: Math.max(1, quantity),
      note: note?.trim() || "",
      userId: user.uid,
      requestedBy: user.displayName || user.email,
      requestedByEmail: user.email,
      status: "pending",
      createdAt: serverTimestamp(),
    });
  }

  return { createFreeRequest };
}
