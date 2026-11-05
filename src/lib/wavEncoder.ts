export function downsample(
  samples: Float32Array,
  fromRate: number,
  toRate: number,
): Float32Array {
  if (fromRate === toRate) return samples;
  const ratio = fromRate / toRate;
  const outputLength = Math.floor(samples.length / ratio);
  const output = new Float32Array(outputLength);
  for (let i = 0; i < outputLength; i++) {
    output[i] = samples[Math.floor(i * ratio)] ?? 0;
  }
  return output;
}

export function floatTo16BitPCM(samples: Float32Array): Int16Array {
  const output = new Int16Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i] ?? 0));
    output[i] = s < 0 ? s * 32768 : s * 32767;
  }
  return output;
}

export function encodeWav(
  sampleRate: number,
  channels: number,
  pcmData: Int16Array,
): Uint8Array {
  const bytesPerSample = 2;
  const dataBytes = pcmData.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataBytes);
  const view = new DataView(buffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(0, "RIFF");
  view.setUint32(4, 36 + dataBytes, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * channels * bytesPerSample, true);
  view.setUint16(32, channels * bytesPerSample, true);
  view.setUint16(34, bytesPerSample * 8, true);
  writeString(36, "data");
  view.setUint32(40, dataBytes, true);

  for (let i = 0; i < pcmData.length; i++) {
    view.setInt16(44 + i * bytesPerSample, pcmData[i] ?? 0, true);
  }

  return new Uint8Array(buffer);
}
