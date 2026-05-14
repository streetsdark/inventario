import { useCallback } from "react";
import { error as logError } from "../utils/logger";

export const useNotificationSound = () => {
  const playNotificationSound = useCallback(() => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();

      const play = () => {
        const now = audioContext.currentTime;

        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = 800;
        gainNode.gain.setValueAtTime(0.3, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

        oscillator.start(now);
        oscillator.stop(now + 0.1);

        const oscillator2 = audioContext.createOscillator();
        oscillator2.connect(gainNode);
        oscillator2.frequency.value = 1200;
        gainNode.gain.setValueAtTime(0.3, now + 0.15);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

        oscillator2.start(now + 0.15);
        oscillator2.stop(now + 0.25);
      };

      if (audioContext.state === "suspended") {
        audioContext.resume().then(play);
      } else {
        play();
      }
    } catch (error) {
      logError("Error reproduciendo sonido de notificación:", error);
    }
  }, []);

  return { playNotificationSound };
};
