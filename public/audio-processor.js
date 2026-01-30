class PCMProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.bufferSize = 4096;
    this.buffer = new Float32Array(this.bufferSize);
    this.bytesWritten = 0;
  }

  process(inputs, outputs, parameters) {
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
    // Convert Float32 (-1.0 to 1.0) to Int16 (-32768 to 32767)
    const int16Data = new Int16Array(this.bytesWritten);
    let sumSquares = 0;
    
    for (let i = 0; i < this.bytesWritten; i++) {
      const sample = this.buffer[i];
      // Clamp values
      const s = Math.max(-1, Math.min(1, sample));
      
      // Convert to PCM Int16
      int16Data[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
      
      // Accumulate for RMS (Volume) calculation
      sumSquares += s * s;
    }
    
    const rms = Math.sqrt(sumSquares / this.bytesWritten);

    // Send data to main thread. 
    // We transfer the buffer to avoid copying memory (performance optimization).
    this.port.postMessage({
      pcm: int16Data.buffer,
      volume: rms
    }, [int16Data.buffer]);
    
    this.bytesWritten = 0;
  }
}

registerProcessor('pcm-processor', PCMProcessor);