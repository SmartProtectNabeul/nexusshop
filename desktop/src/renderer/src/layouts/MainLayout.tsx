import { ReactNode, useContext, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ShoppingBag, Library, User, LogOut, Settings, Bell, Search } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';

export default function MainLayout({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const auth = useContext(AuthContext);
  const [searchQuery, setSearchQuery] = useState('');

  if (!auth) return <>{children}</>;
  const { user, logout } = auth;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // For now, we'll just navigate to store with a query or alert
      // We can implement a dedicated search page later or filter the store
      console.log('Searching for:', searchQuery);
    }
  };

  const navItems = [
    { label: 'Store', path: '/store', icon: <ShoppingBag size={20} /> },
    { label: 'Library', path: '/library', icon: <Library size={20} /> },
  ];

  if (!user) return <>{children}</>;

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--surface-base)' }}>
      {/* Sidebar (unchanged code ...) */}
      <aside style={{ 
        width: '260px', 
        background: 'var(--surface-dark)', 
        borderRight: '1px solid var(--surface-glass-border)',
        display: 'flex',
        flexDirection: 'column',
        padding: '24px 16px',
        flexShrink: 0,
        zIndex: 100
      }}>
        <div style={{ padding: '0 8px', marginBottom: '32px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '32px', height: '32px', background: 'var(--accent-gradient)', borderRadius: '8px' }}></div>
          <h2 style={{ fontSize: '18px', fontWeight: 900, color: '#fff', letterSpacing: '1px' }}>NEXUS</h2>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px', flexGrow: 1 }}>
          <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', padding: '0 16px 8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Menu</div>
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 16px',
                borderRadius: '10px',
                background: location.pathname === item.path ? 'hsla(186, 100%, 65%, 0.08)' : 'transparent',
                color: location.pathname === item.path ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                fontWeight: 600,
                fontSize: '14px',
                textAlign: 'left',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                border: '1px solid transparent',
                borderColor: location.pathname === item.path ? 'hsla(186, 100%, 65%, 0.1)' : 'transparent'
              }}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
          
          <div style={{ marginTop: '24px', fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', padding: '0 16px 8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>System</div>
          <button
            onClick={() => navigate('/settings')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '10px 16px',
              borderRadius: '10px',
              background: location.pathname === '/settings' ? 'hsla(186, 100%, 65%, 0.08)' : 'transparent',
              color: location.pathname === '/settings' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: '14px',
              textAlign: 'left',
              transition: 'all 0.2s ease',
              border: '1px solid transparent',
              borderColor: location.pathname === '/settings' ? 'hsla(186, 100%, 65%, 0.1)' : 'transparent'
            }}
          >
            <Settings size={20} />
            Settings
          </button>
        </nav>

        <div style={{ 
          marginTop: 'auto', 
          padding: '16px', 
          background: 'rgba(255,255,255,0.03)', 
          borderRadius: '16px',
          border: '1px solid rgba(255,255,255,0.05)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--accent-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow-glow-cyan)' }}>
              <User size={18} color="#fff" />
            </div>
            <div style={{ flexGrow: 1, overflow: 'hidden' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user.email.split('@')[0]}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--accent-cyan)', fontWeight: 600 }}>{user.credits} Credits</div>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '8px' }}>
             <button 
                onClick={logout}
                style={{ 
                  flex: 1,
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '8px', 
                  borderRadius: '8px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  color: '#ef4444',
                  fontSize: '12px',
                  fontWeight: 700,
                  transition: 'all 0.2s ease'
                }}
             >
                <LogOut size={14} />
                Logout
             </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top Header */}
        <header style={{ 
          height: '72px', 
          borderBottom: '1px solid var(--surface-glass-border)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          padding: '0 32px',
          background: 'rgba(11, 18, 32, 0.5)',
          backdropFilter: 'blur(16px)',
          zIndex: 90
        }}>
           <form onSubmit={handleSearch} style={{ position: 'relative', width: '400px' }}>
              <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                type="text" 
                placeholder="Search for apps, tools, and games..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px 12px 48px',
                  borderRadius: '12px',
                  background: 'var(--surface-dark)',
                  border: '1px solid var(--surface-glass-border)',
                  fontSize: '14px',
                  color: '#fff',
                  transition: 'all 0.2s ease'
                }}
              />
           </form>

           <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
              <button style={{ color: 'var(--text-muted)', position: 'relative' }}>
                <Bell size={20} />
                <div style={{ position: 'absolute', top: '-2px', right: '-2px', width: '8px', height: '8px', background: 'var(--accent-purple)', borderRadius: '50%', border: '2px solid var(--surface-base)' }}></div>
              </button>
              <div style={{ width: '1px', height: '24px', background: 'var(--surface-glass-border)' }}></div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>{new Date().toLocaleDateString(undefined, { weekday: 'long' })}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</div>
              </div>
           </div>
        </header>

        {/* Page Content */}
        <main style={{ flexGrow: 1, overflowY: 'auto', background: 'var(--surface-base)', position: 'relative' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
