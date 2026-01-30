import React, { useEffect, useRef } from 'react';

interface AudioVisualizerProps {
  isUserSpeaking: boolean;
  isAiSpeaking: boolean;
  userVolume: number; // 0.0 to 1.0
  aiVolume: number; // 0.0 to 1.0
  state: 'idle' | 'connecting' | 'connected' | 'error';
}

const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ 
  isUserSpeaking, 
  isAiSpeaking, 
  userVolume, 
  aiVolume, 
  state 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const resize = () => {
      canvas.width = canvas.clientWidth * window.devicePixelRatio;
      canvas.height = canvas.clientHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resize();
    window.addEventListener('resize', resize);

    let time = 0;

    const draw = () => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      const centerX = width / 2;
      const centerY = height / 2;

      ctx.clearRect(0, 0, width, height);
      
      // Global composite operation for glow effect
      ctx.globalCompositeOperation = 'screen';

      time += 0.05;

      // Base visualizer state logic
      let activeVolume = 0;
      let baseColor = { r: 100, g: 116, b: 139 }; // Slate 500 (Idle)

      if (state === 'connecting') {
        baseColor = { r: 255, g: 255, b: 255 }; // White pulsing
        activeVolume = (Math.sin(time) + 1) * 0.2; // Auto pulse
      } else if (state === 'error') {
        baseColor = { r: 239, g: 68, b: 68 }; // Red
        activeVolume = 0.1;
      } else if (isUserSpeaking) {
        baseColor = { r: 16, g: 185, b: 129 }; // Emerald (User)
        activeVolume = userVolume;
      } else if (isAiSpeaking) {
        baseColor = { r: 14, g: 165, b: 233 }; // Sky Blue (AI)
        activeVolume = aiVolume;
      } else if (state === 'connected') {
        baseColor = { r: 56, g: 189, b: 248 }; // Light Blue Idle
        activeVolume = 0.05 + (Math.sin(time * 0.5) * 0.02); // Gentle breathing
      }

      // Clamp volume for visuals
      const intensity = Math.min(1, Math.max(0.05, activeVolume));
      const numRings = 3 + Math.floor(intensity * 5);
      
      // Draw Neural Rings
      for (let i = 0; i < numRings; i++) {
        ctx.beginPath();
        
        const offset = (time * (i + 1) * 0.5) % 100;
        const baseRadius = 40 + (i * 15);
        const expansion = intensity * 100 * (Math.sin(time + i) * 0.5 + 0.5); // Reactive expansion
        const radius = baseRadius + expansion;

        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        
        const alpha = Math.max(0, 1 - (radius / (Math.min(width, height) / 2)));
        ctx.strokeStyle = `rgba(${baseColor.r}, ${baseColor.g}, ${baseColor.b}, ${alpha})`;
        ctx.lineWidth = 2 + (intensity * 4);
        ctx.stroke();
      }

      // Draw Core Orb
      ctx.beginPath();
      const coreRadius = 30 + (intensity * 20);
      const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, coreRadius);
      gradient.addColorStop(0, `rgba(${baseColor.r}, ${baseColor.g}, ${baseColor.b}, 0.8)`);
      gradient.addColorStop(1, `rgba(${baseColor.r}, ${baseColor.g}, ${baseColor.b}, 0)`);
      
      ctx.fillStyle = gradient;
      ctx.arc(centerX, centerY, coreRadius, 0, Math.PI * 2);
      ctx.fill();

      // Draw "Particles" representing neural activity
      if (isAiSpeaking || isUserSpeaking) {
          const particleCount = 8;
          for(let j = 0; j < particleCount; j++) {
              const angle = (time * 2) + (j * (Math.PI * 2 / particleCount));
              const orbitRadius = 60 + (intensity * 80);
              const px = centerX + Math.cos(angle) * orbitRadius;
              const py = centerY + Math.sin(angle) * orbitRadius;
              
              ctx.beginPath();
              ctx.fillStyle = `rgba(${baseColor.r}, ${baseColor.g}, ${baseColor.b}, 0.6)`;
              ctx.arc(px, py, 3, 0, Math.PI * 2);
              ctx.fill();
          }
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationRef.current);
    };
  }, [isUserSpeaking, isAiSpeaking, userVolume, aiVolume, state]);

  return (
    <div className="w-full h-full flex items-center justify-center relative overflow-hidden">
       {/* Background Mesh Grid Effect */}
       <div className="absolute inset-0" 
            style={{
                backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.05) 1px, transparent 0)',
                backgroundSize: '24px 24px',
                maskImage: 'radial-gradient(circle at center, black 40%, transparent 100%)'
            }} 
       />
       <canvas ref={canvasRef} className="w-full h-full absolute z-10" />
    </div>
  );
};

export default AudioVisualizer;
