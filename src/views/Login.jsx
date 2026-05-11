import React from 'react';
import { useLocation } from 'react-router-dom';
import FormLogin from '../components/FormLogin';
import '../css/hero-login.css';

const Login = () => {
  const { state } = useLocation();
  // Si viene del hero de Home, el glaciar ya terminó → modo estático
  const fromHero = state?.fromHero === true;

  return (
    <div className="hero-login-root">

      <video
        className="hero-video"
        autoPlay
        muted
        playsInline
        loop
        src="/hero.mp4"
      />

      <div className="hero-dark-overlay" />

      {/* Glaciar: estático si viene de Home, animado si accede directo */}
      <div className={`glacier-layer${fromHero ? ' glacier-layer--static' : ''}`}>
        <div className="ice-shard ice-shard--a" />
        <div className="ice-shard ice-shard--b" />
        <div className="ice-shard ice-shard--c" />
        <div className="ice-shard ice-shard--d" />
        <div className="ice-frost-veil" />
        <div className="ice-cracks" />
      </div>

      {/* Formulario: aparece rápido si viene de Home, después del glaciar si es directo */}
      <div className={`hero-form-wrapper${fromHero ? ' hero-form-wrapper--fast' : ''}`}>
        <FormLogin />
      </div>

    </div>
  );
};

export default Login;
