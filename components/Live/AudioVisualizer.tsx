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
      ctx.globalCompositeOperation = 'screen';

      time += 0.05;

      let activeVolume = 0;
      let baseColor = { r: 50, g: 70, b: 100 }; // Darker, more rigid base

      if (state === 'connecting') {
        baseColor = { r: 255, g: 255, b: 255 };
        activeVolume = (Math.sin(time) + 1) * 0.15;
      } else if (state === 'error') {
        baseColor = { r: 239, g: 68, b: 68 };
        activeVolume = 0.05;
      } else if (isUserSpeaking) {
        baseColor = { r: 16, g: 185, b: 129 };
        activeVolume = userVolume;
      } else if (isAiSpeaking) {
        baseColor = { r: 14, g: 165, b: 233 };
        activeVolume = aiVolume;
      } else if (state === 'connected') {
        baseColor = { r: 56, g: 189, b: 248 };
        activeVolume = 0.03 + (Math.sin(time * 0.4) * 0.01);
      }

      const intensity = Math.min(1, Math.max(0.02, activeVolume));
      const numLayers = 4 + Math.floor(intensity * 6);
      
      // Draw Geometric Neural Squares (Replacing Rings)
      for (let i = 0; i < numLayers; i++) {
        ctx.beginPath();
        const baseSize = 60 + (i * 25);
        const expansion = intensity * 120 * (Math.sin(time * 0.8 + i) * 0.5 + 0.5);
        const size = baseSize + expansion;

        // Draw Square
        ctx.rect(centerX - size / 2, centerY - size / 2, size, size);
        
        const alpha = Math.max(0, 1 - (size / (Math.min(width, height) * 0.8)));
        ctx.strokeStyle = `rgba(${baseColor.r}, ${baseColor.g}, ${baseColor.b}, ${alpha * 0.6})`;
        ctx.lineWidth = 1 + (intensity * 3);
        ctx.stroke();
      }

      // Draw Core Technical Cube
      const coreSize = 40 + (intensity * 30);
      ctx.fillStyle = `rgba(${baseColor.r}, ${baseColor.g}, ${baseColor.b}, ${0.1 + intensity * 0.2})`;
      ctx.fillRect(centerX - coreSize / 2, centerY - coreSize / 2, coreSize, coreSize);
      
      // Outer border for core
      ctx.strokeStyle = `rgba(${baseColor.r}, ${baseColor.g}, ${baseColor.b}, 0.8)`;
      ctx.lineWidth = 2;
      ctx.strokeRect(centerX - coreSize / 2, centerY - coreSize / 2, coreSize, coreSize);

      // Technical Geometric Particles
      if (isAiSpeaking || isUserSpeaking) {
          const particleCount = 12;
          for(let j = 0; j < particleCount; j++) {
              const angle = (time * 1.5) + (j * (Math.PI * 2 / particleCount));
              const orbitDistance = 80 + (intensity * 100);
              const px = centerX + Math.cos(angle) * orbitDistance;
              const py = centerY + Math.sin(angle) * orbitDistance;
              
              const pSize = 3 + intensity * 6;
              ctx.fillStyle = `rgba(${baseColor.r}, ${baseColor.g}, ${baseColor.b}, 0.7)`;
              // Square particles
              ctx.fillRect(px - pSize/2, py - pSize/2, pSize, pSize);
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
    <div className="w-full h-full flex items-center justify-center relative overflow-hidden rounded-none">
       {/* Geometric Grid Overlay */}
       <div className="absolute inset-0 rounded-none" 
            style={{
                backgroundImage: `linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)`,
                backgroundSize: '30px 30px',
                maskImage: 'linear-gradient(to bottom, transparent, black 40%, black 60%, transparent)'
            }} 
       />
       <canvas ref={canvasRef} className="w-full h-full absolute z-10 rounded-none" />
    </div>
  );
};

export default AudioVisualizer;