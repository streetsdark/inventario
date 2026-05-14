import { useEffect, useState } from "react";
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase/config";
import { error as logError } from "../utils/logger";

export default function useMoves() {
  const [moves, setMoves] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const movesQuery = query(
      collection(db, "moves"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      movesQuery,
      (snapshot) => {
        setMoves(
          snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }))
        );
        setLoading(false);
      },
      (err) => {
        logError("useMoves error:", err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const createMove = async ({ product, quantity, typeIn, moveDate, recipientUser, outputStatus, returnMoveId }) => {
    const productRef = doc(db, "products", product.id);
    const moveRef = doc(collection(db, "moves"));
    const returnMoveRef = returnMoveId ? doc(db, "moves", returnMoveId) : null;
    let currentPending = 0;

    await runTransaction(db, async (transaction) => {
      const productSnapshot = await transaction.get(productRef);
      if (!productSnapshot.exists()) throw new Error("not-found");

      const currentProduct = productSnapshot.data();
      currentPending = Number(currentProduct.pending || 0);
      const liveStock = Number(currentProduct.stock || 0);
      const nextStock = typeIn ? liveStock + quantity : liveStock - quantity;

      if (nextStock < 0) throw new Error("negative-stock");

      transaction.update(productRef, {
        stock: nextStock,
        totalIn: Number(currentProduct.totalIn || 0) + (typeIn ? quantity : 0),
        totalOut: Number(currentProduct.totalOut || 0) + (!typeIn ? quantity : 0),
        lastEntryDate: typeIn ? moveDate : currentProduct.lastEntryDate || "",
        lastExitDate: !typeIn ? moveDate : currentProduct.lastExitDate || "",
      });

      transaction.set(moveRef, {
        productId: productSnapshot.id,
        sku: currentProduct.sku || product.sku || "",
        description: currentProduct.description || product.description || "",
        unit: currentProduct.product_Unit || product.product_Unit || "",
        quantity,
        type: typeIn ? "in" : "out",
        movementDate: moveDate,
        entryDate: typeIn ? moveDate : "",
        exitDate: !typeIn ? moveDate : "",
        recipientUser: typeIn ? "" : recipientUser.trim(),
        deliveryStatus: typeIn ? "" : outputStatus,
        createdAt: serverTimestamp(),
      });

      if (returnMoveRef) {
        transaction.update(returnMoveRef, {
          deliveryStatus: "devuelto",
          returnDate: moveDate,
          returnQuantity: quantity,
        });
      }
    });

    return { currentPending };
  };

  return { moves, loading, createMove };
}
