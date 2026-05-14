import { useAuthContext } from "../context/AuthContext";

export default function useRole() {
  const { role, loading } = useAuthContext();
  return {
    role,
    isSuperUser: role === "superuser",
    isAdmin: role === "admin" || role === "superuser",
    canAccessDashboard: role === "superuser" || role === "admin",
    loading,
  };
}
