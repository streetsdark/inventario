import React, { useEffect, useState } from 'react';
import { BsImages, BsX } from "react-icons/bs";
import { useNavigate } from "react-router-dom";
import {
  sendEmailVerification,
  signOut,
  updateProfile,
} from "firebase/auth";

import { auth } from "../firebase/config";
import Modal from "../components/Modal";
import '../css/profile.css';

const Profile = () => {
  const navigate = useNavigate();
  const [modalConfig, setModalConfig] = useState({
    show: false,
    text: '',
    type: '',
    showButton: true,
  });
  const [user, setUser] = useState({});

  useEffect(() => {
    const currentUser = auth.currentUser;

    if (!currentUser) return;

    setUser({
      displayName: currentUser.displayName || '',
      photoURL: currentUser.photoURL || '',
      email: currentUser.email || '',
      emailVerified: currentUser.emailVerified,
      phoneNumber: currentUser.phoneNumber || '',
      metadata: currentUser.metadata,
    });
  }, []);

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

  const validateEmail = async () => {
    const currentUser = auth.currentUser;

    if (!currentUser) return;

    try {
      await sendEmailVerification(currentUser);
      setModalConfig({
        show: true,
        text: 'Hemos enviado un correo electronico a tu email para validarlo.',
        type: 'success',
        showButton: true,
      });
    } catch (error) {
      console.log(error);
      setModalConfig({
        show: true,
        text: 'No se pudo enviar el correo de verificacion.',
        type: 'error',
        showButton: true,
      });
    }
  };

  const updatePerfil = async () => {
    const currentUser = auth.currentUser;

    if (!currentUser) return;

    try {
      await updateProfile(currentUser, {
        displayName: user.displayName || '',
        photoURL: user.photoURL || '',
      });

      setUser((prev) => ({
        ...prev,
        displayName: currentUser.displayName || prev.displayName,
        photoURL: currentUser.photoURL || prev.photoURL,
      }));

      setModalConfig({
        show: true,
        text: 'El perfil ha sido actualizado correctamente.',
        type: 'success',
        showButton: true,
      });
    } catch (error) {
      console.log(error);
      setModalConfig({
        show: true,
        text: 'No se pudo actualizar el perfil.',
        type: 'error',
        showButton: true,
      });
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    setUser({ ...user, [e.target.name]: e.target.value });
  };

  const handleImage = (e) => {
    e.preventDefault();

    const file = e.target.files[0];
    if (!file) return;

    setUser({ ...user, photoURL: window.URL.createObjectURL(file) });
  };

  return (
    <div className="content">
      <div className="user-data">
        <div className="img-container">
          {user?.photoURL ? <img src={user.photoURL} alt="product" /> : <BsImages size={60} />}
          <input type="file" accept="image/*" onChange={handleImage} />
        </div>

        <div className="form-group">
          <label htmlFor="">Nombre: </label>
          <input type="text" name="displayName" value={user?.displayName || ''} onChange={handleChange} />
          <span onClick={updatePerfil}>Actualizar nombre e imagen</span>
        </div>

        <div className="form-group">
          <label htmlFor="">Correo Electronico: </label>
          <input type="text" name="email" value={user?.email || ''} onChange={handleChange} disabled />

          {user?.emailVerified ? null : <span onClick={validateEmail}>Validar correo electronico</span>}
        </div>

        <div className="form-group">
          <label htmlFor="">Correo verificado: </label>
          <select style={{ flex: 1 }} name="emailVerified" value={user?.emailVerified ? 'Si' : 'No'} disabled>
            <option value="-">-</option>
            <option value="Si">Si</option>
            <option value="No">No</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="">Telefono: </label>
          <input type="text" name="phoneNumber" value={user?.phoneNumber || '-'} disabled />
        </div>

        <div className="form-group">
          <label htmlFor="">Fecha de registro: </label>
          <input type="text" name="creationTime" value={user?.metadata?.creationTime || ''} disabled />
        </div>

        <div className="form-group">
          <label htmlFor="">Ultimo inicio de sesion: </label>
          <input type="text" name="lastSignInTime" value={user?.metadata?.lastSignInTime || ''} disabled />
        </div>

        <div className="container-button">
          <button onClick={handleSignOut} style={{ backgroundColor: 'red' }}>
            <BsX size={22} style={{ marginRight: 5 }} color="#FFFFFF" />
            Cerrar sesion
          </button>
        </div>
      </div>
      <Modal modalConfig={modalConfig} setModalConfig={setModalConfig} />
    </div>
  );
};

export default Profile;
