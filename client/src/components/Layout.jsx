import { useState, useEffect } from 'react';
import { Outlet, NavLink, Link, useSearchParams, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Truck,
  Receipt,
  TrendingUp,
  Settings,
  Menu,
  X,
  Bell,
  ChevronRight,
  ExternalLink,
  Search,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { getUserRole } from '../utils.jsx';

const NAV_ITEMS = [
  { to: '/',             label: 'Dashboard',   icon: LayoutDashboard, end: true },
  { to: '/shipping',     label: 'Vận chuyển',  icon: Truck },
  { to: '/customers',    label: 'Khách hàng',  icon: Users },
  { to: '/transactions', label: 'Giao dịch',   icon: Receipt },
  { to: '/revenue',      label: 'Doanh thu VC', icon: TrendingUp },
  { to: '/settings',     label: 'Cài đặt',     icon: Settings },
];

function Mark({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <polygon points="5,3 5,29 28,16" fill="#3AAFD3" />
      <polygon points="5,3 17,10 5,17" fill="#21809E" />
    </svg>
  );
}

function Wordmark() {
  return (
    <div>
      <div className="text-wordmark font-extrabold tracking-wide leading-none">
        <span className="text-ink-900">SHIP</span>
        <span className="text-primary-500">US</span>
      </div>
      <div className="text-2xs text-ink-400 mt-1">Quản lý vận chuyển</div>
    </div>
  );
}

function Sidebar({ onNavigate, navItems, collapsed, toggleCollapsed }) {
  return (
    <div className="flex flex-col h-full">
      {/* Logo → Dashboard */}
      <NavLink
        to="/"
        end
        onClick={onNavigate}
        aria-label="Về Dashboard"
        className={`flex items-center pt-7 pb-5 hover:opacity-80 ${collapsed ? 'justify-center px-3' : 'gap-3 px-5'}`}
        style={{ transition: 'opacity 150ms ease-out' }}
      >
        <span className="w-11 h-11 rounded-tile bg-primary-100 grid place-items-center flex-shrink-0">
          <Mark size={26} />
        </span>
        {!collapsed && <Wordmark />}
      </NavLink>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-2 space-y-0.5 overflow-y-auto">
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onNavigate}
            title={collapsed ? label : undefined}
            className={({ isActive }) =>
              `flex items-center py-3 rounded-tile text-nav font-semibold ${
                collapsed ? 'justify-center px-2' : 'gap-3 px-3.5'
              } ${
                isActive
                  ? 'bg-primary-500 text-white shadow-pill'
                  : 'text-ink-500 hover:bg-greige-50 hover:text-ink-900'
              }`
            }
            style={{ transition: 'background-color 150ms ease-out, color 150ms ease-out' }}
          >
            {({ isActive }) => (
              <>
                <Icon className="w-5 h-5 flex-shrink-0" strokeWidth={isActive ? 2.1 : 1.9} />
                {!collapsed && <span className="flex-1">{label}</span>}
                {!collapsed && isActive && <ChevronRight className="w-4 h-4 opacity-70" />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Sidebar footer */}
      <div className={`py-4 border-t border-greige-100 space-y-1 ${collapsed ? 'px-2' : 'px-3.5'}`}>
        {!collapsed && (
          <>
            <a
              href="https://ai.basso.vn/admin/dashboard.html"
              onClick={onNavigate}
              className="flex items-center gap-3 px-3.5 py-3 rounded-tile text-nav font-semibold text-ink-500 hover:bg-greige-50 hover:text-ink-900"
              style={{ transition: 'background-color 150ms ease-out, color 150ms ease-out' }}
            >
              <ExternalLink className="w-5 h-5 flex-shrink-0" strokeWidth={1.9} />
              <span className="flex-1">AI Basso</span>
            </a>
            <p className="text-2xs text-ink-400 font-semibold px-3.5 pt-1">ShipUS v1.0</p>
          </>
        )}
        {/* Toggle collapse — desktop only */}
        <button
          onClick={toggleCollapsed}
          aria-label={collapsed ? 'Mở menu' : 'Thu gọn menu'}
          title={collapsed ? 'Mở menu' : 'Thu gọn menu'}
          className={`hidden lg:flex items-center w-full py-3 rounded-tile text-ink-500 hover:bg-greige-50 hover:text-ink-900 ${collapsed ? 'justify-center px-2' : 'gap-3 px-3.5'}`}
          style={{ transition: 'background-color 150ms ease-out' }}
        >
          {collapsed
            ? <PanelLeftOpen className="w-5 h-5 flex-shrink-0" />
            : <PanelLeftClose className="w-5 h-5 flex-shrink-0" />}
          {!collapsed && <span className="flex-1 text-nav font-semibold">Thu gọn</span>}
        </button>
      </div>
    </div>
  );
}

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('shipus_sidebar_collapsed') === '1');
  const [searchOpen, setSearchOpen] = useState(false);
  const [username, setUsername] = useState('Admin');
  const role = getUserRole();
  const location = useLocation();

  // Ép iOS cập nhật status-bar màu teal sau mỗi SPA navigation
  // (iOS chỉ đọc theme-color lần đầu load; trong BASSO PWA scope nó revert về màu BASSO sau pushState)
  useEffect(() => {
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#3AAFD3');
  }, [location.pathname]);

  const navItems = NAV_ITEMS.filter(({ to }) => {
    if (role === 'staff') return to !== '/' && to !== '/transactions';
    return true;
  });

  function toggleCollapsed() {
    setCollapsed((c) => {
      const next = !c;
      localStorage.setItem('shipus_sidebar_collapsed', next ? '1' : '0');
      return next;
    });
  }
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') || '';

  useEffect(() => {
    try {
      const raw = localStorage.getItem('ai_chat_user') || sessionStorage.getItem('ai_chat_user');
      if (raw) {
        const u = JSON.parse(raw);
        const display = u?.name || u?.username;
        if (display) setUsername(display);
      }
    } catch { /* keep default */ }
  }, []);

  function handleSearch(value) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) next.set('q', value);
      else next.delete('q');
      return next;
    }, { replace: true });
  }

  return (
    <div className="flex min-h-screen bg-greige-200 lg:p-5 lg:gap-5">

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-ink-900/40 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-30 bg-white flex flex-col overflow-hidden
          lg:relative lg:translate-x-0 lg:flex-shrink-0
          lg:rounded-frame lg:shadow-card lg:sticky lg:top-5 lg:self-start
          lg:h-[calc(100vh-40px)]
          ${sidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full w-64'}
          ${collapsed ? 'lg:w-16' : 'lg:w-64'}
        `}
        style={{
          transition: 'transform 280ms cubic-bezier(0.4,0,0.2,1), width 280ms cubic-bezier(0.4,0,0.2,1)',
          paddingTop: 'env(safe-area-inset-top, 0px)',
        }}
      >
        <button
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden absolute top-4 right-4 text-ink-400 hover:text-ink-900 p-1"
          aria-label="Đóng menu"
        >
          <X className="w-5 h-5" />
        </button>
        <Sidebar
          onNavigate={() => setSidebarOpen(false)}
          navItems={navItems}
          collapsed={collapsed}
          toggleCollapsed={toggleCollapsed}
        />
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 gap-4 lg:h-[calc(100vh-40px)]">
        {/* Top bar — full-bleed teal on mobile, floating white card on desktop */}
        <header
          className="flex items-center gap-3 bg-primary-500 lg:bg-white lg:rounded-card lg:shadow-card px-4 lg:px-5 pb-3 flex-shrink-0"
          style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.75rem)' }}
        >
          <button
            onClick={() => setSidebarOpen(true)}
            aria-label="Mở menu"
            className="lg:hidden p-2 rounded-full text-white hover:bg-white/20"
            style={{ transition: 'background-color 150ms ease-out' }}
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Search pill — desktop (sm+ with frosted look on teal, greige on white) */}
          <div className="hidden sm:flex items-center gap-2 flex-1 max-w-md bg-white/20 lg:bg-greige-50 rounded-full px-4 py-2.5">
            <Search className="w-4 h-4 text-white lg:text-ink-400 flex-shrink-0" />
            <input
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Tìm theo mã KH, tracking #…"
              className="border-none outline-none bg-transparent text-sm w-full text-white lg:text-ink-900 placeholder-white/60 lg:placeholder-ink-400"
            />
            {query && (
              <button
                onClick={() => handleSearch('')}
                aria-label="Xóa tìm kiếm"
                className="text-white/70 lg:text-ink-400 hover:text-white lg:hover:text-ink-900 flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Mobile wordmark */}
          <Link to="/" aria-label="Về Dashboard" className="flex items-center gap-2 sm:hidden">
            <span style={{ filter: 'brightness(0) invert(1)' }}>
              <Mark size={22} />
            </span>
            <span className="text-body-md font-extrabold tracking-wide text-white">
              SHIPUS
            </span>
          </Link>

          <div className="ml-auto flex items-center gap-2">
            {/* Mobile search toggle */}
            <button
              onClick={() => setSearchOpen((v) => !v)}
              aria-label="Tìm kiếm"
              className="sm:hidden p-2 rounded-full text-white hover:bg-white/20"
              style={{ transition: 'background-color 150ms ease-out' }}
            >
              <Search className="w-5 h-5" />
            </button>

            <button
              aria-label="Thông báo"
              className="relative w-10 h-10 rounded-full bg-white/20 lg:bg-white lg:shadow-pill text-white lg:text-ink-700 grid place-items-center hover:bg-white/30 lg:hover:bg-greige-50"
              style={{ transition: 'background-color 150ms ease-out' }}
            >
              <Bell className="w-[18px] h-[18px]" />
              <span className="absolute top-2 right-2.5 w-2 h-2 rounded-full bg-danger-600 border-2 border-white" />
            </button>

            <div className="flex items-center gap-2.5 pl-1">
              <span className="w-10 h-10 rounded-full bg-white/20 lg:bg-ink-900 text-white grid place-items-center font-bold uppercase text-sm border border-white/30 lg:border-0">
                {username.charAt(0) || 'A'}
              </span>
              <div className="hidden sm:block leading-tight">
                <div className="text-sm font-bold text-white lg:text-ink-900">{username}</div>
                <div className="text-2xs text-white/70 lg:text-ink-400 whitespace-nowrap">Quản trị viên</div>
              </div>
            </div>
          </div>
        </header>

        {/* Mobile search bar — expands below topbar when toggled */}
        {searchOpen && (
          <div className="sm:hidden flex items-center gap-2 bg-white mx-4 rounded-card shadow-card px-4 py-3 flex-shrink-0">
            <Search className="w-4 h-4 text-ink-400 flex-shrink-0" />
            <input
              autoFocus
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Tìm theo mã KH, tracking #…"
              className="border-none outline-none bg-transparent text-sm w-full text-ink-900 placeholder-ink-400"
            />
            {query && (
              <button onClick={() => handleSearch('')} aria-label="Xóa" className="text-ink-400 hover:text-ink-900">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* Page content */}
        <main
          className="flex-1 overflow-y-auto min-w-0"
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
