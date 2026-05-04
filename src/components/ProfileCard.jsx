import React, { useState } from 'react';
import { FcLock } from "react-icons/fc";
import { FaUser, FaSync } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";

import { auth } from "../firebase/config";
import useUser from "../hooks/useAuth";
import Modal from "./Modal";
import Password from './Password';
import "../css/profileCard.css";

const ProfileCard = () => {
  const { user } = useUser();
  const navigate = useNavigate();
  const [modalConfig, setModalConfig] = useState({
    show: false,
    text: '',
    type: '',
    showButton: true,
  });
  const [showPassword, setShowPassword] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setModalConfig({
        show: true,
        text: 'Cerrando sesion...',
        type: 'success',
        showButton: false,
      });

      setTimeout(() => {
        navigate("/");
        navigate(0);
      }, 1500);
    } catch (error) {
      console.log(error);
      setModalConfig({
        show: true,
        text: 'No se pudo cerrar la sesion.',
        type: 'error',
        showButton: true,
      });
    }
  };

  const isPasswordProvider = user?.providerData?.[0]?.providerId === 'password';

  return (
    <div>
      <div className="profileContainer">
        {user?.photoURL ? <img src={user.photoURL} alt="Usuario de My Inventory" className="imgProfile" /> : <FaUser size={60} className="imgProfile" />}
        <div className="data">
          <h4>{user?.displayName}</h4>
          <h5>{user?.email}</h5>
        </div>
        <div className="menu">
          <ul>
            <li onClick={() => navigate("/profile")}>
              <FaUser size={22} />
              <h4>Mi Perfil</h4>
            </li>
            {isPasswordProvider ? (
              <li onClick={() => setShowPassword(true)}>
                <FaSync size={20} />
                <h4>Cambiar contrasena</h4>
              </li>
            ) : null}
            <li onClick={handleSignOut}>
              <FcLock size={22} />
              <h4>Cerrar Sesion</h4>
            </li>
          </ul>
        </div>
      </div>
      <Modal modalConfig={modalConfig} setModalConfig={setModalConfig} />
      <Password showPassword={showPassword} setShowPassword={setShowPassword} />
    </div>
  );
};

export default ProfileCard;
