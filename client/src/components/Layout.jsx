import { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, Link, useSearchParams, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, Truck, Receipt, TrendingUp, Settings, BookOpen,
  Bell, X, Moon, Sun, ChevronLeft, ChevronRight, ExternalLink,
} from 'lucide-react';
import axios from 'axios';
import { getUserRole } from '../utils.jsx';
import shipusLogo from '../assets/shipus-logo.png';

const NAV_ITEMS = [
  { to: '/',             label: 'Tổng quan',  short: 'TQ', icon: LayoutDashboard, end: true,  badgeKey: null },
  { to: '/shipping',     label: 'Hàng về',    short: 'HV', icon: Truck,                         badgeKey: 'shipments' },
  { to: '/notification-log', label: 'Lịch sử gửi tin', short: 'LS', icon: Bell,                 badgeKey: null },
  { to: '/customers',    label: 'Khách hàng', short: 'KH', icon: Users,                         badgeKey: 'customers' },
  { to: '/transactions', label: 'Giao dịch',  short: 'GD', icon: Receipt,                       badgeKey: null },
  { to: '/revenue',      label: 'Doanh thu VC', short: 'DV', icon: TrendingUp,                  badgeKey: null },
  { to: '/guide',        label: 'HDSD',       short: 'HD', icon: BookOpen,                       badgeKey: null },
  { to: '/settings',     label: 'Cài đặt',   short: 'CĐ', icon: Settings,                      badgeKey: null },
];

const MOBILE_TABS = [
  { to: '/',             label: 'Tổng quan',  icon: LayoutDashboard, end: true },
  { to: '/shipping',     label: 'Hàng về',    icon: Truck },
  { to: '/transactions', label: 'Giao dịch',  icon: Receipt },
  { to: '/customers',    label: 'Khách hàng', icon: Users },
];

export default function Layout() {
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('shipus_sidebar_collapsed') === '1');
  const [theme, setTheme] = useState(() => localStorage.getItem('shipus_theme') || 'dark');
  const [username, setUsername] = useState('');
  const [badges, setBadges] = useState({ shipments: 0, customers: 0 });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const role = getUserRole();
  const pillRef = useRef(null);
  const navRef = useRef(null);

  useEffect(() => {
    if (window.innerWidth < 768 || /Mobi|Android/i.test(navigator.userAgent)) {
      navigate('/mobile', { replace: true });
    }
  }, []);

  const navItems = NAV_ITEMS.filter(({ to }) => {
    if (role === 'staff') return to !== '/' && to !== '/transactions';
    return true;
  });

  // Tính vị trí pill
  const activeIndex = navItems.findIndex(({ to, end }) =>
    end ? location.pathname === to : location.pathname.startsWith(to)
  );

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

  // Fetch badge counts
  useEffect(() => {
    async function fetchBadges() {
      try {
        const [custRes] = await Promise.all([
          axios.get('/api/customers'),
        ]);
        setBadges(prev => ({
          ...prev,
          customers: Array.isArray(custRes.data) ? custRes.data.length : 0,
        }));
      } catch { /* ignore */ }
    }
    fetchBadges();
  }, []);

  // iOS status bar
  useEffect(() => {
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#3AAFD3');
  }, [location.pathname]);

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('shipus_theme', next);
    document.body.setAttribute('data-theme', next);
    document.body.style.backgroundColor = next === 'light' ? '#e9ecee' : '#07161d';
  }

  function toggleCollapsed() {
    setCollapsed(c => {
      const next = !c;
      localStorage.setItem('shipus_sidebar_collapsed', next ? '1' : '0');
      return next;
    });
  }

  const sideW = collapsed ? 76 : 236;
  const showLabels = !collapsed;
  const isDark = theme === 'dark';

  const currentPageTitle = navItems.find(({ to, end }) =>
    end ? location.pathname === to : location.pathname.startsWith(to)
  )?.label ?? 'ShipUS';

  const mobileTabs = MOBILE_TABS.filter(({ to }) => {
    if (role === 'staff') return to !== '/' && to !== '/transactions';
    return true;
  });

  const activeMobileIndex = mobileTabs.findIndex(({ to, end }) =>
    end ? location.pathname === to : location.pathname.startsWith(to)
  );

  return (
    <div
      style={{
        minHeight: '100vh',
        background: isDark
          ? 'radial-gradient(900px 560px at 6% -12%, rgba(58,175,211,.3), transparent 62%), radial-gradient(760px 520px at 96% 4%, rgba(33,128,158,.26), transparent 62%), radial-gradient(640px 620px at 58% 118%, rgba(58,175,211,.13), transparent 62%), #07161d'
          : 'radial-gradient(760px 420px at 4% -8%, rgba(58,175,211,.28), transparent 62%), radial-gradient(680px 460px at 100% 4%, rgba(33,128,158,.16), transparent 60%), linear-gradient(180deg,#f3f5f6,#e7ebee)',
        color: 'var(--tx)',
      }}
    >
      {/* ── Desktop layout ── */}
      <div className="hidden lg:flex gap-[18px] p-5 max-w-[1720px] mx-auto items-start">

        {/* Sidebar */}
        <aside
          style={{
            flex: 'none',
            width: sideW,
            transition: 'width 260ms cubic-bezier(.4,0,.2,1)',
            position: 'sticky',
            top: 20,
            borderRadius: 22,
            padding: '22px 14px',
            background: 'var(--sf)',
            border: '1px solid var(--ln)',
            backdropFilter: 'blur(22px) saturate(1.3)',
            WebkitBackdropFilter: 'blur(22px) saturate(1.3)',
            boxShadow: '0 26px 54px -26px rgba(0,0,0,.75), inset 0 1px 0 rgba(255,255,255,.14)',
            display: 'flex',
            flexDirection: 'column',
            gap: 24,
            minHeight: 'calc(100vh - 40px)',
            boxSizing: 'border-box',
            overflow: 'hidden',
          }}
        >
          {/* Logo */}
          <Link
            to="/"
            className="flex items-center"
            style={{ gap: showLabels ? 11 : 0, padding: '0 8px', textDecoration: 'none' }}
          >
            <span style={{
              flexShrink: 0,
              width: 40, height: 40,
              borderRadius: 13,
              display: 'grid', placeItems: 'center',
              background: 'linear-gradient(150deg,rgba(58,175,211,.4),rgba(58,175,211,.08))',
              border: '1px solid rgba(58,175,211,.42)',
              boxShadow: '0 0 26px -6px rgba(58,175,211,.7)',
            }}>
              <img src={shipusLogo} alt="ShipUS" style={{ height: 26, width: 'auto', display: 'block' }} />
            </span>
            {showLabels && (
              <div>
                <div style={{ fontWeight: 800, letterSpacing: '.06em', fontSize: 17, lineHeight: 1, color: 'var(--tx)' }}>
                  SHIP<span style={{ color: 'var(--brand)' }}>US</span>
                </div>
                <div style={{ fontSize: 9.5, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--mu)', marginTop: 5 }}>
                  Quản lý vận chuyển
                </div>
              </div>
            )}
          </Link>

          {/* Nav with sliding pill */}
          <nav style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {/* Pill indicator */}
            {activeIndex >= 0 && (
              <div style={{
                position: 'absolute',
                left: 0, right: 0,
                height: 44,
                borderRadius: 13,
                background: 'var(--navOn)',
                boxShadow: 'var(--navGlow)',
                transition: 'top 260ms cubic-bezier(.4,0,.2,1)',
                top: activeIndex * 48,
                pointerEvents: 'none',
              }} />
            )}
            {navItems.map(({ to, label, short, icon: Icon, end, badgeKey }, idx) => {
              const isActive = activeIndex === idx;
              const badge = badgeKey ? badges[badgeKey] : null;
              return (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  style={{
                    position: 'relative',
                    zIndex: 1,
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: showLabels ? 10 : 0,
                    justifyContent: showLabels ? 'flex-start' : 'center',
                    height: 44,
                    padding: showLabels ? '0 14px' : '0',
                    borderRadius: 13,
                    fontFamily: 'inherit',
                    fontSize: 13.5,
                    fontWeight: 600,
                    color: isActive ? '#fff' : 'var(--tx2)',
                    transition: 'color 160ms ease',
                  }}
                >
                  <Icon className="w-[18px] h-[18px] flex-shrink-0" strokeWidth={isActive ? 2.1 : 1.9} />
                  {showLabels && (
                    <>
                      <span style={{ flex: 1 }}>{label}</span>
                      {badge ? (
                        <span style={{
                          font: '700 9.5px "JetBrains Mono", monospace',
                          padding: '2px 6px',
                          borderRadius: 20,
                          background: 'var(--sf2)',
                          color: 'var(--tx2)',
                        }}>
                          {badge}
                        </span>
                      ) : null}
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>

          {/* Footer */}
          <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Theme + AI Basso + Collapse — 1 hàng khi mở, xếp dọc khi thu gọn */}
            <div style={{ display: 'flex', flexDirection: showLabels ? 'row' : 'column', gap: 6, alignItems: 'center' }}>
              {/* Theme toggle */}
              <button
                onClick={toggleTheme}
                title={isDark ? 'Chuyển sáng' : 'Chuyển tối'}
                style={{
                  appearance: 'none',
                  border: '1px solid var(--ln)',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  flexShrink: 0,
                  width: 36, height: 36,
                  borderRadius: 11,
                  display: 'grid', placeItems: 'center',
                  color: 'var(--tx2)',
                  background: 'var(--sf2)',
                }}
              >
                {isDark ? <Moon className="w-[15px] h-[15px]" /> : <Sun className="w-[15px] h-[15px]" />}
              </button>

              {/* Thu gọn */}
              <button
                onClick={toggleCollapsed}
                title={collapsed ? 'Mở menu' : 'Thu gọn'}
                style={{
                  appearance: 'none',
                  border: '1px solid var(--ln)',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  flex: showLabels ? 1 : 'none',
                  flexShrink: 0,
                  height: 36,
                  width: showLabels ? 'auto' : 36,
                  padding: showLabels ? '0 10px' : '0',
                  borderRadius: 11,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--tx2)',
                  background: 'var(--sf2)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                }}
              >
                {collapsed ? <ChevronRight className="w-[13px] h-[13px]" /> : <ChevronLeft className="w-[13px] h-[13px]" />}
                {showLabels && 'Thu gọn'}
              </button>
            </div>

            {/* User */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: showLabels ? 11 : 0,
              justifyContent: showLabels ? 'flex-start' : 'center',
              padding: '12px 8px 0',
              borderTop: '1px solid var(--ln2)',
            }}>
              <span style={{
                flexShrink: 0,
                width: 34, height: 34,
                borderRadius: 11,
                display: 'grid', placeItems: 'center',
                fontWeight: 700,
                fontSize: 13,
                color: 'var(--onbtn)',
                background: 'var(--btn)',
              }}>
                {(username || 'A').charAt(0).toUpperCase()}
              </span>
              {showLabels && (
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--tx)' }}>
                    {username || 'Admin'}
                  </div>
                  <div style={{ fontSize: 10.5, color: 'var(--mu)' }}>Quản trị viên</div>
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* Main content area */}
        <main style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 18,
          paddingBottom: 20,
        }}>
          <Outlet />
        </main>
      </div>

      {/* ── Mobile layout ── */}
      <div className="lg:hidden flex flex-col min-h-screen">
        {/* Mobile header */}
        <header
          style={{
            background: 'var(--sf)',
            borderBottom: '1px solid var(--ln)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '12px 16px',
            paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)',
            position: 'sticky',
            top: 0,
            zIndex: 30,
          }}
        >
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none' }}>
            <span style={{
              width: 36, height: 36,
              borderRadius: 11,
              display: 'grid', placeItems: 'center',
              background: 'linear-gradient(150deg,rgba(58,175,211,.4),rgba(58,175,211,.08))',
              border: '1px solid rgba(58,175,211,.42)',
            }}>
              <img src={shipusLogo} alt="" style={{ height: 22, display: 'block' }} />
            </span>
            <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--tx)' }}>
              {currentPageTitle}
            </span>
          </Link>

          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <button
              onClick={toggleTheme}
              style={{
                appearance: 'none',
                border: '1px solid var(--ln)',
                cursor: 'pointer',
                fontFamily: 'inherit',
                width: 36, height: 36,
                borderRadius: 11,
                display: 'grid', placeItems: 'center',
                color: 'var(--tx2)',
                background: 'var(--sf2)',
              }}
            >
              {isDark ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>
            <span style={{
              width: 36, height: 36,
              borderRadius: 11,
              display: 'grid', placeItems: 'center',
              fontWeight: 700,
              fontSize: 13,
              color: 'var(--onbtn)',
              background: 'var(--btn)',
              flexShrink: 0,
            }}>
              {(username || 'A').charAt(0).toUpperCase()}
            </span>
          </div>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, paddingBottom: 'calc(max(env(safe-area-inset-bottom, 0px), 12px) + 80px)' }}>
          <Outlet />
        </main>

        {/* Floating pill tab bar */}
        <nav style={{
          position: 'fixed',
          bottom: 0, left: 0, right: 0,
          display: 'flex',
          justifyContent: 'center',
          padding: '0 20px',
          paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 12px)',
          zIndex: 30,
          pointerEvents: 'none',
        }}>
          <div style={{
            pointerEvents: 'auto',
            position: 'relative',
            display: 'flex',
            width: '100%',
            maxWidth: 360,
            height: 68,
            background: 'var(--sf)',
            border: '1px solid var(--ln)',
            backdropFilter: 'blur(28px) saturate(1.5)',
            WebkitBackdropFilter: 'blur(28px) saturate(1.5)',
            borderRadius: 999,
            boxShadow: '0 20px 48px -16px rgba(0,0,0,.85), inset 0 1px 0 rgba(255,255,255,.12)',
            animation: 'pillUp 400ms cubic-bezier(.2,.9,.3,1) both',
          }}>
            {/* Sliding active indicator */}
            {activeMobileIndex >= 0 && (
              <div style={{
                position: 'absolute',
                top: 6,
                bottom: 6,
                width: `calc(${100 / mobileTabs.length}% - 8px)`,
                left: `calc(${activeMobileIndex * (100 / mobileTabs.length)}% + 4px)`,
                borderRadius: 999,
                background: 'linear-gradient(100deg,#1c7691,#2f9dbf)',
                boxShadow: '0 6px 22px -4px rgba(47,157,191,.85)',
                transition: 'left 300ms cubic-bezier(.4,0,.2,1)',
                pointerEvents: 'none',
              }} />
            )}
            {mobileTabs.map(({ to, label, icon: Icon, end }, idx) => {
              const isActive = activeMobileIndex === idx;
              return (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  style={{
                    position: 'relative',
                    zIndex: 1,
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 3,
                    textDecoration: 'none',
                    color: isActive ? '#fff' : 'var(--mu)',
                    fontSize: 10,
                    fontWeight: 600,
                    letterSpacing: '.01em',
                    transition: 'color 200ms ease',
                  }}
                >
                  <Icon size={18} strokeWidth={isActive ? 2.1 : 1.7} />
                  <span style={{ lineHeight: 1 }}>{label}</span>
                </NavLink>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
