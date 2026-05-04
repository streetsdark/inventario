import React, { useState } from 'react';
import { FcGoogle } from "react-icons/fc";
import { MdEmail } from "react-icons/md";
import { useNavigate } from "react-router-dom";

import { auth } from "../firebase/config";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  sendPasswordResetEmail,
} from "firebase/auth";

import '../css/login.css';
import Modal from './Modal';

const DEFAULT_MODAL_CONFIG = {
  show: false,
  text: '',
  type: '',
  showButton: true,
  handleClick: null,
};

const FormLogin = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalConfig, setModalConfig] = useState(DEFAULT_MODAL_CONFIG);

  const showModal = (text, type = 'info', showButton = true) => {
    setModalConfig({
      show: true,
      text,
      type,
      showButton,
      handleClick: null,
    });
  };

  const getAuthErrorMessage = (error) => {
    switch (error?.code) {
      case 'auth/invalid-email':
        return 'El correo electronico no es valido.';
      case 'auth/user-disabled':
        return 'Este usuario esta deshabilitado.';
      case 'auth/user-not-found':
      case 'auth/invalid-credential':
        return 'Correo o contrasena incorrectos.';
      case 'auth/wrong-password':
        return 'La contrasena es incorrecta.';
      case 'auth/email-already-in-use':
        return 'Ya existe una cuenta registrada con este correo.';
      case 'auth/weak-password':
        return 'La contrasena debe tener al menos 6 caracteres.';
      case 'auth/popup-closed-by-user':
        return 'Se cerro la ventana de Google antes de completar el acceso.';
      case 'auth/cancelled-popup-request':
        return 'Ya hay una ventana de acceso abierta. Intentalo de nuevo.';
      case 'auth/too-many-requests':
        return 'Hay demasiados intentos. Espera un momento y vuelve a probar.';
      case 'auth/network-request-failed':
        return 'No se pudo conectar con Firebase. Revisa tu conexion.';
      default:
        return 'No se pudo completar la operacion. Revisa la configuracion de autenticacion.';
    }
  };

  const validateCredentials = () => {
    const trimmedEmail = email.trim();

    if (!trimmedEmail || !password) {
      showModal('Completa el correo y la contrasena antes de continuar.', 'error');
      return null;
    }

    if (!trimmedEmail.includes('@')) {
      showModal('Introduce un correo electronico valido.', 'error');
      return null;
    }

    if (!isLogin && password.length < 6) {
      showModal('La contrasena debe tener al menos 6 caracteres para crear la cuenta.', 'error');
      return null;
    }

    return { email: trimmedEmail, password };
  };

  const loginEmail = async () => {
    const credentials = validateCredentials();
    if (!credentials) return;

    setIsSubmitting(true);

    try {
      await signInWithEmailAndPassword(auth, credentials.email, credentials.password);
      navigate('/dashboard');
    } catch (error) {
      console.log(error);
      showModal(getAuthErrorMessage(error), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const registerEmail = async () => {
    const credentials = validateCredentials();
    if (!credentials) return;

    setIsSubmitting(true);

    try {
      await createUserWithEmailAndPassword(auth, credentials.email, credentials.password);
      navigate('/dashboard');
    } catch (error) {
      console.log(error);
      showModal(getAuthErrorMessage(error), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const loginGoogle = async () => {
    const provider = new GoogleAuthProvider();

    setIsSubmitting(true);

    try {
      await signInWithPopup(auth, provider);
      navigate('/dashboard');
    } catch (error) {
      console.log(error);
      showModal(getAuthErrorMessage(error), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isSubmitting) return;

    if (isLogin) {
      await loginEmail();
      return;
    }

    await registerEmail();
  };

  const forgotPass = async (e) => {
    e.preventDefault();

    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      showModal('Escribe tu correo y vuelve a pulsar para recuperar la contrasena.', 'info');
      return;
    }

    try {
      await sendPasswordResetEmail(auth, trimmedEmail);
      showModal('Te enviamos un correo para restablecer la contrasena.', 'success');
    } catch (error) {
      console.log(error);
      showModal(getAuthErrorMessage(error), 'error');
    }
  };

  const toggleMode = () => {
    setIsLogin((prev) => !prev);
    setPassword('');
    setModalConfig(DEFAULT_MODAL_CONFIG);
  };

  return (
    <div className="container">
      <section className="loginSection">
        <form className="cardLogin" onSubmit={handleSubmit}>
          <h1>{isLogin ? "Iniciar sesion" : "Registrarse"}</h1>
          <input
            type="email"
            placeholder="Correo electronico"
            autoComplete="username"
            required
            value={email}
            onChange={(ev) => setEmail(ev.target.value)}
          />
          <input
            type="password"
            placeholder="Contrasena"
            autoComplete={isLogin ? "current-password" : "new-password"}
            required
            value={password}
            onChange={(ev) => setPassword(ev.target.value)}
          />

          {isLogin ? (
            <button type="submit" disabled={isSubmitting}>
              <MdEmail size={24} />
              {isSubmitting ? 'Procesando...' : 'Iniciar sesion'}
            </button>
          ) : (
            <button type="submit" disabled={isSubmitting}>
              <MdEmail size={24} />
              {isSubmitting ? 'Procesando...' : 'Crear una cuenta'}
            </button>
          )}

          <h4>O</h4>

          {isLogin ? (
            <button type="button" onClick={loginGoogle} disabled={isSubmitting}>
              <FcGoogle size={24} />
              {isSubmitting ? 'Procesando...' : 'Iniciar sesion con Google'}
            </button>
          ) : (
            <button type="button" onClick={loginGoogle} disabled={isSubmitting}>
              <FcGoogle size={24} />
              {isSubmitting ? 'Procesando...' : 'Registrarse con Google'}
            </button>
          )}

          {isLogin ? (
            <h3 onClick={forgotPass}>
              <span>Olvidaste tu contrasena?</span>
            </h3>
          ) : null}

          {isLogin ? (
            <h3>
              No tienes cuenta?<span onClick={toggleMode}> Crea una</span>
            </h3>
          ) : (
            <h3>
              Ya tienes una cuenta?<span onClick={toggleMode}> Iniciar sesion</span>
            </h3>
          )}
        </form>
      </section>
      <Modal modalConfig={modalConfig} setModalConfig={setModalConfig} />
    </div>
  );
};

export default FormLogin;
