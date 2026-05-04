// /router/AppRouter.jsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import useAuth from "../hooks/useAuth";
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
import Error from "../views/E404";

export default function AppRouter() {
  const { user, loading } = useAuth();

  if (loading) return <Loader />;

  return (
    <BrowserRouter>
      <Routes>

        {/* 🌐 Públicas */}
        <Route path="/" element={<Home />} />
        <Route path="/pricing" element={<Pricing />} />

        <Route 
          path="/login" 
          element={user ? <Navigate to="/dashboard" /> : <Login />} 
        />

        {/* 🔒 Privadas con layout */}
        <Route
          path="/dashboard"
          element={
            <PrivateRoute user={user} loading={loading}>
              <Layout><Dashboard /></Layout>
            </PrivateRoute>
          }
        />

        <Route
          path="/products"
          element={
            <PrivateRoute user={user} loading={loading}>
              <Layout><Products /></Layout>
            </PrivateRoute>
          }
        />

        <Route
          path="/moves"
          element={
            <PrivateRoute user={user} loading={loading}>
              <Layout><Moves /></Layout>
            </PrivateRoute>
          }
        />

        <Route
          path="/profile"
          element={
            <PrivateRoute user={user} loading={loading}>
              <Layout><Profile /></Layout>
            </PrivateRoute>
          }
        />

        {/* 🚫 404 */}
        <Route path="*" element={<Error />} />

      </Routes>
    </BrowserRouter>
  );
}