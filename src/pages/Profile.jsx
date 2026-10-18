import { useState } from 'react';
import axios from 'axios';
import { 
  User, Shield, Lock, Key, CheckCircle2, 
  AlertCircle, Eye, EyeOff, Save, 
  ShoppingCart, Package, Truck, Receipt, 
  LayoutDashboard, Users, ShieldCheck, X,
  BadgeCheck, Sparkles
} from 'lucide-react';

const MODULE_DETAILS = [
  { id: 'dashboard', label: 'Dashboard & Analytics', desc: 'Store revenue KPIs, trends, and sales summaries', icon: LayoutDashboard },
  { id: 'inventory', label: 'Inventory Management', desc: 'Product catalog, pricing control, and stock alerts', icon: Package },
  { id: 'purchases', label: 'Purchases & Inward', desc: 'Vendor orders, consignment bills, and payables', icon: Truck },
  { id: 'sales', label: 'Point of Sale (POS)', desc: 'Retail counter checkout, barcodes, and billing slips', icon: ShoppingCart },
  { id: 'ledger', label: 'Sales Ledger & Invoices', desc: 'Customer invoice audit trails and invoice history', icon: Receipt },
  { id: 'crm', label: 'CRM Leads Pipeline', desc: 'Commercial clients, quotations, and deal tracking', icon: Users }
];

export default function Profile() {
  // Safe Session State
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const raw = localStorage.getItem('erp_user');
      const user = raw ? JSON.parse(raw) : {};
      return {
        id: user.id || 1,
        username: user.username || 'operator',
        full_name: user.full_name || user.name || 'Team Member',
        role: user.role || 'staff',
        permissions: Array.isArray(user.permissions) ? user.permissions : []
      };
    } catch {
      return {
        id: 1,
        username: 'operator',
        full_name: 'Team Member',
        role: 'staff',
        permissions: []
      };
    }
  });

  const displayName = currentUser.full_name || 'Team Member';
  const avatarLetter = (displayName.charAt(0) || 'U').toUpperCase();

  // Name Form State
  const [fullName, setFullName] = useState(displayName);
  const [isUpdatingName, setIsUpdatingName] = useState(false);

  // Password Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [isUpdatingPass, setIsUpdatingPass] = useState(false);

  // Floating Toast Notification State
  const [toast, setToast] = useState({ isOpen: false, type: 'success', title: '', message: '' });

  const triggerToast = (type, title, message) => {
    setToast({ isOpen: true, type, title, message });
    setTimeout(() => {
      setToast(prev => ({ ...prev, isOpen: false }));
    }, 4000);
  };

  // 1. Update Display Name Handler
  const handleUpdateName = async (e) => {
    e.preventDefault();
    if (!fullName.trim()) {
      triggerToast('error', 'Name Required', 'Please provide a valid display name.');
      return;
    }

    setIsUpdatingName(true);
    try {
      const res = await axios.put(`http://localhost:5000/api/users/profile/${currentUser.id}`, {
        full_name: fullName.trim()
      });

      const updatedUser = { 
        ...currentUser, 
        full_name: res.data.user?.full_name || fullName.trim() 
      };

      localStorage.setItem('erp_user', JSON.stringify(updatedUser));
      setCurrentUser(updatedUser);

      window.dispatchEvent(new Event('erp_user_updated'));
      triggerToast('success', 'Profile Updated', 'Your full name has been saved successfully.');
    } catch (err) {
      triggerToast('error', 'Update Failed', err.response?.data?.error || 'Unable to update your name.');
    } finally {
      setIsUpdatingName(false);
    }
  };

  // 2. Change Password Handler
  const handleChangePassword = async (e) => {
    e.preventDefault();

    if (!currentPassword) {
      triggerToast('error', 'Verification Required', 'Please enter your current password.');
      return;
    }

    if (!newPassword || newPassword.length < 4) {
      triggerToast('error', 'Weak Password', 'Password should contain at least 4 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      triggerToast('error', 'Passwords Do Not Match', 'New password and confirmation must match.');
      return;
    }

    setIsUpdatingPass(true);
    try {
      await axios.put(`http://localhost:5000/api/users/profile/${currentUser.id}`, {
        currentPassword,
        newPassword
      });

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      triggerToast('success', 'Password Changed', 'Your account credentials have been updated.');
    } catch (err) {
      triggerToast('error', 'Verification Failed', err.response?.data?.error || 'Failed to update password.');
    } finally {
      setIsUpdatingPass(false);
    }
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-8 font-sans select-none bg-[#F8FAFC]">

      {/* Floating Notification Toast */}
      <div 
        className={`fixed top-5 right-5 z-50 transition-all duration-200 transform ${
          toast.isOpen 
            ? 'translate-y-0 opacity-100 scale-100 pointer-events-auto' 
            : '-translate-y-3 opacity-0 scale-95 pointer-events-none'
        }`}
      >
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl border border-slate-200 bg-[#FFFFFF] shadow-xl min-w-[300px] max-w-md">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
            toast.type === 'success' 
              ? 'bg-[#10B981]/10 text-[#10B981]' 
              : 'bg-[#EF4444]/10 text-[#EF4444]'
          }`}>
            {toast.type === 'success' ? (
              <CheckCircle2 size={15} />
            ) : (
              <AlertCircle size={15} />
            )}
          </div>
          <div className="flex-1 pr-1">
            <h4 className="text-xs font-bold text-slate-900 tracking-tight">{toast.title}</h4>
            <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{toast.message}</p>
          </div>
          <button 
            type="button"
            onClick={() => setToast(prev => ({ ...prev, isOpen: false }))} 
            className="text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* 1. Header Profile Banner (60% Primary Sapphire #0F52BA & Neutral #FFFFFF) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#FFFFFF] px-5 py-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-11 h-11 rounded-xl bg-[#0F52BA] text-[#FFFFFF] flex items-center justify-center font-extrabold text-base tracking-tight shrink-0 shadow-xs border border-[#0F52BA]/20">
            {avatarLetter}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base font-bold text-slate-900 tracking-tight leading-none">
                {displayName}
              </h1>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border leading-none ${
                currentUser.role === 'admin' 
                  ? 'bg-[#0F52BA]/10 text-[#0F52BA] border-[#0F52BA]/25' 
                  : 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/25'
              }`}>
                <BadgeCheck size={11} />
                {currentUser.role === 'admin' ? 'Super Administrator' : 'Staff Member'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mt-1.5 leading-none">
              <span className="font-mono font-semibold text-[#0F52BA]">@{currentUser.username}</span>
              <span className="text-slate-300">&bull;</span>
              <span className="inline-flex items-center gap-1 text-[#10B981] font-semibold text-[11px]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
                Signed In & Active
              </span>
            </div>
          </div>
        </div>

        <div className="h-8 px-3 bg-[#F8FAFC] border border-slate-200 rounded-lg text-xs text-slate-600 flex items-center gap-2 shrink-0 self-start sm:self-auto">
          <ShieldCheck size={14} className="text-[#0F52BA] shrink-0" />
          <span className="text-[11px] font-semibold">Role permissions managed by Admin</span>
        </div>
      </div>

      {/* 2. Micro KPI Strip (Tokens: #0F52BA, #10B981, #4F46E5) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-[#FFFFFF] p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Assigned Authority</span>
          <div className="text-lg font-black text-slate-900 mt-1">
            {currentUser.role === 'admin' ? 'Root Administrator' : 'Standard Operator'}
          </div>
          <div className="text-[11px] text-[#0F52BA] font-semibold mt-1 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#0F52BA]" />
            Verified Workstation Profile
          </div>
        </div>

        <div className="bg-[#FFFFFF] p-4 rounded-xl border border-[#10B981]/30 bg-[#10B981]/5 shadow-xs flex flex-col justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#10B981] block">Session Security</span>
          <div className="text-lg font-black text-[#10B981] mt-1">Authenticated</div>
          <div className="text-[11px] text-[#10B981] font-semibold mt-1 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
            Active Shift Token
          </div>
        </div>

        <div className="bg-[#FFFFFF] p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#4F46E5] block">Workspace Access</span>
          <div className="text-lg font-black text-slate-900 mt-1">
            {currentUser.role === 'admin' ? 'All 6 Modules' : `${currentUser.permissions.length} Modules Granted`}
          </div>
          <div className="text-[11px] text-[#4F46E5] font-semibold mt-1 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4F46E5]" />
            Role-Based Access Control
          </div>
        </div>
      </div>

      {/* 3. Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">

        {/* Left Column: Module Privileges */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-[#FFFFFF] rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 bg-[#F8FAFC] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield size={14} className="text-[#0F52BA]" />
                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Access Rights</h2>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-[#0F52BA]/10 text-[#0F52BA] border border-[#0F52BA]/20 rounded-full">
                {currentUser.role === 'admin' ? 'Unrestricted' : `${currentUser.permissions.length} Active`}
              </span>
            </div>

            <div className="p-4">
              {currentUser.role === 'admin' ? (
                <div className="space-y-3">
                  <div className="p-3.5 bg-[#0F52BA]/5 border border-[#0F52BA]/20 rounded-xl space-y-1.5">
                    <div className="text-xs font-bold text-[#0F52BA] flex items-center gap-1.5">
                      <Sparkles size={14} className="text-[#0F52BA]" />
                      Unrestricted Administrator
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      Your account holds full root authority across catalog pricing, POS registers, vendor payables, staff shifts, and monthly payroll.
                    </p>
                  </div>

                  <div className="space-y-2 pt-1">
                    {MODULE_DETAILS.map((mod) => {
                      const Icon = mod.icon;
                      return (
                        <div 
                          key={mod.id} 
                          className="p-2.5 bg-[#F8FAFC] border border-slate-200/80 rounded-lg flex items-center justify-between gap-2.5"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-6 h-6 rounded-md bg-[#FFFFFF] border border-slate-200 text-[#0F52BA] flex items-center justify-center shrink-0">
                              <Icon size={13} />
                            </div>
                            <span className="text-xs font-semibold text-slate-800 truncate">{mod.label}</span>
                          </div>
                          <CheckCircle2 size={13} className="text-[#10B981] shrink-0" />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <p className="text-[11px] text-slate-500 mb-2">
                    Your account is authorized to access the following workspace modules:
                  </p>
                  {currentUser.permissions && currentUser.permissions.length > 0 ? (
                    currentUser.permissions.map((permId) => {
                      const mod = MODULE_DETAILS.find(m => m.id === permId);
                      const Icon = mod?.icon || Package;
                      return (
                        <div 
                          key={permId} 
                          className="p-2.5 bg-[#F8FAFC] border border-slate-200 rounded-lg flex items-start gap-2.5 hover:border-[#0F52BA]/40 transition-colors"
                        >
                          <div className="w-7 h-7 rounded-lg bg-[#FFFFFF] border border-slate-200 text-[#0F52BA] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                            <Icon size={14} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="text-xs font-bold text-slate-900 truncate">{mod ? mod.label : permId}</h4>
                            <p className="text-[10px] text-slate-500 mt-0.5 leading-snug line-clamp-2">{mod?.desc}</p>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-3.5 bg-[#F59E0B]/10 border border-[#F59E0B]/30 rounded-xl text-xs text-[#F59E0B] font-medium">
                      No active modules assigned. Please contact your administrator to request access permissions.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Profile & Password Settings */}
        <div className="lg:col-span-2 space-y-4">

          {/* Form 1: General Profile Info */}
          <div className="bg-[#FFFFFF] rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-200 bg-[#F8FAFC] flex items-center gap-2">
              <User size={14} className="text-[#0F52BA]" />
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Account Details</h2>
            </div>

            <form onSubmit={handleUpdateName} className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Your Full Name <span className="text-[#EF4444]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                    className="h-8 w-full border border-slate-300 rounded-lg px-2.5 text-xs text-slate-900 bg-[#FFFFFF] focus:outline-none focus:border-[#0F52BA] focus:ring-2 focus:ring-[#0F52BA]/15 transition-all placeholder:text-slate-400 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Account Username (Locked)
                  </label>
                  <input
                    type="text"
                    disabled
                    value={`@${currentUser.username || ''}`}
                    className="h-8 w-full border border-slate-200 bg-[#F8FAFC] text-slate-500 rounded-lg px-2.5 text-xs font-mono font-medium cursor-not-allowed select-none"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Unique system identifier assigned by administrator</span>
                </div>
              </div>

              <div className="flex justify-end pt-2 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={isUpdatingName || fullName.trim() === currentUser.full_name}
                  className="h-8 px-4 inline-flex items-center gap-1.5 bg-[#0F52BA] hover:bg-[#0c449c] text-[#FFFFFF] rounded-lg text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-xs active:scale-95"
                >
                  <Save size={13} />
                  <span>{isUpdatingName ? 'Saving Changes...' : 'Save Profile Changes'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Form 2: Password Security */}
          <div className="bg-[#FFFFFF] rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-200 bg-[#F8FAFC] flex items-center gap-2">
              <Lock size={14} className="text-[#0F52BA]" />
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Password & Security</h2>
            </div>

            <form onSubmit={handleChangePassword} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Current Password <span className="text-[#EF4444]">*</span>
                </label>
                <div className="relative max-w-md">
                  <input
                    type={showCurrentPass ? 'text' : 'password'}
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password to verify"
                    className="h-8 w-full border border-slate-300 rounded-lg pl-2.5 pr-9 text-xs text-slate-900 bg-[#FFFFFF] focus:outline-none focus:border-[#0F52BA] focus:ring-2 focus:ring-[#0F52BA]/15 transition-all placeholder:text-slate-400 font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPass(!showCurrentPass)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                  >
                    {showCurrentPass ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    New Password <span className="text-[#EF4444]">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPass ? 'text' : 'password'}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimum 4 characters"
                      className="h-8 w-full border border-slate-300 rounded-lg pl-2.5 pr-9 text-xs text-slate-900 bg-[#FFFFFF] focus:outline-none focus:border-[#0F52BA] focus:ring-2 focus:ring-[#0F52BA]/15 transition-all placeholder:text-slate-400 font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPass(!showNewPass)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                    >
                      {showNewPass ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Confirm New Password <span className="text-[#EF4444]">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    className="h-8 w-full border border-slate-300 rounded-lg px-2.5 text-xs text-slate-900 bg-[#FFFFFF] focus:outline-none focus:border-[#0F52BA] focus:ring-2 focus:ring-[#0F52BA]/15 transition-all placeholder:text-slate-400 font-medium"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-3 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={isUpdatingPass || !newPassword || !currentPassword}
                  className="h-8 px-4 inline-flex items-center gap-1.5 bg-[#0F52BA] hover:bg-[#0c449c] text-[#FFFFFF] rounded-lg text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-xs active:scale-95"
                >
                  <Key size={13} />
                  <span>{isUpdatingPass ? 'Updating Credentials...' : 'Update Password'}</span>
                </button>
              </div>
            </form>
          </div>

        </div>

      </div>

    </div>
  );
}