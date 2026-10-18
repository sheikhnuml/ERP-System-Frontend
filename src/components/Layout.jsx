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

// ============================================================================
// 2. ANIMATION STYLESHEET (all keyframes live here, no Tailwind plugin needed)
// ============================================================================
const ANIMATION_CSS = `
@keyframes erpTipIn { from { opacity: 0; transform: translate(-4px, -50%); } to { opacity: 1; transform: translate(0, -50%); } }
@keyframes erpPageIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
@keyframes erpDropIn { from { opacity: 0; transform: translateY(-6px) scale(.97); } to { opacity: 1; transform: none; } }
@keyframes erpDropOut { from { opacity: 1; transform: none; } to { opacity: 0; transform: translateY(-6px) scale(.97); } }
@keyframes erpFadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes erpFadeOut { from { opacity: 1; } to { opacity: 0; } }
@keyframes erpModalIn { from { opacity: 0; transform: translateY(14px) scale(.96); } to { opacity: 1; transform: none; } }
@keyframes erpModalOut { from { opacity: 1; transform: none; } to { opacity: 0; transform: translateY(8px) scale(.97); } }
@keyframes erpPop { 0% { transform: scale(.6); } 60% { transform: scale(1.25); } 100% { transform: scale(1); } }
@keyframes erpRing { 0%, 100% { transform: rotate(0); } 15% { transform: rotate(14deg); } 30% { transform: rotate(-12deg); } 45% { transform: rotate(9deg); } 60% { transform: rotate(-6deg); } 75% { transform: rotate(3deg); } }
@keyframes erpNavIn { from { opacity: 0; transform: translateX(-10px); } to { opacity: 1; transform: none; } }
@keyframes erpBarIn { from { transform: scaleY(0); } to { transform: scaleY(1); } }
@keyframes erpProgress { 0% { width: 0; opacity: 1; } 70% { width: 85%; opacity: 1; } 100% { width: 100%; opacity: 0; } }
@keyframes erpToastIn { from { opacity: 0; transform: translateX(28px); } to { opacity: 1; transform: none; } }
@keyframes erpToastOut { from { opacity: 1; transform: none; } to { opacity: 0; transform: translateX(28px); } }
@keyframes erpTimer { from { width: 100%; } to { width: 0; } }

.erp-tip { animation: erpTipIn 120ms ease-out; }
.erp-page-enter { animation: erpPageIn 280ms ease-out; }
.erp-drop-in { animation: erpDropIn 160ms ease-out; transform-origin: top right; }
.erp-drop-out { animation: erpDropOut 140ms ease-in forwards; transform-origin: top right; }
.erp-fade-in { animation: erpFadeIn 160ms ease-out; }
.erp-fade-out { animation: erpFadeOut 150ms ease-in forwards; }
.erp-modal-in { animation: erpModalIn 200ms cubic-bezier(.2,.9,.3,1.1); }
.erp-modal-out { animation: erpModalOut 150ms ease-in forwards; }
.erp-pop { animation: erpPop 320ms ease-out; }
.erp-ring { animation: erpRing 900ms ease-in-out; transform-origin: 50% 0; }
.erp-nav-in { animation: erpNavIn 380ms ease-out backwards; }
.erp-bar-in { animation: erpBarIn 260ms ease-out; }
.erp-progress { animation: erpProgress 800ms ease-out forwards; }
.erp-toast-in { animation: erpToastIn 260ms cubic-bezier(.2,.9,.3,1.1); }
.erp-toast-out { animation: erpToastOut 200ms ease-in forwards; }
.erp-timer { animation: erpTimer 5500ms linear forwards; }

@media (prefers-reduced-motion: reduce) {
  [class*="erp-"] { animation: none !important; }
}
`;

// ============================================================================
// 3. SMALL HELPERS
// ============================================================================

// Keeps an element mounted for a short while after `open` turns false so an exit animation can play
function usePresence(open, ms = 160) {
  const [mounted, setMounted] = useState(open);
  useEffect(() => {
    if (open) {
      setMounted(true);
      return undefined;
    }
    const t = setTimeout(() => setMounted(false), ms);
    return () => clearTimeout(t);
  }, [open, ms]);
  return mounted;
}

// Same visibility rule used for the bell list and the live toast
const canSeeNotification = (n, user) => {
  if (!user) return false;
  if (user.role === 'admin') return true;
  if (n.target_permission === 'all') return true;
  return Boolean(user.permissions?.includes(n.target_permission));
};

// ============================================================================
// 4. SIDEBAR NAV ITEM (icon-only when collapsed, tooltip on hover/focus)
// ============================================================================
function NavItem({ to, icon: Icon, label, hint, active, expanded, tip, delay = 0 }) {
  return (
    <Link
      to={to}
      aria-label={label}
      aria-current={active ? 'page' : undefined}
      {...tip(label, hint)}
      style={{ animationDelay: `${delay}ms` }}
      className={`erp-nav-in group relative flex items-center h-9 rounded-lg select-none outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-[#06B6D4]/60 ${
        expanded ? 'px-2.5' : 'justify-center'
      } ${
        active
          ? 'bg-[#0F52BA]/25 ring-1 ring-inset ring-[#0F52BA]/40 text-white font-semibold'
          : 'text-slate-400 hover:bg-white/5 hover:text-slate-100'
      }`}
    >
      {active && (
        <span className="erp-bar-in absolute left-0 top-1/2 -mt-2.5 h-5 w-[3px] rounded-r-full bg-[#06B6D4]" />
      )}
      <Icon
        size={17}
        className={`shrink-0 transition-all duration-200 group-hover:scale-110 ${active ? 'text-[#06B6D4]' : 'text-slate-400 group-hover:text-slate-200'}`}
      />
      <span
        className={`whitespace-nowrap overflow-hidden text-[13px] tracking-wide transition-all duration-200 group-hover:translate-x-0.5 ${
          expanded ? 'opacity-100 ml-3 max-w-[180px]' : 'opacity-0 max-w-0 ml-0'
        }`}
      >
        {label}
      </span>
    </Link>
  );
}

export default function Layout() {
  // Sidebar state (desktop collapse is remembered between visits)
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    try {
      return localStorage.getItem('erp_sidebar_open') !== 'false';
    } catch {
      return true;
    }
  });
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const [notifications, setNotifications] = useState([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Hover tooltip shown next to collapsed sidebar buttons
  const [tip, setTip] = useState(null);

  // Header shadow when the page content is scrolled
  const [scrolled, setScrolled] = useState(false);

  // Bell shake when new unread notifications arrive
  const [bellRing, setBellRing] = useState(false);

  // Live toast for realtime notifications
  const [toastData, setToastData] = useState(null);
  const [toastOpen, setToastOpen] = useState(false);

  // Live POS Cart Counter State for Navbar
  const [cartSummary, setCartSummary] = useState({ totalUnits: 0, lineCount: 0, subTotal: 0 });

  // Tree Node Expansion States
  const [expandedGroups, setExpandedGroups] = useState({
    sales_group: true,
    inventory_group: true,
    admin_group: true
  });
  
  const notifRef = useRef(null);
  const mainRef = useRef(null);
  const prevUnreadRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();

  // On desktop the sidebar is "expanded" when not collapsed; on mobile the drawer is always full width
  const expanded = isSidebarOpen || isMobileOpen;

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

  // Latest user for callbacks created once (realtime listener)
  const currentUserRef = useRef(currentUser);
  currentUserRef.current = currentUser;

  // Exit-animation presence flags
  const notifPresent = usePresence(isNotifOpen, 150);
  const logoutPresent = usePresence(isLogoutModalOpen, 170);
  const toastPresent = usePresence(toastOpen, 210);

  // ---- Tooltip helpers (fixed-position so the scrolling nav never clips them) ----
  const showTip = (e, label, hint, kbd, always) => {
    if (expanded && !always) return;
    const r = e.currentTarget.getBoundingClientRect();
    setTip({ label, hint, kbd, x: r.right + 12, y: r.top + r.height / 2 });
  };
  const hideTip = () => setTip(null);
  const tipProps = (label, hint, opts = {}) => ({
    onMouseEnter: (e) => showTip(e, label, hint, opts.kbd, opts.always),
    onMouseLeave: hideTip,
    onFocus: (e) => showTip(e, label, hint, opts.kbd, opts.always),
    onBlur: hideTip
  });

  // Persist collapse state
  useEffect(() => {
    try {
      localStorage.setItem('erp_sidebar_open', String(isSidebarOpen));
    } catch { /* ignore */ }
  }, [isSidebarOpen]);

  // Hide tooltip when layout mode or route changes
  useEffect(() => {
    setTip(null);
  }, [expanded, location.pathname]);

  // On every route change: close mobile drawer, scroll page to top, reset header shadow
  useEffect(() => {
    setIsMobileOpen(false);
    setScrolled(false);
    mainRef.current?.scrollTo?.({ top: 0 });
  }, [location.pathname]);

  // Close mobile drawer automatically when resizing up to desktop
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const handler = (e) => { if (e.matches) setIsMobileOpen(false); };
    mq.addEventListener?.('change', handler);
    return () => mq.removeEventListener?.('change', handler);
  }, []);

  // Keyboard shortcuts: Ctrl/Cmd + B toggles sidebar, Esc closes popups
  useEffect(() => {
    const onKey = (e) => {
      const tag = (e.target?.tagName || '').toLowerCase();
      const typing = tag === 'input' || tag === 'textarea' || e.target?.isContentEditable;

      if (e.key === 'Escape') {
        setIsNotifOpen(false);
        setIsLogoutModalOpen(false);
        setIsMobileOpen(false);
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b' && !typing) {
        e.preventDefault();
        setIsSidebarOpen(v => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Auto-hide the live toast
  useEffect(() => {
    if (!toastOpen) return undefined;
    const t = setTimeout(() => setToastOpen(false), 5500);
    return () => clearTimeout(t);
  }, [toastOpen, toastData]);

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
            // Live toast for the notification (only if this user may see it)
            if (canSeeNotification(payload.new, currentUserRef.current)) {
              setToastData(payload.new);
              setToastOpen(true);
            }
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

  const userNotifications = notifications.filter(n => canSeeNotification(n, currentUser));

  const unreadCount = userNotifications.filter(n => !n.is_read).length;

  // Shake the bell when the unread count goes up
  useEffect(() => {
    if (prevUnreadRef.current !== null && unreadCount > prevUnreadRef.current) {
      setBellRing(true);
      const t = setTimeout(() => setBellRing(false), 1000);
      prevUnreadRef.current = unreadCount;
      return () => clearTimeout(t);
    }
    prevUnreadRef.current = unreadCount;
    return undefined;
  }, [unreadCount]);

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
    setToastOpen(false);
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

  const todayLabel = new Date().toLocaleDateString('en-PK', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  // Running index so nav items fade in one after another on first load
  let navIndex = 0;

  return (
    <div className="flex h-screen w-full bg-[#F8FAFC] font-sans overflow-hidden select-none">

      {/* All animation keyframes */}
      <style>{ANIMATION_CSS}</style>

      {/* Route change progress bar (replays on every navigation) */}
      <div key={location.pathname} className="erp-progress fixed top-0 left-0 h-[2px] z-[300] pointer-events-none bg-gradient-to-r from-[#0F52BA] via-[#4F46E5] to-[#06B6D4]" />

      {/* Collapsed-sidebar hover tooltip */}
      {tip && (
        <div
          className="erp-tip fixed z-[200] pointer-events-none"
          style={{ top: tip.y, left: tip.x, transform: 'translateY(-50%)' }}
        >
          <div className="relative flex items-center gap-2.5 rounded-lg bg-slate-800 border border-slate-700 px-3 py-1.5 shadow-xl shadow-slate-900/30">
            <span className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 rotate-45 bg-slate-800 border-l border-b border-slate-700" />
            <div>
              <p className="text-xs font-semibold text-white whitespace-nowrap leading-tight">{tip.label}</p>
              {tip.hint && (
                <p className="text-[10px] text-slate-400 whitespace-nowrap leading-tight mt-0.5">{tip.hint}</p>
              )}
            </div>
            {tip.kbd && (
              <kbd className="px-1.5 py-0.5 rounded bg-slate-700 text-[10px] font-mono text-slate-300 border border-slate-600">
                {tip.kbd}
              </kbd>
            )}
          </div>
        </div>
      )}

      {/* Mobile drawer backdrop */}
      {isMobileOpen && (
        <div
          className="erp-fade-in fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-[2px] lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}
      
      {/* ========================================================================= */}
      {/* 1. ENTERPRISE SIDEBAR                                                     */}
      {/* ========================================================================= */}
      <aside 
        className={`fixed inset-y-0 left-0 lg:relative z-50 flex flex-col shrink-0 bg-slate-900 text-white border-r border-white/5
          transition-[width,transform] duration-300 ease-in-out w-64
          ${isSidebarOpen ? 'lg:w-64' : 'lg:w-20'}
          ${isMobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'} lg:translate-x-0
        `}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center px-5 border-b border-white/5 relative shrink-0">
          <div className="w-8 h-8 rounded-lg bg-[#0F52BA] flex items-center justify-center shrink-0 shadow-md shadow-[#0F52BA]/30 ring-1 ring-white/10">
            <span className="font-extrabold text-[#FFFFFF] text-base leading-none">S</span>
          </div>
          <span className={`text-base font-bold tracking-tight transition-all duration-300 overflow-hidden whitespace-nowrap ${expanded ? 'opacity-100 w-36 ml-3' : 'opacity-0 w-0 ml-0'}`}>
            Sheikh&apos;s <span className="text-[#06B6D4] font-semibold">ERP</span>
          </span>

          {/* Mobile close */}
          <button
            onClick={() => setIsMobileOpen(false)}
            className="lg:hidden ml-auto p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            aria-label="Close menu"
          >
            <X size={17} />
          </button>

          {/* Desktop collapse toggle (edge button) */}
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            {...tipProps(isSidebarOpen ? 'Collapse sidebar' : 'Expand sidebar', undefined, { kbd: 'Ctrl B', always: true })}
            aria-label={isSidebarOpen ? 'Collapse navigation' : 'Expand navigation'}
            className="hidden lg:flex absolute -right-3.5 top-1/2 -translate-y-1/2 w-7 h-7 bg-slate-800 border-2 border-slate-900 rounded-full items-center justify-center text-slate-400 hover:bg-[#0F52BA] hover:border-[#0F52BA] hover:text-[#FFFFFF] hover:scale-110 active:scale-95 transition-all duration-150 shadow-sm z-[60] outline-none cursor-pointer"
          >
            <ChevronLeft size={15} className={`transition-transform duration-300 ${!isSidebarOpen && 'rotate-180'}`} />
          </button>
        </div>
        
        {/* Scrollable Tree Navigation */}
        <nav
          onScroll={hideTip}
          className="flex-1 px-3 py-4 flex flex-col gap-1 overflow-y-auto overflow-x-hidden [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        >
          {NAVIGATION_TREE.map((node) => {
            if (node.type === 'link') {
              if (!hasAccess(node)) return null;
              const active = location.pathname === node.to;

              return (
                <NavItem
                  key={node.to}
                  to={node.to}
                  icon={node.icon}
                  label={node.label}
                  active={active}
                  expanded={expanded}
                  tip={tipProps}
                  delay={navIndex++ * 40}
                />
              );
            }

            if (node.type === 'group') {
              if (node.adminOnly && currentUser.role !== 'admin') return null;

              const authorizedItems = node.items.filter(item => hasAccess(item));
              if (authorizedItems.length === 0) return null;

              const isExpanded = expandedGroups[node.id] ?? true;
              const GroupIcon = node.icon;
              const showItems = isExpanded || !expanded;

              return (
                <div key={node.id} className="mt-2 pt-2 border-t border-white/5 first:border-0 first:pt-0 first:mt-0">
                  
                  {expanded ? (
                    <button
                      type="button"
                      onClick={() => toggleGroup(node.id)}
                      aria-expanded={isExpanded}
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
                    <div className="h-px bg-white/10 my-1 mx-2" />
                  )}

                  {/* Smooth open/close of the group */}
                  <div className={`grid transition-[grid-template-rows] duration-200 ease-out ${showItems ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                    <div className="min-h-0 overflow-hidden">
                      <div className={`${expanded ? 'mt-1 pl-3 space-y-0.5 border-l border-white/10 ml-3.5' : 'space-y-1'}`}>
                        {authorizedItems.map((subItem) => {
                          const active = location.pathname === subItem.to || (subItem.to === '/sales' && location.pathname === '/cart');

                          return (
                            <NavItem
                              key={subItem.to}
                              to={subItem.to}
                              icon={subItem.icon}
                              label={subItem.label}
                              hint={node.label}
                              active={active}
                              expanded={expanded}
                              tip={tipProps}
                              delay={navIndex++ * 40}
                            />
                          );
                        })}
                      </div>
                    </div>
                  </div>

                </div>
              );
            }

            return null;
          })}
        </nav>

        {/* User Footer Profile Card */}
        <div className="border-t border-white/5 p-3 shrink-0">
          {expanded ? (
            <div className="flex items-center gap-2.5 bg-white/5 p-2 rounded-xl border border-white/5">
              <Link to="/profile" className="flex items-center gap-2.5 min-w-0 flex-1 hover:opacity-90 transition-opacity">
                <div className="relative shrink-0">
                  <div className="w-8 h-8 rounded-lg bg-[#0F52BA] flex items-center justify-center text-xs font-bold text-white">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5">
                    <span className="absolute inset-0 rounded-full bg-[#10B981] opacity-70 animate-ping" />
                    <span className="absolute inset-0 rounded-full bg-[#10B981] border-2 border-slate-900" />
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-100 truncate leading-tight">{displayName}</p>
                  <p className="text-[11px] text-slate-400 font-medium truncate leading-tight mt-0.5">{displayRole}</p>
                </div>
              </Link>
              <button
                onClick={() => setIsLogoutModalOpen(true)}
                title="Lock Session / Clock Out"
                aria-label="Lock session or clock out"
                className="p-1.5 text-slate-400 hover:text-[#EF4444] hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Link
                to="/profile"
                {...tipProps(displayName, `${displayRole} · Open profile`)}
                aria-label="Open profile"
                className="relative w-8 h-8 rounded-lg bg-[#0F52BA] flex items-center justify-center text-xs font-bold text-white hover:bg-[#4F46E5] hover:scale-105 transition-all"
              >
                {displayName.charAt(0).toUpperCase()}
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#10B981] border-2 border-slate-900" />
              </Link>
              <button 
                onClick={() => setIsLogoutModalOpen(true)} 
                {...tipProps('Lock / Clock Out', 'End or pause your session')}
                aria-label="Lock session or clock out"
                className="p-2 text-slate-400 hover:text-[#EF4444] hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
              >
                <LogOut size={16} />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* 2. MAIN VIEWPORT                                                          */}
      {/* ========================================================================= */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0 bg-[#F8FAFC]">
        
        {/* Top Header Navbar */}
        <header className={`h-16 bg-[#FFFFFF]/90 backdrop-blur border-b border-slate-200/90 flex items-center justify-between px-4 sm:px-6 z-20 shrink-0 transition-shadow duration-200 ${
          scrolled ? 'shadow-[0_2px_12px_rgba(15,23,42,0.08)]' : 'shadow-none'
        }`}>
          <div className="flex items-center gap-3 min-w-0">
            <button 
              onClick={() => setIsMobileOpen(true)}
              className="lg:hidden p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              aria-label="Open menu"
            >
              <Menu size={18} />
            </button>
            <div className="min-w-0">
              <h2 key={location.pathname} className="erp-page-enter text-sm font-bold text-slate-900 tracking-tight truncate leading-tight">
                {getHeaderTitle(location.pathname)}
              </h2>
              <p className="hidden sm:block text-[11px] text-slate-400 font-medium leading-tight mt-0.5">
                {todayLabel}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            
            {/* PERMISSION-GATED POS CART BUTTON (Visible ONLY to Sales / Admin Users) */}
            {canAccessPOS && (
              <Link
                to="/cart"
                title="Open POS Checkout Cart"
                className={`relative h-9 px-3 rounded-xl border flex items-center gap-2 transition-all active:scale-95 cursor-pointer ${
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
                  <span
                    key={cartSummary.totalUnits}
                    className={`erp-pop min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-mono font-extrabold flex items-center justify-center ${
                      location.pathname === '/cart'
                        ? 'bg-[#FFFFFF] text-[#0F52BA]'
                        : 'bg-[#10B981] text-[#FFFFFF]'
                    }`}
                  >
                    {cartSummary.totalUnits}
                  </span>
                )}
              </Link>
            )}

            {/* Notification Center Popover */}
            <div className="relative" ref={notifRef}>
              <button 
                onClick={() => setIsNotifOpen(!isNotifOpen)}
                className={`relative p-2 rounded-xl transition-colors active:scale-95 cursor-pointer outline-none ${
                  isNotifOpen ? 'bg-[#0F52BA]/10 text-[#0F52BA]' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-700'
                }`}
                title="Notifications"
                aria-label="Notifications"
              >
                <Bell size={18} className={bellRing ? 'erp-ring' : ''} />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[17px] h-[17px]">
                    <span className="absolute inset-0 rounded-full bg-[#EF4444] opacity-60 animate-ping" />
                    <span className="relative min-w-[17px] h-[17px] px-1 bg-[#EF4444] text-[#FFFFFF] font-bold text-[9px] rounded-full flex items-center justify-center border-2 border-white">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  </span>
                )}
              </button>

              {notifPresent && (
                <div className={`${isNotifOpen ? 'erp-drop-in' : 'erp-drop-out'} absolute right-0 mt-2.5 w-80 sm:w-96 bg-[#FFFFFF] rounded-2xl shadow-xl border border-slate-200 z-50 overflow-hidden`}>
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
              className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition-colors cursor-pointer outline-none group"
              title="Account Security"
              aria-label="Account security"
            >
              <Settings size={18} className="transition-transform duration-500 group-hover:rotate-90" />
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

        {/* Dynamic Route Viewport (page fades/slides in on every navigation) */}
        <main
          ref={mainRef}
          onScroll={(e) => setScrolled(e.currentTarget.scrollTop > 4)}
          className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-7 min-w-0"
        >
          <div key={location.pathname} className="erp-page-enter">
            <Outlet />
          </div>
        </main>
        
      </div>

      {/* ========================================================================= */}
      {/* 3. LIVE NOTIFICATION TOAST (appears when a realtime notification lands)   */}
      {/* ========================================================================= */}
      {toastPresent && toastData && (
        <div className={`${toastOpen ? 'erp-toast-in' : 'erp-toast-out'} fixed bottom-5 right-5 z-[150] w-80 max-w-[calc(100vw-2rem)]`}>
          <div
            onClick={() => handleNotificationClick(toastData)}
            className="relative overflow-hidden bg-[#FFFFFF] rounded-2xl border border-slate-200 shadow-xl p-3.5 flex items-start gap-3 cursor-pointer hover:border-[#0F52BA]/40 transition-colors"
          >
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
              toastData.type === 'warning'
                ? 'bg-[#F59E0B]/10 text-[#F59E0B]'
                : toastData.type === 'success'
                ? 'bg-[#10B981]/10 text-[#10B981]'
                : 'bg-[#0F52BA]/10 text-[#0F52BA]'
            }`}>
              {toastData.type === 'warning' ? <AlertTriangle size={15} /> : toastData.type === 'success' ? <CheckCircle2 size={15} /> : <Info size={15} />}
            </div>
            <div className="min-w-0 flex-1 pr-4">
              <p className="text-xs font-bold text-slate-900 leading-tight">{toastData.title}</p>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-snug line-clamp-2">{toastData.message}</p>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); setToastOpen(false); }}
              className="absolute top-2.5 right-2.5 p-0.5 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
              aria-label="Dismiss"
            >
              <X size={13} />
            </button>
            <span key={toastData.id} className="erp-timer absolute bottom-0 left-0 h-[3px] bg-[#0F52BA]/60" />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. SESSION EXIT MODAL                                                     */}
      {/* ========================================================================= */}
      {logoutPresent && (
        <div
          className={`${isLogoutModalOpen ? 'erp-fade-in' : 'erp-fade-out'} fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs`}
          onClick={() => setIsLogoutModalOpen(false)}
        >
          <div
            className={`${isLogoutModalOpen ? 'erp-modal-in' : 'erp-modal-out'} w-full max-w-md bg-[#FFFFFF] rounded-3xl shadow-xl border border-slate-200 p-6 sm:p-7 relative`}
            onClick={(e) => e.stopPropagation()}
          >
            
            <button
              onClick={() => setIsLogoutModalOpen(false)}
              className="absolute top-5 right-5 p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              aria-label="Close"
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
                className="w-full text-left p-3.5 rounded-2xl border border-slate-200 hover:border-[#0F52BA]/60 hover:bg-[#0F52BA]/5 hover:-translate-y-0.5 transition-all flex items-start gap-3.5 group cursor-pointer"
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
                className="w-full text-left p-3.5 rounded-2xl border border-[#EF4444]/20 bg-[#EF4444]/5 hover:bg-[#EF4444]/10 hover:border-[#EF4444]/40 hover:-translate-y-0.5 transition-all flex items-start gap-3.5 group cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
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