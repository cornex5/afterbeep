import { describe, it, expect } from "vitest";
import { classifySilence } from "./audio";

function int16BufferFromAmplitude(amplitude: number, sampleCount: number): Buffer {
  const buf = Buffer.alloc(sampleCount * 2);
  const sample = Math.round(amplitude * 32767);
  for (let i = 0; i < sampleCount; i++) {
    buf.writeInt16LE(sample, i * 2);
  }
  return buf;
}

describe("classifySilence", () => {
  it("returns true for a zero-byte buffer", () => {
    expect(classifySilence(Buffer.alloc(0))).toBe(true);
  });

  it("returns true for a one-byte buffer (no complete samples)", () => {
    expect(classifySilence(Buffer.alloc(1))).toBe(true);
  });

  it("returns true for a buffer below the -50 dBFS threshold", () => {
    const silentBuffer = int16BufferFromAmplitude(0.001, 1024);
    expect(classifySilence(silentBuffer)).toBe(true);
  });

  it("returns false for a buffer with normal speech amplitude", () => {
    const speechBuffer = int16BufferFromAmplitude(0.5, 1024);
    expect(classifySilence(speechBuffer)).toBe(false);
  });

  it("returns false for a full-scale signal", () => {
    const fullScaleBuffer = int16BufferFromAmplitude(1.0, 512);
    expect(classifySilence(fullScaleBuffer)).toBe(false);
  });

  it("returns true for a buffer of all-zero samples", () => {
    const zeroBuffer = Buffer.alloc(1024, 0);
    expect(classifySilence(zeroBuffer)).toBe(true);
  });

  it("handles an odd-length buffer by ignoring the trailing byte", () => {
    const speechBuffer = int16BufferFromAmplitude(0.5, 512);
    const oddBuffer = Buffer.concat([speechBuffer, Buffer.alloc(1)]);
    expect(classifySilence(oddBuffer)).toBe(false);
  });
});
