// src/hooks/useProducts.js

import { useEffect, useState } from "react";
import { db } from "../firebase/config";
import {
  collection,
  onSnapshot,
  deleteDoc,
  doc,
  query as fbQuery
} from "firebase/firestore";

export default function useProducts(search) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = fbQuery(collection(db, "products"));

    // 🔥 REALTIME (esto es PRO)
    const unsubscribe = onSnapshot(
  q,
  (snapshot) => {
    const data = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    }));

    if (search) {
      setProducts(
        data.filter((p) =>
          p.description?.toLowerCase().includes(search.toLowerCase()) ||
          p.sku?.toLowerCase().includes(search.toLowerCase())
        )
      );
    } else {
      setProducts(data);
    }

    setLoading(false);
  },
  (error) => {
    console.error("useProducts error:", error);
    setLoading(false);
  }
);

    return () => unsubscribe();
  }, [search]);

  // 🗑️ DELETE
  const removeProduct = async (id) => {
    await deleteDoc(doc(db, "products", id));
  };

  return { products, loading, removeProduct };
}