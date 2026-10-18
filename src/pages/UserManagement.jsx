import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { 
  Users, UserPlus, Trash2, Shield, 
  Check, X, RefreshCw, Eye, EyeOff, Search, 
  ShoppingCart, Package, Truck, Receipt, 
  LayoutDashboard, CheckCircle2, Edit2, Ban, 
  Unlock, ShieldCheck, Banknote, Sparkles
} from 'lucide-react';

const MODULES = [
  { 
    id: 'dashboard', 
    label: 'Dashboard & Metrics', 
    desc: 'Access analytics, revenue KPIs, and executive inventory summaries',
    icon: LayoutDashboard 
  },
  { 
    id: 'inventory', 
    label: 'Inventory Management', 
    desc: 'Manage catalog products, retail prices, and low stock warnings',
    icon: Package 
  },
  { 
    id: 'purchases', 
    label: 'Purchases & Stock Inward', 
    desc: 'Log inward vendor stock, process purchase bills, and settle payables',
    icon: Truck 
  },
  { 
    id: 'sales', 
    label: 'Point of Sale (POS)', 
    desc: 'Operate checkout counter, scan barcodes, and generate sale receipts',
    icon: ShoppingCart 
  },
  { 
    id: 'ledger', 
    label: 'Sales Ledger & Invoices', 
    desc: 'Audit invoice history, view customer balances, and reprint slips',
    icon: Receipt 
  },
  { 
    id: 'crm', 
    label: 'CRM Leads Pipeline', 
    desc: 'Manage prospective customers, commercial orders, and lead stages',
    icon: Users 
  }
];

const PRESETS = [
  { label: 'POS Cashier', perms: ['sales', 'ledger'] },
  { label: 'Warehouse Clerk', perms: ['inventory', 'purchases'] },
  { label: 'Store Manager', perms: ['dashboard', 'inventory', 'purchases', 'sales', 'ledger', 'crm'] }
];

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal State for Add & Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    username: '',
    password: '',
    full_name: '',
    role: 'staff',
    base_salary: 35000,
    permissions: ['sales', 'ledger'],
    is_blocked: false
  });

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const res = await axios.get('http://localhost:5000/api/users');
      setUsers(res.data || []);
    } catch (err) {
      console.error('Failed to load user accounts:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // Filtered Users Search
  const filteredUsers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return users;
    return users.filter(u => 
      u.full_name?.toLowerCase().includes(q) || 
      u.username?.toLowerCase().includes(q)
    );
  }, [users, searchQuery]);

  // Executive KPI Stats
  const stats = useMemo(() => {
    const totalAccounts = users.length;
    const activeAccounts = users.filter(u => !u.is_blocked).length;
    const suspendedAccounts = users.filter(u => u.is_blocked).length;
    const totalPayrollBase = users
      .filter(u => !u.is_blocked)
      .reduce((sum, u) => sum + Number(u.base_salary || 0), 0);

    return { totalAccounts, activeAccounts, suspendedAccounts, totalPayrollBase };
  }, [users]);

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setEditingUser(null);
    setFormData({
      username: '',
      password: '',
      full_name: '',
      role: 'staff',
      base_salary: 35000,
      permissions: ['sales', 'ledger'],
      is_blocked: false
    });
    setShowPassword(false);
    setIsModalOpen(true);
  };

  // Open Edit Modal (Supports Admin & Staff)
  const handleOpenEditModal = (user) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      password: '',
      full_name: user.full_name,
      role: user.role,
      base_salary: user.base_salary || 0,
      permissions: user.permissions || [],
      is_blocked: user.is_blocked || false
    });
    setShowPassword(false);
    setIsModalOpen(true);
  };

  // Toggle Single Permission Card
  const handleTogglePermission = (modId) => {
    setFormData(prev => {
      const current = prev.permissions;
      const exists = current.includes(modId);
      const updated = exists 
        ? current.filter(id => id !== modId)
        : [...current, modId];
      return { ...prev, permissions: updated };
    });
  };

  const applyPreset = (presetPerms) => {
    setFormData(prev => ({ ...prev, permissions: presetPerms, role: 'staff' }));
  };

  // Submit Handler (Create or Update)
  const handleSubmitForm = async (e) => {
    e.preventDefault();
    if (formData.permissions.length === 0 && formData.role !== 'admin') {
      alert('Please assign at least one workspace module permission.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        base_salary: Math.max(0, Number(formData.base_salary) || 0)
      };

      if (editingUser) {
        await axios.put(`http://localhost:5000/api/users/${editingUser.id}`, payload);
        alert(`Account "@${editingUser.username}" updated successfully.`);
      } else {
        await axios.post('http://localhost:5000/api/users', payload);
        alert(`New team member "@${formData.username}" provisioned successfully.`);
      }

      setIsModalOpen(false);
      loadUsers();
    } catch (err) {
      alert(err.response?.data?.error || 'Operation failed. Please verify server connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Instant Block / Unblock Toggle Action (Staff Only)
  const handleToggleBlock = async (user) => {
    if (user.username === 'admin') return;
    const actionName = user.is_blocked ? 'unblock and restore' : 'suspend';
    if (window.confirm(`Are you sure you want to ${actionName} access for ${user.full_name}?`)) {
      try {
        await axios.put(`http://localhost:5000/api/users/${user.id}`, {
          full_name: user.full_name,
          permissions: user.permissions,
          base_salary: user.base_salary,
          is_blocked: !user.is_blocked
        });
        loadUsers();
      } catch (err) {
        alert('Failed to update account status.');
      }
    }
  };

  // Delete User Action (Staff Only)
  const handleDeleteUser = async (id, name, username) => {
    if (username === 'admin') return;
    if (window.confirm(`Permanently remove account for ${name}? This action cannot be reversed.`)) {
      try {
        await axios.delete(`http://localhost:5000/api/users/${id}`);
        loadUsers();
      } catch (err) {
        alert('Failed to delete team member.');
      }
    }
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-8 font-sans select-none bg-[#F8FAFC]">
      
      {/* 1. Top Header Card (60% Primary Sapphire #0F52BA & Neutral #FFFFFF) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#FFFFFF] px-5 py-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-[#0F52BA]/10 border border-[#0F52BA]/20 flex items-center justify-center text-[#0F52BA] shrink-0">
            <Shield size={18} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900 tracking-tight leading-none">
                Staff Accounts & Access Management
              </h1>
              <span className="text-[11px] font-semibold text-[#0F52BA] bg-[#0F52BA]/10 border border-[#0F52BA]/20 px-2 py-0.5 rounded-full leading-none">
                {users.length} Registered
              </span>
            </div>
            <p className="text-xs text-slate-500 truncate mt-1 leading-none">
              Configure employee roles, base monthly salaries, and module privileges
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
          <button 
            onClick={loadUsers} 
            title="Refresh Staff List" 
            className="h-8 px-2.5 flex items-center justify-center bg-[#FFFFFF] border border-slate-300 hover:border-[#0F52BA] hover:text-[#0F52BA] rounded-lg text-slate-600 transition-colors cursor-pointer shadow-2xs active:scale-95"
          >
            <RefreshCw size={13} className={isLoading ? 'animate-spin text-[#0F52BA]' : ''} />
          </button>

          <button
            onClick={handleOpenCreateModal}
            className="h-8 px-3.5 flex items-center gap-1.5 bg-[#0F52BA] hover:bg-[#0c449c] text-[#FFFFFF] rounded-lg text-xs font-semibold shadow-xs transition-all cursor-pointer active:scale-95"
          >
            <UserPlus size={14} />
            <span>New Team Member</span>
          </button>
        </div>
      </div>

      {/* 2. KPI Summary Ribbon (Tokens: #4F46E5, #10B981, #EF4444, #06B6D4) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-[#FFFFFF] p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Total Staff Directory</span>
          <div className="text-xl font-black text-slate-900 mt-1">{stats.totalAccounts}</div>
          <div className="text-[11px] text-[#4F46E5] font-semibold mt-1 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4F46E5]" />
            Provisioned Workstations
          </div>
        </div>

        <div className="bg-[#FFFFFF] p-4 rounded-xl border border-[#10B981]/30 bg-[#10B981]/5 shadow-xs flex flex-col justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#10B981] block">Active Accounts</span>
          <div className="text-xl font-black text-[#10B981] mt-1">{stats.activeAccounts}</div>
          <div className="text-[11px] text-[#10B981] font-semibold mt-1 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
            Authorized for Login
          </div>
        </div>

        <div className="bg-[#FFFFFF] p-4 rounded-xl border border-[#EF4444]/30 bg-[#EF4444]/5 shadow-xs flex flex-col justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#EF4444] block">Suspended Accounts</span>
          <div className="text-xl font-black text-[#EF4444] mt-1">{stats.suspendedAccounts}</div>
          <div className="text-[11px] text-[#EF4444] font-semibold mt-1 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444]" />
            Access Revoked
          </div>
        </div>

        <div className="bg-[#FFFFFF] p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#06B6D4] block">Active Salary Commitment</span>
          <div className="text-xl font-black text-slate-900 font-mono mt-1">
            Rs {stats.totalPayrollBase.toLocaleString()}
          </div>
          <div className="text-[11px] text-[#06B6D4] font-semibold mt-1 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#06B6D4]" />
            Monthly Base Payroll
          </div>
        </div>
      </div>

      {/* 3. Staff Accounts Table Container */}
      <div className="bg-[#FFFFFF] rounded-xl border border-slate-200 overflow-hidden shadow-xs flex flex-col">
        
        {/* Search Toolbar */}
        <div className="p-3.5 border-b border-slate-200 bg-[#F8FAFC] flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input 
              type="text" 
              placeholder="Search by full name or @username..." 
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
            Showing <strong className="text-slate-800">{filteredUsers.length}</strong> of {users.length} Accounts
          </span>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto min-h-[320px]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400 gap-2">
              <div className="w-5 h-5 border-2 border-[#0F52BA] border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-medium">Loading staff accounts...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400 p-6 text-center">
              <Users size={34} strokeWidth={1.3} className="mx-auto mb-1.5 text-slate-300" />
              <p className="font-semibold text-slate-700 text-xs">No accounts found</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Try a different search query or provision a new team member.</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs min-w-[820px] border-collapse">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-slate-200 text-slate-600 uppercase font-bold tracking-wider text-[10px]">
                  <th className="py-2.5 px-4 whitespace-nowrap">Staff Member</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Username</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Monthly Base Salary</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Account Status</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Role</th>
                  <th className="py-2.5 px-3">Granted Module Permissions</th>
                  <th className="py-2.5 px-4 text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map(u => (
                  <tr 
                    key={u.id} 
                    className={`hover:bg-[#F8FAFC] transition-colors group ${
                      u.is_blocked ? 'bg-[#EF4444]/5' : ''
                    }`}
                  >
                    
                    {/* Staff Member */}
                    <td className="py-2.5 px-4 font-bold text-slate-900 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-7 h-7 rounded-lg border text-xs font-bold flex items-center justify-center shrink-0 ${
                          u.is_blocked 
                            ? 'bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/30' 
                            : u.role === 'admin'
                            ? 'bg-[#0F52BA]/10 text-[#0F52BA] border-[#0F52BA]/30'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}>
                          {u.full_name?.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            <span className="truncate">{u.full_name}</span>
                            {u.is_blocked && (
                              <span className="text-[9px] bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/20 font-bold px-1.5 py-0.2 rounded-full uppercase">
                                Locked
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 font-normal">
                            {u.role === 'admin' ? 'System Administrator' : 'Workstation Operator'}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Username */}
                    <td className="py-2.5 px-3 font-mono font-semibold text-[#0F52BA] whitespace-nowrap">
                      @{u.username}
                    </td>

                    {/* Monthly Base Salary */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-[#10B981] font-mono font-bold">
                        <Banknote size={13} />
                        <span>Rs {Number(u.base_salary || 0).toLocaleString()}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                        ~Rs {Math.round(Number(u.base_salary || 0) / 30).toLocaleString()} / day
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {u.is_blocked ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/30">
                          <Ban size={11} />
                          Suspended
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/30">
                          <CheckCircle2 size={11} />
                          Active
                        </span>
                      )}
                    </td>

                    {/* Role */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                        u.role === 'admin' 
                          ? 'bg-[#0F52BA]/10 text-[#0F52BA] border-[#0F52BA]/30' 
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}>
                        {u.role === 'admin' ? 'Administrator' : 'Staff Member'}
                      </span>
                    </td>

                    {/* Module Permissions */}
                    <td className="py-2.5 px-3">
                      {u.role === 'admin' ? (
                        <span className="font-semibold text-[#10B981] flex items-center gap-1.5 text-xs">
                          <ShieldCheck size={14} />
                          Full Unrestricted Access
                        </span>
                      ) : (
                        <div className="flex flex-wrap gap-1 max-w-sm">
                          {u.permissions?.length > 0 ? (
                            u.permissions.map(p => {
                              const mod = MODULES.find(m => m.id === p);
                              return (
                                <span 
                                  key={p} 
                                  className="px-2 py-0.5 bg-[#F8FAFC] text-slate-700 rounded text-[10px] font-semibold border border-slate-200 whitespace-nowrap"
                                >
                                  {mod ? mod.label : p}
                                </span>
                              );
                            })
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">No modules granted</span>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-2.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1 opacity-85 group-hover:opacity-100 transition-opacity">
                        
                        {/* Edit Button */}
                        <button
                          onClick={() => handleOpenEditModal(u)}
                          className="p-1.5 text-slate-400 hover:text-[#0F52BA] hover:bg-[#0F52BA]/10 rounded-md transition-colors cursor-pointer"
                          title="Edit Details & Salary"
                        >
                          <Edit2 size={13} />
                        </button>

                        {/* Suspend & Delete Buttons (Restricted to non-admin staff) */}
                        {u.username !== 'admin' ? (
                          <>
                            <button
                              onClick={() => handleToggleBlock(u)}
                              className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                                u.is_blocked 
                                  ? 'text-[#10B981] hover:bg-[#10B981]/10' 
                                  : 'text-[#F59E0B] hover:bg-[#F59E0B]/10'
                              }`}
                              title={u.is_blocked ? 'Unblock & Restore Access' : 'Suspend Access'}
                            >
                              {u.is_blocked ? <Unlock size={13} /> : <Ban size={13} />}
                            </button>

                            <button
                              onClick={() => handleDeleteUser(u.id, u.full_name, u.username)}
                              className="p-1.5 text-slate-400 hover:text-[#EF4444] hover:bg-[#EF4444]/10 rounded-md transition-colors cursor-pointer"
                              title="Delete Account"
                            >
                              <Trash2 size={13} />
                            </button>
                          </>
                        ) : (
                          <span 
                            className="text-[10px] font-mono text-[#0F52BA] bg-[#0F52BA]/10 border border-[#0F52BA]/20 font-semibold px-2 py-0.5 rounded select-none ml-1" 
                            title="Root Administrator Account"
                          >
                            ROOT
                          </span>
                        )}

                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* 4. CREATE & EDIT OPERATOR MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-3 animate-in fade-in duration-150">
          <div className="bg-[#FFFFFF] rounded-2xl shadow-xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="px-5 py-3.5 border-b border-slate-200 bg-[#F8FAFC] flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-[#0F52BA]/10 text-[#0F52BA] flex items-center justify-center">
                  <Shield size={15} />
                </div>
                <div>
                  <h2 className="text-xs font-bold text-slate-900 tracking-tight">
                    {editingUser ? `Edit Account: @${editingUser.username}` : 'Register New Team Member'}
                  </h2>
                  <p className="text-[10px] text-slate-500">
                    Set login credentials, assign monthly base salary, and configure module access
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md cursor-pointer transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitForm} className="p-5 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
              
              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name <span className="text-[#EF4444]">*</span>
                </label>
                <input 
                  type="text" 
                  required
                  value={formData.full_name}
                  onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="e.g. Tahir (Managing Director)"
                  className="h-8 w-full border border-slate-300 rounded-lg px-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#0F52BA] focus:ring-2 focus:ring-[#0F52BA]/15 transition-all"
                />
              </div>

              {/* Monthly Base Salary & Username */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Monthly Base Salary (Rs) <span className="text-[#EF4444]">*</span>
                  </label>
                  <input 
                    type="number" 
                    min="0"
                    step="500"
                    required
                    value={formData.base_salary}
                    onChange={e => setFormData({ ...formData, base_salary: e.target.value })}
                    placeholder="e.g. 75000"
                    className="h-8 w-full border border-slate-300 rounded-lg px-2.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-[#0F52BA] focus:ring-2 focus:ring-[#0F52BA]/15 transition-all"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Used for daily rate (~Rs {Math.round(Number(formData.base_salary || 0) / 30).toLocaleString()}/day) & payroll
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Username {editingUser && '(Locked)'} <span className="text-[#EF4444]">*</span>
                  </label>
                  <input 
                    type="text" 
                    required
                    disabled={!!editingUser}
                    value={formData.username}
                    onChange={e => setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/\s+/g, '') })}
                    placeholder="e.g. tahir_admin"
                    className="h-8 w-full border border-slate-300 rounded-lg px-2.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-[#0F52BA] focus:ring-2 focus:ring-[#0F52BA]/15 transition-all disabled:bg-[#F8FAFC] disabled:text-slate-500"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {editingUser ? 'New Password (Optional)' : 'Password'} {!editingUser && <span className="text-[#EF4444]">*</span>}
                </label>
                <div className="relative">
                  <input 
                    type={showPassword ? 'text' : 'password'}
                    required={!editingUser}
                    value={formData.password}
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                    placeholder={editingUser ? 'Leave blank to preserve current password' : '••••••••'}
                    className="h-8 w-full border border-slate-300 rounded-lg pl-2.5 pr-9 text-xs text-slate-900 focus:outline-none focus:border-[#0F52BA] focus:ring-2 focus:ring-[#0F52BA]/15 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              {/* Permissions Section: Dynamic check for Admin vs Staff */}
              {formData.role === 'admin' ? (
                <div className="p-3.5 bg-[#0F52BA]/5 border border-[#0F52BA]/20 rounded-xl flex items-start gap-3">
                  <Sparkles size={17} className="text-[#0F52BA] shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Administrator Account Privileges</h4>
                    <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                      Administrators have full root authority across all modules by default. You only need to configure the base salary and personal details.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="pt-2.5 border-t border-slate-100">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                        Accessible Modules ({formData.permissions.length} Selected)
                      </label>
                      <span className="text-[11px] text-slate-400">Click cards below to grant or revoke workspace access</span>
                    </div>

                    {/* Role Presets */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {PRESETS.map(p => (
                        <button
                          key={p.label}
                          type="button"
                          onClick={() => applyPreset(p.perms)}
                          className="px-2 py-1 text-[10px] font-semibold bg-[#F8FAFC] hover:bg-[#0F52BA]/10 hover:text-[#0F52BA] text-slate-600 rounded-md border border-slate-200 transition-colors cursor-pointer"
                        >
                          {p.label}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, permissions: MODULES.map(m => m.id) }))}
                        className="px-1.5 py-1 text-[10px] font-semibold text-[#0F52BA] hover:underline cursor-pointer"
                      >
                        All
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, permissions: [] }))}
                        className="px-1.5 py-1 text-[10px] font-semibold text-slate-400 hover:text-[#EF4444] cursor-pointer"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  {/* Module Cards Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {MODULES.map(m => {
                      const isChecked = formData.permissions.includes(m.id);
                      const Icon = m.icon;

                      return (
                        <div
                          key={m.id}
                          onClick={() => handleTogglePermission(m.id)}
                          className={`p-3 rounded-xl border text-left cursor-pointer transition-all select-none flex items-start gap-2.5 ${
                            isChecked 
                              ? 'bg-[#0F52BA]/5 border-[#0F52BA] shadow-2xs ring-1 ring-[#0F52BA]/20' 
                              : 'bg-[#FFFFFF] border-slate-200 hover:border-slate-300 hover:bg-[#F8FAFC]'
                          }`}
                        >
                          <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                            isChecked 
                              ? 'bg-[#0F52BA] border-[#0F52BA] text-[#FFFFFF]' 
                              : 'border-slate-300 bg-[#FFFFFF]'
                          }`}>
                            {isChecked && <Check size={11} strokeWidth={3} />}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <Icon size={13} className={isChecked ? 'text-[#0F52BA]' : 'text-slate-400'} />
                              <h4 className={`text-xs font-bold ${isChecked ? 'text-[#0F52BA]' : 'text-slate-800'}`}>
                                {m.label}
                              </h4>
                            </div>
                            <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                              {m.desc}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Modal Footer Buttons */}
              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="h-8 px-3.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-8 px-4 text-xs font-semibold bg-[#0F52BA] hover:bg-[#0c449c] text-[#FFFFFF] rounded-lg transition-all cursor-pointer shadow-xs disabled:opacity-50 active:scale-95 flex items-center gap-1.5"
                >
                  <Check size={13} />
                  <span>{isSubmitting ? 'Saving...' : editingUser ? 'Update Account' : 'Register Member'}</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}