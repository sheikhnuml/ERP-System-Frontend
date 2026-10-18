import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, Lock, LogOut } from 'lucide-react';

export default function AccessDenied() {
  const navigate = useNavigate();

  const currentUser = (() => {
    try {
      return JSON.parse(localStorage.getItem('erp_user') || '{}');
    } catch {
      return {};
    }
  })();

  const displayName = currentUser.full_name || currentUser.username || 'Team Member';
  const roleName = currentUser.role === 'admin' ? 'Super Administrator' : 'Staff Member';

  const getSafeReturnPath = () => {
    if (currentUser.role === 'admin' || currentUser.permissions?.includes('dashboard')) {
      return '/';
    }
    const perms = currentUser.permissions || [];
    if (perms.includes('sales')) return '/sales';
    if (perms.includes('ledger')) return '/ledger';
    if (perms.includes('inventory')) return '/inventory';
    if (perms.includes('purchases')) return '/purchases';
    if (perms.includes('crm')) return '/crm';
    return '/profile';
  };

  const handleLogout = () => {
    localStorage.removeItem('erp_user');
    navigate('/login');
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center p-4 font-sans select-none bg-[#F8FAFC]">
      <div className="w-full max-w-md bg-[#FFFFFF] rounded-xl border border-slate-200 shadow-xs p-6 sm:p-7 text-center relative overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Micro-Accent Top Alert Line (Coral Red #EF4444) */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-[#EF4444]" />
        
        {/* Warning Icon Badge */}
        <div className="w-11 h-11 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/20 text-[#EF4444] flex items-center justify-center mx-auto mb-3.5 shadow-2xs">
          <ShieldAlert size={22} />
        </div>

        {/* 403 Status Pill */}
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wide text-[#EF4444] bg-[#EF4444]/10 border border-[#EF4444]/20 mb-2.5">
          <Lock size={11} />
          403 &bull; RESTRICTED ACCESS
        </span>

        <h1 className="text-base font-bold text-slate-900 tracking-tight">
          Module Permission Required
        </h1>

        <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
          Your account is not authorized to access this module. Please return to your assigned workstation or contact management to request permissions.
        </p>

        {/* Account Metadata Box */}
        <div className="my-5 p-3 bg-[#F8FAFC] border border-slate-200 rounded-lg flex items-center justify-between text-left">
          <div className="min-w-0 pr-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block leading-none mb-1">
              Active Account
            </span>
            <p className="text-xs font-bold text-slate-900 truncate leading-tight">{displayName}</p>
            <p className="text-[11px] text-slate-500 mt-0.5 leading-none">@{currentUser.username || 'user'}</p>
          </div>

          <div className="text-right shrink-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block leading-none mb-1">
              Assigned Role
            </span>
            <span className={`inline-block text-[11px] font-semibold px-2.5 py-0.5 rounded-full border leading-tight ${
              currentUser.role === 'admin' 
                ? 'text-[#0F52BA] bg-[#0F52BA]/10 border-[#0F52BA]/20' 
                : 'text-slate-700 bg-white border-slate-200'
            }`}>
              {roleName}
            </span>
          </div>
        </div>

        {/* Action Buttons (Primary Brand #0F52BA) */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
          <button
            onClick={() => navigate(getSafeReturnPath())}
            className="w-full sm:w-auto flex-1 h-8 flex items-center justify-center gap-1.5 px-3.5 bg-[#0F52BA] hover:bg-[#0c449c] text-white rounded-lg text-xs font-semibold shadow-2xs transition-all cursor-pointer active:scale-95"
          >
            <ArrowLeft size={13} />
            <span>Return to Workspace</span>
          </button>

          <button
            onClick={handleLogout}
            className="w-full sm:w-auto h-8 flex items-center justify-center gap-1.5 px-3.5 bg-white hover:bg-[#F8FAFC] border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer shadow-2xs active:scale-95"
            title="Sign in with another account"
          >
            <LogOut size={13} />
            <span>Switch Account</span>
          </button>
        </div>

        <p className="text-[11px] text-slate-400 mt-4 leading-none">
          Sheikh's ERP &bull; Enterprise Access Control
        </p>

      </div>
    </div>
  );
}