import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { 
  Clock, Calendar, UserCheck, Search, RefreshCw, 
  CheckCircle2, AlertTriangle, LogOut, Shield, Settings, 
  Save, X, Sliders, CalendarDays, CheckCheck, FileEdit, Info
} from 'lucide-react';

export default function Attendance() {
  const [records, setRecords] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  // 1. Shift Timings Policy Modal State
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);
  const [isSavingPolicy, setIsSavingPolicy] = useState(false);
  const [policyForm, setPolicyForm] = useState({
    shift_start: '09:00',
    grace_minutes: 15,
    half_day_cutoff: '11:30',
    absent_cutoff: '13:00'
  });

  // 2. Declare Holiday Modal State
  const [isHolidayModalOpen, setIsHolidayModalOpen] = useState(false);
  const [isSavingHoliday, setIsSavingHoliday] = useState(false);
  const [holidayForm, setHolidayForm] = useState({
    holiday_date: new Date().toISOString().split('T')[0],
    title: ''
  });

  // 3. Attendance Override / Excuse Modal State
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);
  const [isSavingOverride, setIsSavingOverride] = useState(false);
  const [overrideTarget, setOverrideTarget] = useState(null);
  const [overrideForm, setOverrideForm] = useState({
    status: 'On Time',
    is_excused: true,
    excuse_reason: 'Emergency Leave Approved by Management'
  });

  const loadAttendance = async () => {
    setIsLoading(true);
    try {
      const url = selectedDate 
        ? `http://localhost:5000/api/attendance?date=${selectedDate}`
        : 'http://localhost:5000/api/attendance';
      
      const [attRes, holRes] = await Promise.all([
        axios.get(url),
        axios.get('http://localhost:5000/api/holidays')
      ]);

      setRecords(attRes.data || []);
      setHolidays(holRes.data || []);
    } catch (err) {
      console.error('Failed to retrieve attendance logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSettings = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/attendance/settings');
      if (res.data) {
        setPolicyForm({
          shift_start: res.data.shift_start?.slice(0, 5) || '09:00',
          grace_minutes: res.data.grace_minutes ?? 15,
          half_day_cutoff: res.data.half_day_cutoff?.slice(0, 5) || '11:30',
          absent_cutoff: res.data.absent_cutoff?.slice(0, 5) || '13:00'
        });
      }
    } catch (err) {
      console.error('Failed to load shift policy settings:', err);
    }
  };

  useEffect(() => {
    loadAttendance();
  }, [selectedDate]);

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSavePolicy = async (e) => {
    e.preventDefault();
    setIsSavingPolicy(true);
    try {
      await axios.put('http://localhost:5000/api/attendance/settings', {
        shift_start: `${policyForm.shift_start}:00`,
        grace_minutes: Number(policyForm.grace_minutes),
        half_day_cutoff: `${policyForm.half_day_cutoff}:00`,
        absent_cutoff: `${policyForm.absent_cutoff}:00`
      });
      alert('Shift policy updated successfully.');
      setIsPolicyModalOpen(false);
    } catch (err) {
      alert('Failed to update shift policy settings.');
    } finally {
      setIsSavingPolicy(false);
    }
  };

  const handleDeclareHoliday = async (e) => {
    e.preventDefault();
    setIsSavingHoliday(true);
    try {
      await axios.post('http://localhost:5000/api/holidays', holidayForm);
      alert(`Official holiday "${holidayForm.title}" declared successfully.`);
      setIsHolidayModalOpen(false);
      setHolidayForm({
        holiday_date: new Date().toISOString().split('T')[0],
        title: ''
      });
      loadAttendance();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to declare official holiday.');
    } finally {
      setIsSavingHoliday(false);
    }
  };

  const handleOpenOverride = (record) => {
    setOverrideTarget(record);
    setOverrideForm({
      status: record.status || 'On Time',
      is_excused: record.is_excused ?? true,
      excuse_reason: record.excuse_reason || 'Medical / Emergency Approved by Management'
    });
    setIsOverrideModalOpen(true);
  };

  const handleSaveOverride = async (e) => {
    e.preventDefault();
    if (!overrideTarget) return;

    setIsSavingOverride(true);
    try {
      await axios.put(`http://localhost:5000/api/attendance/${overrideTarget.id}/override`, overrideForm);
      setIsOverrideModalOpen(false);
      loadAttendance();
    } catch (err) {
      alert('Failed to update attendance record.');
    } finally {
      setIsSavingOverride(false);
    }
  };

  const handleForceCheckout = async (recordId, name) => {
    if (window.confirm(`Are you sure you want to conclude the shift checkout for ${name}?`)) {
      try {
        await axios.put(`http://localhost:5000/api/attendance/${recordId}/checkout`);
        loadAttendance();
      } catch (err) {
        alert('Failed to close active shift.');
      }
    }
  };

  const filteredRecords = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return records;
    return records.filter(r => r.operator_name?.toLowerCase().includes(q));
  }, [records, searchQuery]);

  const stats = useMemo(() => {
    const totalPresent = records.length;
    const currentlyActive = records.filter(r => !r.check_out).length;
    const completedShifts = records.filter(r => r.check_out).length;
    const lateArrivals = records.filter(r => r.status === 'Late' && !r.is_excused).length;
    const excusedLeaves = records.filter(r => r.is_excused).length;
    return { totalPresent, currentlyActive, completedShifts, lateArrivals, excusedLeaves };
  }, [records]);

  const formatTime = (isoString) => {
    if (!isoString) return '--:--';
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDuration = (minutes, isCurrentlyActive) => {
    if (isCurrentlyActive) return 'Active Duty';
    if (!minutes || minutes <= 0) return '0m';
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hrs === 0 ? `${mins}m` : `${hrs}h ${mins}m`;
  };

  const getStatusBadge = (status, isActive) => {
    if (isActive) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#0F52BA]/10 text-[#0F52BA] border border-[#0F52BA]/30 whitespace-nowrap">
          <span className="w-1.5 h-1.5 rounded-full bg-[#0F52BA] animate-pulse" />
          On Duty
        </span>
      );
    }

    switch (status) {
      case 'Late':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/30 whitespace-nowrap">
            Late Arrival
          </span>
        );
      case 'Half Day':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/30 whitespace-nowrap">
            Half Day
          </span>
        );
      case 'Absent':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/30 whitespace-nowrap">
            Absent Cutoff
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/30 whitespace-nowrap">
            On Time
          </span>
        );
    }
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-8 font-sans select-none bg-[#F8FAFC]">

      {/* 1. Header Card (60% Primary Sapphire #0F52BA & Neutral #FFFFFF) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#FFFFFF] px-5 py-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-[#0F52BA]/10 border border-[#0F52BA]/20 flex items-center justify-center text-[#0F52BA] shrink-0">
            <Clock size={18} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900 tracking-tight leading-none">
                Staff Attendance & Shift Logs
              </h1>
              <span className="text-[11px] font-semibold text-[#0F52BA] bg-[#0F52BA]/10 border border-[#0F52BA]/20 px-2 py-0.5 rounded-full leading-none">
                Shift: {policyForm.shift_start} (+{policyForm.grace_minutes}m)
              </span>
            </div>
            <p className="text-xs text-slate-500 truncate mt-1 leading-none">
              Daily check-ins, automated duty tracking, and excuse governance
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto flex-wrap">
          <input 
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="h-8 border border-slate-300 rounded-lg px-2.5 text-xs font-medium text-slate-700 bg-[#FFFFFF] focus:outline-none focus:border-[#0F52BA] focus:ring-2 focus:ring-[#0F52BA]/15 transition-all cursor-pointer shadow-2xs"
          />

          <button 
            onClick={loadAttendance}
            title="Refresh Logs"
            className="h-8 px-2.5 flex items-center justify-center bg-[#FFFFFF] border border-slate-300 hover:border-[#0F52BA] hover:text-[#0F52BA] rounded-lg text-slate-600 transition-colors cursor-pointer shadow-2xs active:scale-95"
          >
            <RefreshCw size={13} className={isLoading ? 'animate-spin text-[#0F52BA]' : ''} />
          </button>

          <button
            onClick={() => setIsPolicyModalOpen(true)}
            className="h-8 px-3 flex items-center gap-1.5 bg-[#FFFFFF] border border-slate-300 hover:border-[#0F52BA] hover:text-[#0F52BA] rounded-lg text-xs font-semibold text-slate-700 transition-colors cursor-pointer shadow-2xs active:scale-95 whitespace-nowrap"
          >
            <Sliders size={13} />
            <span>Shift Timings</span>
          </button>

          <button
            onClick={() => setIsHolidayModalOpen(true)}
            className="h-8 px-3.5 flex items-center gap-1.5 bg-[#0F52BA] hover:bg-[#0c449c] text-[#FFFFFF] rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-xs active:scale-95 whitespace-nowrap"
          >
            <CalendarDays size={13} />
            <span>Declare Holiday</span>
          </button>
        </div>
      </div>

      {/* 2. Micro KPI Strip (Tokens: #0F52BA, #10B981, #F59E0B, #4F46E5) */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="bg-[#FFFFFF] p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Total Present</span>
          <div className="text-xl font-black text-slate-900 mt-1">{stats.totalPresent}</div>
          <div className="text-[11px] text-[#0F52BA] font-semibold mt-1 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#0F52BA]"></span>
            Registered Today
          </div>
        </div>

        <div className="bg-[#FFFFFF] p-4 rounded-xl border border-[#10B981]/30 bg-[#10B981]/5 shadow-xs flex flex-col justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#10B981] block">Currently Active</span>
          <div className="text-xl font-black text-[#10B981] mt-1 flex items-center gap-1.5">
            <span>{stats.currentlyActive}</span>
            <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
          </div>
          <div className="text-[11px] text-[#10B981] font-semibold mt-1">On Active Shift</div>
        </div>

        <div className="bg-[#FFFFFF] p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Completed Shifts</span>
          <div className="text-xl font-black text-slate-800 mt-1">{stats.completedShifts}</div>
          <div className="text-[11px] text-slate-400 font-medium mt-1">Clocked Out</div>
        </div>

        <div className="bg-[#FFFFFF] p-4 rounded-xl border border-[#F59E0B]/30 bg-[#F59E0B]/5 shadow-xs flex flex-col justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#F59E0B] block">Unexcused Lates</span>
          <div className="text-xl font-black text-[#F59E0B] mt-1">{stats.lateArrivals}</div>
          <div className="text-[11px] text-[#F59E0B] font-semibold mt-1">Deduction Pending</div>
        </div>

        <div className="bg-[#FFFFFF] p-4 rounded-xl border border-[#4F46E5]/30 bg-[#4F46E5]/5 shadow-xs flex flex-col justify-between col-span-2 lg:col-span-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#4F46E5] block">Excused Leaves</span>
          <div className="text-xl font-black text-[#4F46E5] mt-1">{stats.excusedLeaves}</div>
          <div className="text-[11px] text-[#4F46E5] font-semibold mt-1">Waived / Holiday</div>
        </div>
      </div>

      {/* 3. High-Density Attendance Table Container */}
      <div className="bg-[#FFFFFF] rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
        
        {/* Search Toolbar */}
        <div className="p-3.5 border-b border-slate-200 bg-[#F8FAFC] flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="relative w-full sm:w-80 z-30">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input 
              type="text" 
              placeholder="Search staff member..." 
              value={searchQuery} 
              onChange={e => setSearchQuery(e.target.value)}
              className="h-8 w-full pl-8 pr-7 border border-slate-300 rounded-lg text-xs bg-[#FFFFFF] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#0F52BA] focus:ring-2 focus:ring-[#0F52BA]/15 transition-all"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
              >
                <X size={12} />
              </button>
            )}
          </div>

          <div className="text-xs text-slate-500 font-medium">
            Active Records: <strong className="text-slate-800">{filteredRecords.length}</strong>
          </div>
        </div>

        {/* Horizontal Overflow Safe Table Viewport */}
        <div className="overflow-x-auto w-full min-h-[340px]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400 gap-2">
              <div className="w-5 h-5 border-2 border-[#0F52BA] border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-medium">Loading attendance data...</p>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400 p-4 text-center">
              <UserCheck size={34} strokeWidth={1.3} className="text-slate-300 mb-1.5" />
              <p className="text-xs font-semibold text-slate-700">No shift logs found</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Logs generate automatically upon user workstation login.</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs min-w-[820px] border-collapse">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-slate-200 text-slate-600 uppercase font-bold tracking-wider text-[10px]">
                  <th className="py-2.5 px-4 whitespace-nowrap">Staff Member</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Date</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Check-In</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Check-Out</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Duration</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Shift Status</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Payroll Status</th>
                  <th className="py-2.5 px-4 text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRecords.map(r => {
                  const isActive = !r.check_out;
                  return (
                    <tr key={r.id} className={`hover:bg-[#F8FAFC] transition-colors group ${isActive ? 'bg-[#0F52BA]/5' : ''}`}>
                      
                      {/* Staff Member */}
                      <td className="py-2.5 px-4 font-bold text-slate-900 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-bold flex items-center justify-center text-xs shrink-0">
                            {r.operator_name?.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 truncate text-xs">{r.operator_name}</div>
                            <div className="text-[10px] text-slate-400 font-normal">Staff Member</div>
                          </div>
                        </div>
                      </td>

                      {/* Date */}
                      <td className="py-2.5 px-3 text-slate-600 font-medium whitespace-nowrap text-xs">{r.date}</td>

                      {/* Check-In */}
                      <td className="py-2.5 px-3 font-semibold text-[#10B981] whitespace-nowrap text-xs">{formatTime(r.check_in)}</td>

                      {/* Check-Out */}
                      <td className="py-2.5 px-3 font-semibold text-slate-600 whitespace-nowrap text-xs">{formatTime(r.check_out)}</td>

                      {/* Duration */}
                      <td className="py-2.5 px-3 font-semibold text-slate-800 whitespace-nowrap text-xs">{formatDuration(r.total_minutes, isActive)}</td>
                      
                      {/* Shift Status */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {getStatusBadge(r.status, isActive)}
                      </td>

                      {/* Payroll Status */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {r.is_excused ? (
                          <div className="inline-flex flex-col items-start">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/30 whitespace-nowrap">
                              <CheckCheck size={11} /> Excused (No Cut)
                            </span>
                            {r.excuse_reason && (
                              <span className="text-[10px] text-slate-400 truncate max-w-[140px] mt-0.5" title={r.excuse_reason}>
                                {r.excuse_reason}
                              </span>
                            )}
                          </div>
                        ) : r.status === 'Late' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/30 whitespace-nowrap">
                            Late Fine Applied
                          </span>
                        ) : r.status === 'Half Day' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/30 whitespace-nowrap">
                            50% Deduction
                          </span>
                        ) : r.status === 'Absent' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/30 whitespace-nowrap">
                            100% Deduction
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200 whitespace-nowrap">
                            Standard Pay
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenOverride(r)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-[#0F52BA] hover:text-[#0c449c] transition-colors cursor-pointer"
                            title="Excuse or adjust record"
                          >
                            <FileEdit size={12} />
                            <span>Excuse</span>
                          </button>

                          {isActive && (
                            <button
                              onClick={() => handleForceCheckout(r.id, r.operator_name)}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-[#EF4444] hover:text-[#dc2626] transition-colors cursor-pointer"
                              title="Force close duty"
                            >
                              <LogOut size={12} />
                              <span>Close Shift</span>
                            </button>
                          )}
                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. MODALS (Aligned with Sapphire #0F52BA & Coral #EF4444)                 */}
      {/* ========================================================================= */}

      {/* Modal 1: Shift Policy Rules */}
      {isPolicyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-3 animate-in fade-in duration-150">
          <div className="bg-[#FFFFFF] rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="px-5 py-3.5 border-b border-slate-200 flex justify-between items-center bg-[#F8FAFC]">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-[#0F52BA]/10 text-[#0F52BA] flex items-center justify-center">
                  <Sliders size={14} />
                </div>
                <h2 className="text-xs font-bold text-slate-900 tracking-tight">Shift Timing Rules</h2>
              </div>
              <button onClick={() => setIsPolicyModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer">
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleSavePolicy} className="p-5 space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Shift Start Time</label>
                  <input
                    type="time"
                    required
                    value={policyForm.shift_start}
                    onChange={(e) => setPolicyForm({ ...policyForm, shift_start: e.target.value })}
                    className="h-8 w-full border border-slate-300 rounded-lg px-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#0F52BA] focus:ring-2 focus:ring-[#0F52BA]/15 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Grace Buffer (Minutes)</label>
                  <input
                    type="number"
                    min="0"
                    max="60"
                    required
                    value={policyForm.grace_minutes}
                    onChange={(e) => setPolicyForm({ ...policyForm, grace_minutes: e.target.value })}
                    className="h-8 w-full border border-slate-300 rounded-lg px-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#0F52BA] focus:ring-2 focus:ring-[#0F52BA]/15 transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Half-Day Cutoff</label>
                  <input
                    type="time"
                    required
                    value={policyForm.half_day_cutoff}
                    onChange={(e) => setPolicyForm({ ...policyForm, half_day_cutoff: e.target.value })}
                    className="h-8 w-full border border-slate-300 rounded-lg px-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#0F52BA] focus:ring-2 focus:ring-[#0F52BA]/15 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Absent Cutoff</label>
                  <input
                    type="time"
                    required
                    value={policyForm.absent_cutoff}
                    onChange={(e) => setPolicyForm({ ...policyForm, absent_cutoff: e.target.value })}
                    className="h-8 w-full border border-slate-300 rounded-lg px-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#0F52BA] focus:ring-2 focus:ring-[#0F52BA]/15 transition-all"
                  />
                </div>
              </div>

              <div className="p-3 bg-[#F8FAFC] border border-slate-200 rounded-xl text-xs text-slate-600 space-y-1">
                <p className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-[#10B981]" />
                  Active Policy Matrix:
                </p>
                <p>&bull; <strong>On Time:</strong> Up to {policyForm.shift_start} + {policyForm.grace_minutes}m buffer</p>
                <p>&bull; <strong>Late:</strong> Up to {policyForm.half_day_cutoff}</p>
                <p>&bull; <strong>Half Day:</strong> Up to {policyForm.absent_cutoff}</p>
                <p>&bull; <strong>Absent:</strong> Any check-in arriving after {policyForm.absent_cutoff}</p>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsPolicyModalOpen(false)}
                  className="h-8 px-3.5 bg-[#FFFFFF] border border-slate-300 hover:bg-slate-50 text-xs font-semibold text-slate-600 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingPolicy}
                  className="h-8 px-4 bg-[#0F52BA] hover:bg-[#0c449c] text-[#FFFFFF] text-xs font-semibold rounded-lg transition-all disabled:opacity-40 cursor-pointer shadow-xs active:scale-95 flex items-center gap-1.5"
                >
                  <Save size={13} />
                  <span>{isSavingPolicy ? 'Saving...' : 'Save Shift Policy'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Declare Holiday */}
      {isHolidayModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-3 animate-in fade-in duration-150">
          <div className="bg-[#FFFFFF] rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="px-5 py-3.5 border-b border-slate-200 flex justify-between items-center bg-[#F8FAFC]">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-[#0F52BA]/10 text-[#0F52BA] flex items-center justify-center">
                  <CalendarDays size={14} />
                </div>
                <h2 className="text-xs font-bold text-slate-900 tracking-tight">Declare Paid Holiday</h2>
              </div>
              <button onClick={() => setIsHolidayModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer">
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleDeclareHoliday} className="p-5 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Holiday Date <span className="text-[#EF4444]">*</span></label>
                <input
                  type="date"
                  required
                  value={holidayForm.holiday_date}
                  onChange={(e) => setHolidayForm({ ...holidayForm, holiday_date: e.target.value })}
                  className="h-8 w-full border border-slate-300 rounded-lg px-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#0F52BA] focus:ring-2 focus:ring-[#0F52BA]/15 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Occasion / Reason <span className="text-[#EF4444]">*</span></label>
                <input
                  type="text"
                  required
                  placeholder="e.g. National Day, Weather Emergency, Office Closed"
                  value={holidayForm.title}
                  onChange={(e) => setHolidayForm({ ...holidayForm, title: e.target.value })}
                  className="h-8 w-full border border-slate-300 rounded-lg px-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#0F52BA] focus:ring-2 focus:ring-[#0F52BA]/15 transition-all"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsHolidayModalOpen(false)}
                  className="h-8 px-3.5 bg-[#FFFFFF] border border-slate-300 hover:bg-slate-50 text-xs font-semibold text-slate-600 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingHoliday}
                  className="h-8 px-4 bg-[#0F52BA] hover:bg-[#0c449c] text-[#FFFFFF] text-xs font-semibold rounded-lg transition-all disabled:opacity-40 cursor-pointer shadow-xs active:scale-95 flex items-center gap-1.5"
                >
                  <CalendarDays size={13} />
                  <span>{isSavingHoliday ? 'Declaring...' : 'Declare Holiday'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Excuse / Adjust Record */}
      {isOverrideModalOpen && overrideTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-3 animate-in fade-in duration-150">
          <div className="bg-[#FFFFFF] rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="px-5 py-3.5 border-b border-slate-200 flex justify-between items-center bg-[#F8FAFC]">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-[#0F52BA]/10 text-[#0F52BA] flex items-center justify-center">
                  <FileEdit size={14} />
                </div>
                <h2 className="text-xs font-bold text-slate-900 tracking-tight">Adjust: {overrideTarget.operator_name}</h2>
              </div>
              <button onClick={() => setIsOverrideModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer">
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleSaveOverride} className="p-5 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Adjust Shift Status</label>
                <select
                  value={overrideForm.status}
                  onChange={(e) => setOverrideForm({ ...overrideForm, status: e.target.value })}
                  className="h-8 w-full border border-slate-300 rounded-lg px-2 text-xs bg-[#FFFFFF] text-slate-900 focus:outline-none focus:border-[#0F52BA] cursor-pointer"
                >
                  <option value="On Time">On Time (Full Shift)</option>
                  <option value="Late">Late Arrival</option>
                  <option value="Half Day">Half Day</option>
                  <option value="Absent">Absent</option>
                </select>
              </div>

              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-[#0F52BA]/5 border border-[#0F52BA]/20">
                <input 
                  type="checkbox"
                  id="excuse_checkbox"
                  checked={overrideForm.is_excused}
                  onChange={(e) => setOverrideForm({ ...overrideForm, is_excused: e.target.checked })}
                  className="w-4 h-4 rounded text-[#0F52BA] cursor-pointer"
                />
                <label htmlFor="excuse_checkbox" className="text-xs font-semibold text-slate-800 select-none cursor-pointer">
                  Excuse This Record (Waive salary deductions)
                </label>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Audit Reason / Remarks <span className="text-[#EF4444]">*</span></label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Approved medical leave, Emergency verified by manager"
                  value={overrideForm.excuse_reason}
                  onChange={(e) => setOverrideForm({ ...overrideForm, excuse_reason: e.target.value })}
                  className="h-8 w-full border border-slate-300 rounded-lg px-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#0F52BA] focus:ring-2 focus:ring-[#0F52BA]/15 transition-all"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsOverrideModalOpen(false)}
                  className="h-8 px-3.5 bg-[#FFFFFF] border border-slate-300 hover:bg-slate-50 text-xs font-semibold text-slate-600 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingOverride}
                  className="h-8 px-4 bg-[#0F52BA] hover:bg-[#0c449c] text-[#FFFFFF] text-xs font-semibold rounded-lg transition-all disabled:opacity-40 cursor-pointer shadow-xs active:scale-95 flex items-center gap-1.5"
                >
                  <Save size={13} />
                  <span>{isSavingOverride ? 'Saving...' : 'Save Adjustments'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}