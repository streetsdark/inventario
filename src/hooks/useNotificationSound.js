import { useCallback } from "react";

export const useNotificationSound = () => {
  const playNotificationSound = useCallback(() => {
    try {
      // Crear contexto de audio
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const now = audioContext.currentTime;

      // Crear oscilador para el sonido
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Configurar sonido de notificación (dos tonos)
      oscillator.frequency.value = 800; // Frecuencia inicial
      gainNode.gain.setValueAtTime(0.3, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

      oscillator.start(now);
      oscillator.stop(now + 0.1);

      // Segundo tono
      const oscillator2 = audioContext.createOscillator();
      oscillator2.connect(gainNode);
      oscillator2.frequency.value = 1200; // Frecuencia más alta
      gainNode.gain.setValueAtTime(0.3, now + 0.15);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

      oscillator2.start(now + 0.15);
      oscillator2.stop(now + 0.25);
    } catch (error) {
      console.error("Error reproduciendo sonido de notificación:", error);
    }
  }, []);

  return { playNotificationSound };
};
