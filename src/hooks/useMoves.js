import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "../firebase/config";

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
      (error) => {
        console.error("useMoves error:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return { moves, loading };
}