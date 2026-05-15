// src/hooks/useProducts.js

import { useEffect, useState, useMemo } from "react";
import { db } from "../firebase/config";
import {
  collection,
  onSnapshot,
  deleteDoc,
  doc,
  updateDoc,
  query as fbQuery
} from "firebase/firestore";
import { useWarehouseContext } from "../context/WarehouseContext";
import { useAccountContext } from "../context/AccountContext";
import { filterByWarehouse } from "../utils/warehouseFilter";
import { filterByAccount } from "../utils/accountFilter";

export default function useProducts(search) {
  const { selectedId, defaultWarehouseId } = useWarehouseContext();
  const { accountId: currentAccountId } = useAccountContext();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = fbQuery(collection(db, "products"));

    // 🔥 REALTIME (esto es PRO)
    const unsubscribe = onSnapshot(
  q,
  (snapshot) => {
    const data = snapshot.docs.map((doc) => {
      const product = doc.data();

      return {
        id: doc.id,
        ...product,
        imageUrl: product.imageUrl || product.img_b64 || "",
      };
    });

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

  const removeProduct = async (id) => {
    await deleteDoc(doc(db, "products", id));
  };

  const clearPending = async (id) => {
    await updateDoc(doc(db, "products", id), { pending: 0 });
  };

  // Aislamiento por cuenta primero, luego por almacén dentro de esa cuenta.
  const visibleProducts = useMemo(() => {
    const byAccount = filterByAccount(products, currentAccountId, currentAccountId);
    return filterByWarehouse(byAccount, selectedId, defaultWarehouseId);
  }, [products, currentAccountId, selectedId, defaultWarehouseId]);

  return { products: visibleProducts, loading, removeProduct, clearPending };
}
