"use client";
import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield, Activity, AlertTriangle, Users,
  Car, Zap, Eye, CheckCircle2, XCircle,
  LogOut, RefreshCw, Wifi, WifiOff,
} from "lucide-react";
import {
  auth, drivers, trips, analytics,alerts,connectDashboardWS,
  isLoggedIn, loadTokens, type Driver, type Trip,
  type FleetStats, type WSEvent, type Alert,
} from "@/lib/api";
import DriverCamera from "@/components/DriverCamera";

// ─── Login form ───────────────────────────────────────────────────────────────
function LoginForm({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isDetecting, setIsDetecting] = useState(true);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      await auth.login(email, password);
      onLogin();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020008] grid-bg flex items-center justify-center px-4">
      <div className="aurora"><div className="aurora-1"/><div className="aurora-2"/></div>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-sm"
      >
        <div className="glass-bright rounded-3xl p-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-600 to-pink-500 flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-white font-bold text-lg">DriverSafety<span className="text-violet-400">AI</span></div>
              <div className="text-white/40 text-sm">Fleet Dashboard</div>
            </div>
          </div>

          <form onSubmit={submit} className="flex flex-col gap-4">
            <div>
              <label className="text-white/50 text-sm mb-1.5 block">Email</label>
              <input
                type="email" required value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-white/5 border border-violet-500/20 rounded-xl px-4 py-3 text-white text-sm placeholder-white/20 outline-none focus:border-violet-500/60 transition-colors"
                placeholder="fleet@company.com"
              />
            </div>
            <div>
              <label className="text-white/50 text-sm mb-1.5 block">Password</label>
              <input
                type="password" required value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-white/5 border border-violet-500/20 rounded-xl px-4 py-3 text-white text-sm placeholder-white/20 outline-none focus:border-violet-500/60 transition-colors"
                placeholder="••••••••"
              />
            </div>
            {error && <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}
            <button
              type="submit" disabled={loading}
              className="btn-glow text-white font-semibold py-3 text-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <p className="text-white/25 text-sm text-center mt-5">
            No account? Register at{" "}
            <span className="text-violet-400 font-mono">localhost:8000/docs</span>
          </p>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, color }: {
  label: string; value: string | number; icon: React.ElementType; color: string;
}) {
  return (
    <div className="
glass
card-lift
rounded-3xl
p-3 h-[170px]
hover:scale-[1.02]
transition-all
duration-300
">
      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} p-0.5 mb-3`}>
        <div className="w-full h-full rounded-xl bg-[#0d0118]/80 flex items-center justify-center">
          <Icon className="w-4 h-4 text-white" />
        </div>
      </div>
      <div className="text-5xl font-black text-white mb-0.5">{value}</div>
      <div className="text-white/40 text-sm">{label}</div>
    </div>
  );
}

// ─── Alert badge ──────────────────────────────────────────────────────────────
const severityColors: Record<string, string> = {
  critical: "text-red-400 bg-red-500/10 border-red-500/25",
  high:     "text-orange-400 bg-orange-500/10 border-orange-500/25",
  medium:   "text-yellow-400 bg-yellow-500/10 border-yellow-500/25",
  low:      "text-green-400 bg-green-500/10 border-green-500/25",
};

// ─── Main Dashboard ───────────────────────────────────────────────────────────
function Dashboard() {
  const [stats, setStats] = useState<FleetStats | null>(null);
  const [driverList, setDriverList] = useState<Driver[]>([]);
  const [tripList, setTripList] = useState<Trip[]>([]);
  const [liveAlerts, setLiveAlerts] = useState<Alert[]>([]);
  const [wsConnected, setWsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string>("");
  const [isDetecting, setIsDetecting] = useState<boolean>(true);
  const [audioEnabled, setAudioEnabled] = useState<boolean>(false);

  const onMetrics = useCallback((metrics: any) => {
    // metrics handler (no-op for dashboard)
    // console.log('driver camera metrics', metrics);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const [s, d, t,me] = await Promise.all([
        analytics.fleet(),
        drivers.list(),
        trips.list(),
        auth.me(),
      ]);
      setStats(s);
      setDriverList(d);
      setTripList(t);
      if (t.length > 0) {
         const a = await alerts.forTrip(t[0].id);
       setLiveAlerts(a);
      }
      setUserId(me.id);
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
  refresh();

  const interval = setInterval(() => {
    refresh();
  }, 5000); // every 5 seconds

  return () => clearInterval(interval);
}, [refresh]);
  // Live WebSocket — reconnects when userId is set
  useEffect(() => {
    if (!userId) return;
    let unsub: (() => void) | null = null;

    const connect = () => {
      unsub = connectDashboardWS(userId, (msg: WSEvent) => {
        setWsConnected(true);
        if (msg.event === "alert") {
          setLiveAlerts(prev => [msg.data, ...prev].slice(0, 20));
        }
      });
    };

    connect();
    return () => { unsub?.(); };
  }, [userId]);

  const activeTrips = tripList.filter(t => t.status === "active");

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020008] flex items-center justify-center">
        <div className="flex items-center gap-3 text-white/50">
          <RefreshCw className="w-5 h-5 animate-spin text-violet-400" />
          Loading dashboard...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020008] grid-bg">
      <div className="aurora"><div className="aurora-1"/><div className="aurora-2"/></div>

      {/* Top bar */}
      <div className="relative z-10 navbar-glass sticky top-0">
        <div className="max-w-[1800px] mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-pink-500 flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <span className="text-white font-bold">DriverSafety<span className="text-violet-400">AI</span></span>
            <span className="text-white/20 mx-1">•</span>
            <span className="text-white/40 text-sm">Fleet Dashboard</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-xl">
              {wsConnected
                ? <><Wifi className="w-3.5 h-3.5 text-green-400"/><span className="text-green-400">Live</span></>
                : <><WifiOff className="w-3.5 h-3.5 text-white/30"/><span className="text-white/30">Offline</span></>
              }
            </div>
            <button
              onClick={() => { auth.logout(); window.location.reload(); }}
              className="flex items-center gap-1.5 text-white/40 hover:text-white/70 text-sm transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" /> Sign out
            </button>
          </div>
        </div>
      </div>

      <div className="relative z-10 max-w-[1800px] mx-auto px-6 py-8">

        {/* Stats row */}
        {stats && (
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
            <StatCard label="Active Trips"          value={stats.active_trips}                icon={Activity}      color="from-violet-500 to-purple-600" />
            <StatCard label="Total Drivers"         value={stats.total_drivers}               icon={Users}         color="from-pink-500 to-rose-600" />
            <StatCard label="Avg Safety Score"      value={`${stats.avg_safety_score}%`}      icon={Shield}        color="from-cyan-500 to-blue-600" />
            <StatCard label="Alerts Today"          value={stats.total_alerts_today}          icon={AlertTriangle} color="from-orange-500 to-amber-600" />
          </div>
        )}

        <div className="grid grid-cols-12 gap-6">

          {/* Live alerts */}
          <div className="
glass
rounded-3xl
border
border-violet-500/20
p-6
col-span-12
xl:col-span-4
">
            <div className="px-5 py-4 border-b border-violet-500/15 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-400" />
                <span className="text-white font-semibold text-sm">Live Alerts</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400 live-dot" />
                <span className="text-sm text-white/30">realtime</span>
              </div>
            </div>
            <div className="p-4 flex flex-col gap-2 h-[420px] overflow-y-auto">
              <AnimatePresence>
                {liveAlerts.length === 0 ? (
                  <div className="text-center py-8 text-white/25 text-sm">
                    <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-500/40" />
                    No alerts — all drivers safe
                  </div>
                ) : (
                  liveAlerts.map((alert, i) => (
                    <motion.div
                      key={alert.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className={`rounded-xl border px-3 py-2.5 text-sm ${severityColors[alert.severity]}`}
                    >
                      <div className="font-semibold uppercase tracking-wide mb-0.5">
                        {alert.alert_type.replace("_", " ")} · {alert.severity}
                      </div>
                      <div className="opacity-80 leading-snug">{alert.message}</div>
                      <div className="opacity-40 mt-1 font-mono">
                        {new Date(alert.timestamp).toLocaleTimeString()}
                        {alert.confidence && ` · ${Math.round(alert.confidence * 100)}%`}
                      </div>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          </div>
{/* Live alerts */}
<div className="
glass
rounded-3xl
border
border-violet-500/20
p-6
col-span-12
xl:col-span-4
h-[420px]">
  <h2 className="text-lg font-semibold mb-4 text-white">
    Driver Camera
  </h2>

  <div className="h-[340px] rounded-2xl overflow-hidden">
    <DriverCamera
      onMetrics={onMetrics}
      isDetecting={isDetecting}
      audioEnabled={audioEnabled}
    />
  </div>
</div>
          {/* Active trips */}
          <div className="col-span-12
xl:col-span-4 glass rounded-3xl overflow-hidden">
            <div className="px-5 py-4 border-b border-violet-500/15 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Car className="w-4 h-4 text-violet-400" />
                <span className="text-white font-semibold text-sm">Active Trips</span>
              </div>
              <span className="text-sm text-white/30">{activeTrips.length} running</span>
            </div>
            <div className="p-4 flex flex-col gap-3 h-[250px] overflow-y-auto">
              {activeTrips.length === 0 ? (
                <div className="text-center py-8 text-white/25 text-sm">
                  No active trips
                </div>
              ) : (
                activeTrips.map(trip => (
                  <div key={trip.id} className="glass rounded-xl p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-white text-sm font-mono truncate">
                        {trip.id.slice(0, 8)}…
                      </span>
                      <span className="text-green-400 text-sm flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-400 live-dot" />
                        Active
                      </span>
                    </div>
                    <div className="text-white/40 text-sm">
                      Started {new Date(trip.started_at).toLocaleTimeString()}
                    </div>
                    <div className="text-white/40 text-sm">
                      Alerts: <span className={trip.total_alerts > 0 ? "text-yellow-400" : "text-green-400"}>{trip.total_alerts}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        {/* Recent Trips */}
<div className="col-span-12 xl:col-span-8 glass rounded-3xl overflow-hidden">
  <div className="px-6 py-4 border-b border-violet-500/15">
    <span className="text-white font-semibold text-sm">
      Recent Trips
    </span>
  </div>

  <div className="overflow-x-auto h-[250px]">
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-violet-500/10">
          <th className="px-6 py-3 text-left text-white/40">Trip ID</th>
          <th className="px-6 py-3 text-left text-white/40">Status</th>
          <th className="px-6 py-3 text-left text-white/40">Started</th>
          <th className="px-6 py-3 text-left text-white/40">Alerts</th>
          <th className="px-6 py-3 text-left text-white/40">Safety</th>
        </tr>
      </thead>

      <tbody>
        {tripList.slice(0, 10).map((trip) => (
          <tr
            key={trip.id}
            className="border-b border-violet-500/5 hover:bg-white/5"
          >
            <td className="px-6 py-3">
              {trip.id.slice(0, 10)}...
            </td>

            <td className="px-6 py-3">
              {trip.status}
            </td>

            <td className="px-6 py-3">
              {new Date(trip.started_at).toLocaleString()}
            </td>

            <td className="px-6 py-3">
              {trip.total_alerts}
            </td>

            <td className="px-6 py-3">
              {trip.safety_score ?? "--"}%
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
</div>
{/* Drivers */}
          <div className="col-span-12 xl:col-span-4 glass rounded-3xl overflow-hidden">
            <div className="px-5 py-4 border-b border-violet-500/15 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-cyan-400" />
                <span className="text-white font-semibold text-sm">Drivers</span>
              </div>
              <div className="hidden xl:block xl:col-span-12"></div>
              <button onClick={refresh} className="text-white/30 hover:text-white/60 transition-colors">
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="p-4 flex flex-col gap-2 h-[280px] overflow-y-auto">
              {driverList.length === 0 ? (
                <div className="text-center py-8 text-white/25 text-sm">
                  No drivers added yet.<br />
                  <span className="text-violet-400 font-mono text-sm">POST /api/v1/drivers</span>
                </div>
              ) : (
                driverList.map(driver => (
                  <div key={driver.id} className="glass rounded-xl p-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500/30 to-pink-500/20 flex items-center justify-center text-white/60 text-sm font-bold flex-shrink-0">
                      {driver.full_name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-white text-sm font-medium truncate">{driver.full_name}</div>
                      <div className="text-white/35 text-sm">{driver.employee_id} · {driver.total_trips} trips</div>
                    </div>
                    <div className="flex items-center gap-1">
                      {driver.is_active
                        ? <CheckCircle2 className="w-4 h-4 text-green-400" />
                        : <XCircle className="w-4 h-4 text-red-400" />
                      }
                      <span className={`text-sm font-bold ${driver.safety_score >= 80 ? "text-green-400" : driver.safety_score >= 60 ? "text-yellow-400" : "text-red-400"}`}>
                        {Math.round(driver.safety_score)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* API quick links */}
        <div className="mt-6 glass rounded-2xl p-3 flex flex-wrap gap-3 items-center">
          <span className="text-white/30 text-sm">Quick links:</span>
          {[
            ["API Docs",    "http://localhost:8000/docs"],
            ["Health",     "http://localhost:8000/health"],
            ["WS Health",  "http://localhost:8000/health/ws"],
          ].map(([label, url]) => (
            <a key={url} href={url} target="_blank" rel="noopener noreferrer"
              className="text-violet-400 hover:text-violet-300 text-sm font-mono border border-violet-500/20 hover:border-violet-500/50 rounded-lg px-3 py-1.5 transition-all">
              {label} ↗
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Page: auth gate ──────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    loadTokens();
    setAuthed(isLoggedIn());
  }, []);

  if (!authed) return <LoginForm onLogin={() => setAuthed(true)} />;
  return <Dashboard />;
}
