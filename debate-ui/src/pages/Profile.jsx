// debate-ui/src/pages/Profile.jsx
// Drop this file into debate-ui/src/pages/

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Trophy,
  Target,
  TrendingUp,
  TrendingDown,
  Minus,
  Zap,
  BarChart2,
  Calendar,
  Flame,
  Star,
  Award,
  Brain,
  BookOpen,
  ChevronRight,
  Pencil,
} from 'lucide-react';

const CYPRUS = '#004643';
const SAND = '#F0EDE5';
const DUMMY_USER_ID = '8f3c2e7b-6b4a-4c9a-9e6f-2d5c1a8f7e42';
const BASE = 'http://127.0.0.1:8000/api/user';

// ─── Badge icon map ───────────────────────────────────────────────────────────
const BADGE_ICONS = {
  'Fallacy Hunter': { icon: Target, color: '#f59e0b' },
  'Open Mind': { icon: Brain, color: '#8b5cf6' },
  'Depth Seeker': { icon: BookOpen, color: '#3b82f6' },
  'Marathon Debater': { icon: Flame, color: '#ef4444' },
  default: { icon: Award, color: '#10b981' },
};

function getBadgeConfig(name) {
  return BADGE_ICONS[name] || BADGE_ICONS.default;
}

// ─── Tiny bar chart ───────────────────────────────────────────────────────────


function MiniBarChart({ data }) {
  if (!data || data.length === 0)
    return (
      <p className="text-sm" style={{ color: 'rgba(0,70,67,0.4)', fontFamily: "'DM Sans',sans-serif" }}>
        Not enough data yet.
      </p>
    );

  const validData = data.filter((d) => d.argument_strength != null);
  if (validData.length === 0)
    return (
      <p className="text-sm" style={{ color: 'rgba(0,70,67,0.4)', fontFamily: "'DM Sans',sans-serif" }}>
        No strength data recorded yet.
      </p>
    );

  const maxVal = Math.max(...data.map((d) => d.argument_strength || 0), 1);
  const CHART_HEIGHT = 80; // px

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: `${CHART_HEIGHT}px` }}>
      {data.map((d, i) => {
        const strength = d.argument_strength;
        const barHeight = strength != null
          ? Math.max((strength / maxVal) * CHART_HEIGHT, 4)
          : 6;

        const perf = d.performance;
        const color =
          perf === 'excellent' ? '#10b981' :
          perf === 'good'      ? '#60a5fa' :
          perf === 'fair'      ? '#f59e0b' :
          perf === 'poor'      ? '#f87171' :
          'rgba(0,70,67,0.2)';

        return (
          <div
            key={i}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', position: 'relative' }}
            className="group"
          >
            {/* Tooltip */}
            <div
              style={{
                position: 'absolute',
                bottom: '100%',
                left: '50%',
                transform: 'translateX(-50%)',
                marginBottom: '6px',
                backgroundColor: 'white',
                borderRadius: '8px',
                padding: '4px 8px',
                fontSize: '11px',
                color: '#004643',
                boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                whiteSpace: 'nowrap',
                pointerEvents: 'none',
                opacity: 0,
                transition: 'opacity 0.15s',
                zIndex: 10,
                fontFamily: "'DM Sans', sans-serif",
              }}
              className="group-hover:opacity-100"
            >
              {d.topic?.length > 20 ? d.topic.slice(0, 20) + '…' : d.topic}
              <br />
              {strength != null ? `Strength: ${strength.toFixed(1)}` : 'No data'}
            </div>

            {/* Bar */}
            <div
              style={{
                width: '100%',
                height: `${barHeight}px`,
                backgroundColor: strength != null ? color : 'rgba(0,70,67,0.12)',
                borderRadius: '4px 4px 2px 2px',
                transition: 'height 0.6s ease',
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, icon: Icon, accent = CYPRUS }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-5 flex flex-col gap-2"
      style={{ backgroundColor: 'rgba(0,70,67,0.05)', border: '1px solid rgba(0,70,67,0.1)' }}
    >
      <div className="flex items-center justify-between">
        <p
          className="text-xs font-semibold uppercase tracking-widest"
          style={{ color: 'rgba(0,70,67,0.5)', fontFamily: "'DM Sans',sans-serif" }}
        >
          {label}
        </p>
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${accent}18` }}
        >
          <Icon size={14} style={{ color: accent }} />
        </div>
      </div>
      <p
        className="text-3xl font-black"
        style={{ fontFamily: "'Barlow Condensed',sans-serif", color: CYPRUS }}
      >
        {value}
      </p>
      {sub && (
        <p className="text-xs" style={{ color: 'rgba(0,70,67,0.45)', fontFamily: "'DM Sans',sans-serif" }}>
          {sub}
        </p>
      )}
    </motion.div>
  );
}

                  
// ─── Skill ring ───────────────────────────────────────────────────────────────
function SkillRing({ skill = 0.5, label = 'Intermediate' }) {
  const pct = Math.round(skill * 100);
  const r = 52;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-36 h-36">
        <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
          <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(0,70,67,0.12)" strokeWidth="10" />
          <motion.circle
            cx="60"
            cy="60"
            r={r}
            fill="none"
            stroke={CYPRUS}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circ}
            initial={{ strokeDashoffset: circ }}
            animate={{ strokeDashoffset: circ - dash }}
            transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="text-3xl font-black"
            style={{ fontFamily: "'Barlow Condensed',sans-serif", color: CYPRUS }}
          >
            {pct}
          </span>
          <span
            className="text-xs font-semibold uppercase tracking-wider"
            style={{ color: 'rgba(0,70,67,0.5)', fontFamily: "'DM Sans',sans-serif" }}
          >
            /100
          </span>
        </div>
      </div>
      <span
        className="text-sm font-bold uppercase tracking-widest px-3 py-1 rounded-full"
        style={{ backgroundColor: 'rgba(0,70,67,0.1)', color: CYPRUS, fontFamily: "'DM Sans',sans-serif" }}
      >
        {label}
      </span>
    </div>
  );
}

// ─── Performance donut ────────────────────────────────────────────────────────
function PerfBreakdown({ breakdown }) {
  const entries = [
    { key: 'excellent', color: '#10b981', label: 'Excellent' },
    { key: 'good', color: '#60a5fa', label: 'Good' },
    { key: 'fair', color: '#f59e0b', label: 'Fair' },
    { key: 'poor', color: '#f87171', label: 'Poor' },
  ];
  const total = entries.reduce((s, e) => s + (breakdown[e.key] || 0), 0);
  if (total === 0)
    return (
      <p className="text-sm" style={{ color: 'rgba(0,70,67,0.4)', fontFamily: "'DM Sans',sans-serif" }}>
        No completed debates yet.
      </p>
    );

  return (
    <div className="flex flex-col gap-2 w-full">
      {entries.map(({ key, color, label }) => {
        const val = breakdown[key] || 0;
        const pct = total > 0 ? Math.round((val / total) * 100) : 0;
        return (
          <div key={key} className="flex items-center gap-3">
            <span
              className="text-xs w-16 font-semibold"
              style={{ color: 'rgba(0,70,67,0.6)', fontFamily: "'DM Sans',sans-serif" }}
            >
              {label}
            </span>
            <div
              className="flex-1 h-2 rounded-full overflow-hidden"
              style={{ backgroundColor: 'rgba(0,70,67,0.1)' }}
            >
              <motion.div
                className="h-full rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                style={{ backgroundColor: color }}
              />
            </div>
            <span
              className="text-xs w-8 text-right font-bold"
              style={{ color: CYPRUS, fontFamily: "'Barlow Condensed',sans-serif" }}
            >
              {val}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Trend icon ───────────────────────────────────────────────────────────────
function TrendIcon({ trend }) {
  if (trend === 'improving') return <TrendingUp size={16} className="text-green-500" />;
  if (trend === 'declining') return <TrendingDown size={16} className="text-red-400" />;
  return <Minus size={16} style={{ color: 'rgba(0,70,67,0.4)' }} />;
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function Profile() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview'); // overview | achievements | history
   const [editingName, setEditingName] = useState(false);
   const [nameInput, setNameInput] = useState('');
   const [savingName, setSavingName] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${BASE}/${DUMMY_USER_ID}/profile`);
        if (!res.ok) throw new Error(`${res.status}`);
        setProfile(await res.json());
      } catch (e) {
        setError('Could not load profile. Make sure the backend is running.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading)
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: SAND }}
      >
        <link
          href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;800;900&family=DM+Sans:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
        <div className="flex flex-col items-center gap-4">
          <div
            className="w-10 h-10 rounded-full border-4 border-t-transparent animate-spin"
            style={{ borderColor: `${CYPRUS}40`, borderTopColor: CYPRUS }}
          />
          <p style={{ color: CYPRUS, fontFamily: "'DM Sans',sans-serif", opacity: 0.6 }}>
            Loading profile…
          </p>
        </div>
      </div>
    );

  // ── Error ──────────────────────────────────────────────────────────────────
  if (error)
    return (
      <div
        className="min-h-screen flex items-center justify-center p-8"
        style={{ backgroundColor: SAND }}
      >
        <link
          href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;800;900&family=DM+Sans:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
        <div className="text-center max-w-sm">
          <p
            className="text-5xl font-black mb-4"
            style={{ fontFamily: "'Barlow Condensed',sans-serif", color: CYPRUS }}
          >
            Oops
          </p>
          <p style={{ color: 'rgba(0,70,67,0.6)', fontFamily: "'DM Sans',sans-serif" }}>{error}</p>
          <button
            onClick={() => navigate('/')}
            className="mt-6 px-6 py-3 rounded-xl font-bold uppercase tracking-wider text-sm"
            style={{ backgroundColor: CYPRUS, color: SAND, fontFamily: "'DM Sans',sans-serif" }}
          >
            Go Home
          </button>
        </div>
      </div>
    );

  const { user, stats, achievements, recent_debates, growth_trajectory } = profile;
  const tabs = ['overview', 'achievements', 'history'];


   const handleSaveName = async () => {
     const trimmed = nameInput.trim();
     if (!trimmed) return;
     setSavingName(true);
     try {
       const res = await fetch(`http://127.0.0.1:8000/api/user/${DUMMY_USER_ID}/update`, {
         method: 'PATCH',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ username: trimmed }),
       });
       if (res.ok) {
         setProfile(prev => ({
           ...prev,
           user: { ...prev.user, username: trimmed }
         }));
         setEditingName(false);
       }
     } finally {
       setSavingName(false);
     }
   };

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: SAND, fontFamily: "'Barlow Condensed',sans-serif" }}
    >
      <link
        href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;800;900&family=DM+Sans:wght@400;500;600&display=swap"
        rel="stylesheet"
      />

      {/* Grain overlay */}
      <div
        className="fixed inset-0 pointer-events-none opacity-20 z-0"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")`,
        }}
      />

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 py-8">

        {/* ── Header ── */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-10"
        >
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition-all hover:bg-white/60"
            style={{ color: CYPRUS, fontFamily: "'DM Sans',sans-serif", border: '1px solid rgba(0,70,67,0.15)' }}
          >
            <ArrowLeft size={16} /> Back
          </button>
          <h1
            className="text-3xl font-black uppercase tracking-tighter"
            style={{ color: CYPRUS }}
          >
            Profile
          </h1>
          <div className="w-20" />
        </motion.div>

        {/* ── Hero card ── */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-3xl p-7 mb-6 flex flex-col sm:flex-row items-center sm:items-start gap-6"
          style={{ backgroundColor: CYPRUS, color: SAND }}
        >
          {/* Avatar */}
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center shrink-0 text-4xl font-black"
            style={{ backgroundColor: 'rgba(240,237,229,0.15)', fontFamily: "'Barlow Condensed',sans-serif" }}
          >
            {(user.username || 'D').charAt(0).toUpperCase()}
          </div>

          <div className="flex-1 text-center sm:text-left">
   {editingName ? (
     <div className="flex items-center gap-2 mt-1">
       <input
         autoFocus
         value={nameInput}
         onChange={e => setNameInput(e.target.value)}
         onKeyDown={e => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') setEditingName(false); }}
         className="px-3 py-1.5 rounded-lg text-sm font-semibold outline-none"
         style={{ backgroundColor: 'rgba(240,237,229,0.15)', color: SAND, border: '1px solid rgba(240,237,229,0.3)', fontFamily: "'DM Sans',sans-serif", width: '180px' }}
         maxLength={50}
       />
       <button onClick={handleSaveName} disabled={savingName}
         className="px-3 py-1.5 rounded-lg text-xs font-bold uppercase"
         style={{ backgroundColor: 'rgba(240,237,229,0.2)', color: SAND, fontFamily: "'DM Sans',sans-serif" }}>
         {savingName ? '…' : 'Save'}
       </button>
       <button onClick={() => setEditingName(false)}
         className="px-3 py-1.5 rounded-lg text-xs font-bold uppercase"
         style={{ backgroundColor: 'rgba(240,237,229,0.1)', color: 'rgba(240,237,229,0.6)', fontFamily: "'DM Sans',sans-serif" }}>
         Cancel
       </button>
     </div>
   ) : (
     <div className="flex items-center gap-2">
       <p className="text-2xl font-black uppercase tracking-tight">
         {user.username || 'Debater'}
       </p>
       <button
         onClick={() => { setNameInput(user.username || ''); setEditingName(true); }}
         className="opacity-50 hover:opacity-100 transition-opacity"
         title="Edit name"
       >
         <Pencil size={14} color={SAND} />
       </button>
     </div>
   )}
            <p className="text-sm mt-1 opacity-60" style={{ fontFamily: "'DM Sans',sans-serif" }}>
              {user.email || 'Anonymous User'}
            </p>
            <p className="text-xs mt-2 opacity-40" style={{ fontFamily: "'DM Sans',sans-serif" }}>
              Member since{' '}
              {new Date(user.member_since).toLocaleDateString('en-US', {
                month: 'long',
                year: 'numeric',
              })}
            </p>
          </div>

          {/* Skill ring */}
          <div className="shrink-0">
            <SkillRing skill={user.current_skill_level} label={user.skill_label} />
          </div>
        </motion.div>

        {/* ── Tabs ── */}
        <div
          className="flex gap-1 p-1 rounded-2xl mb-6"
          style={{ backgroundColor: 'rgba(0,70,67,0.08)' }}
        >
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold uppercase tracking-widest transition-all"
              style={{
                fontFamily: "'DM Sans',sans-serif",
                backgroundColor: activeTab === t ? CYPRUS : 'transparent',
                color: activeTab === t ? SAND : 'rgba(0,70,67,0.55)',
              }}
            >
              {t}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">

          {/* ══════════════ OVERVIEW TAB ══════════════ */}
          {activeTab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-6"
            >
              {/* Quick stats grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard
                  label="Total Debates"
                  value={stats.total_debates}
                  icon={BarChart2}
                />
                <StatCard
                  label="Completed"
                  value={stats.completed_debates}
                  icon={Trophy}
                  accent="#10b981"
                />
                <StatCard
                  label="Avg Strength"
                  value={stats.avg_argument_strength > 0 ? stats.avg_argument_strength.toFixed(1) : '–'}
                  sub="out of 10"
                  icon={Zap}
                  accent="#f59e0b"
                />
                <StatCard
                  label="Fallacies"
                  value={stats.total_fallacies}
                  sub={`${stats.avg_fallacies_per_debate.toFixed(1)} per debate`}
                  icon={Target}
                  accent="#ef4444"
                />
              </div>

              {/* Performance breakdown + trend */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div
                  className="rounded-2xl p-5"
                  style={{ backgroundColor: 'rgba(0,70,67,0.04)', border: '1px solid rgba(0,70,67,0.08)' }}
                >
                  <p
                    className="text-xs font-bold uppercase tracking-widest mb-4"
                    style={{ color: 'rgba(0,70,67,0.5)', fontFamily: "'DM Sans',sans-serif" }}
                  >
                    Performance Breakdown
                  </p>
                  <PerfBreakdown breakdown={stats.performance_breakdown} />
                </div>

                <div
                  className="rounded-2xl p-5 flex flex-col gap-4"
                  style={{ backgroundColor: 'rgba(0,70,67,0.04)', border: '1px solid rgba(0,70,67,0.08)' }}
                >
                  <p
                    className="text-xs font-bold uppercase tracking-widest"
                    style={{ color: 'rgba(0,70,67,0.5)', fontFamily: "'DM Sans',sans-serif" }}
                  >
                    Skill Trend
                  </p>
                  <div className="flex items-center gap-3">
                    <TrendIcon trend={stats.skill_trend} />
                    <span
                      className="text-xl font-black capitalize"
                      style={{ fontFamily: "'Barlow Condensed',sans-serif", color: CYPRUS }}
                    >
                  {stats.skill_trend === 'insufficient_data'
                        ? 'Not enough data yet'
                        : stats.skill_trend.charAt(0).toUpperCase() + stats.skill_trend.slice(1)}
                    </span>
                    {stats.improvement_percentage != null && (
                      <span
                        className="text-sm font-bold ml-auto"
                        style={{
                          color:
                            stats.improvement_percentage > 0
                              ? '#10b981'
                              : stats.improvement_percentage < 0
                              ? '#ef4444'
                              : 'rgba(0,70,67,0.5)',
                          fontFamily: "'DM Sans',sans-serif",
                        }}
                      >
                        {stats.improvement_percentage > 0 ? '+' : ''}
                        {stats.improvement_percentage}%
                      </span>
                    )}
                  </div>
                  <div
                    className="text-sm flex gap-4"
                    style={{ color: 'rgba(0,70,67,0.55)', fontFamily: "'DM Sans',sans-serif" }}
                  >
                    <span>
                      Preferred:{' '}
                      <strong style={{ color: CYPRUS, fontFamily: "'Barlow Condensed',sans-serif" }}>
                        {stats.preferred_difficulty
                          ? stats.preferred_difficulty.charAt(0).toUpperCase() +
                            stats.preferred_difficulty.slice(1)
                          : '–'}
                      </strong>
                    </span>
                  </div>
                  {/* mini achievement tease */}
                  <p
                    className="text-xs mt-auto"
                    style={{ color: 'rgba(0,70,67,0.4)', fontFamily: "'DM Sans',sans-serif" }}
                  >
                    🏆 {achievements.total} achievement{achievements.total !== 1 ? 's' : ''} earned
                  </p>
                </div>
              </div>

              {/* Growth chart */}
              <div
                className="rounded-2xl p-5"
                style={{ backgroundColor: 'rgba(0,70,67,0.04)', border: '1px solid rgba(0,70,67,0.08)' }}
              >
                <p
                  className="text-xs font-bold uppercase tracking-widest mb-4"
                  style={{ color: 'rgba(0,70,67,0.5)', fontFamily: "'DM Sans',sans-serif" }}
                >
                  Argument Strength Over Time
                </p>
                <MiniBarChart data={growth_trajectory} />
                <p
                  className="text-xs mt-3 text-right"
                  style={{ color: 'rgba(0,70,67,0.35)', fontFamily: "'DM Sans',sans-serif" }}
                >
                  Each bar = one completed debate
                </p>
              </div>
            </motion.div>
          )}

          {/* ══════════════ ACHIEVEMENTS TAB ══════════════ */}
          {activeTab === 'achievements' && (
            <motion.div
              key="achievements"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              {achievements.list.length === 0 ? (
                <div
                  className="rounded-3xl p-12 flex flex-col items-center gap-4 text-center"
                  style={{ backgroundColor: 'rgba(0,70,67,0.04)', border: '1px solid rgba(0,70,67,0.08)' }}
                >
                  <Star size={36} style={{ color: 'rgba(0,70,67,0.2)' }} />
                  <p
                    className="text-xl font-black uppercase"
                    style={{ color: 'rgba(0,70,67,0.3)', fontFamily: "'Barlow Condensed',sans-serif" }}
                  >
                    No achievements yet
                  </p>
                  <p
                    className="text-sm max-w-xs"
                    style={{ color: 'rgba(0,70,67,0.4)', fontFamily: "'DM Sans',sans-serif" }}
                  >
                    Complete debates to earn badges. Try debating with few fallacies or
                    going deep on a topic!
                  </p>
                  <button
                    onClick={() => navigate('/')}
                    className="mt-2 px-5 py-2.5 rounded-xl font-bold text-sm uppercase tracking-wider"
                    style={{ backgroundColor: CYPRUS, color: SAND, fontFamily: "'DM Sans',sans-serif" }}
                  >
                    Start a Debate
                  </button>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 gap-4">
                  {achievements.list.map((a, i) => {
                    const cfg = getBadgeConfig(a.badge_name);
                    const Icon = cfg.icon;
                    return (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.05 }}
                        className="rounded-2xl p-5 flex gap-4 items-start"
                        style={{
                          backgroundColor: 'rgba(0,70,67,0.04)',
                          border: '1px solid rgba(0,70,67,0.1)',
                        }}
                      >
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                          style={{ backgroundColor: `${cfg.color}18` }}
                        >
                          <Icon size={22} style={{ color: cfg.color }} />
                        </div>
                        <div>
                          <p
                            className="font-black text-base uppercase tracking-tight"
                            style={{ color: CYPRUS }}
                          >
                            {a.badge_name}
                          </p>
                          <p
                            className="text-xs mt-1"
                            style={{ color: 'rgba(0,70,67,0.55)', fontFamily: "'DM Sans',sans-serif" }}
                          >
                            {a.description}
                          </p>
                          <p
                            className="text-xs mt-2 flex items-center gap-1"
                            style={{ color: 'rgba(0,70,67,0.35)', fontFamily: "'DM Sans',sans-serif" }}
                          >
                            <Calendar size={11} />
                            {new Date(a.earned_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {/* ══════════════ HISTORY TAB ══════════════ */}
          {activeTab === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-3"
            >
              {recent_debates.length === 0 ? (
                <div
                  className="rounded-3xl p-12 text-center"
                  style={{ backgroundColor: 'rgba(0,70,67,0.04)', border: '1px solid rgba(0,70,67,0.08)' }}
                >
                  <p
                    className="text-xl font-black uppercase"
                    style={{ color: 'rgba(0,70,67,0.3)', fontFamily: "'Barlow Condensed',sans-serif" }}
                  >
                    No debates yet
                  </p>
                </div>
              ) : (
                recent_debates.map((d, i) => {
                  const isActive = !d.ended_at;
                  const perfColor =
                    d.performance === 'excellent'
                      ? '#10b981'
                      : d.performance === 'good'
                      ? '#60a5fa'
                      : d.performance === 'fair'
                      ? '#f59e0b'
                      : isActive
                      ? '#4ade80'
                      : 'rgba(0,70,67,0.3)';

                  return (
                    <motion.div
                      key={d.session_id}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.06 }}
                      onClick={() =>
                        navigate(`/debate/${d.session_id}`, {
                          state: {
                            topic: d.topic,
                            difficulty: d.difficulty,
                            isResume: true,
                          },
                        })
                      }
                      className="rounded-2xl p-5 flex items-center gap-4 cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99]"
                      style={{
                        backgroundColor: 'rgba(0,70,67,0.04)',
                        border: '1px solid rgba(0,70,67,0.08)',
                      }}
                    >
                      {/* Status dot */}
                      <div
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: perfColor }}
                      />

                      <div className="flex-1 min-w-0">
                        <p
                          className="font-bold text-base truncate"
                          style={{ color: CYPRUS, fontFamily: "'Barlow Condensed',sans-serif", fontSize: '1.05rem' }}
                        >
                          {d.topic}
                        </p>
                        <div
                          className="flex items-center gap-3 mt-1 flex-wrap"
                          style={{ fontFamily: "'DM Sans',sans-serif" }}
                        >
                          <span
                            className="text-xs px-2 py-0.5 rounded-full font-semibold capitalize"
                            style={{
                              backgroundColor: 'rgba(0,70,67,0.08)',
                              color: 'rgba(0,70,67,0.7)',
                            }}
                          >
                            {d.difficulty}
                          </span>
                          {isActive ? (
                            <span className="text-xs font-semibold text-green-500">● Active</span>
                          ) : (
                            d.performance && (
                              <span
                                className="text-xs font-semibold capitalize"
                                style={{ color: perfColor }}
                              >
                                {d.performance}
                              </span>
                            )
                          )}
                          <span className="text-xs" style={{ color: 'rgba(0,70,67,0.4)' }}>
                            {new Date(d.started_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                        </div>
                      </div>

                      {d.avg_argument_strength != null && (
                        <div className="text-right shrink-0">
                          <p
                            className="text-2xl font-black"
                            style={{ color: CYPRUS, fontFamily: "'Barlow Condensed',sans-serif" }}
                          >
                            {d.avg_argument_strength.toFixed(1)}
                          </p>
                          <p
                            className="text-xs"
                            style={{ color: 'rgba(0,70,67,0.4)', fontFamily: "'DM Sans',sans-serif" }}
                          >
                            strength
                          </p>
                        </div>
                      )}
                      <ChevronRight size={16} style={{ color: 'rgba(0,70,67,0.3)' }} />
                    </motion.div>
                  );
                })
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
