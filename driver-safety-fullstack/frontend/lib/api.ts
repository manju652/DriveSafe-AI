/**
 * Driver Safety AI — typed API client
 * Connects the Next.js frontend to the FastAPI backend.
 * All endpoints mirror app/schemas/schemas.py.
 */

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";
const WS_BASE = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8000/api/v1/ws";

// ─── Types ────────────────────────────────────────────────────────────────────

export type UserRole = "admin" | "fleet_manager" | "driver" | "viewer";
export type AlertType =
  | "drowsiness" | "distraction" | "yawning" | "head_down"
  | "phone_usage" | "seatbelt" | "microsleep" | "unknown_driver";
export type AlertSeverity = "low" | "medium" | "high" | "critical";
export type TripStatus = "active" | "completed" | "aborted";

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: string;
}
export interface User {
  id: string; email: string; full_name: string;
  role: UserRole; is_active: boolean; is_verified: boolean; created_at: string;
}
export interface Driver {
  id: string; employee_id: string; full_name: string;
  phone: string | null; license_number: string | null;
  safety_score: number; total_trips: number; total_alerts: number;
  is_active: boolean; created_at: string;
}
export interface Vehicle {
  id: string; plate_number: string; make: string | null;
  model: string | null; year: number | null; device_id: string | null;
  is_active: boolean; created_at: string;
}
export interface Trip {
  id: string; driver_id: string; vehicle_id: string;
  status: TripStatus; started_at: string; ended_at: string | null;
  duration_seconds: number | null; distance_km: number | null;
  safety_score: number | null; avg_attention: number | null;
  avg_fatigue: number | null; seatbelt_compliant: boolean | null;
  total_alerts: number;
}
export interface Alert {
  id: string; trip_id: string; alert_type: AlertType;
  severity: AlertSeverity; message: string; confidence: number;
  ear_value: number | null; mar_value: number | null;
  head_pitch: number | null; head_yaw: number | null;
  frame_number: number | null; acknowledged: boolean; timestamp: string;
}
export interface FleetStats {
  total_drivers: number; active_trips: number;
  total_alerts_today: number; avg_safety_score: number;
  top_alert_type: string | null; incidents_prevented_estimate: number;
}

// ─── Token storage (browser only) ────────────────────────────────────────────

let _accessToken: string | null = null;
let _refreshToken: string | null = null;

export function setTokens(pair: TokenPair) {
  _accessToken = pair.access_token;
  _refreshToken = pair.refresh_token;
  if (typeof window !== "undefined") {
    localStorage.setItem("dsai_access", pair.access_token);
    localStorage.setItem("dsai_refresh", pair.refresh_token);
  }
}

export function loadTokens() {
  if (typeof window !== "undefined") {
    _accessToken = localStorage.getItem("dsai_access");
    _refreshToken = localStorage.getItem("dsai_refresh");
  }
}

export function clearTokens() {
  _accessToken = null; _refreshToken = null;
  if (typeof window !== "undefined") {
    localStorage.removeItem("dsai_access");
    localStorage.removeItem("dsai_refresh");
  }
}

export function isLoggedIn(): boolean {
  loadTokens();
  return !!_accessToken;
}

// ─── Core fetch wrapper ───────────────────────────────────────────────────────

async function request<T>(
  path: string,
  options: RequestInit = {},
  auth = true,
): Promise<T> {
  loadTokens();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (auth && _accessToken) headers["Authorization"] = `Bearer ${_accessToken}`;

  const res = await fetch(`${BASE}${path}`, { ...options, headers });

  // Auto-refresh on 401
  if (res.status === 401 && _refreshToken && auth) {
    const refreshed = await fetch(`${BASE}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: _refreshToken }),
    });
    if (refreshed.ok) {
      const pair: TokenPair = await refreshed.json();
      setTokens(pair);
      headers["Authorization"] = `Bearer ${pair.access_token}`;
      const retry = await fetch(`${BASE}${path}`, { ...options, headers });
      if (!retry.ok) throw new Error(await retry.text());
      return retry.json() as Promise<T>;
    } else {
      clearTokens();
      throw new Error("Session expired — please log in again");
    }
  }

  if (!res.ok) {
    const body = await res.text();
    let msg = body;
    try { msg = JSON.parse(body)?.detail ?? body; } catch { /* ok */ }
    throw new Error(msg);
  }

  if (res.status === 204) return undefined as unknown as T;
  return res.json() as Promise<T>;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const auth = {
  register: (email: string, password: string, full_name: string) =>
    request<User>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, full_name }),
    }, false),

  login: async (email: string, password: string): Promise<User> => {
    const pair = await request<TokenPair>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }, false);
    setTokens(pair);
    return request<User>("/auth/me");
  },

  me: () => request<User>("/auth/me"),

  logout: () => { clearTokens(); },
};

// ─── Drivers ─────────────────────────────────────────────────────────────────

export const drivers = {
  list:   () => request<Driver[]>("/drivers"),
  get:    (id: string) => request<Driver>(`/drivers/${id}`),
  create: (data: { employee_id: string; full_name: string; phone?: string }) =>
    request<Driver>("/drivers", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Driver>) =>
    request<Driver>(`/drivers/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
};

// ─── Vehicles ─────────────────────────────────────────────────────────────────

export const vehicles = {
  list:   () => request<Vehicle[]>("/vehicles"),
  create: (data: { plate_number: string; make?: string; model?: string; year?: number }) =>
    request<Vehicle>("/vehicles", { method: "POST", body: JSON.stringify(data) }),
};

// ─── Trips ────────────────────────────────────────────────────────────────────

export const trips = {
  list:  (params?: { driver_id?: string; status?: TripStatus }) => {
    const q = new URLSearchParams(params as Record<string, string>).toString();
    return request<Trip[]>(`/trips${q ? "?" + q : ""}`);
  },
  get:   (id: string) => request<Trip>(`/trips/${id}`),
  start: (driver_id: string, vehicle_id: string) =>
    request<Trip>("/trips/start", { method: "POST", body: JSON.stringify({ driver_id, vehicle_id }) }),
  end:   (id: string, distance_km?: number) =>
    request<Trip>(`/trips/${id}/end`, { method: "POST", body: JSON.stringify({ distance_km }) }),
};

// ─── Alerts ───────────────────────────────────────────────────────────────────

export const alerts = {
  forTrip: (trip_id: string) => request<Alert[]>(`/alerts/trip/${trip_id}`),
  acknowledge: (id: string) => request<Alert>(`/alerts/${id}/acknowledge`, { method: "PATCH" }),
  create: (data: {
    trip_id: string;
    alert_type: AlertType;
    severity: AlertSeverity;
    message: string;
    confidence: number;
  }) => request<Alert>("/alerts", { method: "POST", body: JSON.stringify(data) }),
};

// ─── Analytics ────────────────────────────────────────────────────────────────

export const analytics = {
  fleet:  () => request<FleetStats>("/analytics/fleet"),
  driver: (id: string) => request<unknown>(`/analytics/driver/${id}`),
  alertsSummary: (days = 7) => request<{ alert_type: string; count: number }[]>(
    `/analytics/alerts/summary?days=${days}`
  ),
};

// ─── WebSocket helpers ────────────────────────────────────────────────────────

export type WSEvent =
  | { event: "alert"; data: Alert }
  | { event: "metrics"; data: Record<string, number | boolean> }
  | { event: "pong" };

/**
 * Connect to the real-time trip WebSocket.
 * Returns an unsubscribe function.
 */
export function connectTripWS(
  trip_id: string,
  onMessage: (msg: WSEvent) => void,
  onError?: (err: Event) => void,
): () => void {
  const ws = new WebSocket(`${WS_BASE}/trip/${trip_id}`);

  ws.onmessage = (e) => {
    try { onMessage(JSON.parse(e.data) as WSEvent); } catch { /* skip */ }
  };
  ws.onerror = onError ?? console.error;

  // Keepalive ping every 25s
  const ping = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ event: "ping" }));
  }, 25_000);

  return () => { clearInterval(ping); ws.close(); };
}

/**
 * Connect to the fleet manager dashboard WebSocket.
 */
export function connectDashboardWS(
  user_id: string,
  onMessage: (msg: WSEvent) => void,
): () => void {
  const ws = new WebSocket(`${WS_BASE}/dashboard/${user_id}`);
  ws.onmessage = (e) => {
    try { onMessage(JSON.parse(e.data) as WSEvent); } catch { /* skip */ }
  };
  const ping = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ event: "ping" }));
  }, 25_000);
  return () => { clearInterval(ping); ws.close(); };
}
