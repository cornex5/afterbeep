import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { downsample, floatTo16BitPCM, encodeWav } from "./wavEncoder";

describe("downsample", () => {
  it("returns same array when rates are equal", () => {
    const samples = new Float32Array([0.1, 0.2, 0.3]);
    const result = downsample(samples, 16000, 16000);
    expect(result).toBe(samples);
  });

  it("halves length when downsampling 2:1", () => {
    const samples = new Float32Array(48000);
    const result = downsample(samples, 48000, 24000);
    expect(result.length).toBe(24000);
  });

  it("takes every other sample for 2:1 ratio", () => {
    const samples = new Float32Array([1, 2, 3, 4, 5, 6]);
    const result = downsample(samples, 2, 1);
    expect(Array.from(result)).toEqual([1, 3, 5]);
  });

  it("handles empty input", () => {
    const result = downsample(new Float32Array(0), 48000, 16000);
    expect(result.length).toBe(0);
  });
});

describe("floatTo16BitPCM", () => {
  it("converts 1.0 to 32767", () => {
    const result = floatTo16BitPCM(new Float32Array([1.0]));
    expect(result[0]).toBe(32767);
  });

  it("converts -1.0 to -32768", () => {
    const result = floatTo16BitPCM(new Float32Array([-1.0]));
    expect(result[0]).toBe(-32768);
  });

  it("converts 0.0 to 0", () => {
    const result = floatTo16BitPCM(new Float32Array([0.0]));
    expect(result[0]).toBe(0);
  });

  it("clamps values above 1.0", () => {
    const result = floatTo16BitPCM(new Float32Array([2.0]));
    expect(result[0]).toBe(32767);
  });

  it("clamps values below -1.0", () => {
    const result = floatTo16BitPCM(new Float32Array([-2.0]));
    expect(result[0]).toBe(-32768);
  });

  it("preserves length", () => {
    const samples = new Float32Array(1000);
    const result = floatTo16BitPCM(samples);
    expect(result.length).toBe(1000);
  });
});

describe("encodeWav", () => {
  const sampleRate = 16000;
  const channels = 1;
  const pcm = new Int16Array([100, 200, -100, -200]);

  it("produces exactly 44 + dataBytes total bytes", () => {
    const wav = encodeWav(sampleRate, channels, pcm);
    expect(wav.length).toBe(44 + pcm.length * 2);
  });

  it("starts with RIFF marker", () => {
    const wav = encodeWav(sampleRate, channels, pcm);
    const marker = String.fromCharCode(wav[0]!, wav[1]!, wav[2]!, wav[3]!);
    expect(marker).toBe("RIFF");
  });

  it("includes WAVE format marker at offset 8", () => {
    const wav = encodeWav(sampleRate, channels, pcm);
    const marker = String.fromCharCode(wav[8]!, wav[9]!, wav[10]!, wav[11]!);
    expect(marker).toBe("WAVE");
  });

  it("writes correct RIFF chunk size at offset 4", () => {
    const wav = encodeWav(sampleRate, channels, pcm);
    const view = new DataView(wav.buffer);
    const riffSize = view.getUint32(4, true);
    expect(riffSize).toBe(36 + pcm.length * 2);
  });

  it("writes correct data chunk size at offset 40", () => {
    const wav = encodeWav(sampleRate, channels, pcm);
    const view = new DataView(wav.buffer);
    const dataSize = view.getUint32(40, true);
    expect(dataSize).toBe(pcm.length * 2);
  });

  it("writes correct sample rate at offset 24", () => {
    const wav = encodeWav(sampleRate, channels, pcm);
    const view = new DataView(wav.buffer);
    expect(view.getUint32(24, true)).toBe(sampleRate);
  });

  it("writes correct channel count at offset 22", () => {
    const wav = encodeWav(sampleRate, channels, pcm);
    const view = new DataView(wav.buffer);
    expect(view.getUint16(22, true)).toBe(channels);
  });

  it("property: header length fields always match actual data length", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: -32768, max: 32767 }), { minLength: 0, maxLength: 4096 }),
        (samples) => {
          const pcmData = new Int16Array(samples);
          const wav = encodeWav(16000, 1, pcmData);
          const view = new DataView(wav.buffer);
          const riffChunkSize = view.getUint32(4, true);
          const dataChunkSize = view.getUint32(40, true);
          const expectedDataBytes = pcmData.length * 2;
          return (
            riffChunkSize === 36 + expectedDataBytes &&
            dataChunkSize === expectedDataBytes &&
            wav.length === 44 + expectedDataBytes
          );
        },
      ),
    );
  });
});
