// /components/PrivateRoute.jsx
import { Navigate } from "react-router-dom";

export default function PrivateRoute({ user, loading, children }) {
  if (loading) return <div>Cargando sesión...</div>;

  return user ? children : <Navigate to="/login" />;
}