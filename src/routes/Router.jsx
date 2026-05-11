// /router/AppRouter.jsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import useAuth from "../hooks/useAuth";
import useRole from "../hooks/useRole";
import PrivateRoute from "../components/PrivateRoute";
import Layout from "../components/Layout";
import Loader from "../components/Loader";

import Home from "../views/Home";
import Login from "../views/Login";
import Pricing from "../views/Pricing";
import Dashboard from "../views/Dashboard";
import Products from "../views/Products";
import Moves from "../views/Moves";
import Profile from "../views/Profile";
import SecurityTests from "../views/SecurityTests";
import Error from "../views/E404";
import Solicitar from "../views/Solicitar";

function getHomeRoute(role) {
  if (role === "superuser" || role === "admin") return "/dashboard";
  return "/solicitar";
}

function AuthRoute({ user, loading, roleLoading, role, allowedRoles, basicOnly, children }) {
  if (loading || roleLoading) return <Loader />;
  if (!user) return <Navigate to="/login" />;
  // Ruta exclusiva de usuarios básicos: si es admin/superuser, manda al dashboard
  if (basicOnly && (role === "superuser" || role === "admin")) {
    return <Navigate to="/dashboard" replace />;
  }
  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to={getHomeRoute(role)} />;
  }
  return children;
}

export default function AppRouter() {
  const { user, loading } = useAuth();
  const { role, isSuperUser, isAdmin, canAccessDashboard, loading: roleLoading } = useRole();

  const authReady = !loading && !roleLoading;

  return (
    <BrowserRouter>
      <Routes>

        {/* Public */}
        <Route path="/" element={<Home />} />
        <Route path="/pricing" element={<Pricing />} />

        {/* Login: always visible immediately; redirect only when auth is ready */}
        <Route
          path="/login"
          element={
            authReady && user && role !== null
              ? <Navigate to={getHomeRoute(role)} />
              : <Login />
          }
        />

        {/* /solicitar — solo mecanico y basic; admin/superuser van al dashboard */}
        <Route
          path="/solicitar"
          element={
            <AuthRoute user={user} loading={loading} roleLoading={roleLoading} role={role} basicOnly>
              <Solicitar />
            </AuthRoute>
          }
        />

        {/* Admin/superuser routes wrapped in Layout */}
        <Route
          path="/dashboard"
          element={
            <AuthRoute user={user} loading={loading} roleLoading={roleLoading} role={role} allowedRoles={["superuser", "admin"]}>
              <Layout><Dashboard /></Layout>
            </AuthRoute>
          }
        />

        <Route
          path="/products"
          element={
            <AuthRoute user={user} loading={loading} roleLoading={roleLoading} role={role} allowedRoles={["superuser", "admin"]}>
              <Layout><Products /></Layout>
            </AuthRoute>
          }
        />

        <Route
          path="/moves"
          element={
            <AuthRoute user={user} loading={loading} roleLoading={roleLoading} role={role} allowedRoles={["superuser", "admin"]}>
              <Layout><Moves /></Layout>
            </AuthRoute>
          }
        />

        {/* /profile — any authenticated user */}
        <Route
          path="/profile"
          element={
            <AuthRoute user={user} loading={loading} roleLoading={roleLoading} role={role}>
              <Layout><Profile /></Layout>
            </AuthRoute>
          }
        />

        {/* /security-tests — superuser only */}
        <Route
          path="/security-tests"
          element={
            <AuthRoute user={user} loading={loading} roleLoading={roleLoading} role={role} allowedRoles={["superuser"]}>
              <Layout><SecurityTests /></Layout>
            </AuthRoute>
          }
        />

        {/* 404 */}
        <Route path="*" element={<Error />} />

      </Routes>
    </BrowserRouter>
  );
}
