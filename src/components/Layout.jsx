import { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  Home, Package, ShoppingCart, Receipt, Truck, Users, Settings, 
  Menu, ChevronLeft, ChevronDown, Bell, LogOut, Shield, AlertTriangle, 
  CheckCircle2, Info, CheckCheck, Clock, Lock, Wallet, X
} from 'lucide-react';
import { supabase } from '../supabaseClient';

// ============================================================================
// 1. SYSTEM NAVIGATION TREE SPECIFICATION
// ============================================================================
const NAVIGATION_TREE = [
  {
    type: 'link',
    to: '/',
    icon: Home,
    label: 'Dashboard',
    permission: 'dashboard'
  },
  {
    type: 'group',
    id: 'sales_group',
    label: 'Sales & Commercial',
    icon: ShoppingCart,
    items: [
      { to: '/sales', icon: ShoppingCart, label: 'POS Catalog', permission: 'sales' },
      { to: '/ledger', icon: Receipt, label: 'Sales Invoices', permission: 'ledger' },
      { to: '/crm', icon: Users, label: 'CRM Pipeline', permission: 'crm' }
    ]
  },
  {
    type: 'group',
    id: 'inventory_group',
    label: 'Catalog & Supply',
    icon: Package,
    items: [
      { to: '/inventory', icon: Package, label: 'Product Catalog', permission: 'inventory' },
      { to: '/low-stock', icon: AlertTriangle, label: 'Low Stock Alerts', permission: 'inventory' },
      { to: '/purchases', icon: Truck, label: 'Vendor Purchases', permission: 'purchases' }
    ]
  },
  {
    type: 'group',
    id: 'admin_group',
    label: 'Administration & HR',
    icon: Shield,
    adminOnly: true,
    items: [
      { to: '/users', icon: Shield, label: 'Staff Accounts', adminOnly: true },
      { to: '/attendance', icon: Clock, label: 'Shift Attendance', adminOnly: true },
      { to: '/payroll', icon: Wallet, label: 'Payroll & Salaries', adminOnly: true }
    ]
  }
];

export default function Layout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Live POS Cart Counter State for Navbar
  const [cartSummary, setCartSummary] = useState({ totalUnits: 0, lineCount: 0, subTotal: 0 });

  // Tree Node Expansion States
  const [expandedGroups, setExpandedGroups] = useState({
    sales_group: true,
    inventory_group: true,
    admin_group: true
  });
  
  const notifRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();

  // Active Session State
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      return JSON.parse(
        localStorage.getItem('erp_user') || 
        '{"id": 1, "full_name": "Tahir", "role": "admin", "permissions": ["dashboard","inventory","purchases","sales","ledger","crm","users"]}'
      );
    } catch {
      return { id: 1, full_name: "Tahir", role: "admin", permissions: ["dashboard","inventory","purchases","sales","ledger","crm","users"] };
    }
  });

  // Sync POS Cart Badge Live across tabs & pages
  useEffect(() => {
    const syncCartBadge = () => {
      try {
        const rawCart = JSON.parse(localStorage.getItem('erp_pos_cart') || '[]');
        if (Array.isArray(rawCart)) {
          const totalUnits = rawCart.reduce((sum, item) => sum + Number(item.sellQuantity || 0), 0);
          const subTotal = rawCart.reduce((sum, item) => sum + (Number(item.price || 0) * Number(item.sellQuantity || 0)), 0);
          setCartSummary({ totalUnits, lineCount: rawCart.length, subTotal });
        } else {
          setCartSummary({ totalUnits: 0, lineCount: 0, subTotal: 0 });
        }
      } catch {
        setCartSummary({ totalUnits: 0, lineCount: 0, subTotal: 0 });
      }
    };

    syncCartBadge();
    window.addEventListener('erp_cart_updated', syncCartBadge);
    window.addEventListener('storage', syncCartBadge);
    return () => {
      window.removeEventListener('erp_cart_updated', syncCartBadge);
      window.removeEventListener('storage', syncCartBadge);
    };
  }, []);

  // Auto-expand group that matches current path
  useEffect(() => {
    NAVIGATION_TREE.forEach(node => {
      if (node.type === 'group' && node.items.some(sub => sub.to === location.pathname)) {
        setExpandedGroups(prev => ({ ...prev, [node.id]: true }));
      }
    });
  }, [location.pathname]);

  // Sync profile changes live
  useEffect(() => {
    const handleUserSync = () => {
      try {
        const updated = JSON.parse(localStorage.getItem('erp_user') || '{}');
        if (updated && (updated.full_name || updated.name)) {
          setCurrentUser(updated);
        }
      } catch (e) {
        console.error("Session sync failed:", e);
      }
    };
    window.addEventListener('erp_user_updated', handleUserSync);
    window.addEventListener('storage', handleUserSync);
    return () => {
      window.removeEventListener('erp_user_updated', handleUserSync);
      window.removeEventListener('storage', handleUserSync);
    };
  }, []);

  const displayName = currentUser.full_name || currentUser.name || 'Operator';
  const displayRole = currentUser.role === 'admin' ? 'Administrator' : 'Staff Member';

  const hasAccess = (item) => {
    if (currentUser.role === 'admin') return true;
    if (item.adminOnly) return false;
    if (!item.permission) return true;
    return currentUser.permissions?.includes(item.permission);
  };

  // Permission Check Specifically for Sales / POS Cart Icon
  const canAccessPOS = hasAccess({ permission: 'sales' });

  // Close notifications dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch Notifications
  const fetchNotifications = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/notifications');
      setNotifications(res.data || []);
    } catch (err) {
      console.error("Failed to fetch notifications:", err.message);
    }
  };

  // Realtime Notifications Listener
  useEffect(() => {
    fetchNotifications();

    const channel = supabase
      .channel('realtime_notifications')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'app_notifications' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setNotifications(prev => [payload.new, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setNotifications(prev => prev.map(n => n.id === payload.new.id ? payload.new : n));
          }
        }
      )
      .subscribe();

    const interval = setInterval(fetchNotifications, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  const userNotifications = notifications.filter(n => {
    if (currentUser.role === 'admin') return true;
    if (n.target_permission === 'all') return true;
    return currentUser.permissions?.includes(n.target_permission);
  });

  const unreadCount = userNotifications.filter(n => !n.is_read).length;

  const handleNotificationClick = async (notif) => {
    if (!notif.is_read) {
      try {
        await axios.put(`http://localhost:5000/api/notifications/${notif.id}/read`);
        setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
      } catch (err) {
        console.error("Failed to mark read:", err);
      }
    }
    setIsNotifOpen(false);
    if (notif.link_url) navigate(notif.link_url);
  };

  const handleMarkAllRead = async () => {
    try {
      await axios.put('http://localhost:5000/api/notifications/mark-all-read');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error("Failed to mark all read:", err);
    }
  };

  const toggleGroup = (groupId) => {
    setExpandedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  // Session Exit Handlers
  const handleLockTerminal = () => {
    localStorage.removeItem('erp_user');
    setIsLogoutModalOpen(false);
    navigate('/login');
  };

  const handleEndShiftClockOut = async () => {
    setIsLoggingOut(true);
    try {
      if (currentUser?.id) {
        await axios.post('http://localhost:5000/api/auth/logout', { userId: currentUser.id });
      }
    } catch (err) {
      console.error("Shift checkout error:", err);
    } finally {
      setIsLoggingOut(false);
      localStorage.removeItem('erp_user');
      setIsLogoutModalOpen(false);
      navigate('/login');
    }
  };

  const getHeaderTitle = (pathname) => {
    switch (pathname) {
      case '/': return 'Dashboard Overview';
      case '/inventory': return 'Inventory Management';
      case '/low-stock': return 'Low Stock Alerts';
      case '/purchases': return 'Purchases & Stock Inward';
      case '/sales': return 'Point of Sale (POS) Catalog';
      case '/cart': return 'POS Order Cart & Billing';
      case '/ledger': return 'Sales Invoices & Ledger';
      case '/crm': return 'CRM Commercial Pipeline';
      case '/users': return 'Staff Account Directory';
      case '/attendance': return 'Staff Attendance & Shifts';
      case '/payroll': return 'Monthly Payroll & Salaries';
      case '/profile': return 'Account Profile & Security';
      default: return 'Workspace Overview';
    }
  };

  return (
    <div className="flex h-screen w-full bg-[#F8FAFC] font-sans overflow-hidden select-none">
      
      {/* ========================================================================= */}
      {/* 1. ENTERPRISE SIDEBAR (Sapphire Blue #0F52BA & Indigo #4F46E5 Branding)   */}
      {/* ========================================================================= */}
      <aside 
        className={`bg-slate-900 text-white flex flex-col shadow-xl transition-all duration-300 z-50 relative shrink-0 border-r border-slate-800/90
          ${isSidebarOpen ? 'w-64' : 'w-20'}
        `}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center px-5 border-b border-slate-800/80 relative shrink-0">
          <div className="w-8 h-8 rounded-lg bg-[#0F52BA] flex items-center justify-center shrink-0 shadow-md shadow-[#0F52BA]/30 border border-[#0F52BA]/40">
            <span className="font-extrabold text-[#FFFFFF] text-base leading-none">S</span>
          </div>
          <span className={`text-base font-bold tracking-tight transition-all duration-300 overflow-hidden whitespace-nowrap ${isSidebarOpen ? 'opacity-100 w-36 ml-3' : 'opacity-0 w-0 ml-0'}`}>
            Sheikh&apos;s <span className="text-[#06B6D4] font-semibold">ERP</span>
          </span>
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="absolute -right-3.5 top-1/2 -translate-y-1/2 w-7 h-7 bg-slate-800 border-2 border-slate-900 rounded-full flex items-center justify-center text-slate-400 hover:bg-[#0F52BA] hover:border-[#0F52BA] hover:text-[#FFFFFF] transition-all duration-150 shadow-sm z-[60] outline-none cursor-pointer"
            title={isSidebarOpen ? 'Collapse Navigation' : 'Expand Navigation'}
          >
            <ChevronLeft size={15} className={`transition-transform duration-300 ${!isSidebarOpen && 'rotate-180'}`} />
          </button>
        </div>
        
        {/* Scrollable Tree Navigation */}
        <nav className="flex-1 px-3 py-4 flex flex-col gap-1 overflow-y-auto overflow-x-hidden [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {NAVIGATION_TREE.map((node) => {
            if (node.type === 'link') {
              if (!hasAccess(node)) return null;
              const active = location.pathname === node.to;
              const Icon = node.icon;

              return (
                <Link
                  key={node.to}
                  to={node.to}
                  title={!isSidebarOpen ? node.label : undefined}
                  className={`flex items-center p-2.5 rounded-lg transition-all duration-150 select-none ${
                    active 
                      ? 'bg-[#0F52BA] text-[#FFFFFF] font-semibold shadow-xs' 
                      : 'text-slate-400 hover:bg-slate-800/70 hover:text-slate-200'
                  }`}
                >
                  <Icon size={17} className={`shrink-0 ${active ? 'text-[#FFFFFF]' : 'text-slate-400'}`} />
                  <span className={`transition-all duration-200 text-xs tracking-wide whitespace-nowrap overflow-hidden ${
                    isSidebarOpen ? 'opacity-100 ml-3' : 'opacity-0 w-0 ml-0'
                  }`}>
                    {node.label}
                  </span>
                </Link>
              );
            }

            if (node.type === 'group') {
              if (node.adminOnly && currentUser.role !== 'admin') return null;

              const authorizedItems = node.items.filter(item => hasAccess(item));
              if (authorizedItems.length === 0) return null;

              const isExpanded = expandedGroups[node.id] ?? true;
              const GroupIcon = node.icon;

              return (
                <div key={node.id} className="mt-2 pt-2 border-t border-slate-800/60 first:border-0 first:pt-0 first:mt-0">
                  
                  {isSidebarOpen ? (
                    <button
                      type="button"
                      onClick={() => toggleGroup(node.id)}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 text-slate-400 hover:text-slate-200 transition-colors text-left group cursor-pointer"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <GroupIcon size={13} className="text-slate-500 group-hover:text-slate-400 shrink-0" />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-slate-300 truncate">
                          {node.label}
                        </span>
                      </div>
                      <ChevronDown 
                        size={13} 
                        className={`text-slate-500 transition-transform duration-200 ${!isExpanded && '-rotate-90'}`} 
                      />
                    </button>
                  ) : (
                    <div className="h-px bg-slate-800 my-1 mx-2" />
                  )}

                  {(isExpanded || !isSidebarOpen) && (
                    <div className={`${isSidebarOpen ? 'mt-1 pl-3 space-y-0.5 border-l border-slate-800/80 ml-3.5' : 'space-y-1'}`}>
                      {authorizedItems.map((subItem) => {
                        const SubIcon = subItem.icon;
                        const active = location.pathname === subItem.to || (subItem.to === '/sales' && location.pathname === '/cart');

                        return (
                          <Link
                            key={subItem.to}
                            to={subItem.to}
                            title={!isSidebarOpen ? subItem.label : undefined}
                            className={`flex items-center p-2 rounded-lg text-xs transition-colors select-none ${
                              active 
                                ? 'bg-[#0F52BA] text-[#FFFFFF] font-semibold shadow-xs' 
                                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                            }`}
                          >
                            <SubIcon size={15} className={`shrink-0 ${active ? 'text-[#FFFFFF]' : 'text-slate-400'}`} />
                            <span className={`transition-all duration-200 whitespace-nowrap overflow-hidden text-xs ${
                              isSidebarOpen ? 'opacity-100 ml-2.5' : 'opacity-0 w-0 ml-0'
                            }`}>
                              {subItem.label}
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                  )}

                </div>
              );
            }

            return null;
          })}
        </nav>

        {/* User Footer Profile Card */}
        <div className="border-t border-slate-800/80 p-3 shrink-0">
          {isSidebarOpen ? (
            <div className="flex items-center justify-between gap-2 bg-slate-800/50 p-2 rounded-xl border border-slate-700/50">
              <Link to="/profile" className="min-w-0 flex-1 pl-1 hover:opacity-90 transition-opacity">
                <p className="text-xs font-semibold text-slate-200 truncate hover:text-[#06B6D4]">{displayName}</p>
                <p className="text-[11px] text-slate-400 font-medium truncate">{displayRole}</p>
              </Link>
              <button
                onClick={() => setIsLogoutModalOpen(true)}
                title="Lock Session / Clock Out"
                className="p-1.5 text-slate-400 hover:text-[#EF4444] hover:bg-slate-700/60 rounded-lg transition-colors cursor-pointer"
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Link to="/profile" className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-xs font-bold text-[#06B6D4] hover:bg-[#0F52BA] hover:text-[#FFFFFF] transition-colors">
                {displayName.charAt(0).toUpperCase()}
              </Link>
              <button 
                onClick={() => setIsLogoutModalOpen(true)} 
                title="Lock Session / Clock Out" 
                className="p-2 text-slate-400 hover:text-[#EF4444] hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                <LogOut size={16} />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* 2. MAIN VIEWPORT (Neutral Backgrounds #F8FAFC & #FFFFFF)                  */}
      {/* ========================================================================= */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0 bg-[#F8FAFC]">
        
        {/* Top Header Navbar */}
        <header className="h-16 bg-[#FFFFFF] border-b border-slate-200/90 shadow-2xs flex items-center justify-between px-6 z-20 shrink-0">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="sm:hidden p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              <Menu size={18} />
            </button>
            <h2 className="text-sm font-bold text-slate-900 hidden sm:block tracking-tight">
              {getHeaderTitle(location.pathname)}
            </h2>
          </div>

          <div className="flex items-center gap-2.5">
            
            {/* PERMISSION-GATED POS CART BUTTON (Visible ONLY to Sales / Admin Users) */}
            {canAccessPOS && (
              <Link
                to="/cart"
                title="Open POS Checkout Cart"
                className={`relative h-9 px-3 rounded-xl border flex items-center gap-2 transition-all cursor-pointer ${
                  location.pathname === '/cart'
                    ? 'bg-[#0F52BA] text-[#FFFFFF] border-[#0F52BA] shadow-xs'
                    : cartSummary.totalUnits > 0
                    ? 'bg-[#0F52BA]/10 text-[#0F52BA] border-[#0F52BA]/30 hover:bg-[#0F52BA] hover:text-[#FFFFFF]'
                    : 'bg-[#F8FAFC] text-slate-600 border-slate-200 hover:border-[#0F52BA] hover:text-[#0F52BA]'
                }`}
              >
                <ShoppingCart size={16} />
                <div className="hidden sm:flex items-center gap-1.5 text-xs font-bold">
                  <span>Cart</span>
                  {cartSummary.totalUnits > 0 && (
                    <span className="font-mono text-[11px] opacity-90">
                      (Rs {cartSummary.subTotal.toLocaleString()})
                    </span>
                  )}
                </div>

                {cartSummary.totalUnits > 0 && (
                  <span className={`min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-mono font-extrabold flex items-center justify-center ${
                    location.pathname === '/cart'
                      ? 'bg-[#FFFFFF] text-[#0F52BA]'
                      : 'bg-[#10B981] text-[#FFFFFF]'
                  }`}>
                    {cartSummary.totalUnits}
                  </span>
                )}
              </Link>
            )}

            {/* Notification Center Popover */}
            <div className="relative" ref={notifRef}>
              <button 
                onClick={() => setIsNotifOpen(!isNotifOpen)}
                className={`relative p-2 rounded-xl transition-colors cursor-pointer outline-none ${
                  isNotifOpen ? 'bg-[#0F52BA]/10 text-[#0F52BA]' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-700'
                }`}
                title="Notifications"
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[17px] h-[17px] px-1 bg-[#EF4444] text-[#FFFFFF] font-bold text-[9px] rounded-full flex items-center justify-center border-2 border-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {isNotifOpen && (
                <div className="absolute right-0 mt-2.5 w-80 sm:w-96 bg-[#FFFFFF] rounded-2xl shadow-xl border border-slate-200 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                  <div className="p-3.5 border-b border-slate-100 bg-[#F8FAFC] flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-bold text-slate-900 tracking-tight">
                        System Notifications
                      </h3>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {unreadCount} unread update{unreadCount === 1 ? '' : 's'}
                      </p>
                    </div>

                    {unreadCount > 0 && (
                      <button 
                        onClick={handleMarkAllRead}
                        className="text-[11px] font-semibold text-[#0F52BA] hover:text-[#4F46E5] flex items-center gap-1 cursor-pointer"
                      >
                        <CheckCheck size={13} />
                        <span>Mark all read</span>
                      </button>
                    )}
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                    {userNotifications.length === 0 ? (
                      <div className="p-8 text-center text-slate-400">
                        <Bell size={26} className="mx-auto mb-2 text-slate-300" />
                        <p className="text-xs font-medium">No new notifications</p>
                      </div>
                    ) : (
                      userNotifications.map((n) => {
                        const isWarning = n.type === 'warning';
                        const isSuccess = n.type === 'success';

                        return (
                          <div 
                            key={n.id}
                            onClick={() => handleNotificationClick(n)}
                            className={`p-3.5 hover:bg-[#F8FAFC] transition-colors cursor-pointer flex items-start gap-3 ${
                              !n.is_read ? 'bg-[#0F52BA]/5' : ''
                            }`}
                          >
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                              isWarning 
                                ? 'bg-[#F59E0B]/10 text-[#F59E0B]' 
                                : isSuccess 
                                ? 'bg-[#10B981]/10 text-[#10B981]' 
                                : 'bg-[#0F52BA]/10 text-[#0F52BA]'
                            }`}>
                              {isWarning ? <AlertTriangle size={14} /> : isSuccess ? <CheckCircle2 size={14} /> : <Info size={14} />}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <h4 className={`text-xs ${!n.is_read ? 'font-bold text-slate-900' : 'font-semibold text-slate-700'}`}>
                                  {n.title}
                                </h4>
                                {!n.is_read && (
                                  <span className="w-2 h-2 rounded-full bg-[#0F52BA] shrink-0" />
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                                {n.message}
                              </p>
                              <span className="text-[10px] text-slate-400 mt-1 block">
                                {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            <Link
              to="/profile"
              className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition-colors cursor-pointer outline-none"
              title="Account Security"
            >
              <Settings size={18} />
            </Link>
            
            <div className="w-px h-5 bg-slate-200 mx-0.5"></div>

            {/* Profile Avatar Chip */}
            <Link 
              to="/profile" 
              title="Account Settings"
              className="flex items-center gap-2.5 p-1 pl-2 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer group"
            >
              <div className="text-right hidden md:block">
                <p className="text-xs font-semibold text-slate-800 group-hover:text-[#0F52BA] transition-colors leading-tight">{displayName}</p>
                <p className="text-[10px] text-slate-400 font-medium">{displayRole}</p>
              </div>
              <div className="w-8 h-8 bg-[#0F52BA] group-hover:bg-[#4F46E5] transition-colors rounded-xl text-[#FFFFFF] flex items-center justify-center font-bold text-xs shadow-xs">
                {displayName.charAt(0).toUpperCase()}
              </div>
            </Link>
          </div>
        </header>

        {/* Dynamic Route Viewport */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-7 min-w-0">
          <Outlet /> 
        </main>
        
      </div>

      {/* ========================================================================= */}
      {/* 3. SESSION EXIT MODAL                                                     */}
      {/* ========================================================================= */}
      {isLogoutModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-[#FFFFFF] rounded-3xl shadow-xl border border-slate-200 p-6 sm:p-7 relative animate-in zoom-in-95 duration-150">
            
            <button
              onClick={() => setIsLogoutModalOpen(false)}
              className="absolute top-5 right-5 p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3.5 mb-2">
              <div className="w-10 h-10 rounded-2xl bg-[#0F52BA]/10 text-[#0F52BA] flex items-center justify-center shrink-0">
                <Shield size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 tracking-tight">
                  Session Exit Options
                </h3>
                <p className="text-xs text-slate-500">
                  Signed in as <strong>{displayName}</strong>
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 mt-2 mb-5 leading-relaxed">
              Are you stepping away for a temporary break, or concluding your duty for today?
            </p>

            <div className="space-y-3">
              <button
                type="button"
                onClick={handleLockTerminal}
                className="w-full text-left p-3.5 rounded-2xl border border-slate-200 hover:border-[#0F52BA]/60 hover:bg-[#0F52BA]/5 transition-all flex items-start gap-3.5 group cursor-pointer"
              >
                <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 group-hover:bg-[#0F52BA] group-hover:text-[#FFFFFF] flex items-center justify-center shrink-0 transition-colors mt-0.5">
                  <Lock size={16} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 group-hover:text-[#0F52BA] transition-colors">
                    Lock Terminal (Temporary Break)
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                    Locks your workstation screen. <strong>Your active shift attendance remains continuous</strong>.
                  </p>
                </div>
              </button>

              <button
                type="button"
                disabled={isLoggingOut}
                onClick={handleEndShiftClockOut}
                className="w-full text-left p-3.5 rounded-2xl border border-[#EF4444]/20 bg-[#EF4444]/5 hover:bg-[#EF4444]/10 hover:border-[#EF4444]/40 transition-all flex items-start gap-3.5 group cursor-pointer"
              >
                <div className="w-9 h-9 rounded-xl bg-[#EF4444]/10 text-[#EF4444] group-hover:bg-[#EF4444] group-hover:text-[#FFFFFF] flex items-center justify-center shrink-0 transition-colors mt-0.5">
                  <LogOut size={16} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#EF4444] transition-colors">
                    {isLoggingOut ? 'Recording Shift Clock-out...' : 'End Day Shift (Clock Out)'}
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                    Concludes today&apos;s shift and writes your official <strong>check-out timestamp</strong> to attendance logs.
                  </p>
                </div>
              </button>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 text-center">
              <button
                type="button"
                onClick={() => setIsLogoutModalOpen(false)}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
              >
                Cancel &amp; Continue Working
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}