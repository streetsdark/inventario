import { useAuthContext } from "../context/AuthContext";

export default function useAuth() {
  const { user, loading } = useAuthContext();
  return { user, loading };
}
