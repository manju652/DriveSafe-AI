"use client";

import { alerts } from "@/lib/api";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  FilesetResolver,
  FaceLandmarker,
  type FaceLandmarkerResult,
} from "@mediapipe/tasks-vision";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DriverMetrics {
  ear: number;
  leftEAR: number;
  rightEAR: number;
  eyeClosureSeconds: number;
  perclos: number;
  blinkCount: number;
  blinkRatePerMin: number;
  avgBlinkDuration: number;
  mar: number;
  jawOpen: number;
  yawnCount: number;
  yawnDurationSeconds: number;
  headPitch: number;
  headYaw: number;
  headRoll: number;
  headPoseStatus: "forward" | "down" | "up" | "left" | "right" | "unknown";
  gazeX: number;
  gazeY: number;
  fatigueScore: number;
  riskScore: number;
  attentionScore: number;
  confidence: number;
  faceDetected: boolean;
  drowsy: boolean;
  yawning: boolean;
  distracted: boolean;
  microSleep: boolean;
  phoneDetected: boolean;
  phoneDurationSeconds: number;
  driverStatus: string;
}

interface DriverCameraProps {
  onMetrics?: (metrics: DriverMetrics) => void;
  isDetecting: boolean;
  audioEnabled: boolean;
}

type CameraStatus = "initializing" | "ready" | "denied" | "error";

interface PhoneBox {
  x: number; y: number; w: number; h: number; score: number;
}

// ─── Landmark indices ────────────────────────────────────────────────────────

const LEFT_EYE_EAR   = [33, 160, 158, 133, 153, 144];
const RIGHT_EYE_EAR  = [362, 385, 387, 263, 373, 380];
const LEFT_IRIS_CENTER  = 468;
const RIGHT_IRIS_CENTER = 473;
const LEFT_EYE_LEFT  = 33;  const LEFT_EYE_RIGHT  = 133;
const LEFT_EYE_TOP   = 159; const LEFT_EYE_BOT    = 145;
const RIGHT_EYE_LEFT = 362; const RIGHT_EYE_RIGHT = 263;
const RIGHT_EYE_TOP  = 386; const RIGHT_EYE_BOT   = 374;
const MOUTH_MAR      = [61, 39, 37, 0, 267, 269, 291, 405];
const NOSE_TIP = 1; const CHIN = 152; const FOREHEAD = 10;
const LEFT_CHEEK = 234; const RIGHT_CHEEK = 454;

// Mesh draw groups
const FACE_OVAL   = [10,338,297,332,284,251,389,356,454,323,361,288,397,365,379,378,400,377,152,148,176,149,150,136,172,58,132,93,234,127,162,21,54,103,67,109];
const L_EYE_DRAW  = [33,7,163,144,145,153,154,155,133,173,157,158,159,160,161,246];
const R_EYE_DRAW  = [362,382,381,380,374,373,390,249,263,466,388,387,386,385,384,398];
const L_BROW      = [70,63,105,66,107,55,65,52,53,46];
const R_BROW      = [300,293,334,296,336,285,295,282,283,276];
const MOUTH_OUTER = [61,146,91,181,84,17,314,405,321,375,291,409,270,269,267,0,37,39,40,185];
const MOUTH_INNER = [78,95,88,178,87,14,317,402,318,324,308,415,310,311,312,13,82,81,80,191];
const NOSE_DRAW   = [168,6,197,195,5,4,1,19,94,2,164,0,11,302,12,268,267,419,420,429,362];

// ─── Thresholds ──────────────────────────────────────────────────────────────

const EAR_CLOSED        = 0.20;
const EAR_DROWSY        = 0.24;
const MAR_YAWN          = 0.70;   // raised — reduces false positives
const JAW_YAWN          = 0.55;   // blendshape confirmation
const PITCH_DOWN        = 30;
const PITCH_UP          = -25;
const YAW_SIDE          = 12;
const DROWSY_FRAMES     = 18;
const YAWN_FRAMES       = 6;     // consecutive frames before confirming yawn
const DISTRACT_FRAMES   = 30;
const MICRO_SLEEP_SEC   = 1.5;
const PERCLOS_WINDOW_MS = 60000;
const ALERT_COOLDOWN_MS = 10000;
const BLINK_MAX_MS      = 400;
const PHONE_ALERT_SEC   = 2.0;    // continuous phone detection before alert
const SMOOTHING         = 5;      // moving-average window size
const TRIP_ID           = "2bc0025d-b741-4912-8a9c-456f1abecde7";

// ─── Geometry ────────────────────────────────────────────────────────────────

type Pt = { x: number; y: number; z?: number };
const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);

function calcEAR(pts: Pt[]): number {
  if (pts.length < 6) return 1;
  return (dist(pts[1], pts[5]) + dist(pts[2], pts[4])) / (2 * dist(pts[0], pts[3]) + 1e-6);
}

function calcMAR(pts: Pt[]): number {
  if (pts.length < 8) return 0;
  const v = (dist(pts[1], pts[7]) + dist(pts[2], pts[6]) + dist(pts[3], pts[5])) / 3;
  return v / (dist(pts[0], pts[4]) + 1e-6);
}

function calcHeadPose(lm: Pt[]): { pitch: number; yaw: number; roll: number } {
  if (lm.length < 468) return { pitch: 0, yaw: 0, roll: 0 };
  const nose = lm[NOSE_TIP], chin = lm[CHIN], forehead = lm[FOREHEAD];
  const lc = lm[LEFT_CHEEK], rc = lm[RIGHT_CHEEK];
  const faceW = dist(lc, rc);
  const yaw   = faceW > 0 ? ((nose.x - (lc.x + rc.x) / 2) / faceW) * 90 : 0;
  const faceH = dist(forehead, chin);
  const pitch = faceH > 0
  ? ((forehead.y - nose.y) - (nose.y - chin.y)) * 180
  : 0;
  const roll  = (Math.atan2(rc.y - lc.y, rc.x - lc.x) * 180) / Math.PI;
  return { pitch, yaw, roll };
}

function calcGaze(lm: Pt[], iris: Pt | null, l: number, r: number, t: number, b: number) {
  if (!iris || lm.length <= b) return { x: 0, y: 0 };
  const cx = (lm[l].x + lm[r].x) / 2, cy = (lm[t].y + lm[b].y) / 2;
  return {
    x: Math.max(-1, Math.min(1, (iris.x - cx) / (dist(lm[l], lm[r]) * 0.5 + 1e-6))),
    y: Math.max(-1, Math.min(1, (iris.y - cy) / (dist(lm[t], lm[b]) * 0.5 + 1e-6))),
  };
}

// Moving-average buffer
class SmoothBuffer {
  private buf: number[] = [];
  constructor(private size: number) {}
  push(v: number): number {
    this.buf.push(v);
    if (this.buf.length > this.size) this.buf.shift();
    return this.buf.reduce((a, b) => a + b, 0) / this.buf.length;
  }
}

// ─── Canvas helpers ──────────────────────────────────────────────────────────

function polyline(ctx: CanvasRenderingContext2D, pts: Pt[], close: boolean, W: number, H: number) {
  if (pts.length < 2) return;
  ctx.beginPath();
  ctx.moveTo(pts[0].x * W, pts[0].y * H);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x * W, pts[i].y * H);
  if (close) ctx.closePath();
  ctx.stroke();
}

function drawFaceMesh(
  ctx: CanvasRenderingContext2D, lm: Pt[], W: number, H: number,
  drowsy: boolean, distracted: boolean, yawning: boolean,
) {
  const get = (idx: number[]) => idx.map((i) => lm[i]).filter(Boolean);

  // Face oval
  ctx.strokeStyle = "rgba(139,92,246,0.5)"; ctx.lineWidth = 1.5;
  polyline(ctx, get(FACE_OVAL), true, W, H);

  // Eyes — red if drowsy, cyan if alert
  ctx.strokeStyle = drowsy ? "rgba(239,68,68,0.9)" : "rgba(34,211,238,0.9)"; ctx.lineWidth = 1.5;
  polyline(ctx, get(L_EYE_DRAW), true, W, H);
  polyline(ctx, get(R_EYE_DRAW), true, W, H);

  // Brows
  ctx.strokeStyle = "rgba(167,139,250,0.6)"; ctx.lineWidth = 1;
  polyline(ctx, get(L_BROW), false, W, H);
  polyline(ctx, get(R_BROW), false, W, H);

  // Mouth — amber if yawning, pink otherwise
  ctx.strokeStyle = yawning ? "rgba(251,191,36,0.9)" : "rgba(244,114,182,0.7)"; ctx.lineWidth = 1.5;
  polyline(ctx, get(MOUTH_OUTER), true, W, H);
  ctx.lineWidth = 1;
  polyline(ctx, get(MOUTH_INNER), true, W, H);

  // Nose
  ctx.strokeStyle = "rgba(139,92,246,0.4)"; ctx.lineWidth = 1;
  polyline(ctx, get(NOSE_DRAW), false, W, H);

  // Iris dots
  if (lm.length > 473) {
    for (const idx of [LEFT_IRIS_CENTER, RIGHT_IRIS_CENTER]) {
      const p = lm[idx]; if (!p) continue;
      ctx.beginPath(); ctx.arc(p.x * W, p.y * H, 3, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(34,211,238,0.9)"; ctx.fill();
    }
  }

  // Sparse mesh dots
  ctx.fillStyle = "rgba(139,92,246,0.25)";
  for (let i = 0; i < Math.min(lm.length, 468); i += 6) {
    const p = lm[i];
    ctx.beginPath(); ctx.arc(p.x * W, p.y * H, 0.8, 0, Math.PI * 2); ctx.fill();
  }

  // Face bounding box
  let mnX = 1, mnY = 1, mxX = 0, mxY = 0;
  for (let i = 0; i < Math.min(lm.length, 468); i++) {
    const p = lm[i];
    if (p.x < mnX) mnX = p.x; if (p.x > mxX) mxX = p.x;
    if (p.y < mnY) mnY = p.y; if (p.y > mxY) mxY = p.y;
  }
  const pad = 0.025;
  const bx = Math.max(0, (mnX - pad) * W), by = Math.max(0, (mnY - pad) * H);
  const bw = Math.min(W - bx, (mxX - mnX + pad * 2) * W);
  const bh = Math.min(H - by, (mxY - mnY + pad * 2) * H);
  const boxC = drowsy ? "rgba(239,68,68,0.9)" : distracted ? "rgba(234,179,8,0.9)" : "rgba(139,92,246,0.9)";

  ctx.strokeStyle = boxC; ctx.lineWidth = 2;
  ctx.strokeRect(bx, by, bw, bh);

  // Corner brackets
  ctx.lineWidth = 3;
  const cL = 18;
  for (const [x, y, dx, dy] of [
    [bx, by, cL, 0], [bx, by, 0, cL],
    [bx + bw, by, -cL, 0], [bx + bw, by, 0, cL],
    [bx, by + bh, cL, 0], [bx, by + bh, 0, -cL],
    [bx + bw, by + bh, -cL, 0], [bx + bw, by + bh, 0, -cL],
  ] as [number, number, number, number][]) {
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + dx, y + dy); ctx.stroke();
  }

  // Nose tip dot
  const np = lm[NOSE_TIP];
  if (np) {
    ctx.beginPath(); ctx.arc(np.x * W, np.y * H, 4, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(167,139,250,1)"; ctx.fill();
  }
}

function drawPhoneBox(
  ctx: CanvasRenderingContext2D, box: PhoneBox, W: number, H: number, confirmed: boolean,
) {
  const px = box.x * W, py = box.y * H, pw = box.w * W, ph = box.h * H;

  // Red box
  ctx.strokeStyle = confirmed ? "rgba(239,68,68,1)" : "rgba(239,68,68,0.6)";
  ctx.lineWidth = confirmed ? 3 : 2;
  ctx.strokeRect(px, py, pw, ph);

  // Corner brackets
  const cL = 14; ctx.lineWidth = confirmed ? 4 : 2;
  for (const [x, y, dx, dy] of [
    [px, py, cL, 0], [px, py, 0, cL],
    [px + pw, py, -cL, 0], [px + pw, py, 0, cL],
    [px, py + ph, cL, 0], [px, py + ph, 0, -cL],
    [px + pw, py + ph, -cL, 0], [px + pw, py + ph, 0, -cL],
  ] as [number, number, number, number][]) {
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + dx, y + dy); ctx.stroke();
  }

  // Badge
  const label = `📱 Phone ${Math.round(box.score * 100)}%`;
  ctx.font = "bold 12px monospace";
  const tw = ctx.measureText(label).width;
  ctx.fillStyle = confirmed ? "rgba(239,68,68,0.92)" : "rgba(239,68,68,0.6)";
  ctx.fillRect(px, py - 22, tw + 14, 22);
  ctx.fillStyle = "#fff";
  ctx.fillText(label, px + 7, py - 6);
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function DriverCamera({
  onMetrics,
  isDetecting,
  audioEnabled,
}: DriverCameraProps) {
  const videoRef    = useRef<HTMLVideoElement>(null);
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const rafRef      = useRef<number | null>(null);
  const lmRef       = useRef<FaceLandmarker | null>(null);
  const cocoRef     = useRef<unknown>(null);          // tf ObjectDetection model
  const streamRef   = useRef<MediaStream | null>(null);
  const audioRef    = useRef<AudioContext | null>(null);
  const mountedRef  = useRef(true);
  const cbRef       = useRef(onMetrics);
  cbRef.current     = onMetrics;

  // Smoothing buffers
  const smEAR   = useRef(new SmoothBuffer(SMOOTHING));
  const smMAR   = useRef(new SmoothBuffer(SMOOTHING));
  const smPitch = useRef(new SmoothBuffer(SMOOTHING));
  const smYaw   = useRef(new SmoothBuffer(SMOOTHING));
  const smRoll  = useRef(new SmoothBuffer(SMOOTHING));

  // Session
  const sessionStartRef  = useRef(0);
  const frameTimesRef    = useRef<number[]>([]);
  const hudThrottleRef   = useRef(0);
  const lastAlertRef     = useRef(0);
  const lastAudioRef     = useRef(0);
  const lastVoiceRef = useRef(0);
  const phoneFrameRef    = useRef(0);    // consecutive phone-detected frames
  const phoneStartRef    = useRef<number | null>(null);
  const phoneAlertRef    = useRef(0);
  const phoneBoxRef      = useRef<PhoneBox | null>(null);

  // Blink
  const blinkCountRef      = useRef(0);
  const blinkTimestampsRef = useRef<number[]>([]);
  const blinkDurationsRef  = useRef<number[]>([]);
  const eyeClosedAtRef     = useRef<number | null>(null);
  const wasClosedRef       = useRef(false);

  // Yawn — uses BOTH MAR and jawOpen blendshape
  const yawnCountRef   = useRef(0);
  const yawnStartRef   = useRef<number | null>(null);
  const wasYawningRef  = useRef(false);
  const consecYawnRef  = useRef(0);

  // PERCLOS
  const perclosFramesRef = useRef<{ t: number; closed: boolean }[]>([]);

  // Consecutive counters
  const consecDrowsyRef   = useRef(0);
  const consecDistractRef = useRef(0);
  const fatigueRef        = useRef(0);

  const [status, setStatus]       = useState<CameraStatus>("initializing");
  const [errMsg, setErrMsg]       = useState("");
  const [hud, setHud] = useState({
    fps: 0, elapsed: 0, faceDetected: false,
    ear: 0, mar: 0, leftEAR: 0, rightEAR: 0,
    blinkCount: 0, blinkRate: 0, yawnCount: 0,
    pitch: 0, yaw: 0, roll: 0, headStatus: "Forward",
    gazeX: 0, gazeY: 0, fatigue: 0, risk: 0, attention: 100,
    status: "Initializing",
    drowsy: false, distracted: false, microSleep: false,
    perclos: 0, phoneDetected: false, phoneConfirmed: false,
  });

  // ── Audio ─────────────────────────────────────────────────────────────

  const speakAlert = useCallback((message: string) => {
    const now = Date.now();

    if (now - lastVoiceRef.current < 8000) return;

    lastVoiceRef.current = now;

    window.speechSynthesis.cancel();

    const speech = new SpeechSynthesisUtterance(message);

    speech.lang = "en-US";
    speech.rate = 1.0;
    speech.pitch = 1.0;
    speech.volume = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const female =
      voices.find((v) => v.name.includes("Google US English")) ||
      voices.find((v) => v.name.includes("Microsoft Zira")) ||
      voices.find((v) => v.lang === "en-US");

    if (female) speech.voice = female;

    window.speechSynthesis.speak(speech);
  }, []);

  const playAlert = useCallback(() => {
    window.speechSynthesis.cancel();
  }, []);

  // ── Phone detection (TF COCO-SSD, runs every 10th frame) ─────────────

  const phoneFrameCountRef = useRef(0);

  const detectPhone = useCallback(async (video: HTMLVideoElement, W: number, H: number) => {
    const model = cocoRef.current as {
      detect: (img: HTMLVideoElement) => Promise<{ class: string; score: number; bbox: [number,number,number,number] }[]>;
    } | null;
    if (!model) return;

    phoneFrameCountRef.current++;
    if (phoneFrameCountRef.current % 10 !== 0) return; // run every 10th frame

    try {
      const preds = await model.detect(video);
      const phone = preds
        .filter((p) => p.class === "cell phone" && p.score > 0.45)
        .sort((a, b) => b.score - a.score)[0];

      if (phone) {
        const [bx, by, bw, bh] = phone.bbox;
        phoneBoxRef.current = {
          x: bx / W, y: by / H,
          w: bw / W, h: bh / H,
          score: phone.score,
        };
        phoneFrameRef.current++;
        if (phoneStartRef.current === null) phoneStartRef.current = performance.now();
      } else {
        phoneFrameRef.current = Math.max(0, phoneFrameRef.current - 3);
        if (phoneFrameRef.current === 0) {
          phoneBoxRef.current = null;
          phoneStartRef.current = null;
        }
      }
    } catch { /* model not ready yet */ }
  }, []);

  // ── Main draw pass ────────────────────────────────────────────────────

  const draw = useCallback((
    result: FaceLandmarkerResult | null,
    video: HTMLVideoElement,
    drowsy: boolean, distracted: boolean, yawning: boolean,
    phoneConfirmed: boolean,
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (result?.faceLandmarks?.length)
      drawFaceMesh(ctx, result.faceLandmarks[0], canvas.width, canvas.height, drowsy, distracted, yawning);
    if (phoneBoxRef.current)
      drawPhoneBox(ctx, phoneBoxRef.current, canvas.width, canvas.height, phoneConfirmed);
  }, []);

  // ── Detection loop ─────────────────────────────────────────────────────

  const detectFrame = useCallback(() => { 
    if (!isDetecting) {
  const ctx = canvasRef.current?.getContext("2d");

  if (ctx && canvasRef.current) {
    ctx.clearRect(
      0,
      0,
      canvasRef.current.width,
      canvasRef.current.height
    );
  }

  phoneBoxRef.current = null;

  rafRef.current = requestAnimationFrame(detectFrame);
  return;
}
    const video = videoRef.current, lm = lmRef.current;
    if (!video || !lm || !mountedRef.current) return;
    if (video.readyState < 2 || video.videoWidth === 0) {
      rafRef.current = requestAnimationFrame(detectFrame); return;
    }

    const now = performance.now();
    frameTimesRef.current.push(now);
    frameTimesRef.current = frameTimesRef.current.filter((t) => now - t < 1000);

    let result: FaceLandmarkerResult | null = null;
    try { result = lm.detectForVideo(video, now); }
    catch { rafRef.current = requestAnimationFrame(detectFrame); return; }

    // Run phone detection asynchronously (non-blocking)
    detectPhone(video, video.videoWidth, video.videoHeight);

    // ── Phone state ──────────────────────────────────────────────────
    const phoneDetected   = phoneFrameRef.current > 3;
    const phoneDuration   = phoneStartRef.current && phoneDetected
      ? (now - phoneStartRef.current) / 1000 : 0;
    const phoneConfirmed  = phoneDuration >= PHONE_ALERT_SEC;

    if (phoneConfirmed && Date.now() - phoneAlertRef.current > ALERT_COOLDOWN_MS) {
      phoneAlertRef.current = Date.now();
      playAlert();
      if (audioEnabled) {
        speakAlert("Warning! Phone usage detected. Please focus on driving.");
      }
      alerts.create({
        trip_id: TRIP_ID,
        alert_type: "phone_usage",
        severity: "high",
        message: "Phone usage detected while driving",
        confidence: phoneBoxRef.current?.score ?? 0.8,
      }).catch((e) => console.warn("Phone alert failed:", e));
    }

    const hasFace = !!(result?.faceLandmarks?.length);
    let leftEAR = 1, rightEAR = 1, earVal = 1, marVal = 0, jawOpen = 0;
    let pitch = 0, yaw = 0, roll = 0, gazeX = 0, gazeY = 0, confidence = 0;
    let drowsy = false, yawning = false, distracted = false, microSleep = false;
    let headStatus = "Forward", perclos = 0;

    if (hasFace) {
      const LM = result!.faceLandmarks[0];

      // Raw metrics
      leftEAR  = calcEAR(LEFT_EYE_EAR.map((i) => LM[i]));
      rightEAR = calcEAR(RIGHT_EYE_EAR.map((i) => LM[i]));
      const rawEAR = (leftEAR + rightEAR) / 2;
      const rawMAR = calcMAR(MOUTH_MAR.map((i) => LM[i]));
      const { pitch: rPitch, yaw: rYaw, roll: rRoll } = calcHeadPose(LM);

      // Smoothed values
      earVal = smEAR.current.push(rawEAR);
      marVal = smMAR.current.push(rawMAR);
      pitch  = smPitch.current.push(rPitch);
      yaw    = smYaw.current.push(rYaw);
      roll   = smRoll.current.push(rRoll);

      // jawOpen blendshape (extra yawn confirmation)
      if (result?.faceBlendshapes?.length) {
        const cats = result.faceBlendshapes[0].categories;
        jawOpen = cats.find((c) => c.categoryName === "jawOpen")?.score ?? 0;
        const variance = cats.reduce((s, c) => s + Math.abs(c.score - 0.5), 0) / cats.length;
        confidence = Math.round(Math.min(100, 55 + variance * 90));
      } else { confidence = 80; }

      // Gaze
      if (LM.length > 473) {
        const lg = calcGaze(LM, LM[LEFT_IRIS_CENTER],  LEFT_EYE_LEFT,  LEFT_EYE_RIGHT,  LEFT_EYE_TOP,  LEFT_EYE_BOT);
        const rg = calcGaze(LM, LM[RIGHT_IRIS_CENTER], RIGHT_EYE_LEFT, RIGHT_EYE_RIGHT, RIGHT_EYE_TOP, RIGHT_EYE_BOT);
        gazeX = (lg.x + rg.x) / 2; gazeY = (lg.y + rg.y) / 2;
      }

      const eyesClosed = earVal < EAR_CLOSED;
      // Yawn requires BOTH MAR AND jawOpen to be above threshold — reduces false positives
      const mouthYawning = marVal > MAR_YAWN && jawOpen > JAW_YAWN;

      // PERCLOS
      perclosFramesRef.current.push({ t: now, closed: eyesClosed });
      perclosFramesRef.current = perclosFramesRef.current.filter((f) => now - f.t < PERCLOS_WINDOW_MS);
      const cf = perclosFramesRef.current;
      perclos = cf.length > 0 ? Math.round((cf.filter((f) => f.closed).length / cf.length) * 100) : 0;

      // Blink (rising edge, duration-gated < 400ms)
      if (eyesClosed && !wasClosedRef.current) eyeClosedAtRef.current = now;
      if (!eyesClosed && wasClosedRef.current && eyeClosedAtRef.current) {
        const dur = now - eyeClosedAtRef.current;
        if (dur < BLINK_MAX_MS) {
          blinkCountRef.current++;
          blinkTimestampsRef.current.push(now);
          blinkDurationsRef.current.push(dur);
          blinkTimestampsRef.current = blinkTimestampsRef.current.filter((t) => now - t < 60000);
          blinkDurationsRef.current  = blinkDurationsRef.current.slice(-blinkTimestampsRef.current.length);
        }
        eyeClosedAtRef.current = null;
      }
      wasClosedRef.current = eyesClosed;

      const eyeClosureSec = eyeClosedAtRef.current ? (now - eyeClosedAtRef.current) / 1000 : 0;
      microSleep = eyeClosureSec >= MICRO_SLEEP_SEC;

      // ── Yawn detection (MAR + jawOpen + consecutive frames) ──────────
      // IMPORTANT: yawn gets priority over head-down detection
      if (mouthYawning && !wasYawningRef.current) {
        yawnStartRef.current = now;
        yawnCountRef.current++;
      }
      wasYawningRef.current = mouthYawning;
      const yawnDuration = yawnStartRef.current && mouthYawning ? (now - yawnStartRef.current) / 1000 : 0;

      consecYawnRef.current    = mouthYawning ? consecYawnRef.current + 1    : Math.max(0, consecYawnRef.current - 3);
      consecDrowsyRef.current  = earVal < EAR_DROWSY ? consecDrowsyRef.current + 1 : Math.max(0, consecDrowsyRef.current - 2);

      yawning = consecYawnRef.current >= YAWN_FRAMES;
      if (yawning) {
        if (audioEnabled) {
          speakAlert("Alert! Frequent yawning detected.");
        }
      }
      drowsy  = consecDrowsyRef.current >= DROWSY_FRAMES || microSleep;

      // ── Head pose — only trigger Head Down when NOT yawning ──────────
      // Yawning naturally causes head to tilt forward; skip head-down in that case.
    const isHeadDown =
  pitch > 38 &&
  !mouthYawning &&
  jawOpen < 0.45 &&
  marVal < 0.55;

const isHeadUp = pitch < PITCH_UP;
const isRight = yaw > 10;
const isLeft = yaw < -10;

if (mouthYawning) {
  headStatus = "Forward";
}
else if (isHeadDown) {
  headStatus = "Down";
}
else if (isHeadUp) {
  headStatus = "Up";
}
else if (isRight) {
  headStatus = "Right";
}
else if (isLeft) {
  headStatus = "Left";
}
else {
  headStatus = "Forward";
}

      consecDistractRef.current = headStatus !== "Forward"
        ? consecDistractRef.current + 1
        : Math.max(0, consecDistractRef.current - 2);
      distracted = consecDistractRef.current >= DISTRACT_FRAMES;

      // Fatigue EMA
      const ft = (drowsy ? 65 : earVal < EAR_DROWSY ? 35 : 0)
        + (yawning ? 20 : 0) + (microSleep ? 15 : 0) + (perclos > 15 ? perclos * 0.3 : 0);
      fatigueRef.current = fatigueRef.current * 0.93 + Math.min(100, ft) * 0.07;

      const blinksLastMin = blinkTimestampsRef.current.filter((t) => now - t < 60000).length;
      const avgBlinkDur   = blinkDurationsRef.current.length
        ? blinkDurationsRef.current.reduce((a, b) => a + b, 0) / blinkDurationsRef.current.length : 0;

      // ── Priority: MicroSleep > Drowsy > Phone > Yawning > Distracted ──
      const driverStatus =
  !hasFace
    ? "No face"
    : microSleep
    ? "Micro-sleep!"
    : drowsy
    ? "Drowsy"
    : yawning
    ? "Yawning"
    : phoneConfirmed
    ? "Phone Usage!"
    : headStatus === "Down"
    ? "Head Down"
    : headStatus === "Up"
    ? "Head Up"
    : headStatus === "Left"
    ? "Looking Left"
    : headStatus === "Right"
    ? "Looking Right"
    : fatigueRef.current > 50
    ? "Fatigued"
    : "Alert";

      const riskScore = Math.min(100, Math.round(
        (microSleep ? 30 : 0) + (drowsy ? 35 : 0) + (phoneConfirmed ? 25 : 0)
        + (yawning ? 15 : 0) + (distracted ? 15 : 0)
        + fatigueRef.current * 0.2 + (perclos > 15 ? perclos * 0.4 : 0)
      ));

      const attentionScore = Math.max(0, Math.round(
        100 - (distracted ? 35 : 0) - (drowsy ? 25 : 0) - (yawning ? 10 : 0)
        - (phoneConfirmed ? 30 : 0) - Math.abs(gazeX) * 15 - Math.abs(gazeY) * 10
      ));

      const metrics: DriverMetrics = {
        ear: +earVal.toFixed(3), leftEAR: +leftEAR.toFixed(3), rightEAR: +rightEAR.toFixed(3),
        eyeClosureSeconds: +eyeClosureSec.toFixed(2), perclos,
        blinkCount: blinkCountRef.current, blinkRatePerMin: blinksLastMin,
        avgBlinkDuration: Math.round(avgBlinkDur),
        mar: +marVal.toFixed(3), jawOpen: +jawOpen.toFixed(3),
        yawnCount: yawnCountRef.current, yawnDurationSeconds: +yawnDuration.toFixed(1),
        headPitch: +pitch.toFixed(1), headYaw: +yaw.toFixed(1), headRoll: +roll.toFixed(1),
        headPoseStatus: headStatus as DriverMetrics["headPoseStatus"],
        gazeX: +gazeX.toFixed(3), gazeY: +gazeY.toFixed(3),
        fatigueScore: Math.round(fatigueRef.current), riskScore, attentionScore, confidence,
        faceDetected: hasFace, drowsy, yawning, distracted, microSleep,
        phoneDetected, phoneDurationSeconds: +phoneDuration.toFixed(1),
        driverStatus,
      };

      cbRef.current?.(metrics);

      // Backend alerts
      if ((drowsy || microSleep) && Date.now() - lastAlertRef.current > ALERT_COOLDOWN_MS) {
        playAlert();

if (microSleep) {
  if (audioEnabled) {
    speakAlert("Critical warning. Micro sleep detected.");
  }
} else {
  if (audioEnabled) {
    speakAlert("Warning! Driver drowsiness detected.");
  }
}
        lastAlertRef.current = Date.now();
        alerts.create({
          trip_id: TRIP_ID,
          alert_type: "drowsiness",
          severity: microSleep ? "critical" : "high",
          message: microSleep ? "Micro-sleep detected!" : "Driver appears drowsy",
          confidence: microSleep ? 0.99 : 0.94,
        }).catch((e) => console.warn("Alert failed:", e));
      }

      // HUD update throttled ~6fps
      if (now - hudThrottleRef.current > 160) {
        hudThrottleRef.current = now;
        setHud({
          fps: frameTimesRef.current.length,
          elapsed: Math.floor((now - sessionStartRef.current) / 1000),
          faceDetected: hasFace,
          ear: metrics.ear, mar: metrics.mar,
          leftEAR: metrics.leftEAR, rightEAR: metrics.rightEAR,
          blinkCount: metrics.blinkCount, blinkRate: blinksLastMin,
          yawnCount: metrics.yawnCount,
          pitch, yaw, roll, headStatus,
          gazeX, gazeY,
          fatigue: Math.round(fatigueRef.current), risk: riskScore, attention: attentionScore,
          status: driverStatus, drowsy, distracted, microSleep, perclos,
          phoneDetected, phoneConfirmed,
        });
      }
    } else {
      fatigueRef.current = Math.max(0, fatigueRef.current - 0.5);
      if (now - hudThrottleRef.current > 500) {
        hudThrottleRef.current = now;
        setHud((h) => ({
          ...h, faceDetected: false,
          fps: frameTimesRef.current.length,
          elapsed: Math.floor((now - sessionStartRef.current) / 1000),
          status: "No face", phoneDetected, phoneConfirmed,
        }));
      }
    }

    draw(result, video, drowsy, distracted, yawning, phoneConfirmed);
    rafRef.current = requestAnimationFrame(detectFrame);
  }, [
  draw,
  playAlert,
  detectPhone,
  speakAlert,
  isDetecting,
  audioEnabled,
]);

  // ── Init ───────────────────────────────────────────────────────────────

  useEffect(() => {
    mountedRef.current = true;

    async function init() {
      try {
        // Camera
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720, facingMode: "user" }, audio: false,
        });
        if (!mountedRef.current) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;

        // MediaPipe face landmarker
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm"
        );
        const fl = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task",
            delegate: "GPU",
          },
          runningMode: "VIDEO", numFaces: 1,
          outputFaceBlendshapes: true, outputFacialTransformationMatrixes: true,
        });
        if (!mountedRef.current) return;
        lmRef.current = fl;

        // TensorFlow.js COCO-SSD for phone detection (lazy-loaded)
        (async () => {
          try {
            const tf   = await import("@tensorflow/tfjs");
            const coco = await import("@tensorflow-models/coco-ssd");
            await tf.ready();
            cocoRef.current = await coco.load({ base: "lite_mobilenet_v2" });
            console.log("✅ COCO-SSD ready");
          } catch (e) { console.warn("COCO-SSD load failed (phone detection disabled):", e); }
        })();

        // Wait for video
        await new Promise<void>((res) => {
          const v = videoRef.current;
          if (!v || v.readyState >= 2) return res();
          v.onloadeddata = () => res();
        });
        if (!mountedRef.current) return;
        await videoRef.current?.play();

        sessionStartRef.current = performance.now();
        setStatus("ready");
        rafRef.current = requestAnimationFrame(detectFrame);
      } catch (err: unknown) {
        if (!mountedRef.current) return;
        const e = err as { name?: string; message?: string };
        if (e?.name === "NotAllowedError") {
          setStatus("denied"); setErrMsg("Camera permission denied. Allow access and reload.");
        } else {
          setStatus("error"); setErrMsg(e?.message ?? "Initialization failed.");
        }
      }
    }

    init();

    return () => {
      mountedRef.current = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      lmRef.current?.close(); lmRef.current = null;
      audioRef.current?.close().catch(() => {}); audioRef.current = null;
    };
  }, [detectFrame]);

  // ── HUD ───────────────────────────────────────────────────────────────

  const fmt = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, "0")}:${Math.floor(s % 60).toString().padStart(2, "0")}`;

  const riskColor    = hud.risk > 60 ? "text-red-400"     : hud.risk > 30     ? "text-yellow-400" : "text-emerald-400";
  const statusColor  = hud.microSleep ? "text-red-500"    : hud.drowsy         ? "text-red-400"
    : hud.phoneConfirmed ? "text-orange-400" : hud.distracted  ? "text-yellow-400"
    : hud.status === "No face" ? "text-white/40"           : "text-emerald-400";

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="
relative
w-full
h-full
rounded-[32px]
overflow-hidden

bg-[#09090B]

border
border-white/10

shadow-[0_0_60px_rgba(168,85,247,0.25)]

before:absolute
before:inset-0
before:rounded-[32px]
before:border
before:border-pink-500/20
before:pointer-events-none

after:absolute
after:inset-0
after:bg-gradient-to-br
after:from-pink-500/5
after:to-cyan-500/5
after:pointer-events-none
">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`w-full h-full object-cover ${
          !isDetecting ? "opacity-40" : "opacity-100"
        } transition-all duration-300`}
      />
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover pointer-events-none" />
      <div className="absolute inset-0 pointer-events-none">

<div className="
absolute
inset-0
bg-gradient-to-t
from-black/20
via-transparent
to-black/20
"/>

<div className="
absolute
inset-0
bg-[radial-gradient(circle_at_center,transparent_55%,rgba(0,0,0,0.35))]
"/>

</div>

      {/* Loading */}
      {status === "initializing" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/80 backdrop-blur-sm">
          <div className="w-10 h-10 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-white/60 text-sm">Initializing AI models…</p>
        </div>
      )}

      {/* Error */}
      {(status === "denied" || status === "error") && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/90 px-8 text-center">
          <div className="w-12 h-12 rounded-full bg-red-500/15 flex items-center justify-center text-red-400 text-2xl">!</div>
          <p className="text-white font-medium text-sm">{status === "denied" ? "Camera permission required" : "Camera error"}</p>
          <p className="text-white/50 text-xs max-w-xs">{errMsg}</p>
          <button onClick={() => window.location.reload()} className="mt-2 px-4 py-2 rounded-lg bg-violet-500/20 border border-violet-500/40 text-violet-300 text-xs hover:bg-violet-500/30 transition-colors">
            Retry
          </button>
        </div>
      )}

      {/* Live HUD */}
      {status === "ready" && (
        <>
          {/* Top-left: LIVE · FPS · Timer */}
          <div className="absolute top-3 left-3 flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-black/40 backdrop-blur-xl border border-white/10 shadow-lg">
              <div className="relative">

<div className="
absolute
w-3
h-3
bg-red-500
rounded-full
animate-ping
"/>

<div className="
relative
w-3
h-3
bg-red-500
rounded-full
"/>

</div>
              <span className="text-white text-xs font-bold tracking-widest">LIVE</span>
            </div>
            <div className="px-2.5 py-1 rounded-xl bg-black/40
backdrop-blur-xl
border
border-white/10
shadow-lg
rounded-xl">
              <span className="text-white/70 text-xs font-mono">{hud.fps} FPS</span>
            </div>
            <div className="px-2.5 py-1 rounded-xl bg-black/40
backdrop-blur-xl
border
border-white/10
shadow-lg
rounded-xl">
              <span className="text-white/70 text-xs font-mono">{fmt(hud.elapsed)}</span>
            </div>
          </div>

          {/* Top-right: face + driver status */}
          <div className="absolute top-3 right-3 flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-black/40
backdrop-blur-xl
border
border-white/10
shadow-lg
rounded-xl">
              <span className={`w-1.5 h-1.5 rounded-full ${hud.faceDetected ? "bg-emerald-400" : "bg-white/20"}`} />
              <span className="text-white/70 text-xs">{hud.faceDetected ? "Face OK" : "No face"}</span>
            </div>
            <div className="px-3 py-2 rounded-xl bg-black/40
backdrop-blur-xl
border
border-white/10
shadow-lg
rounded-xl">
              <span className={`text-xs font-bold ${statusColor}`}>
  {!isDetecting ? "Stopped" : hud.status}
</span>
            </div>
          </div>

          {/* Micro-sleep banner */}
          {hud.microSleep && (
            <div className="absolute top-14 left-0 right-0 flex justify-center">
              <div className="px-6 py-2 rounded-xl bg-red-600/80 backdrop-blur-md border border-red-500 animate-pulse">
                <span className="text-white text-sm font-bold tracking-widest">⚠ MICRO-SLEEP DETECTED ⚠</span>
              </div>
            </div>
          )}

          {/* Phone confirmed banner */}
          {hud.phoneConfirmed && !hud.microSleep && (
            <div className="absolute top-14 left-0 right-0 flex justify-center">
              <div className="px-6 py-2 rounded-xl bg-orange-600/80 backdrop-blur-md border border-orange-500 animate-pulse">
                <span className="text-white text-sm font-bold tracking-widest">📱 PHONE USAGE DETECTED</span>
              </div>
            </div>
          )}

          {/* Bottom HUD — Row 1: eye / mouth metrics */}
          <div className="absolute bottom-3 left-3 right-3">
            <div className="flex gap-2 mb-2 flex-wrap">
              {[
                { label: "EAR",    value: hud.ear.toFixed(2),     warn: hud.ear < EAR_DROWSY },
                { label: "L-EAR",  value: hud.leftEAR.toFixed(2), warn: hud.leftEAR < EAR_DROWSY },
                { label: "R-EAR",  value: hud.rightEAR.toFixed(2),warn: hud.rightEAR < EAR_DROWSY },
                { label: "MAR",    value: hud.mar.toFixed(2),     warn: hud.mar > MAR_YAWN },
                { label: "Blinks", value: hud.blinkCount,         warn: false },
                { label: "/min",   value: hud.blinkRate,          warn: hud.blinkRate < 5 },
                { label: "Yawns",  value: hud.yawnCount,          warn: hud.yawnCount > 2 },
                { label: "PERCLOS",value: `${hud.perclos}%`,      warn: hud.perclos > 15 },
              ].map(({ label, value, warn }) => (
                <div key={label} className="px-2.5 py-1.5 rounded-xl bg-black/40
backdrop-blur-xl
border
border-white/10
shadow-lg
rounded-xl">
                  <p className="text-white/35 text-[9px] uppercase tracking-wide leading-none mb-0.5">{label}</p>
                  <p className={`text-sm font-bold font-mono leading-none ${warn ? "text-red-400" : "text-white"}`}>{value}</p>
                </div>
              ))}
            </div>

            {/* Row 2: head pose + gaze + scores */}
            <div className="flex gap-2 flex-wrap items-end justify-between">
              <div className="flex gap-2 flex-wrap">
                {[
                  { label: "Pitch",  value: `${hud.pitch > 0 ? "↓" : "↑"}${Math.abs(hud.pitch).toFixed(1)}°`, warn: Math.abs(hud.pitch) > PITCH_DOWN },
                  { label: "Yaw",    value: `${hud.yaw > 0 ? "→" : "←"}${Math.abs(hud.yaw).toFixed(1)}°`,    warn: Math.abs(hud.yaw) > YAW_SIDE },
                  { label: "Roll",   value: `${hud.roll.toFixed(1)}°`,                                          warn: Math.abs(hud.roll) > 15 },
                  { label: "Head",   value: hud.headStatus,                                                     warn: hud.headStatus !== "Forward" },
                  { label: "Gaze X", value: hud.gazeX.toFixed(2),                                              warn: Math.abs(hud.gazeX) > 0.5 },
                  { label: "Gaze Y", value: hud.gazeY.toFixed(2),                                              warn: Math.abs(hud.gazeY) > 0.5 },
                  { label: "Phone",  value: hud.phoneDetected ? "YES" : "No",                                  warn: hud.phoneConfirmed },
                ].map(({ label, value, warn }) => (
                  <div key={label} className="px-2.5 py-1.5 rounded-xl bg-black/40
backdrop-blur-xl
border
border-white/10
shadow-lg
rounded-xl">
                    <p className="text-white/35 text-[9px] uppercase tracking-wide leading-none mb-0.5">{label}</p>
                    <p className={`text-sm font-bold font-mono leading-none ${warn ? "text-orange-400" : "text-white"}`}>{value}</p>
                  </div>
                ))}
              </div>

              {/* Scores */}
              <div className="flex gap-2">
                <div className="px-3 py-1.5 rounded-xl bg-black/40
backdrop-blur-xl
border
border-white/10
shadow-lg
rounded-xl">
                  <p className="text-white/35 text-[9px] uppercase tracking-wide leading-none mb-0.5">Fatigue</p>
                  <p className={`text-sm font-bold font-mono ${hud.fatigue > 60 ? "text-red-400" : hud.fatigue > 30 ? "text-yellow-400" : "text-emerald-400"}`}>{hud.fatigue}%</p>
                </div>
                <div className="px-3 py-1.5 rounded-xl bg-black/40
backdrop-blur-xl
border
border-white/10
shadow-lg
rounded-xl">
                  <p className="text-white/35 text-[9px] uppercase tracking-wide leading-none mb-0.5">Attn</p>
                  <p className={`text-sm font-bold font-mono ${hud.attention < 50 ? "text-red-400" : hud.attention < 70 ? "text-yellow-400" : "text-emerald-400"}`}>{hud.attention}%</p>
                </div>
                <div className="px-3 py-1.5 rounded-xl bg-black/40
backdrop-blur-xl
border
border-white/10
shadow-lg
rounded-xl">
                  <p className="text-white/35 text-[9px] uppercase tracking-wide leading-none mb-0.5">Risk</p>
                  <p className={`text-sm font-bold font-mono ${riskColor}`}>{hud.risk}%</p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}