import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Menu,
  X,
  Search,
  Home,
  FileText,
  Settings,
  Bell,
  ArrowUpRight,
  ArrowDownRight,
  ChevronDown,
  Check,
  AlertCircle,
  LayoutDashboard,
  PieChart,
} from 'lucide-react';

const BASE = window.__BACKEND_URL__ || '';

async function apiFetch(path, opts = {}) {
  for (let i = 0; i < 5; i++) {
    try {
      const r = await fetch(BASE + path, opts);
      if (r.ok) return r.json();
    } catch (_) {}
    await new Promise(r => setTimeout(r, 1500));
  }
  return null;
}

// -------------------- CSS INJECTION --------------------
function useInjectStyles() {
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
      :root {
        --primary: #0F172A;
        --accent: #6366F1;
        --bg: #06080f;
        --surface: rgba(255,255,255,0.04);
        --border: rgba(255,255,255,0.08);
        --text: #f1f5f9;
        --muted: #94a3b8;
        --radius: 12px;
        --shadow: 0 8px 32px rgba(0,0,0,0.4);
        --transition: 0.2s ease;
      }
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body {
        font-family: 'Inter', sans-serif;
        background: var(--bg);
        color: var(--text);
        overflow-x: hidden;
        -webkit-font-smoothing: antialiased;
      }
      ::-webkit-scrollbar { width: 6px; }
      ::-webkit-scrollbar-track { background: var(--bg); }
      ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }
      @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      @keyframes slideIn {
        from { transform: translateY(20px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
      @keyframes shimmer {
        0% { background-position: -200% 0; }
        100% { background-position: 200% 0; }
      }
      .skeleton {
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent);
        background-size: 200% 100%;
        animation: shimmer 1.5s infinite;
        border-radius: var(--radius);
      }
      .glass {
        background: var(--surface);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border: 1px solid var(--border);
        border-radius: var(--radius);
        box-shadow: var(--shadow);
      }
      .gradient-text {
        background: linear-gradient(135deg, #6366F1, #8B5CF6);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }
      button, a { cursor: pointer; transition: all var(--transition); }
      button:active { transform: scale(0.97); }
      input, select, textarea {
        background: rgba(255,255,255,0.06);
        border: 1px solid var(--border);
        border-radius: 8px;
        padding: 10px 14px;
        color: var(--text);
        font-family: inherit;
        outline: none;
        transition: border var(--transition);
      }
      input:focus { border-color: var(--accent); }
    `;
    document.head.appendChild(style);
    return () => style.remove();
  }, []);
}

// -------------------- MOCK DATA --------------------
function generateTimeSeries(days) {
  let value = 65;
  const now = new Date();
  const data = [];
  for (let i = days; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    value = Math.min(100, Math.max(30, value + (Math.random() - 0.4) * 10));
    data.push({ date: dateStr, value: Math.round(value) });
  }
  return data;
}

const MOCK_DATA = {
  kpis: [
    { label: 'Claude Visibility Score', value: 87, change: 12.5, changeType: 'up' },
    { label: 'Keywords Ranked in Claude', value: 4230, change: 8.2, changeType: 'up' },
    { label: 'AI Click-Through Rate', value: 14.7, change: -2.1, changeType: 'down' },
    { label: 'Conversions from AI', value: 312, change: 23.8, changeType: 'up' },
  ],
  timeSeriesFull: generateTimeSeries(90),
  barData: [
    { label: 'Claude 3.5 Sonnet', value: 92 },
    { label: 'Claude 3 Opus', value: 76 },
    { label: 'Claude 3 Haiku', value: 65 },
    { label: 'GPT-4o', value: 88 },
    { label: 'Gemini Pro', value: 54 },
  ],
  events: [
    { name: 'Page indexed by Claude', count: 1850, conversionRate: 12.3 },
    { name: 'Claude feature snippet', count: 340, conversionRate: 28.4 },
    { name: 'Answer highlighted', count: 720, conversionRate: 18.7 },
    { name: 'Product recommendation', count: 450, conversionRate: 35.1 },
    { name: 'Knowledge panel', count: 120, conversionRate: 40.2 },
  ],
  funnel: [
    { label: 'Impressions', value: 100000 },
    { label: 'Clicks', value: 25000 },
    { label: 'Engaged Visits', value: 8000 },
    { label: 'Conversions', value: 1200 },
  ],
};

// -------------------- SUB-COMPONENTS --------------------
const KPICard = ({ label, value, change, changeType, loading }) => {
  if (loading) return <div className="skeleton" style={{ height: 120, width: '100%' }} />;
  const isUp = changeType === 'up';
  const Icon = isUp ? ArrowUpRight : ArrowDownRight;
  return (
    <div className="glass p-5 flex flex-col gap-2" style={{ animation: 'slideIn 0.3s ease' }}>
      <p className="text-sm font-medium" style={{ color: 'var(--muted)' }}>{label}</p>
      <p className="text-2xl font-bold">{typeof value === 'number' ? value.toLocaleString() : value}</p>
      <div className="flex items-center gap-1 text-sm" style={{ color: isUp ? '#22c55e' : '#ef4444' }}>
        <Icon size={16} />
        <span>{change > 0 ? '+' : ''}{change}%</span>
        <span className="text-xs" style={{ color: 'var(--muted)' }}>vs last period</span>
      </div>
    </div>
  );
};

const DateRangeButtons = ({ range, onRangeChange }) => {
  const ranges = ['7d', '30d', '90d'];
  return (
    <div className="flex items-center gap-2">
      {ranges.map(r => (
        <button
          key={r}
          onClick={() => onRangeChange(r)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            range === r
              ? 'bg-[var(--accent)] text-white'
              : 'bg-[var(--surface)] text-[var(--muted)] hover:bg-white/10'
          }`}
          style={{ border: '1px solid var(--border)' }}
        >
          {r.toUpperCase()}
        </button>
      ))}
    </div>
  );
};

const AreaChart = ({ data, loading, height = 280 }) => {
  if (loading) return <div className="skeleton" style={{ height, width: '100%' }} />;
  const maxVal = Math.max(...(data || []).map(d => d.value), 0);
  const margin = { top: 20, right: 10, bottom: 30, left: 40 };
  const w = 600, h = height;
  const chartW = w - margin.left - margin.right;
  const chartH = h - margin.top - margin.bottom;

  const points = (data || []).map((d, i) => ({
    x: margin.left + (i / (data.length - 1)) * chartW,
    y: margin.top + chartH - (d.value / maxVal) * chartH,
  }));

  const lineD = points.map((p, i) => (i === 0 ? `M${p.x},${p.y}` : `L${p.x},${p.y}`)).join(' ');
  const areaD = `${lineD} L${points[points.length - 1]?.x || 0},${margin.top + chartH} L${points[0]?.x || 0},${margin.top + chartH} Z`;

  return (
    <div className="glass p-4" style={{ animation: 'slideIn 0.3s ease' }}>
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: 'auto' }}>
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366F1" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#6366F1" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#6366F1" />
            <stop offset="100%" stopColor="#8B5CF6" />
          </linearGradient>
        </defs>
        {/* Y axis labels */}
        {[0, maxVal * 0.5, maxVal].map((val, i) => (
          <text key={i} x={margin.left - 5} y={margin.top + (chartH * (1 - val / maxVal))} textAnchor="end" alignmentBaseline="middle" fill="var(--muted)" fontSize="10">
            {Math.round(val)}
          </text>
        ))}
        {/* X axis dates (every few points) */}
        {data.filter((_, i) => i % Math.ceil(data.length / 7) === 0).map((d, i) => {
          const idx = data.indexOf(d);
          const x = margin.left + (idx / (data.length - 1)) * chartW;
          return (
            <text key={i} x={x} y={h - 5} textAnchor="middle" fill="var(--muted)" fontSize="10">{d.date}</text>
          );
        })}
        <path d={areaD} fill="url(#areaGrad)" />
        <path d={lineD} fill="none" stroke="url(#lineGrad)" strokeWidth="2" />
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="3" fill="#6366F1" />
        ))}
      </svg>
    </div>
  );
};

const BarChart = ({ data, loading, height = 240 }) => {
  if (loading) return <div className="skeleton" style={{ height, width: '100%' }} />;
  const margin = { top: 20, right: 20, bottom: 40, left: 40 };
  const w = 500, h = height;
  const chartW = w - margin.left - margin.right;
  const chartH = h - margin.top - margin.bottom;
  const maxVal = Math.max(...(data || []).map(d => d.value), 0);
  const barWidth = chartW / data.length - 10;

  return (
    <div className="glass p-4" style={{ animation: 'slideIn 0.3s ease' }}>
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: 'auto' }}>
        <defs>
          <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366F1" />
            <stop offset="100%" stopColor="#4F46E5" />
          </linearGradient>
        </defs>
        {data.map((item, i) => {
          const barH = (item.value / maxVal) * chartH;
          const x = margin.left + i * (chartW / data.length) + (chartW / data.length - barWidth) / 2;
          const y = margin.top + chartH - barH;
          return (
            <g key={i}>
              <rect x={x} y={y} width={barWidth} height={barH} rx="4" fill="url(#barGrad)" />
              <text x={x + barWidth / 2} y={h - 10} textAnchor="middle" fill="var(--muted)" fontSize="10">{item.label}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

const EventsTable = ({ data, loading }) => {
  const [sortCol, setSortCol] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  if (loading) return <div className="skeleton" style={{ height: 260, width: '100%' }} />;
  const handleSort = (col) => {
    if (sortCol === col) {
      setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortCol(col);
      setSortDir('asc');
    }
  };
  const sorted = [...(data || [])].sort((a, b) => {
    if (!sortCol) return 0;
    const aVal = a[sortCol];
    const bVal = b[sortCol];
    if (typeof aVal === 'string') return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
  });
  return (
    <div className="glass overflow-x-auto" style={{ animation: 'slideIn 0.3s ease' }}>
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-[var(--border)]">
            {['Event Name', 'Count', 'Conversion Rate'].map((col, i) => (
              <th
                key={col}
                className="p-3 font-medium cursor-pointer hover:bg-white/5 transition-colors"
                onClick={() => handleSort(col === 'Event Name' ? 'name' : col === 'Count' ? 'count' : 'conversionRate')}
              >
                <div className="flex items-center gap-1">
                  {col}
                  {sortCol === (col === 'Event Name' ? 'name' : col === 'Count' ? 'count' : 'conversionRate') && (
                    <ChevronDown size={14} style={{ transform: sortDir === 'desc' ? 'rotate(180deg)' : 'none' }} />
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((event, i) => (
            <tr key={i} className="border-b border-[var(--border)] hover:bg-white/5 transition-colors">
              <td className="p-3">{event.name}</td>
              <td className="p-3">{event.count.toLocaleString()}</td>
              <td className="p-3">{event.conversionRate}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const FunnelViz = ({ steps, loading }) => {
  if (loading) return <div className="skeleton" style={{ height: 200, width: '100%' }} />;
  const maxVal = steps[0]?.value || 1;
  return (
    <div className="glass p-5" style={{ animation: 'slideIn 0.3s ease' }}>
      <h3 className="text-lg font-semibold mb-4 gradient-text">Conversion Funnel</h3>
      <div className="flex flex-col gap-2">
        {(steps || []).map((step, i) => {
          const widthPercent = ((step.value / maxVal) * 100).toFixed(1);
          const drop = i > 0 ? `-${((1 - step.value / steps[i-1].value) * 100).toFixed(1)}%` : '';
          return (
            <div key={i} className="flex items-center gap-4">
              <span className="w-32 text-sm text-[var(--muted)] shrink-0">{step.label}</span>
              <div className="flex-1 flex items-center gap-2">
                <div className="h-8 rounded-md bg-[var(--accent)] opacity-80 transition-all duration-500" style={{ width: `${widthPercent}%` }}></div>
                <span className="text-sm font-medium">{step.value.toLocaleString()}</span>
                {drop && <span className="text-xs text-red-400">{drop}</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);
  const bgColor = type === 'success' ? '#22c55e' : '#ef4444';
  return (
    <div
      className="fixed bottom-6 right-6 glass px-5 py-3 flex items-center gap-3 shadow-2xl z-50"
      style={{ animation: 'slideIn 0.3s ease', borderLeft: `4px solid ${bgColor}` }}
    >
      {type === 'success' ? <Check size={18} color={bgColor} /> : <AlertCircle size={18} color={bgColor} />}
      <span className="text-sm">{message}</span>
    </div>
  );
};

// -------------------- MAIN APP COMPONENT --------------------
export default function App() {
  useInjectStyles();

  const [page, setPage] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dateRange, setDateRange] = useState('90d');
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [toast, setToast] = useState(null);

  // Settings form
  const [siteUrl, setSiteUrl] = useState('');
  const [errors, setErrors] = useState({});

  useEffect(() => {
    (async () => {
      const data = await apiFetch('/api/dashboard');
      if (data) setDashboardData(data);
      else {
        // Simulate network delay
        await new Promise(r => setTimeout(r, 800));
        setDashboardData(MOCK_DATA);
      }
      setLoading(false);
    })();
  }, []);

  const timeSeries = useMemo(() => {
    if (!dashboardData) return [];
    const full = dashboardData.timeSeriesFull || [];
    if (dateRange === '7d') return full.slice(-7);
    if (dateRange === '30d') return full.slice(-30);
    return full; // 90d
  }, [dashboardData, dateRange]);

  const handleSettingsSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!siteUrl.trim()) newErrors.siteUrl = 'Site URL is required';
    else if (!/^https?:\/\/.+\..+/.test(siteUrl.trim())) newErrors.siteUrl = 'Enter valid URL';
    if (Object.keys(newErrors).length) {
      setErrors(newErrors);
      return;
    }
    setToast({ message: 'Settings saved successfully!', type: 'success' });
    setErrors({});
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 glass z-30 transform transition-transform duration-300 lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ borderRight: '1px solid var(--border)' }}
      >
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <LayoutDashboard size={28} color="#6366F1" />
            <span className="text-xl font-bold gradient-text">StellarSEO</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden">
            <X size={20} color="var(--muted)" />
          </button>
        </div>
        <nav className="mt-6">
          {[
            { name: 'Dashboard', icon: Home, page: 'dashboard' },
            { name: 'Reports', icon: FileText, page: 'reports' },
            { name: 'Settings', icon: Settings, page: 'settings' },
          ].map(item => (
            <button
              key={item.page}
              onClick={() => { setPage(item.page); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-6 py-3 text-sm font-medium transition-all ${
                page === item.page ? 'text-white bg-white/10 border-r-2 border-[var(--accent)]' : 'text-[var(--muted)] hover:bg-white/5'
              }`}
            >
              <item.icon size={18} />
              {item.name}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="h-16 glass flex items-center justify-between px-4 lg:px-6" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-4">
            <button className="lg:hidden" onClick={() => setSidebarOpen(true)}>
              <Menu size={24} color="var(--text)" />
            </button>
            <h1 className="text-lg font-semibold hidden sm:block">{page.charAt(0).toUpperCase() + page.slice(1)}</h1>
            {page === 'dashboard' && (
              <div className="flex-1 flex justify-center">
                <DateRangeButtons range={dateRange} onRangeChange={setDateRange} />
              </div>
            )}
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-lg bg-[var(--surface)] border border-[var(--border)]">
              <Search size={16} color="var(--muted)" />
              <input
                placeholder="Search..."
                className="bg-transparent border-none p-0 text-sm w-40 focus:outline-none"
                onChange={() => {}}
              />
            </div>
            <Bell size={20} color="var(--muted)" className="cursor-pointer" />
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-6 overflow-y-auto">
          {page === 'dashboard' && (
            <div className="flex flex-col gap-6" style={{ animation: 'fadeIn 0.3s ease' }}>
              {/* KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {(dashboardData?.kpis || MOCK_DATA.kpis).map((kpi, i) => (
                  <KPICard key={i} {...kpi} loading={loading} />
                ))}
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-lg font-semibold mb-3 gradient-text">Claude Visibility Trend</h3>
                  <AreaChart data={timeSeries} loading={loading} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-3 gradient-text">Model Visibility Comparison</h3>
                  <BarChart data={dashboardData?.barData || MOCK_DATA.barData} loading={loading} />
                </div>
              </div>

              {/* Events Table */}
              <div>
                <h3 className="text-lg font-semibold mb-3 gradient-text">AI Visibility Events</h3>
                <EventsTable data={dashboardData?.events || MOCK_DATA.events} loading={loading} />
              </div>

              {/* Funnel */}
              <div>
                <FunnelViz steps={dashboardData?.funnel || MOCK_DATA.funnel} loading={loading} />
              </div>
            </div>
          )}

          {page === 'reports' && (
            <div className="flex flex-col items-center justify-center h-96 glass" style={{ animation: 'fadeIn 0.3s ease' }}>
              <FileText size={64} color="var(--muted)" />
              <h2 className="text-2xl font-bold mt-4 gradient-text">Automated Reports</h2>
              <p className="text-[var(--muted)] mt-2">White-label PDF reports generation coming soon.</p>
            </div>
          )}

          {page === 'settings' && (
            <div className="max-w-md mx-auto glass p-6" style={{ animation: 'fadeIn 0.3s ease' }}>
              <h2 className="text-2xl font-bold mb-6 gradient-text">Settings</h2>
              <form onSubmit={handleSettingsSubmit}>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">Site URL</label>
                  <input
                    type="text"
                    value={siteUrl}
                    onChange={(e) => setSiteUrl(e.target.value)}
                    placeholder="https://yourdomain.com"
                    className={`w-full ${errors.siteUrl ? 'border-red-500' : ''}`}
                  />
                  {errors.siteUrl && <p className="text-red-400 text-xs mt-1">{errors.siteUrl}</p>}
                </div>
                <button type="submit" className="w-full py-3 bg-[var(--accent)] text-white font-semibold rounded-lg hover:bg-opacity-90 transition">
                  Save Settings
                </button>
              </form>
            </div>
          )}
        </main>
      </div>

      {/* Toast */}
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  );
}