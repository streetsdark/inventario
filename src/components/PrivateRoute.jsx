// /components/PrivateRoute.jsx
import { Navigate } from "react-router-dom";
import Loader from "./Loader";

export default function PrivateRoute({ user, loading, children }) {
  if (loading) return <Loader />;
  return user ? children : <Navigate to="/login" />;
}