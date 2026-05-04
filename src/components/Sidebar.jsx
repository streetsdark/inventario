import React, { useState, useRef, useEffect } from "react";
import { FcStatistics, FcPaid, FcMultipleInputs } from "react-icons/fc";
import { Link } from "react-router-dom";
import Switch from "react-switch";
import { FaSun, FaMoon } from "react-icons/fa";
import { GiHamburgerMenu } from "react-icons/gi";
import { MdClose } from "react-icons/md";

import useRole from "../hooks/useRole";
import "../css/sidebar.css";
import logo from "../assets/img/logo.png";

const Sidebar = ({ page, mode, setMode }) => {
  const { isSuperUser } = useRole();
  const [isOpen, setIsOpen] = useState(false);
  const sidebarRef = useRef(null);

  // Cerrar el menú cuando se hace clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  // Cerrar el menú cuando se hace clic en un enlace
  const handleLinkClick = () => {
    setIsOpen(false);
  };

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div 
          className="overlay" 
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Botón Hamburguesa - Siempre visible */}
      <button
        className="hamburger-btn"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle menu"
        title={isOpen ? "Cerrar menú" : "Abrir menú"}
      >
        {isOpen ? <MdClose size={28} /> : <GiHamburgerMenu size={28} />}
      </button>

      {/* Sidebar */}
      <div
        ref={sidebarRef}
        className={`sidebar ${isOpen ? "open" : "closed"}`}
      >
        <div className="logoContainer">
          <img src={logo} alt="My Inventory" className="logo" />
        </div>

        <div className="switch">
          <FaSun size={25} style={{ color: "#F39C12" }} />
          <Switch
            width={50}
            height={20}
            onChange={() => setMode(!mode)}
            checked={mode}
            uncheckedIcon={false}
            checkedIcon={false}
            offColor="#333"
            onColor="#fff"
            onHandleColor="#333"
          />
          <FaMoon size={25} style={{ color: "#444" }} />
        </div>

        {isSuperUser && (
          <Link
            to="/dashboard"
            className={page === "dashboard" ? "itemContainerA" : "itemContainer"}
            title="Inicio"
            onClick={handleLinkClick}
          >
            <FcStatistics size={28} />
            <p>Dashboard</p>
          </Link>
        )}

        <Link
          to="/products"
          className={page === "products" ? "itemContainerA" : "itemContainer"}
          title="Productos"
          onClick={handleLinkClick}
        >
          <FcPaid size={28} />
          <p>Productos</p>
        </Link>

        {isSuperUser && (
          <Link
            to="/moves"
            className={page === "moves" ? "itemContainerA" : "itemContainer"}
            title="Movimientos"
            onClick={handleLinkClick}
          >
            <FcMultipleInputs size={28} />
            <p>Movimientos</p>
          </Link>
        )}
      </div>
    </>
  );
};

export default Sidebar;
