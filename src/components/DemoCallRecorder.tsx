"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import CassetteReels from "./CassetteReels";
import styles from "./DemoCallRecorder.module.css";
import { downsample, floatTo16BitPCM, encodeWav } from "@/lib/wavEncoder";

type RecorderState =
  | "idle"
  | "requesting"
  | "recording"
  | "uploading"
  | "polling"
  | "done"
  | "failed";

const WORKLET_CODE = `
class SamplerProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._buffer = [];
  }
  process(inputs) {
    const channel = inputs[0]?.[0];
    if (channel) {
      for (let i = 0; i < channel.length; i++) {
        this._buffer.push(channel[i]);
      }
      if (this._buffer.length >= 4096) {
        this.port.postMessage(new Float32Array(this._buffer.splice(0, 4096)));
      }
    }
    return true;
  }
}
registerProcessor("sampler-processor", SamplerProcessor);
`;

const MAX_POLL_ATTEMPTS = 30;
const POLL_INTERVAL_MS = 2000;
const TARGET_SAMPLE_RATE = 16000;
const MAX_AUDIO_BYTES = 3 * 1024 * 1024;

function formatSeconds(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export default function DemoCallRecorder() {
  const [state, setState] = useState<RecorderState>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [message, setMessage] = useState("");

  const chunksRef = useRef<Float32Array[]>([]);
  const contextRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollCountRef = useRef(0);
  const blobUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (contextRef.current) {
        contextRef.current.close().catch(() => undefined);
      }
    };
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const teardownAudio = useCallback(() => {
    workletNodeRef.current?.disconnect();
    sourceRef.current?.disconnect();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    contextRef.current?.close().catch(() => undefined);
    workletNodeRef.current = null;
    sourceRef.current = null;
    streamRef.current = null;
    contextRef.current = null;
  }, []);

  const uploadAndPoll = useCallback(async (wav: Uint8Array) => {
    setState("uploading");
    setMessage("Uploading recording...");

    const wavCopy = new Uint8Array(wav.byteLength);
    wavCopy.set(wav);
    const blob = new Blob([wavCopy], { type: "audio/wav" });
    const form = new FormData();
    form.append("audio", blob, "demo.wav");

    let callId: string;
    try {
      const res = await fetch("/api/demo/call", { method: "POST", body: form });
      if (res.status === 429) {
        const data = (await res.json()) as { error?: string };
        setState("failed");
        setMessage(data.error ?? "Too many demo calls. Try again later.");
        return;
      }
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setState("failed");
        setMessage(data.error ?? "Upload failed. Try again.");
        return;
      }
      const data = (await res.json()) as { callId: string };
      callId = data.callId;
    } catch {
      setState("failed");
      setMessage("Network error. Check your connection and try again.");
      return;
    }

    setState("polling");
    setMessage("Processing your message...");
    pollCountRef.current = 0;

    const poll = async () => {
      pollCountRef.current += 1;
      if (pollCountRef.current > MAX_POLL_ATTEMPTS) {
        setState("failed");
        setMessage("Processing timed out. Check your dashboard for the result.");
        return;
      }

      try {
        const res = await fetch(`/api/demo/call/${callId}`);
        if (!res.ok) {
          setTimeout(poll, POLL_INTERVAL_MS);
          return;
        }
        const data = (await res.json()) as { status: string };
        if (data.status === "delivered" || data.status === "extracted") {
          setState("done");
          setMessage("Done. Your message card is on the dashboard.");
          return;
        }
        if (data.status === "transcription-failed" || data.status === "extraction-failed") {
          setState("done");
          setMessage("Processing finished. Check your dashboard for the result.");
          return;
        }
      } catch {
        void 0;
      }
      setTimeout(poll, POLL_INTERVAL_MS);
    };

    setTimeout(poll, POLL_INTERVAL_MS);
  }, []);

  const handleStop = useCallback(() => {
    stopTimer();
    workletNodeRef.current?.port.postMessage("flush");

    setTimeout(() => {
      teardownAudio();

      const allChunks = chunksRef.current;
      chunksRef.current = [];

      if (allChunks.length === 0) {
        setState("failed");
        setMessage("No audio captured. Try again.");
        return;
      }

      const totalLength = allChunks.reduce((sum, c) => sum + c.length, 0);
      const merged = new Float32Array(totalLength);
      let offset = 0;
      for (const chunk of allChunks) {
        merged.set(chunk, offset);
        offset += chunk.length;
      }

      const sampleRate = 48000;
      const downsampled = downsample(merged, sampleRate, TARGET_SAMPLE_RATE);
      const pcm = floatTo16BitPCM(downsampled);
      const wav = encodeWav(TARGET_SAMPLE_RATE, 1, pcm);

      if (wav.byteLength > MAX_AUDIO_BYTES) {
        setState("failed");
        setMessage("Recording too long. Keep demo calls under 2 minutes.");
        return;
      }

      uploadAndPoll(wav);
    }, 100);
  }, [stopTimer, teardownAudio, uploadAndPoll]);

  const handleRecord = useCallback(async () => {
    setState("requesting");
    setMessage("");
    chunksRef.current = [];

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    } catch {
      setState("failed");
      setMessage("Microphone access denied. Allow microphone and try again.");
      return;
    }

    const context = new AudioContext({ sampleRate: 48000 });

    let blobUrl: string;
    if (blobUrlRef.current) {
      blobUrl = blobUrlRef.current;
    } else {
      const workletBlob = new Blob([WORKLET_CODE], { type: "application/javascript" });
      blobUrl = URL.createObjectURL(workletBlob);
      blobUrlRef.current = blobUrl;
    }

    try {
      await context.audioWorklet.addModule(blobUrl);
    } catch {
      stream.getTracks().forEach((t) => t.stop());
      await context.close();
      setState("failed");
      setMessage("AudioWorklet failed to load. Try a different browser.");
      return;
    }

    const workletNode = new AudioWorkletNode(context, "sampler-processor");
    workletNode.port.onmessage = (ev: MessageEvent<Float32Array>) => {
      chunksRef.current.push(ev.data);
    };

    const source = context.createMediaStreamSource(stream);
    source.connect(workletNode);
    workletNode.connect(context.destination);

    streamRef.current = stream;
    contextRef.current = context;
    workletNodeRef.current = workletNode;
    sourceRef.current = source;

    setState("recording");
    setElapsed(0);
    timerRef.current = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);
  }, []);

  const isSpinning = state === "recording" || state === "polling";
  const isRecording = state === "recording";
  const isIdle = state === "idle" || state === "failed" || state === "done";
  const isBusy = state === "requesting" || state === "uploading" || state === "polling";

  return (
    <div className={styles.recorder}>
      <div className={styles.reelsRow}>
        <CassetteReels spinning={isSpinning} size={48} />
      </div>

      {isRecording ? (
        <div className={styles.timerRow} aria-live="off">
          <span
            className={styles.dot + " " + styles.dotBlink}
            aria-hidden="true"
          />
          {" "}{formatSeconds(elapsed)}
        </div>
      ) : (
        <p className={styles.label}>
          {state === "done"
            ? "Recording complete"
            : state === "uploading"
            ? "Uploading"
            : state === "polling"
            ? "Processing"
            : state === "requesting"
            ? "Requesting microphone"
            : "Demo call recorder"}
        </p>
      )}

      {isRecording ? (
        <button
          type="button"
          className={styles.stopButton}
          onClick={handleStop}
          aria-label="Stop recording"
        >
          Stop recording
        </button>
      ) : (
        <button
          type="button"
          className={styles.recordButton}
          onClick={handleRecord}
          disabled={isBusy}
          aria-label="Start recording a demo call"
        >
          {isBusy ? "Please wait..." : isIdle && state === "done" ? "Record again" : "Record a call"}
        </button>
      )}

      {message && (
        <p
          className={state === "failed" ? styles.errorLine : styles.statusLine}
          role={state === "failed" ? "alert" : "status"}
          aria-live="polite"
        >
          {message}
        </p>
      )}
    </div>
  );
}
