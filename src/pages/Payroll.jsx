import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { 
  Wallet, Calendar, Banknote, AlertTriangle, CheckCircle2, 
  Sliders, Printer, RefreshCw, Search, X, FileText, 
  ArrowDownCircle, ArrowUpCircle, Check
} from 'lucide-react';

export default function Payroll() {
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [payrollData, setPayrollData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Individual Employee Payslip Modal State
  const [activePayslip, setActivePayslip] = useState(null);

  // Rules Configuration Modal State
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);
  const [isSavingRules, setIsSavingRules] = useState(false);
  const [rulesForm, setRulesForm] = useState({
    working_days: 30,
    grace_lates: 2,
    late_fine_amount: 300,
    half_day_deduction_pct: 50,
    absent_deduction_pct: 100
  });

  const loadPayroll = async () => {
    setIsLoading(true);
    try {
      const res = await axios.get(`http://localhost:5000/api/payroll/sheet?month=${selectedMonth}`);
      setPayrollData(res.data);
      if (res.data?.rules) {
        setRulesForm(res.data.rules);
      }
    } catch (err) {
      console.error('Failed to load payroll records:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPayroll();
  }, [selectedMonth]);

  const handleSaveRules = async (e) => {
    e.preventDefault();
    setIsSavingRules(true);
    try {
      await axios.put('http://localhost:5000/api/payroll/rules', rulesForm);
      alert('Payroll deduction rules updated successfully.');
      setIsRulesModalOpen(false);
      loadPayroll();
    } catch (err) {
      alert('Failed to update deduction rules.');
    } finally {
      setIsSavingRules(false);
    }
  };

  const filteredSheet = useMemo(() => {
    if (!payrollData?.sheet) return [];
    const q = searchQuery.toLowerCase().trim();
    if (!q) return payrollData.sheet;
    return payrollData.sheet.filter(s => 
      s.operator_name?.toLowerCase().includes(q) || 
      s.username?.toLowerCase().includes(q)
    );
  }, [payrollData, searchQuery]);

  const totals = useMemo(() => {
    if (!payrollData?.sheet) return { base: 0, deductions: 0, net: 0 };
    return payrollData.sheet.reduce((acc, row) => ({
      base: acc.base + Number(row.base_salary || 0),
      deductions: acc.deductions + Number(row.total_deductions || 0),
      net: acc.net + Number(row.net_salary || 0)
    }), { base: 0, deductions: 0, net: 0 });
  }, [payrollData]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-8 font-sans select-none bg-[#F8FAFC]">

      {/* Scoped Print CSS */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
          body {
            background: #ffffff !important;
            color: #000000 !important;
          }
          body * {
            visibility: hidden !important;
          }
          #printable-area, #printable-area * {
            visibility: visible !important;
          }
          #printable-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: transparent !important;
            border: none !important;
            box-shadow: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* 1. Top Header Card (60% Primary Sapphire #0F52BA & Neutral #FFFFFF) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#FFFFFF] px-5 py-4 rounded-xl border border-slate-200 shadow-xs no-print">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-[#0F52BA]/10 border border-[#0F52BA]/20 flex items-center justify-center text-[#0F52BA] shrink-0">
            <Wallet size={18} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900 tracking-tight leading-none">
                Monthly Payroll & Salary Ledger
              </h1>
              <span className="text-[11px] font-semibold text-[#0F52BA] bg-[#0F52BA]/10 border border-[#0F52BA]/20 px-2 py-0.5 rounded-full leading-none">
                {payrollData?.sheet?.length || 0} Staff
              </span>
            </div>
            <p className="text-xs text-slate-500 truncate mt-1 leading-none">
              Automated salary sheet with dynamic deductions for lates, half-days, and unexcused absences
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto flex-wrap">
          <input 
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="h-8 border border-slate-300 rounded-lg px-2.5 text-xs font-mono font-medium text-slate-700 bg-[#FFFFFF] focus:outline-none focus:border-[#0F52BA] focus:ring-2 focus:ring-[#0F52BA]/15 cursor-pointer shadow-2xs"
          />

          <button 
            onClick={loadPayroll} 
            title="Refresh Payroll Sheet" 
            className="h-8 px-2.5 flex items-center justify-center bg-[#FFFFFF] border border-slate-300 hover:border-[#0F52BA] hover:text-[#0F52BA] rounded-lg text-slate-600 transition-colors cursor-pointer shadow-2xs active:scale-95"
          >
            <RefreshCw size={13} className={isLoading ? 'animate-spin text-[#0F52BA]' : ''} />
          </button>

          <button
            onClick={() => setIsRulesModalOpen(true)}
            className="h-8 px-3 flex items-center gap-1.5 bg-[#FFFFFF] border border-slate-300 hover:border-[#0F52BA] hover:text-[#0F52BA] text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer shadow-2xs active:scale-95 whitespace-nowrap"
          >
            <Sliders size={13} />
            <span>Deduction Rules</span>
          </button>

          <button 
            onClick={handlePrint} 
            className="h-8 px-3.5 flex items-center gap-1.5 bg-[#0F52BA] hover:bg-[#0c449c] text-[#FFFFFF] rounded-lg text-xs font-semibold transition-all shadow-xs cursor-pointer active:scale-95 whitespace-nowrap"
            title="Print Full Month Sheet"
          >
            <Printer size={13} />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* 2. Micro KPI Strip (Tokens: #4F46E5, #EF4444, #10B981, #06B6D4) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 no-print">
        <div className="bg-[#FFFFFF] p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Total Base Payroll</span>
          <div className="text-xl font-black text-slate-900 font-mono mt-1">
            Rs {totals.base.toLocaleString()}
          </div>
          <div className="text-[11px] text-[#4F46E5] font-semibold mt-1 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4F46E5]" />
            Gross Monthly Commitment
          </div>
        </div>

        <div className="bg-[#FFFFFF] p-4 rounded-xl border border-[#EF4444]/30 bg-[#EF4444]/5 shadow-xs flex flex-col justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#EF4444] block">Total Deductions</span>
          <div className="text-xl font-black text-[#EF4444] font-mono mt-1">
            -Rs {totals.deductions.toLocaleString()}
          </div>
          <div className="text-[11px] text-[#EF4444] font-semibold mt-1 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444]" />
            Lates & Unexcused Absences
          </div>
        </div>

        <div className="bg-[#FFFFFF] p-4 rounded-xl border border-[#10B981]/30 bg-[#10B981]/5 shadow-xs flex flex-col justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#10B981] block">Net Payable Salary</span>
          <div className="text-xl font-black text-[#10B981] font-mono mt-1">
            Rs {totals.net.toLocaleString()}
          </div>
          <div className="text-[11px] text-[#10B981] font-semibold mt-1 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
            Final Disbursement Amount
          </div>
        </div>

        <div className="bg-[#FFFFFF] p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#06B6D4] block">Active Cycle Policy</span>
          <div className="text-xl font-black text-slate-900 font-mono mt-1">
            {rulesForm.working_days} Days
          </div>
          <div className="text-[11px] text-[#06B6D4] font-semibold mt-1 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#06B6D4]" />
            {rulesForm.grace_lates} Grace Lates &bull; {payrollData?.holidays?.length || 0} Holidays
          </div>
        </div>
      </div>

      {/* 3. Main Table Container */}
      <div id={!activePayslip ? "printable-area" : undefined} className="bg-[#FFFFFF] rounded-xl border border-slate-200 overflow-hidden shadow-xs flex flex-col">
        
        {/* Printable Official Document Header */}
        <div className="hidden print:block p-6 border-b-2 border-[#0F52BA] text-slate-900">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-black tracking-tight uppercase text-[#0F52BA]">
                SHEIKH&apos;S ERP &bull; MONTHLY PAYROLL STATEMENT
              </h2>
              <p className="text-xs text-slate-600 mt-1 font-mono">
                Statement Period: {selectedMonth} &bull; Standard Working Cycle: {rulesForm.working_days} Days
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold font-mono">Generated: {new Date().toLocaleDateString('en-PK')}</span>
              <p className="text-[11px] text-slate-500">Official Accounts & HR Ledger</p>
            </div>
          </div>
        </div>

        {/* Search Toolbar */}
        <div className="p-3.5 border-b border-slate-200 bg-[#F8FAFC] flex flex-col sm:flex-row justify-between items-center gap-3 no-print">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input 
              type="text" 
              placeholder="Search employee by name or @username..." 
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
          <span className="text-xs font-medium text-slate-500">
            Period: <strong className="text-slate-800 font-mono">{selectedMonth}</strong> &bull; Paid Holidays: <strong className="text-[#0F52BA]">{payrollData?.holidays?.length || 0}</strong>
          </span>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto min-h-[340px]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400 gap-2 no-print">
              <div className="w-5 h-5 border-2 border-[#0F52BA] border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-medium">Computing monthly salary sheet...</p>
            </div>
          ) : filteredSheet.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400 p-6 text-center">
              <Wallet size={34} strokeWidth={1.3} className="mx-auto mb-1.5 text-slate-300" />
              <p className="font-semibold text-slate-700 text-xs">No payroll records found</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Ensure active staff members are registered in Staff Accounts.</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs min-w-[840px] border-collapse">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-slate-200 text-slate-600 uppercase font-bold tracking-wider text-[10px]">
                  <th className="py-2.5 px-4 whitespace-nowrap">Staff Member</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Base Salary</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Monthly Duty Audit</th>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap">Late Fines</th>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap">Absence Cuts</th>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap">Total Deductions</th>
                  <th className="py-2.5 px-3 text-right font-black text-[#10B981] whitespace-nowrap">Net Payable</th>
                  <th className="py-2.5 px-4 text-right whitespace-nowrap no-print">Payslip</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSheet.map(row => (
                  <tr key={row.user_id} className="hover:bg-[#F8FAFC] transition-colors group">
                    
                    {/* Staff Member */}
                    <td className="py-2.5 px-4 font-bold text-slate-900 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-[#0F52BA]/10 border border-[#0F52BA]/20 text-[#0F52BA] font-bold flex items-center justify-center text-xs shrink-0 no-print">
                          {row.operator_name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-xs leading-tight">{row.operator_name}</div>
                          <div className="text-[10px] text-[#0F52BA] font-mono leading-none mt-0.5">@{row.username}</div>
                        </div>
                      </div>
                    </td>

                    {/* Base Salary */}
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                      Rs {row.base_salary.toLocaleString()}
                      <span className="block text-[10px] text-slate-400 font-normal">
                        Rs {row.daily_wage.toLocaleString()}/day
                      </span>
                    </td>

                    {/* Duty Audit */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
                        <span className="px-1.5 py-0.2 rounded bg-[#10B981]/10 text-[#10B981] font-semibold">
                          {row.on_time_count} On Time
                        </span>
                        <span className={`px-1.5 py-0.2 rounded font-semibold ${
                          row.chargeable_lates > 0 
                            ? 'bg-[#F59E0B]/10 text-[#F59E0B]' 
                            : 'bg-slate-100 text-slate-500'
                        }`}>
                          {row.late_count} Late ({row.chargeable_lates} fined)
                        </span>
                        <span className={`px-1.5 py-0.2 rounded font-semibold ${
                          row.half_day_count > 0 
                            ? 'bg-[#F59E0B]/10 text-[#F59E0B]' 
                            : 'bg-slate-100 text-slate-500'
                        }`}>
                          {row.half_day_count} Half
                        </span>
                        <span className={`px-1.5 py-0.2 rounded font-semibold ${
                          row.absent_count > 0 
                            ? 'bg-[#EF4444]/10 text-[#EF4444]' 
                            : 'bg-slate-100 text-slate-500'
                        }`}>
                          {row.absent_count} Absent
                        </span>
                      </div>
                      {row.excused_count > 0 && (
                        <span className="text-[10px] text-[#4F46E5] font-semibold block mt-0.5">
                          +{row.excused_count} Excused / Approved Leave Days
                        </span>
                      )}
                    </td>

                    {/* Late Penalties */}
                    <td className="py-2.5 px-3 text-right font-mono font-semibold whitespace-nowrap">
                      {row.late_deduction > 0 ? (
                        <span className="text-[#F59E0B]">-Rs {row.late_deduction.toLocaleString()}</span>
                      ) : (
                        <span className="text-slate-400">Rs 0</span>
                      )}
                    </td>

                    {/* Absence Cuts */}
                    <td className="py-2.5 px-3 text-right font-mono font-semibold whitespace-nowrap">
                      {row.half_day_deduction + row.absent_deduction > 0 ? (
                        <span className="text-[#EF4444]">
                          -Rs {(row.half_day_deduction + row.absent_deduction).toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-slate-400">Rs 0</span>
                      )}
                    </td>

                    {/* Total Deductions */}
                    <td className="py-2.5 px-3 text-right font-mono font-bold whitespace-nowrap">
                      {row.total_deductions > 0 ? (
                        <span className="text-[#EF4444]">-Rs {row.total_deductions.toLocaleString()}</span>
                      ) : (
                        <span className="text-slate-400">Rs 0</span>
                      )}
                    </td>

                    {/* Net Payable */}
                    <td className="py-2.5 px-3 text-right font-mono font-black text-[#10B981] text-xs whitespace-nowrap">
                      Rs {row.net_salary.toLocaleString()}
                    </td>

                    {/* Payslip Action */}
                    <td className="py-2.5 px-4 text-right whitespace-nowrap no-print">
                      <button
                        onClick={() => setActivePayslip(row)}
                        className="h-7 px-2.5 inline-flex items-center gap-1 bg-[#0F52BA]/10 hover:bg-[#0F52BA] text-[#0F52BA] hover:text-[#FFFFFF] rounded-lg text-xs font-semibold transition-colors cursor-pointer border border-[#0F52BA]/20"
                        title="View & Print Salary Slip"
                      >
                        <FileText size={12} />
                        <span>Slip</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Printable Footer */}
        <div className="hidden print:flex justify-between items-center p-8 mt-12 border-t border-slate-300 text-xs font-semibold text-slate-700">
          <div>
            <div className="w-48 border-b border-slate-400 mb-1"></div>
            <span>Prepared By (Accounts Officer)</span>
          </div>
          <div>
            <div className="w-48 border-b border-slate-400 mb-1"></div>
            <span>Approved By (Managing Director)</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. INDIVIDUAL EMPLOYEE PAYSLIP MODAL                                      */}
      {/* ========================================================================= */}
      {activePayslip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-2xl bg-[#FFFFFF] rounded-2xl shadow-xl border border-slate-200 flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-150">
            
            {/* Sticky Top Actions Bar */}
            <div className="px-5 py-3.5 bg-[#F8FAFC] border-b border-slate-200 flex justify-between items-center shrink-0 no-print">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-[#0F52BA]/10 text-[#0F52BA] flex items-center justify-center">
                  <FileText size={14} />
                </div>
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Salary Voucher Preview &mdash; {activePayslip.operator_name}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="h-8 px-3.5 flex items-center gap-1.5 bg-[#0F52BA] hover:bg-[#0c449c] text-[#FFFFFF] rounded-lg text-xs font-semibold cursor-pointer shadow-xs transition-all active:scale-95"
                >
                  <Printer size={13} />
                  <span>Print Slip</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActivePayslip(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-md cursor-pointer transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Scrollable Payslip Body */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 bg-[#F8FAFC] custom-scrollbar">
              <div id="printable-area" className="bg-[#FFFFFF] p-6 rounded-xl border border-slate-200 shadow-2xs space-y-5 text-slate-900">
                
                {/* Slip Header */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b-2 border-[#0F52BA] pb-4">
                  <div>
                    <h3 className="text-lg font-black tracking-tight text-[#0F52BA] uppercase">
                      SHEIKH&apos;S ENTERPRISE ERP
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">Official Employee Salary Statement</p>
                    <p className="text-xs text-slate-600 mt-1 font-mono">
                      Pay Period: <strong>{selectedMonth}</strong>
                    </p>
                  </div>
                  <div className="sm:text-right">
                    <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/30">
                      Disbursement Voucher
                    </span>
                    <p className="text-[11px] text-slate-400 mt-1 font-mono">
                      Issued: {new Date().toLocaleDateString('en-PK')}
                    </p>
                  </div>
                </div>

                {/* Staff Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-[#F8FAFC] border border-slate-200 p-3.5 rounded-xl text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Employee Name</span>
                    <p className="font-bold text-slate-900 text-sm mt-0.5">{activePayslip.operator_name}</p>
                    <p className="text-[#0F52BA] font-mono text-[11px]">@{activePayslip.username}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Workstation Designation</span>
                    <p className="font-bold text-slate-900 text-sm mt-0.5 capitalize">{activePayslip.role}</p>
                    <p className="text-slate-500 font-mono text-[11px]">
                      Daily Wage Rate: Rs {activePayslip.daily_wage.toLocaleString()} / Day
                    </p>
                  </div>
                </div>

                {/* Earnings & Deductions Breakdown */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  
                  {/* Earnings */}
                  <div className="space-y-2">
                    <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <ArrowUpCircle size={14} className="text-[#10B981]" />
                      Earnings & Attendance
                    </h4>
                    <div className="p-3.5 bg-[#F8FAFC] rounded-xl border border-slate-200 space-y-2 font-mono">
                      <div className="flex justify-between">
                        <span className="text-slate-600">Base Monthly Pay:</span>
                        <span className="font-bold text-slate-900">Rs {activePayslip.base_salary.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-slate-500 text-[11px]">
                        <span>On-Time Present Days:</span>
                        <span className="font-semibold text-[#10B981]">{activePayslip.on_time_count} Days</span>
                      </div>
                      {activePayslip.excused_count > 0 && (
                        <div className="flex justify-between text-[#4F46E5] text-[11px]">
                          <span>Excused / Paid Leaves:</span>
                          <span className="font-semibold">{activePayslip.excused_count} Days</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Deductions */}
                  <div className="space-y-2">
                    <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <ArrowDownCircle size={14} className="text-[#EF4444]" />
                      Deductions Breakdown
                    </h4>
                    <div className="p-3.5 bg-[#EF4444]/5 rounded-xl border border-[#EF4444]/20 space-y-2 font-mono">
                      <div className="flex justify-between text-slate-700">
                        <span>Late Fines ({activePayslip.chargeable_lates}x):</span>
                        <span className="text-[#F59E0B] font-semibold">-Rs {activePayslip.late_deduction.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-slate-700">
                        <span>Half-Day Cuts ({activePayslip.half_day_count}x):</span>
                        <span className="text-[#EF4444] font-semibold">-Rs {activePayslip.half_day_deduction.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-slate-700">
                        <span>Unexcused Absent ({activePayslip.absent_count}x):</span>
                        <span className="text-[#EF4444] font-semibold">-Rs {activePayslip.absent_deduction.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between pt-1.5 border-t border-[#EF4444]/20 font-bold text-[#EF4444]">
                        <span>Total Policy Deduction:</span>
                        <span>-Rs {activePayslip.total_deductions.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Net Take-Home Highlight */}
                <div className="p-4 bg-[#10B981]/10 border border-[#10B981]/30 rounded-xl flex justify-between items-center">
                  <div>
                    <span className="text-[10px] font-bold text-[#10B981] uppercase tracking-wider block">
                      Net Take-Home Salary
                    </span>
                    <span className="text-xs text-slate-600">
                      Disbursable after automated shift policy evaluation
                    </span>
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-[#10B981] font-mono">
                    Rs {activePayslip.net_salary.toLocaleString()}
                  </div>
                </div>

                {/* Signature Block */}
                <div className="pt-8 border-t border-slate-200 grid grid-cols-2 gap-8 text-center text-xs font-semibold text-slate-600">
                  <div>
                    <div className="border-b border-slate-300 w-36 mx-auto mb-1"></div>
                    <span>Accountant Signature</span>
                  </div>
                  <div>
                    <div className="border-b border-slate-300 w-36 mx-auto mb-1"></div>
                    <span>Employee Signature</span>
                  </div>
                </div>

              </div>
            </div>

            {/* Sticky Modal Footer */}
            <div className="p-3 bg-[#F8FAFC] border-t border-slate-200 flex justify-end gap-2 shrink-0 no-print">
              <button
                type="button"
                onClick={() => setActivePayslip(null)}
                className="h-8 px-3.5 text-xs font-semibold text-slate-600 hover:bg-slate-200/70 rounded-lg cursor-pointer transition-colors"
              >
                Close Preview
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="h-8 px-4 flex items-center gap-1.5 bg-[#0F52BA] hover:bg-[#0c449c] text-[#FFFFFF] rounded-lg text-xs font-semibold cursor-pointer shadow-xs transition-all active:scale-95"
              >
                <Printer size={13} />
                <span>Print Document</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. DEDUCTION RULES CONFIGURATION MODAL                                    */}
      {/* ========================================================================= */}
      {isRulesModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/60 backdrop-blur-xs no-print animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-[#FFFFFF] rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
            
            <div className="px-5 py-3.5 border-b border-slate-200 bg-[#F8FAFC] flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-[#0F52BA]/10 text-[#0F52BA] flex items-center justify-center">
                  <Sliders size={14} />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 tracking-tight">
                    Payroll & Deduction Formula Rules
                  </h3>
                  <p className="text-[10px] text-slate-500">
                    Configure monthly working days, allowed grace lates, and penalty rates
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsRulesModalOpen(false)} 
                className="text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleSaveRules} className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Working Days in Month</label>
                  <input 
                    type="number"
                    min="20"
                    max="31"
                    required
                    value={rulesForm.working_days}
                    onChange={e => setRulesForm({ ...rulesForm, working_days: e.target.value })}
                    className="h-8 w-full border border-slate-300 rounded-lg px-2.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-[#0F52BA] focus:ring-2 focus:ring-[#0F52BA]/15"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Formula: Base Pay / Working Days = Daily Rate</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Allowed Free Grace Lates</label>
                  <input 
                    type="number"
                    min="0"
                    max="10"
                    required
                    value={rulesForm.grace_lates}
                    onChange={e => setRulesForm({ ...rulesForm, grace_lates: e.target.value })}
                    className="h-8 w-full border border-slate-300 rounded-lg px-2.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-[#0F52BA] focus:ring-2 focus:ring-[#0F52BA]/15"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Monthly lates allowed before fine applies</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Late Fine (Rs)</label>
                  <input 
                    type="number"
                    min="0"
                    step="50"
                    required
                    value={rulesForm.late_fine_amount}
                    onChange={e => setRulesForm({ ...rulesForm, late_fine_amount: e.target.value })}
                    className="h-8 w-full border border-slate-300 rounded-lg px-2.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-[#0F52BA] focus:ring-2 focus:ring-[#0F52BA]/15"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Half-Day Cut (%)</label>
                  <input 
                    type="number"
                    min="0"
                    max="100"
                    required
                    value={rulesForm.half_day_deduction_pct}
                    onChange={e => setRulesForm({ ...rulesForm, half_day_deduction_pct: e.target.value })}
                    className="h-8 w-full border border-slate-300 rounded-lg px-2.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-[#0F52BA] focus:ring-2 focus:ring-[#0F52BA]/15"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Absent Cut (%)</label>
                  <input 
                    type="number"
                    min="0"
                    max="100"
                    required
                    value={rulesForm.absent_deduction_pct}
                    onChange={e => setRulesForm({ ...rulesForm, absent_deduction_pct: e.target.value })}
                    className="h-8 w-full border border-slate-300 rounded-lg px-2.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-[#0F52BA] focus:ring-2 focus:ring-[#0F52BA]/15"
                  />
                </div>
              </div>

              <div className="p-3 bg-[#F8FAFC] border border-slate-200 rounded-xl text-xs text-slate-600 space-y-1">
                <p className="font-bold text-slate-800 flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-[#10B981]" />
                  Active Deduction Summary:
                </p>
                <p>&bull; First <strong>{rulesForm.grace_lates} late arrivals</strong> each month are waived.</p>
                <p>&bull; Each additional unexcused late deducts <strong>Rs {Number(rulesForm.late_fine_amount || 0).toLocaleString()}</strong>.</p>
                <p>&bull; Half-day deducts <strong>{rulesForm.half_day_deduction_pct}%</strong> and absent deducts <strong>{rulesForm.absent_deduction_pct}%</strong> of daily wage.</p>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setIsRulesModalOpen(false)} 
                  className="h-8 px-3.5 border border-slate-300 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isSavingRules} 
                  className="h-8 px-4 bg-[#0F52BA] hover:bg-[#0c449c] text-[#FFFFFF] rounded-lg text-xs font-semibold cursor-pointer shadow-xs active:scale-95 flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Check size={13} />
                  <span>{isSavingRules ? 'Saving...' : 'Save Formula'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}