import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../css/hero-login.css';

const Home = () => {
  const navigate = useNavigate();
  const [glacierActive, setGlacierActive] = useState(false);

  useEffect(() => {
    // 3s de video limpio, luego empieza el glaciar
    const glacierTimer = setTimeout(() => setGlacierActive(true), 3000);

    // Navega a login justo cuando los shards han cubierto la pantalla (~1.5s después)
    const navTimer = setTimeout(
      () => navigate('/login', { state: { fromHero: true } }),
      4500
    );

    return () => {
      clearTimeout(glacierTimer);
      clearTimeout(navTimer);
    };
  }, [navigate]);

  return (
    <div className="hero-login-root">

      {/* Video de fondo */}
      <video
        className="hero-video"
        autoPlay
        muted
        playsInline
        loop
        src="/hero.mp4"
      />

      {/* Degradado cinematográfico */}
      <div className="hero-dark-overlay" />

      {/* Título durante los 3 segundos */}
      <div className="hero-title-block">
        <h1>ALTADILL</h1>
        <p>Sistema de Inventario</p>
      </div>

      {/* Glaciar — se monta a los 3s y anima desde el inicio */}
      {glacierActive && (
        <div className="glacier-layer">
          <div className="ice-shard ice-shard--a" />
          <div className="ice-shard ice-shard--b" />
          <div className="ice-shard ice-shard--c" />
          <div className="ice-shard ice-shard--d" />
          <div className="ice-frost-veil" />
          <div className="ice-cracks" />
        </div>
      )}

    </div>
  );
};

export default Home;
