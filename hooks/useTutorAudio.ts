import { useState, useRef, useCallback, useEffect } from 'react';
import { Blob as GenAIBlob } from "@google/genai";

// We embed the worker code here to ensure it loads correctly even if static file serving fails
// or if there are path/latency issues with fetching 'public/audio-processor.js'.
const AUDIO_WORKLET_CODE = `
class PCMProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.bufferSize = 4096;
    this.buffer = new Float32Array(this.bufferSize);
    this.bytesWritten = 0;
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || input.length === 0) return true;
    const channelData = input[0];
    
    for (let i = 0; i < channelData.length; i++) {
      this.buffer[this.bytesWritten++] = channelData[i];
      if (this.bytesWritten >= this.bufferSize) {
        this.flush();
      }
    }
    return true;
  }

  flush() {
    const int16Data = new Int16Array(this.bytesWritten);
    let sumSquares = 0;
    for (let i = 0; i < this.bytesWritten; i++) {
      const sample = this.buffer[i];
      const s = Math.max(-1, Math.min(1, sample));
      int16Data[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
      sumSquares += s * s;
    }
    const rms = Math.sqrt(sumSquares / this.bytesWritten);
    this.port.postMessage({ pcm: int16Data.buffer, volume: rms }, [int16Data.buffer]);
    this.bytesWritten = 0;
  }
}
registerProcessor('pcm-processor', PCMProcessor);
`;

// --- Audio Helper Utilities ---

function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Convert raw PCM Int16 buffer to Gemini-compatible Blob
function createPcmBlob(buffer: ArrayBuffer): GenAIBlob {
  const bytes = new Uint8Array(buffer);
  return {
    data: uint8ArrayToBase64(bytes),
    mimeType: 'audio/pcm;rate=16000',
  };
}

// Decode raw PCM output from Gemini to an AudioBuffer for playback
async function decodePcmOutput(
  base64Data: string,
  ctx: AudioContext,
  sampleRate: number
): Promise<AudioBuffer> {
  const uint8Data = base64ToUint8Array(base64Data);
  const int16Data = new Int16Array(uint8Data.buffer);
  
  const buffer = ctx.createBuffer(1, int16Data.length, sampleRate);
  const channelData = buffer.getChannelData(0);
  
  for (let i = 0; i < int16Data.length; i++) {
    // Normalize Int16 to Float32
    channelData[i] = int16Data[i] / 32768.0;
  }
  
  return buffer;
}

// --- Hook Definition ---

export interface UseTutorAudioReturn {
  startInput: (onAudioData: (blob: GenAIBlob) => void) => Promise<void>;
  stopInput: () => void;
  playAudioChunk: (base64Audio: string) => Promise<void>;
  stopAudioPlayback: () => void;
  resetAudioState: () => void;
  isUserSpeaking: boolean;
  isAiSpeaking: boolean;
  userVolume: number; // 0.0 to 1.0
  aiVolume: number; // 0.0 to 1.0
  audioError: string | null;
}

export const useTutorAudio = (): UseTutorAudioReturn => {
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [userVolume, setUserVolume] = useState(0);
  const [aiVolume, setAiVolume] = useState(0);
  const [audioError, setAudioError] = useState<string | null>(null);

  // Input Refs (Mic -> Worklet)
  const inputContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);

  // Output Refs (Gemini -> Speaker)
  const outputContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const activeSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const outputAnalyserRef = useRef<AnalyserNode | null>(null);

  // Animation Frame for AI Volume visualization
  const animationFrameRef = useRef<number | null>(null);

  const cleanupOutput = useCallback(() => {
    activeSourcesRef.current.forEach(source => {
      try { source.stop(); } catch (e) {}
    });
    activeSourcesRef.current.clear();
    nextStartTimeRef.current = 0;
    
    if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
    }
    setIsAiSpeaking(false);
    setAiVolume(0);
  }, []);

  const resetAudioState = useCallback(() => {
      cleanupOutput();
      
      if (inputContextRef.current?.state !== 'closed') {
          inputContextRef.current?.close();
      }
      if (outputContextRef.current?.state !== 'closed') {
          outputContextRef.current?.close();
      }
      
      mediaStreamRef.current?.getTracks().forEach(t => t.stop());
      workletNodeRef.current?.disconnect();
      sourceNodeRef.current?.disconnect();
      
      inputContextRef.current = null;
      outputContextRef.current = null;
      mediaStreamRef.current = null;
      workletNodeRef.current = null;
      sourceNodeRef.current = null;
      
      setIsUserSpeaking(false);
      setUserVolume(0);
      setAudioError(null);
  }, [cleanupOutput]);

  const startInput = useCallback(async (onAudioData: (blob: GenAIBlob) => void) => {
    try {
      setAudioError(null);
      
      // 1. Get Microphone Access with constraints
      const stream = await navigator.mediaDevices.getUserMedia({ audio: {
          channelCount: 1,
          sampleRate: 16000, // Request 16kHz hardware rate if possible
          echoCancellation: true,
          autoGainControl: true,
          noiseSuppression: true
      }});
      mediaStreamRef.current = stream;

      // 2. Create Input Context (Force 16kHz for correct Gemini pitch)
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass({ sampleRate: 16000 });
      inputContextRef.current = ctx;

      // 3. Load AudioWorklet
      // Use Blob URL to robustly load the worklet code without relying on file serving paths
      const blob = new Blob([AUDIO_WORKLET_CODE], { type: 'application/javascript' });
      const workletUrl = URL.createObjectURL(blob);
      
      try {
        await ctx.audioWorklet.addModule(workletUrl);
      } finally {
        URL.revokeObjectURL(workletUrl);
      }

      // 4. Setup Nodes
      const source = ctx.createMediaStreamSource(stream);
      const worklet = new AudioWorkletNode(ctx, 'pcm-processor');

      worklet.port.onmessage = (event) => {
        const { pcm, volume } = event.data;
        
        // Send to API
        onAudioData(createPcmBlob(pcm));

        // Update UI state
        // Boost volume slightly for better visual feedback
        setUserVolume(Math.min(1, volume * 5)); 
        setIsUserSpeaking(volume > 0.01);
      };

      source.connect(worklet);
      // Connect to destination to keep the audio graph active, but it won't produce sound 
      // because the processor doesn't write to 'outputs'
      worklet.connect(ctx.destination); 
      
      sourceNodeRef.current = source;
      workletNodeRef.current = worklet;

    } catch (err: any) {
      console.error("Error starting audio input:", err);
      setAudioError("Erro ao acessar microfone. Verifique permissões.");
      throw err;
    }
  }, []);

  const stopInput = useCallback(() => {
    mediaStreamRef.current?.getTracks().forEach(track => track.stop());
    workletNodeRef.current?.disconnect();
    sourceNodeRef.current?.disconnect();
    inputContextRef.current?.close();
    
    mediaStreamRef.current = null;
    workletNodeRef.current = null;
    sourceNodeRef.current = null;
    inputContextRef.current = null;
    
    setIsUserSpeaking(false);
    setUserVolume(0);
  }, []);

  const playAudioChunk = useCallback(async (base64Audio: string) => {
    try {
      // Initialize Output Context on first play if needed
      if (!outputContextRef.current || outputContextRef.current.state === 'closed') {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        // Gemini output is typically 24kHz
        outputContextRef.current = new AudioContextClass({ sampleRate: 24000 });
        
        // Setup Analyzer for AI Volume
        const analyser = outputContextRef.current.createAnalyser();
        analyser.fftSize = 256;
        analyser.connect(outputContextRef.current.destination);
        outputAnalyserRef.current = analyser;
      }

      const ctx = outputContextRef.current;
      const analyser = outputAnalyserRef.current;
      
      // Decode
      const audioBuffer = await decodePcmOutput(base64Audio, ctx, 24000);
      
      // Schedule
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      
      if (analyser) {
        source.connect(analyser);
      } else {
        source.connect(ctx.destination);
      }

      // Ensure gapless playback by tracking the tail of the queue
      const currentTime = ctx.currentTime;
      if (nextStartTimeRef.current < currentTime) {
        nextStartTimeRef.current = currentTime;
      }
      
      source.start(nextStartTimeRef.current);
      nextStartTimeRef.current += audioBuffer.duration;
      
      activeSourcesRef.current.add(source);
      source.onended = () => {
        activeSourcesRef.current.delete(source);
        if (activeSourcesRef.current.size === 0) {
            setIsAiSpeaking(false);
            setAiVolume(0);
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        }
      };

      setIsAiSpeaking(true);

      // Start Visualizer Loop if not running
      if (!animationFrameRef.current && analyser) {
          const updateVolume = () => {
              if (activeSourcesRef.current.size === 0) return;
              
              const dataArray = new Uint8Array(analyser.frequencyBinCount);
              analyser.getByteFrequencyData(dataArray);
              
              // Calculate volume
              let sum = 0;
              for (let i = 0; i < dataArray.length; i++) {
                  sum += dataArray[i];
              }
              const average = sum / dataArray.length;
              
              // Normalize 0-255 to 0-1
              setAiVolume(average / 100); 
              
              animationFrameRef.current = requestAnimationFrame(updateVolume);
          };
          updateVolume();
      }

    } catch (error) {
      console.error("Error playing audio chunk:", error);
    }
  }, []);

  const stopAudioPlayback = useCallback(() => {
    cleanupOutput();
  }, [cleanupOutput]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      resetAudioState();
    };
  }, [resetAudioState]);

  return {
    startInput,
    stopInput,
    playAudioChunk,
    stopAudioPlayback,
    resetAudioState,
    isUserSpeaking,
    isAiSpeaking,
    userVolume,
    aiVolume,
    audioError
  };
};