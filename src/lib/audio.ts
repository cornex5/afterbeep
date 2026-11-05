const SILENCE_THRESHOLD_DBFS = -50;

function rmsToDbfs(rms: number): number {
  if (rms <= 0) return -Infinity;
  return 20 * Math.log10(rms);
}

function computeRms(samples: Int16Array): number {
  if (samples.length === 0) return 0;
  let sumOfSquares = 0;
  for (let i = 0; i < samples.length; i++) {
    const normalized = samples[i] / 32768;
    sumOfSquares += normalized * normalized;
  }
  return Math.sqrt(sumOfSquares / samples.length);
}

export function classifySilence(audioBuffer: Buffer): boolean {
  if (audioBuffer.length === 0) return true;
  const samples = new Int16Array(
    audioBuffer.buffer,
    audioBuffer.byteOffset,
    Math.floor(audioBuffer.byteLength / 2),
  );
  if (samples.length === 0) return true;
  const rms = computeRms(samples);
  const dbfs = rmsToDbfs(rms);
  return dbfs < SILENCE_THRESHOLD_DBFS;
}
