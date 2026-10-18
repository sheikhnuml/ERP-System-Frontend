import { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import {
  Package, AlertTriangle, Banknote, ShoppingCart,
  ArrowRight, RefreshCw, CheckCircle2, ChevronRight,
  TrendingUp, Calendar as CalendarIcon, Printer, X,
  ChevronLeft, Check, Layers
} from 'lucide-react';

/* ------------------------------ Helpers ------------------------------ */

const compact = (v) => {
  const n = Number(v) || 0;
  if (n >= 1e6) return `${(n / 1e6).toFixed(n % 1e6 === 0 ? 0 : 1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(n % 1e3 === 0 ? 0 : 1)}k`;
  return String(Math.round(n));
};

const niceMax = (v) => {
  if (v <= 0) return 100;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / p;
  const m = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return m * p;
};

const toYMD = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const parseYMD = (str) => {
  if (!str) return new Date();
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
};

const formatDisplayDate = (ymdStr) => {
  if (!ymdStr) return '';
  const d = parseYMD(ymdStr);
  return d.toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' });
};

const saleDate = (s) => {
  const raw = s.created_at || s.sale_date || s.date || s.createdAt || s.timestamp;
  if (!raw) return null;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
};

const getPresetRange = (presetKey) => {
  const now = new Date();
  const todayStr = toYMD(now);

  if (presetKey === 'today') {
    return { start: todayStr, end: todayStr, label: 'Today' };
  }
  if (presetKey === '7d') {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
    return { start: toYMD(start), end: todayStr, label: 'Last 7 Days' };
  }
  if (presetKey === '14d') {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 13);
    return { start: toYMD(start), end: todayStr, label: 'Last 14 Days' };
  }
  if (presetKey === '30d') {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29);
    return { start: toYMD(start), end: todayStr, label: 'Last 30 Days' };
  }
  if (presetKey === 'thisMonth') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { start: toYMD(start), end: todayStr, label: 'This Month' };
  }
  if (presetKey === 'lastMonth') {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0);
    return { start: toYMD(start), end: toYMD(end), label: 'Last Month' };
  }
  return { start: '2020-01-01', end: todayStr, label: 'All Time' };
};

/* ------------------------- Shared UI Pieces -------------------------- */

function Spinner({ text }) {
  return (
    <div className="h-44 flex items-center justify-center text-slate-400 text-xs gap-2">
      <div className="w-5 h-5 border-2 border-[#0F52BA] border-t-transparent rounded-full animate-spin" />
      <span className="font-medium">{text}</span>
    </div>
  );
}

/* ---------------- Interactive Calendar Range Popover ----------------- */

function DateRangeCalendarPopover({
  startDate,
  endDate,
  activePreset,
  onApplyRange,
  onClose
}) {
  const [tempStart, setTempStart] = useState(startDate);
  const [tempEnd, setTempEnd] = useState(endDate);
  const [tempPreset, setTempPreset] = useState(activePreset);
  const [selectingStep, setSelectingStep] = useState('start');

  const initialView = parseYMD(endDate);
  const [viewYear, setViewYear] = useState(initialView.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialView.getMonth());

  const presets = [
    { id: 'today', label: 'Today' },
    { id: '7d', label: 'Last 7 Days' },
    { id: '14d', label: 'Last 14 Days' },
    { id: '30d', label: 'Last 30 Days' },
    { id: 'thisMonth', label: 'This Month' },
    { id: 'lastMonth', label: 'Last Month' }
  ];

  const handleSelectPreset = (presetId) => {
    const range = getPresetRange(presetId);
    setTempStart(range.start);
    setTempEnd(range.end);
    setTempPreset(presetId);
    const endObj = parseYMD(range.end);
    setViewYear(endObj.getFullYear());
    setViewMonth(endObj.getMonth());
  };

  const handleDayClick = (ymd) => {
    setTempPreset('custom');
    if (selectingStep === 'start' || ymd < tempStart) {
      setTempStart(ymd);
      setTempEnd(ymd);
      setSelectingStep('end');
    } else {
      setTempEnd(ymd);
      setSelectingStep('start');
    }
  };

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(y => y - 1);
    } else {
      setViewMonth(m => m - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(y => y + 1);
    } else {
      setViewMonth(m => m + 1);
    }
  };

  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells = [];

    for (let i = 0; i < firstDayOfMonth; i++) {
      cells.push(null);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const ymd = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ day: d, ymd });
    }
    return cells;
  }, [viewYear, viewMonth]);

  const monthTitle = new Date(viewYear, viewMonth, 1).toLocaleDateString('en-PK', {
    month: 'long',
    year: 'numeric'
  });

  const todayYMD = toYMD(new Date());

  return (
    <div className="absolute right-0 top-full mt-2 z-50 w-[340px] sm:w-[520px] bg-[#FFFFFF] rounded-2xl border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
      <div className="px-4 py-3 border-b border-slate-200 bg-[#F8FAFC] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarIcon size={14} className="text-[#0F52BA]" />
          <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Select Analytics Date Range
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
        >
          <X size={15} />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-12">
        {/* Left Quick Presets Sidebar */}
        <div className="sm:col-span-4 p-3 bg-[#F8FAFC] border-b sm:border-b-0 sm:border-r border-slate-200 flex sm:flex-col gap-1.5 overflow-x-auto">
          <span className="hidden sm:block text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 mb-1">
            Quick Ranges
          </span>
          {presets.map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => handleSelectPreset(p.id)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold text-left transition-colors whitespace-nowrap cursor-pointer flex items-center justify-between ${
                tempPreset === p.id
                  ? 'bg-[#0F52BA] text-[#FFFFFF] shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-200/70'
              }`}
            >
              <span>{p.label}</span>
              {tempPreset === p.id && <Check size={12} className="hidden sm:inline" />}
            </button>
          ))}
        </div>

        {/* Right Interactive Calendar Grid */}
        <div className="sm:col-span-8 p-4 flex flex-col justify-between">
          <div>
            {/* Month Navigation */}
            <div className="flex items-center justify-between mb-3">
              <button
                type="button"
                onClick={prevMonth}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-[#F8FAFC] text-slate-600 cursor-pointer"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="text-xs font-bold text-slate-900">{monthTitle}</span>
              <button
                type="button"
                onClick={nextMonth}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-[#F8FAFC] text-slate-600 cursor-pointer"
              >
                <ChevronRight size={14} />
              </button>
            </div>

            {/* Weekday Headers */}
            <div className="grid grid-cols-7 text-center text-[10px] font-bold uppercase text-slate-400 mb-1">
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                <div key={d} className="py-1">{d}</div>
              ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-1 text-center">
              {calendarDays.map((cell, idx) => {
                if (!cell) return <div key={`empty-${idx}`} className="h-8" />;

                const isStart = cell.ymd === tempStart;
                const isEnd = cell.ymd === tempEnd;
                const isInRange = cell.ymd > tempStart && cell.ymd < tempEnd;
                const isToday = cell.ymd === todayYMD;

                return (
                  <button
                    key={cell.ymd}
                    type="button"
                    onClick={() => handleDayClick(cell.ymd)}
                    className={`h-8 rounded-lg text-xs font-semibold transition-all cursor-pointer relative flex items-center justify-center ${
                      isStart || isEnd
                        ? 'bg-[#0F52BA] text-[#FFFFFF] font-bold shadow-2xs'
                        : isInRange
                        ? 'bg-[#0F52BA]/10 text-[#0F52BA]'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span>{cell.day}</span>
                    {isToday && !isStart && !isEnd && (
                      <span className="w-1 h-1 rounded-full bg-[#0F52BA] absolute bottom-1" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Manual Date Inputs & Apply Footer */}
          <div className="mt-4 pt-3 border-t border-slate-200 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-0.5">
                  Start Date
                </label>
                <input
                  type="date"
                  value={tempStart}
                  max={tempEnd}
                  onChange={e => {
                    setTempStart(e.target.value);
                    setTempPreset('custom');
                  }}
                  className="h-7 w-full border border-slate-300 rounded-md px-2 text-[11px] font-mono text-slate-800 focus:outline-none focus:border-[#0F52BA]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-0.5">
                  End Date
                </label>
                <input
                  type="date"
                  value={tempEnd}
                  min={tempStart}
                  onChange={e => {
                    setTempEnd(e.target.value);
                    setTempPreset('custom');
                  }}
                  className="h-7 w-full border border-slate-300 rounded-md px-2 text-[11px] font-mono text-slate-800 focus:outline-none focus:border-[#0F52BA]"
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] text-slate-500 font-medium truncate">
                {formatDisplayDate(tempStart)} &rarr; {formatDisplayDate(tempEnd)}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="h-7 px-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onApplyRange(tempStart, tempEnd, tempPreset);
                    onClose();
                  }}
                  className="h-7 px-3 bg-[#0F52BA] hover:bg-[#0c449c] text-[#FFFFFF] rounded-lg text-xs font-semibold cursor-pointer shadow-2xs"
                >
                  Apply Range
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ----------------------- Chart 1: Revenue Trend ----------------------- */

function RevenueChart({
  points,
  mode,
  periodTotal,
  periodCount,
  isLoading,
  rangeLabel,
  startDate,
  endDate,
  activePreset,
  isCalendarOpen,
  onToggleCalendar,
  onCloseCalendar,
  onApplyRange,
  onOpenPrintModal,
  calendarContainerRef
}) {
  const [hover, setHover] = useState(null);

  const W = 640, H = 230;
  const pad = { l: 46, r: 16, t: 16, b: 30 };
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;
  const n = points.length;
  const maxVal = niceMax(Math.max(...points.map(p => p.value), 0));

  const x = (i) => pad.l + (n === 1 ? iw / 2 : (i * iw) / (n - 1));
  const y = (v) => pad.t + ih - (v / maxVal) * ih;

  let line = '';
  points.forEach((p, i) => {
    if (i === 0) line = `M ${x(i)} ${y(p.value)}`;
    else {
      const cx = (x(i - 1) + x(i)) / 2;
      line += ` C ${cx} ${y(points[i - 1].value)}, ${cx} ${y(p.value)}, ${x(i)} ${y(p.value)}`;
    }
  });
  const baseY = pad.t + ih;
  const area = n > 0 ? `${line} L ${x(n - 1)} ${baseY} L ${x(0)} ${baseY} Z` : '';

  const labelStep = Math.max(1, Math.ceil(n / 7));
  const hp = hover !== null && points[hover] ? points[hover] : null;

  return (
    <section className="bg-[#FFFFFF] rounded-xl border border-slate-200 shadow-xs p-4 sm:p-5 flex flex-col h-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Revenue Trend & Analytics
            </h2>
            <span className="text-[10px] font-semibold bg-[#0F52BA]/10 text-[#0F52BA] border border-[#0F52BA]/20 px-2 py-0.5 rounded-full">
              {periodCount} Sales
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {mode === 'singleDay'
              ? 'Transactions logged on selected date'
              : `Daily sales breakdown (${rangeLabel})`}
          </p>
        </div>

        {/* Single Calendar Trigger & Print Trigger inside Chart Header */}
        <div className="flex items-center gap-2 flex-wrap">
          <div ref={calendarContainerRef} className="relative">
            <button
              type="button"
              onClick={onToggleCalendar}
              className="h-8 px-3 bg-[#F8FAFC] hover:bg-[#0F52BA]/5 border border-slate-300 hover:border-[#0F52BA] rounded-lg text-xs font-semibold text-slate-700 hover:text-[#0F52BA] flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              title="Click to select custom date range"
            >
              <CalendarIcon size={13} className="text-[#0F52BA]" />
              <span>{rangeLabel}</span>
            </button>

            {isCalendarOpen && (
              <DateRangeCalendarPopover
                startDate={startDate}
                endDate={endDate}
                activePreset={activePreset}
                onApplyRange={onApplyRange}
                onClose={onCloseCalendar}
              />
            )}
          </div>

          <button
            type="button"
            onClick={onOpenPrintModal}
            className="h-8 px-2.5 bg-[#FFFFFF] hover:bg-slate-50 border border-slate-300 hover:border-[#0F52BA] text-slate-700 hover:text-[#0F52BA] rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            title="Print Custom Graph & Table Report"
          >
            <Printer size={13} />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* Period Revenue Sub-Banner */}
      <div className="mt-3 flex items-baseline justify-between bg-[#F8FAFC] px-3.5 py-2 rounded-lg border border-slate-200/80">
        <span className="text-[11px] font-semibold text-slate-500">
          Selected Period Revenue:
        </span>
        <span className="text-base font-black text-[#0F52BA] font-mono">
          {isLoading ? '...' : `Rs ${periodTotal.toLocaleString()}`}
        </span>
      </div>

      <div className="mt-3 flex-1 flex flex-col justify-center">
        {isLoading ? (
          <Spinner text="Loading revenue chart..." />
        ) : n === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center text-center">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center mb-2">
              <TrendingUp size={18} className="text-slate-400" />
            </div>
            <p className="text-xs font-bold text-slate-800">No sales recorded in this date range</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Click the calendar button above to pick a broader date range.
            </p>
          </div>
        ) : (
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" onMouseLeave={() => setHover(null)}>
            <defs>
              <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0F52BA" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#0F52BA" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* Grid + Y Labels */}
            {[0, 1, 2, 3, 4].map(i => {
              const v = (maxVal * i) / 4;
              return (
                <g key={i}>
                  <line x1={pad.l} x2={W - pad.r} y1={y(v)} y2={y(v)} stroke="#E2E8F0" strokeDasharray={i === 0 ? '0' : '3 4'} />
                  <text x={pad.l - 8} y={y(v) + 4} textAnchor="end" fontSize="10" fill="#94A3B8">{compact(v)}</text>
                </g>
              );
            })}

            {/* X Labels */}
            {points.map((p, i) =>
              i % labelStep === 0 ? (
                <text key={i} x={x(i)} y={H - 8} textAnchor="middle" fontSize="10" fill="#94A3B8">{p.label}</text>
              ) : null
            )}

            {/* Area + Line */}
            <path d={area} fill="url(#revFill)" />
            <path d={line} fill="none" stroke="#0F52BA" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

            {/* Dots */}
            {points.map((p, i) => (
              <circle
                key={i}
                cx={x(i)}
                cy={y(p.value)}
                r={hover === i ? 5 : n > 24 ? 0 : 3}
                fill="#FFFFFF"
                stroke="#0F52BA"
                strokeWidth="2"
              />
            ))}

            {/* Hover Layer */}
            {points.map((p, i) => {
              const colW = n === 1 ? iw : iw / (n - 1);
              return (
                <rect
                  key={i}
                  x={x(i) - colW / 2}
                  y={pad.t}
                  width={colW}
                  height={ih}
                  fill="transparent"
                  onMouseEnter={() => setHover(i)}
                />
              );
            })}

            {hp && (
              <g pointerEvents="none">
                <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={baseY} stroke="#0F52BA" strokeOpacity="0.3" />
                <rect
                  x={Math.min(Math.max(x(hover) - 68, pad.l), W - pad.r - 136)}
                  y={Math.max(y(hp.value) - 48, 2)}
                  width="136"
                  height="40"
                  rx="8"
                  fill="#0F172A"
                />
                <text
                  x={Math.min(Math.max(x(hover) - 68, pad.l), W - pad.r - 136) + 68}
                  y={Math.max(y(hp.value) - 48, 2) + 15}
                  textAnchor="middle"
                  fontSize="10"
                  fill="#94A3B8"
                >
                  {hp.label} ({hp.count || 0} sales)
                </text>
                <text
                  x={Math.min(Math.max(x(hover) - 68, pad.l), W - pad.r - 136) + 68}
                  y={Math.max(y(hp.value) - 48, 2) + 31}
                  textAnchor="middle"
                  fontSize="12"
                  fontWeight="700"
                  fill="#FFFFFF"
                >
                  Rs {hp.value.toLocaleString()}
                </text>
              </g>
            )}
          </svg>
        )}
      </div>
    </section>
  );
}

/* ----------------------- Chart 2: Stock Health Donut ------------------- */

function StockDonut({ healthy, low, out, isLoading, onViewLow }) {
  const total = healthy + low + out;
  const segments = [
    { label: 'Healthy Stock', value: healthy, color: '#10B981' },
    { label: 'Low Stock (1-9)', value: low, color: '#F59E0B' },
    { label: 'Sold Out (0)', value: out, color: '#EF4444' }
  ];

  let offset = 0;

  return (
    <section className="bg-[#FFFFFF] rounded-xl border border-slate-200 shadow-xs p-4 sm:p-5 flex flex-col">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">Stock Health</h2>
          <p className="text-[11px] text-slate-500 mt-0.5">All catalog items by stock level</p>
        </div>
        <button
          onClick={onViewLow}
          className="text-xs font-semibold text-[#0F52BA] hover:text-[#0c449c] flex items-center gap-1 cursor-pointer"
        >
          <span>Low Stock</span>
          <ChevronRight size={13} />
        </button>
      </div>

      {isLoading ? (
        <Spinner text="Loading stock health..." />
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 mt-4">
          <div className="relative w-36 h-36">
            <svg viewBox="0 0 42 42" className="w-full h-full -rotate-90">
              <circle cx="21" cy="21" r="15.9155" fill="none" stroke="#F1F5F9" strokeWidth="5" />
              {total > 0 &&
                segments.map(seg => {
                  const pct = (seg.value / total) * 100;
                  const el = seg.value > 0 ? (
                    <circle
                      key={seg.label}
                      cx="21"
                      cy="21"
                      r="15.9155"
                      fill="none"
                      stroke={seg.color}
                      strokeWidth="5"
                      strokeDasharray={`${pct} ${100 - pct}`}
                      strokeDashoffset={-offset}
                    />
                  ) : null;
                  offset += pct;
                  return el;
                })}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-black text-slate-900 font-mono">{total}</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">SKUs</span>
            </div>
          </div>

          <div className="w-full space-y-2 text-xs">
            {segments.map(seg => (
              <div key={seg.label} className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-slate-600 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: seg.color }} />
                  {seg.label}
                </span>
                <span className="font-bold text-slate-900 font-mono">
                  {seg.value}
                  <span className="text-slate-400 font-normal ml-1.5 text-[11px]">
                    ({total > 0 ? `${Math.round((seg.value / total) * 100)}%` : '0%'})
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

/* ----------------------- Chart 3 & 4: Horizontal Bars ------------------ */

function BarListCard({ title, subtitle, items, color, isLoading, emptyText, actionLabel, onAction }) {
  const max = Math.max(...items.map(i => i.value), 1);

  return (
    <section className="bg-[#FFFFFF] rounded-xl border border-slate-200 shadow-xs p-4 sm:p-5 flex flex-col">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">{title}</h2>
          <p className="text-[11px] text-slate-500 mt-0.5">{subtitle}</p>
        </div>
        {onAction && (
          <button
            onClick={onAction}
            className="text-xs font-semibold text-[#0F52BA] hover:text-[#0c449c] flex items-center gap-1 cursor-pointer"
          >
            <span>{actionLabel}</span>
            <ArrowRight size={13} />
          </button>
        )}
      </div>

      <div className="mt-4 flex-1 space-y-3.5">
        {isLoading ? (
          <Spinner text="Loading ranking..." />
        ) : items.length === 0 ? (
          <div className="h-36 flex items-center justify-center text-xs text-slate-400">{emptyText}</div>
        ) : (
          items.map((item, idx) => (
            <div key={item.key}>
              <div className="flex items-center justify-between text-xs mb-1 gap-3">
                <span className="font-semibold text-slate-800 truncate">
                  <span className="text-slate-400 font-mono mr-2">{idx + 1}.</span>
                  {item.label}
                </span>
                <span className="font-bold text-slate-900 font-mono shrink-0">{item.display}</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(4, (item.value / max) * 100)}%`, backgroundColor: color }}
                />
              </div>
              {item.sub && <p className="text-[10px] text-slate-400 mt-0.5 font-medium">{item.sub}</p>}
            </div>
          ))
        )}
      </div>
    </section>
  );
}

/* ------------------------------ Dashboard ------------------------------ */

export default function Dashboard() {
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Interactive Date Range State
  const defaultRange = useMemo(() => getPresetRange('14d'), []);
  const [startDate, setStartDate] = useState(defaultRange.start);
  const [endDate, setEndDate] = useState(defaultRange.end);
  const [activePreset, setActivePreset] = useState('14d');
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // Custom Print Studio Modal State
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printOptions, setPrintOptions] = useState({
    includeKpis: true,
    includeGraph: true,
    includeDailyTable: true,
    includeTopProducts: true
  });

  const calendarContainerRef = useRef(null);
  const navigate = useNavigate();

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const [prodRes, salesRes] = await Promise.allSettled([
        axios.get('http://localhost:5000/api/products'),
        axios.get('http://localhost:5000/api/sales')
      ]);

      if (prodRes.status === 'fulfilled') {
        setProducts(prodRes.value.data || []);
      }
      if (salesRes.status === 'fulfilled') {
        setSales(salesRes.value.data || []);
      }
    } catch (error) {
      console.error('Failed to load dashboard metrics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Close calendar popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (calendarContainerRef.current && !calendarContainerRef.current.contains(e.target)) {
        setIsCalendarOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleApplyRange = (newStart, newEnd, presetKey) => {
    setStartDate(newStart);
    setEndDate(newEnd);
    setActivePreset(presetKey);
  };

  const rangeDisplayLabel = useMemo(() => {
    if (startDate === endDate) return formatDisplayDate(startDate);
    return `${formatDisplayDate(startDate)} - ${formatDisplayDate(endDate)}`;
  }, [startDate, endDate]);

  // Computed Overall Inventory Metrics
  const totalProducts = products.length;

  const lowStockItems = useMemo(() => {
    return products.filter(p => Number(p.stock_quantity) < 10);
  }, [products]);

  const soldOutCount = useMemo(() => {
    return products.filter(p => Number(p.stock_quantity) <= 0).length;
  }, [products]);

  const totalInventoryValue = useMemo(() => {
    return products.reduce(
      (sum, item) => sum + (Number(item.price || 0) * Number(item.stock_quantity || 0)),
      0
    );
  }, [products]);

  const totalSalesRevenue = useMemo(() => {
    return sales.reduce((sum, sale) => sum + Number(sale.total_price || 0), 0);
  }, [sales]);

  // Filter Sales by Selected Calendar Date Range
  const filteredPeriodSales = useMemo(() => {
    return sales.filter(s => {
      const d = saleDate(s);
      if (!d) return true;
      const ymd = toYMD(d);
      return ymd >= startDate && ymd <= endDate;
    });
  }, [sales, startDate, endDate]);

  const periodRevenue = useMemo(() => {
    return filteredPeriodSales.reduce((sum, s) => sum + Number(s.total_price || 0), 0);
  }, [filteredPeriodSales]);

  const periodUnitsSold = useMemo(() => {
    return filteredPeriodSales.reduce((sum, s) => sum + Number(s.quantity_sold || 0), 0);
  }, [filteredPeriodSales]);

  // Dynamic Chart & Daily Breakdown Table Data for Selected Range
  const trend = useMemo(() => {
    const startObj = parseYMD(startDate);
    const endObj = parseYMD(endDate);
    const diffDays = Math.max(1, Math.round((endObj - startObj) / (1000 * 60 * 60 * 24)) + 1);

    if (diffDays === 1) {
      const daySales = [...filteredPeriodSales].reverse();
      return {
        mode: 'singleDay',
        points: daySales.map((s, idx) => {
          const d = saleDate(s);
          const timeLbl = d
            ? d.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', hour12: true })
            : `#${idx + 1}`;
          return {
            dateKey: startDate,
            label: timeLbl,
            value: Number(s.total_price || 0),
            units: Number(s.quantity_sold || 0),
            count: 1
          };
        })
      };
    }

    const maxBuckets = Math.min(diffDays, 90);
    const buckets = new Map();

    for (let i = maxBuckets - 1; i >= 0; i--) {
      const d = new Date(endObj.getFullYear(), endObj.getMonth(), endObj.getDate() - i);
      const key = toYMD(d);
      buckets.set(key, {
        dateKey: key,
        fullDate: d.toLocaleDateString('en-PK', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }),
        label: d.toLocaleDateString('en-PK', { day: 'numeric', month: 'short' }),
        value: 0,
        units: 0,
        count: 0
      });
    }

    filteredPeriodSales.forEach(s => {
      const d = saleDate(s);
      if (!d) return;
      const b = buckets.get(toYMD(d));
      if (b) {
        b.value += Number(s.total_price || 0);
        b.units += Number(s.quantity_sold || 0);
        b.count += 1;
      }
    });

    return {
      mode: 'day',
      points: Array.from(buckets.values())
    };
  }, [filteredPeriodSales, startDate, endDate]);

  // Top Selling Products (Filtered by Selected Date Range)
  const topSelling = useMemo(() => {
    const map = new Map();
    filteredPeriodSales.forEach(s => {
      const key = s.sku || s.product_name || 'item';
      const cur = map.get(key) || {
        key,
        label: s.product_name || s.sku || 'Standard Retail Item',
        sku: s.sku || 'N/A',
        value: 0,
        qty: 0
      };
      cur.value += Number(s.total_price || 0);
      cur.qty += Number(s.quantity_sold || 0);
      map.set(key, cur);
    });
    return Array.from(map.values())
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)
      .map(i => ({
        key: i.key,
        label: i.label,
        sku: i.sku,
        value: i.value,
        qty: i.qty,
        display: `Rs ${i.value.toLocaleString()}`,
        sub: `${i.qty} units sold in selected period`
      }));
  }, [filteredPeriodSales]);

  // Top Inventory Value by Product
  const topInventory = useMemo(() => {
    return products
      .map(p => ({
        key: p.id ?? p.sku ?? p.name,
        label: p.name,
        value: Number(p.price || 0) * Number(p.stock_quantity || 0),
        stock: Number(p.stock_quantity || 0)
      }))
      .filter(p => p.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)
      .map(p => ({
        key: p.key,
        label: p.label,
        value: p.value,
        display: `Rs ${p.value.toLocaleString()}`,
        sub: `${p.stock} units in stock`
      }));
  }, [products]);

  const lowOnly = lowStockItems.length - soldOutCount;
  const healthyCount = totalProducts - lowStockItems.length;

  // Custom A4 Print Generator
  const handleExecuteCustomPrint = () => {
    const w = window.open('', '_blank', 'width=840,height=900');
    if (!w) return;

    const pts = trend.points;
    const W = 680, H = 200;
    const pad = { l: 48, r: 16, t: 16, b: 28 };
    const iw = W - pad.l - pad.r;
    const ih = H - pad.t - pad.b;
    const n = pts.length;
    const maxVal = niceMax(Math.max(...pts.map(p => p.value), 0));
    const x = (i) => pad.l + (n <= 1 ? iw / 2 : (i * iw) / (n - 1));
    const y = (v) => pad.t + ih - (v / maxVal) * ih;

    let line = '';
    pts.forEach((p, i) => {
      if (i === 0) line = `M ${x(i)} ${y(p.value)}`;
      else {
        const cx = (x(i - 1) + x(i)) / 2;
        line += ` C ${cx} ${y(pts[i - 1].value)}, ${cx} ${y(p.value)}, ${x(i)} ${y(p.value)}`;
      }
    });
    const baseY = pad.t + ih;
    const area = n > 0 ? `${line} L ${x(n - 1)} ${baseY} L ${x(0)} ${baseY} Z` : '';
    const labelStep = Math.max(1, Math.ceil(n / 8));

    const activeDaysRows = pts.filter(p => p.value > 0 || pts.length <= 15);

    w.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Analytics Report - ${rangeDisplayLabel}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600;700&display=swap');
          @page { margin: 12mm; size: A4 portrait; }
          * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          body { font-family: 'Inter', sans-serif; color: #0f172a; margin: 0; padding: 0; font-size: 9pt; line-height: 1.4; }
          .header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #0F52BA; padding-bottom: 10px; margin-bottom: 14px; }
          .brand { font-size: 15pt; font-weight: 800; color: #0F52BA; text-transform: uppercase; }
          .sub { font-size: 8.5pt; color: #64748b; margin-top: 2px; }
          .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 16px; }
          .kpi-card { background: #F8FAFC; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 10px; }
          .kpi-card span { font-size: 7pt; font-weight: 700; text-transform: uppercase; color: #64748b; display: block; }
          .kpi-card strong { font-size: 11pt; font-weight: 800; color: #0f172a; font-family: 'JetBrains Mono', monospace; }
          .section-box { border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-bottom: 16px; page-break-inside: avoid; }
          .section-title { font-size: 9pt; font-weight: 800; text-transform: uppercase; color: #0F52BA; margin: 0 0 8px 0; border-bottom: 1px solid #f1f5f9; padding-bottom: 4px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
          th { background: #F8FAFC; border-bottom: 1.5px solid #0F52BA; padding: 6px 8px; text-align: left; font-size: 7.5pt; text-transform: uppercase; color: #475569; font-weight: 700; }
          td { padding: 6px 8px; border-bottom: 1px solid #e2e8f0; font-size: 8.5pt; }
          .mono { font-family: 'JetBrains Mono', monospace; }
          .text-right { text-align: right; }
          .footer { margin-top: 24px; border-top: 1px solid #cbd5e1; padding-top: 8px; display: flex; justify-content: space-between; font-size: 7.5pt; color: #64748b; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="brand">SHEIKH'S ERP &bull; REVENUE & ANALYTICS REPORT</div>
            <div class="sub">Selected Period: <strong>${rangeDisplayLabel}</strong></div>
          </div>
          <div style="text-align: right;">
            <div style="font-weight: 700; color: #0F52BA;">CUSTOM ANALYTICS STATEMENT</div>
            <div class="sub">Generated: ${new Date().toLocaleString('en-PK')}</div>
          </div>
        </div>

        ${printOptions.includeKpis ? `
          <div class="kpi-grid">
            <div class="kpi-card">
              <span>Period Revenue</span>
              <strong style="color: #0F52BA;">Rs ${periodRevenue.toLocaleString()}</strong>
            </div>
            <div class="kpi-card">
              <span>Transactions Logged</span>
              <strong>${filteredPeriodSales.length} Sales</strong>
            </div>
            <div class="kpi-card">
              <span>Total Units Sold</span>
              <strong style="color: #10B981;">${periodUnitsSold.toLocaleString()} pcs</strong>
            </div>
            <div class="kpi-card">
              <span>Active Inventory Value</span>
              <strong>Rs ${totalInventoryValue.toLocaleString()}</strong>
            </div>
          </div>
        ` : ''}

        ${printOptions.includeGraph && n > 0 ? `
          <div class="section-box">
            <div class="section-title">Visual Revenue Trend (${rangeDisplayLabel})</div>
            <svg viewBox="0 0 ${W}${H}" style="width: 100%; height: auto;">
              <defs>
                <linearGradient id="pFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#0F52BA" stop-opacity="0.25" />
                  <stop offset="100%" stop-color="#0F52BA" stop-opacity="0.0" />
                </linearGradient>
              </defs>
              ${[0, 1, 2, 3, 4].map(i => {
                const v = (maxVal * i) / 4;
                return `
                  <line x1="${pad.l}" x2="${W - pad.r}" y1="${y(v)}" y2="${y(v)}" stroke="#cbd5e1" stroke-dasharray="${i === 0 ? '0' : '3 3'}" />
                  <text x="${pad.l - 6}" y="${y(v) + 3}" text-anchor="end" font-size="9" fill="#64748b">${compact(v)}</text>
                `;
              }).join('')}
              ${pts.map((p, i) => i % labelStep === 0 ? `
                <text x="${x(i)}" y="${H - 6}" text-anchor="middle" font-size="9" fill="#64748b">${p.label}</text>
              ` : '').join('')}
              <path d="${area}" fill="url(#pFill)" />
              <path d="${line}" fill="none" stroke="#0F52BA" stroke-width="2.2" />
              ${pts.map((p, i) => `<circle cx="${x(i)}" cy="${y(p.value)}" r="2.5" fill="#fff" stroke="#0F52BA" stroke-width="1.8" />`).join('')}
            </svg>
          </div>
        ` : ''}

        ${printOptions.includeDailyTable ? `
          <div class="section-box">
            <div class="section-title">Date-Wise Sales & Revenue Breakdown Table</div>
            <table>
              <thead>
                <tr>
                  <th style="width: 10%;">#</th>
                  <th style="width: 35%;">Date / Time Slot</th>
                  <th style="width: 20%; text-align: right;">Transactions</th>
                  <th style="width: 15%; text-align: right;">Units Sold</th>
                  <th style="width: 20%; text-align: right;">Revenue Realized</th>
                </tr>
              </thead>
              <tbody>
                ${activeDaysRows.map((r, idx) => `
                  <tr>
                    <td class="mono">${idx + 1}</td>
                    <td style="font-weight: 600;">${r.fullDate || r.label}</td>
                    <td class="text-right mono">${r.count || 0}</td>
                    <td class="text-right mono">${r.units || 0} pcs</td>
                    <td class="text-right mono" style="font-weight: 700; color: #0F52BA;">Rs ${r.value.toLocaleString()}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : ''}

        ${printOptions.includeTopProducts && topSelling.length > 0 ? `
          <div class="section-box">
            <div class="section-title">Top Selling Products in Selected Period</div>
            <table>
              <thead>
                <tr>
                  <th style="width: 8%;">Rank</th>
                  <th style="width: 47%;">Product Description</th>
                  <th style="width: 20%;">SKU Code</th>
                  <th style="width: 10%; text-align: right;">Qty Sold</th>
                  <th style="width: 15%; text-align: right;">Total Revenue</th>
                </tr>
              </thead>
              <tbody>
                ${topSelling.map((item, idx) => `
                  <tr>
                    <td class="mono font-bold">#${idx + 1}</td>
                    <td style="font-weight: 600;">${item.label}</td>
                    <td class="mono">${item.sku}</td>
                    <td class="text-right mono">${item.qty} pcs</td>
                    <td class="text-right mono" style="font-weight: 700; color: #10B981;">${item.display}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : ''}

        <div class="footer">
          <span>Sheikh's Enterprise ERP &bull; Automated Business Intelligence</span>
          <span>Authorized Signature: ___________________________</span>
        </div>

        <script>
          window.onload = function() { window.print(); window.close(); };
        </script>
      </body>
      </html>
    `);
    w.document.close();
    setIsPrintModalOpen(false);
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-8 font-sans select-none bg-[#F8FAFC]">

      {/* 1. Unified Header Bar (Clean: Only Refresh & Open POS) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#FFFFFF] px-5 py-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-[#0F52BA]/10 border border-[#0F52BA]/20 flex items-center justify-center text-[#0F52BA] shrink-0">
            <Layers size={18} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900 tracking-tight leading-none">
                Store Overview & Analytics
              </h1>
              <span className="text-[11px] font-semibold text-[#0F52BA] bg-[#0F52BA]/10 border border-[#0F52BA]/20 px-2 py-0.5 rounded-full leading-none">
                Live Terminal
              </span>
            </div>
            <p className="text-xs text-slate-500 truncate mt-1 leading-none">
              Real-time stock balance, critical inventory threshold alerts, and revenue ledger
            </p>
          </div>
        </div>

        {/* Action Controls (No duplicate calendar or print buttons here) */}
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
          <button
            onClick={loadDashboardData}
            title="Refresh Metrics"
            className="h-8 px-2.5 flex items-center justify-center bg-[#FFFFFF] border border-slate-300 hover:border-[#0F52BA] hover:text-[#0F52BA] rounded-lg text-slate-600 transition-colors cursor-pointer shadow-2xs active:scale-95"
          >
            <RefreshCw size={13} className={isLoading ? 'animate-spin text-[#0F52BA]' : ''} />
          </button>

          <button
            onClick={() => navigate('/sales')}
            className="h-8 px-3.5 flex items-center gap-1.5 bg-[#0F52BA] hover:bg-[#0c449c] text-[#FFFFFF] rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-xs active:scale-95"
          >
            <ShoppingCart size={14} />
            <span>Open POS</span>
          </button>
        </div>
      </div>

      {/* 2. Micro KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        
        {/* Metric 1: Total Revenue */}
        <div
          onClick={() => navigate('/sales')}
          className="bg-[#FFFFFF] p-4 rounded-xl border border-[#10B981]/30 bg-[#10B981]/5 shadow-xs hover:border-[#10B981]/60 transition-all cursor-pointer flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#10B981]">
              Total Sales Revenue
            </span>
            <div className="w-7 h-7 rounded-lg bg-[#10B981]/10 text-[#10B981] flex items-center justify-center border border-[#10B981]/20">
              <TrendingUp size={14} />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-xl font-black text-[#10B981] tracking-tight font-mono">
              {isLoading ? '...' : `Rs ${totalSalesRevenue.toLocaleString()}`}
            </div>
            <p className="text-[11px] text-slate-500 mt-1 font-medium">
              Selected Period: <strong className="text-slate-800">Rs {periodRevenue.toLocaleString()}</strong>
            </p>
          </div>
        </div>

        {/* Metric 2: Catalog Products */}
        <div
          onClick={() => navigate('/inventory')}
          className="bg-[#FFFFFF] p-4 rounded-xl border border-slate-200 shadow-xs hover:border-[#0F52BA]/40 transition-all cursor-pointer flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Catalog Products
            </span>
            <div className="w-7 h-7 rounded-lg bg-[#4F46E5]/10 text-[#4F46E5] flex items-center justify-center border border-[#4F46E5]/20">
              <Package size={14} />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-xl font-black text-slate-900 tracking-tight font-mono">
              {isLoading ? '...' : totalProducts}
            </div>
            <div className="flex items-center gap-1 text-[11px] text-[#4F46E5] font-semibold mt-1 group-hover:translate-x-0.5 transition-transform">
              <span>View full inventory</span>
              <ChevronRight size={12} />
            </div>
          </div>
        </div>

        {/* Metric 3: Low Stock Alerts */}
        <div
          onClick={() => navigate('/low-stock')}
          className="bg-[#FFFFFF] p-4 rounded-xl border border-[#F59E0B]/30 bg-[#F59E0B]/5 shadow-xs hover:border-[#F59E0B]/60 transition-all cursor-pointer flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#F59E0B]">
              Low Stock Alerts
            </span>
            <div className="w-7 h-7 rounded-lg bg-[#F59E0B]/10 text-[#F59E0B] flex items-center justify-center border border-[#F59E0B]/20">
              <AlertTriangle size={14} />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-xl font-black text-[#F59E0B] tracking-tight font-mono">
              {isLoading ? '...' : lowStockItems.length}
            </div>
            <div className="flex items-center gap-1 text-[11px] text-[#F59E0B] font-semibold mt-1 group-hover:translate-x-0.5 transition-transform">
              <span>{lowStockItems.length > 0 ? 'Urgent reorder needed' : 'All stocks healthy'}</span>
              <ChevronRight size={12} />
            </div>
          </div>
        </div>

        {/* Metric 4: Inventory Valuation */}
        <div className="bg-[#FFFFFF] p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#06B6D4]">
              Inventory Asset Value
            </span>
            <div className="w-7 h-7 rounded-lg bg-[#06B6D4]/10 text-[#06B6D4] flex items-center justify-center border border-[#06B6D4]/20">
              <Banknote size={14} />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-xl font-black text-slate-900 tracking-tight font-mono">
              {isLoading ? '...' : `Rs ${totalInventoryValue.toLocaleString()}`}
            </div>
            <p className="text-[11px] text-slate-400 mt-1 font-medium">
              Capital tied up in current stock
            </p>
          </div>
        </div>

      </div>

      {/* 3. Charts Row 1: Interactive Revenue Trend (Holds the ONLY Calendar & Print Controls) + Stock Health Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 flex flex-col">
          <RevenueChart
            points={trend.points}
            mode={trend.mode}
            periodTotal={periodRevenue}
            periodCount={filteredPeriodSales.length}
            isLoading={isLoading}
            rangeLabel={rangeDisplayLabel}
            startDate={startDate}
            endDate={endDate}
            activePreset={activePreset}
            isCalendarOpen={isCalendarOpen}
            onToggleCalendar={() => setIsCalendarOpen(prev => !prev)}
            onCloseCalendar={() => setIsCalendarOpen(false)}
            onApplyRange={handleApplyRange}
            onOpenPrintModal={() => setIsPrintModalOpen(true)}
            calendarContainerRef={calendarContainerRef}
          />
        </div>
        <StockDonut
          healthy={Math.max(healthyCount, 0)}
          low={Math.max(lowOnly, 0)}
          out={soldOutCount}
          isLoading={isLoading}
          onViewLow={() => navigate('/low-stock')}
        />
      </div>

      {/* 4. Charts Row 2: Top Sellers + Inventory Value */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <BarListCard
          title="Top Selling Products"
          subtitle={`Ranked by revenue (${rangeDisplayLabel})`}
          items={topSelling}
          color="#0F52BA"
          isLoading={isLoading}
          emptyText="No sales recorded in the selected date range."
          actionLabel="POS Console"
          onAction={() => navigate('/sales')}
        />
        <BarListCard
          title="Inventory Value by Product"
          subtitle="Where your warehouse capital is tied up"
          items={topInventory}
          color="#4F46E5"
          isLoading={isLoading}
          emptyText="Add products with stock to see this chart."
          actionLabel="Inventory"
          onAction={() => navigate('/inventory')}
        />
      </div>

      {/* 5. Operational Lists Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Restock Priority Queue */}
        <section className="bg-[#FFFFFF] rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
          <header className="p-3.5 border-b border-slate-200 bg-[#F8FAFC] flex items-center justify-between">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 leading-none">
                Restock Priority Queue
              </h2>
              <p className="text-[11px] text-slate-500 mt-1 leading-none">
                Items with stock balances lower than 10 units
              </p>
            </div>
            <button
              onClick={() => navigate('/low-stock')}
              className="text-xs font-semibold text-[#0F52BA] hover:text-[#0c449c] flex items-center gap-1 cursor-pointer"
            >
              <span>View All</span>
              <ArrowRight size={12} />
            </button>
          </header>

          <div className="flex-1 overflow-y-auto max-h-[340px] divide-y divide-slate-100">
            {isLoading ? (
              <Spinner text="Scanning balances..." />
            ) : lowStockItems.length === 0 ? (
              <div className="h-44 flex flex-col items-center justify-center text-center p-6">
                <CheckCircle2 size={28} className="text-[#10B981] mb-1.5" />
                <p className="text-xs font-bold text-slate-800">No Critical Shortages</p>
                <p className="text-[11px] text-slate-400 mt-0.5">All products have adequate stock.</p>
              </div>
            ) : (
              lowStockItems.slice(0, 6).map(item => {
                const qty = Number(item.stock_quantity);
                const isZero = qty <= 0;
                const pct = Math.max(0, Math.min(100, (qty / 10) * 100));
                return (
                  <div key={item.id} className="p-3 hover:bg-[#F8FAFC] transition-colors">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate">{item.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">SKU: {item.sku}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                          isZero
                            ? 'bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/30'
                            : 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/30'
                        }`}>
                          {isZero ? 'Sold Out' : `${item.stock_quantity} left`}
                        </span>
                        <p className="text-[11px] text-slate-500 font-mono font-semibold mt-0.5">
                          Rs {Number(item.price).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div
                        style={{ width: `${isZero ? 100 : pct}%` }}
                        className={`h-full rounded-full ${isZero ? 'bg-[#EF4444]' : 'bg-[#F59E0B]'}`}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Period Sales Activity */}
        <section className="bg-[#FFFFFF] rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
          <header className="p-3.5 border-b border-slate-200 bg-[#F8FAFC] flex items-center justify-between">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 leading-none">
                Period Sales Activity
              </h2>
              <p className="text-[11px] text-slate-500 mt-1 leading-none">
                Checkouts in selected range ({rangeDisplayLabel})
              </p>
            </div>
            <button
              onClick={() => navigate('/sales')}
              className="text-xs font-semibold text-[#0F52BA] hover:text-[#0c449c] flex items-center gap-1 cursor-pointer"
            >
              <span>POS Console</span>
              <ArrowRight size={12} />
            </button>
          </header>

          <div className="flex-1 overflow-y-auto max-h-[340px] divide-y divide-slate-100">
            {isLoading ? (
              <Spinner text="Loading activity..." />
            ) : filteredPeriodSales.length === 0 ? (
              <div className="h-44 flex flex-col items-center justify-center text-center p-6">
                <ShoppingCart size={28} className="text-slate-300 mb-1.5" />
                <p className="text-xs font-bold text-slate-800">No Transactions in Range</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Adjust the calendar date filter or complete a sale.</p>
              </div>
            ) : (
              filteredPeriodSales.slice(0, 8).map((sale, idx) => {
                const name = sale.product_name || 'Standard Retail Item';
                return (
                  <div
                    key={sale.id || idx}
                    className="p-3 flex items-center justify-between gap-3 hover:bg-[#F8FAFC] transition-colors"
                  >
                    <div className="min-w-0 pr-3">
                      <p className="text-xs font-bold text-slate-900 truncate leading-snug">{name}</p>
                      <p className="text-[11px] text-slate-400 font-medium">
                        Qty: <span className="font-semibold text-slate-700">{sale.quantity_sold}</span> &bull; SKU: {sale.sku}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-bold text-slate-900 font-mono">
                        Rs {Number(sale.total_price).toLocaleString()}
                      </p>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/30 mt-0.5">
                        Settled
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

      </div>

      {/* ========================================================================= */}
      {/* 6. CUSTOM PRINT STUDIO MODAL                                              */}
      {/* ========================================================================= */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-[#FFFFFF] rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
            
            <div className="px-5 py-3.5 border-b border-slate-200 bg-[#F8FAFC] flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#0F52BA]/10 text-[#0F52BA] flex items-center justify-center">
                  <Printer size={14} />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 tracking-tight">
                    Custom Analytics Print Studio
                  </h3>
                  <p className="text-[10px] text-slate-500">
                    Range: <strong>{rangeDisplayLabel}</strong> ({filteredPeriodSales.length} transactions)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsPrintModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-xs text-slate-600">
                Select which components you want to include on your printed A4 report:
              </p>

              <div className="space-y-2.5">
                {[
                  {
                    key: 'includeKpis',
                    title: '1. Executive KPI Summary Ribbon',
                    desc: 'Includes Period Revenue, Transactions Count, Units Sold, and Inventory Value'
                  },
                  {
                    key: 'includeGraph',
                    title: '2. Visual Revenue Trend Graph (Vector Chart)',
                    desc: 'Prints the high-resolution SVG revenue curve for the selected date range'
                  },
                  {
                    key: 'includeDailyTable',
                    title: '3. Date-Wise Revenue Breakdown Table',
                    desc: 'Tabular audit of dates, transaction counts, units sold, and daily revenue'
                  },
                  {
                    key: 'includeTopProducts',
                    title: '4. Top-Selling Products Ranking Table',
                    desc: 'Includes top 5 best-selling products by revenue during this period'
                  }
                ].map(opt => {
                  const checked = printOptions[opt.key];
                  return (
                    <div
                      key={opt.key}
                      onClick={() => setPrintOptions(prev => ({ ...prev, [opt.key]: !prev[opt.key] }))}
                      className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                        checked
                          ? 'bg-[#0F52BA]/5 border-[#0F52BA] ring-1 ring-[#0F52BA]/20'
                          : 'bg-[#FFFFFF] border-slate-200 hover:bg-[#F8FAFC]'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 mt-0.5 ${
                        checked ? 'bg-[#0F52BA] border-[#0F52BA] text-white' : 'border-slate-300 bg-white'
                      }`}>
                        {checked && <Check size={11} strokeWidth={3} />}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">{opt.title}</h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">{opt.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsPrintModalOpen(false)}
                  className="h-8 px-3.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExecuteCustomPrint}
                  className="h-8 px-4 bg-[#0F52BA] hover:bg-[#0c449c] text-[#FFFFFF] rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                >
                  <Printer size={13} />
                  <span>Generate & Print A4 Report</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}