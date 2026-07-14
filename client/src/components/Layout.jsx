import { useState, useEffect } from 'react';
import { Outlet, NavLink, Link, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import {
  LayoutDashboard,
  Users,
  Truck,
  Settings,
  Menu,
  X,
  Bell,
  ChevronRight,
  Search,
} from 'lucide-react';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/customers', label: 'Khách hàng', icon: Users },
  { to: '/shipping', label: 'Vận chuyển', icon: Truck },
  { to: '/settings', label: 'Cài đặt', icon: Settings },
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
      <div className="text-[19px] font-extrabold tracking-wide leading-none">
        <span className="text-ink-900">SHIP</span>
        <span className="text-primary-500">US</span>
      </div>
      <div className="text-xs text-ink-400 mt-1">Quản lý vận chuyển</div>
    </div>
  );
}

function Sidebar({ onNavigate }) {
  return (
    <div className="flex flex-col h-full">
      {/* Logo → Dashboard */}
      <NavLink
        to="/"
        end
        onClick={onNavigate}
        aria-label="Về Dashboard"
        className="flex items-center gap-3 px-5 pt-6 pb-4 rounded-tile hover:opacity-80 transition-opacity"
      >
        <span className="w-11 h-11 rounded-tile bg-primary-100 grid place-items-center flex-shrink-0">
          <Mark size={26} />
        </span>
        <Wordmark />
      </NavLink>

      {/* Navigation */}
      <nav className="flex-1 px-3.5 py-2 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3.5 py-3 rounded-tile text-[14.5px] font-semibold transition-all duration-150 ${
                isActive
                  ? 'bg-primary-500 text-white shadow-pill'
                  : 'text-ink-500 hover:bg-greige-50 hover:text-ink-900'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon className="w-5 h-5 flex-shrink-0" strokeWidth={isActive ? 2.1 : 1.9} />
                <span className="flex-1">{label}</span>
                {isActive && <ChevronRight className="w-4 h-4" />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-greige-100">
        <p className="text-ink-400 text-xs font-semibold">ShipUS v1.0</p>
      </div>
    </div>
  );
}

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [username, setUsername] = useState('Admin');
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') || '';

  useEffect(() => {
    axios.get('/api/settings/me')
      .then((res) => { if (res.data?.username) setUsername(res.data.username); })
      .catch(() => { /* keep default */ });
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

      {/* Sidebar — floating white card on desktop, drawer on mobile */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-30 w-64 bg-white flex flex-col
          transform transition-transform duration-300 ease-in-out
          lg:relative lg:translate-x-0 lg:flex-shrink-0
          lg:rounded-frame lg:shadow-card lg:sticky lg:top-5 lg:self-start
          lg:h-[calc(100vh-40px)]
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <button
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden absolute top-4 right-4 text-ink-400 hover:text-ink-900 p-1"
        >
          <X className="w-5 h-5" />
        </button>
        <Sidebar onNavigate={() => setSidebarOpen(false)} />
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 gap-5 lg:h-[calc(100vh-40px)] p-4 lg:p-0">
        {/* Top bar */}
        <header className="flex items-center gap-4 bg-white rounded-card shadow-card px-4 lg:px-5 py-3 flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            aria-label="Mở menu"
            className="lg:hidden p-2 rounded-full text-ink-500 hover:bg-greige-100"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Search pill */}
          <div className="hidden sm:flex items-center gap-2 flex-1 max-w-md bg-greige-50 rounded-full px-4 py-2.5">
            <Search className="w-4 h-4 text-ink-400 flex-shrink-0" />
            <input
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Tìm theo mã KH, tracking #…"
              className="border-none outline-none bg-transparent text-sm w-full text-ink-900 placeholder-ink-400"
            />
            {query && (
              <button
                onClick={() => handleSearch('')}
                aria-label="Xóa tìm kiếm"
                className="text-ink-400 hover:text-ink-900 flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Mobile wordmark → Dashboard */}
          <Link to="/" aria-label="Về Dashboard" className="flex items-center gap-2 sm:hidden">
            <Mark size={22} />
            <span className="text-[15px] font-extrabold tracking-wide">
              <span className="text-ink-900">SHIP</span>
              <span className="text-primary-500">US</span>
            </span>
          </Link>

          <div className="ml-auto flex items-center gap-3">
            <button aria-label="Thông báo" className="relative w-10 h-10 rounded-full bg-white shadow-pill text-ink-700 grid place-items-center hover:bg-greige-50">
              <Bell className="w-[18px] h-[18px]" />
              <span className="absolute top-2 right-2.5 w-2 h-2 rounded-full bg-[#C2453F] border-2 border-white" />
            </button>
            <div className="flex items-center gap-2.5 pl-1">
              <span className="w-10 h-10 rounded-full bg-ink-900 text-white grid place-items-center font-bold uppercase">
                {username.charAt(0) || 'A'}
              </span>
              <div className="hidden sm:block leading-tight">
                <div className="text-sm font-bold text-ink-900">{username}</div>
                <div className="text-xs text-ink-400 whitespace-nowrap">Quản trị viên</div>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
