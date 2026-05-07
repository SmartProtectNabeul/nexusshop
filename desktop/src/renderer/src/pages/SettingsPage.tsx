import React, { useContext, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { AuthContext } from '../context/AuthContext';
import { User, Key, Shield, Trash2, Copy } from 'lucide-react';

export default function SettingsPage() {
  const auth = useContext(AuthContext);
  const [tokens, setTokens] = useState<any[]>([]);
  const [isLoadingTokens, setIsLoadingTokens] = useState(false);
  const [newTokenName, setNewTokenName] = useState('');
  const [isCreatingToken, setIsCreatingToken] = useState(false);

  if (!auth) return null;
  const { user } = auth;

  const fetchTokens = useCallback(async () => {
    setIsLoadingTokens(true);
    try {
      const res = await fetch('http://localhost:5000/api/sdk/license-tokens', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      if (res.ok) setTokens(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingTokens(false);
    }
  }, []);

  React.useEffect(() => {
    fetchTokens();
  }, [fetchTokens]);

  const handleCreateToken = async () => {
    if (!newTokenName.trim()) {
      toast.error('Please enter a name for your token');
      return;
    }
    setIsCreatingToken(true);
    try {
      const res = await fetch('http://localhost:5000/api/sdk/license-tokens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ name: newTokenName })
      });
      const data = await res.json();
      if (res.ok) {
        setTokens([data, ...tokens]);
        setNewTokenName('');
        toast.success('License token created');
      }
    } catch (err) {
      toast.error('Failed to create token');
    } finally {
      setIsCreatingToken(false);
    }
  };

  const handleDeleteToken = async (tokenId: string) => {
    if (!window.confirm('Delete this token? Apps using it will lose access.')) return;
    try {
      const res = await fetch(`http://localhost:5000/api/sdk/license-tokens/${tokenId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        setTokens(tokens.filter(t => t.id !== tokenId));
        toast.success('Token deleted');
      }
    } catch (err) {
      toast.error('Failed to delete token');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Token copied');
  };

  return (
    <div style={{ padding: '40px', maxWidth: '900px' }}>
      <header style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '8px' }}>Settings</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Manage your account, security, and developer integrations.</p>
      </header>

      <div style={{ display: 'grid', gap: '32px' }}>
        
        {/* Profile Section */}
        <section style={{ background: 'var(--surface-card)', borderRadius: '16px', border: '1px solid var(--surface-glass-border)', padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'hsla(186, 100%, 65%, 0.1)', color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <User size={24} />
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 700 }}>Account Profile</h2>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Your basic account information.</p>
            </div>
          </div>
          
          <div style={{ display: 'grid', gap: '16px' }}>
             <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>Email Address</label>
                <input 
                   type="text" 
                   value={user?.email || ''} 
                   readOnly 
                   style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'var(--surface-dark)', border: '1px solid var(--surface-glass-border)', color: 'var(--text-secondary)' }} 
                />
             </div>
             <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>Account Role</label>
                <div style={{ display: 'inline-block', padding: '4px 12px', borderRadius: '4px', background: 'hsla(186, 100%, 65%, 0.1)', color: 'var(--accent-cyan)', fontSize: '12px', fontWeight: 700 }}>
                   {user?.role}
                </div>
             </div>
          </div>
        </section>

        {/* SDK Tokens Section */}
        <section style={{ background: 'var(--surface-card)', borderRadius: '16px', border: '1px solid var(--surface-glass-border)', padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'hsla(270, 80%, 70%, 0.1)', color: 'var(--accent-purple)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Key size={24} />
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 700 }}>Personal License Tokens</h2>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Use these to authenticate in third-party apps.</p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
            <input
              type="text"
              placeholder="Token Name (e.g. Work Laptop)"
              value={newTokenName}
              onChange={(e) => setNewTokenName(e.target.value)}
              style={{ flexGrow: 1, padding: '12px', borderRadius: '8px', background: 'var(--surface-dark)', border: '1px solid var(--surface-glass-border)', color: '#fff' }}
            />
            <button 
              onClick={handleCreateToken}
              disabled={isCreatingToken}
              style={{ padding: '0 24px', borderRadius: '8px', background: 'var(--accent-gradient)', color: '#000', fontWeight: 700, fontSize: '14px' }}
            >
              {isCreatingToken ? '...' : 'Generate'}
            </button>
          </div>

          <div style={{ display: 'grid', gap: '12px' }}>
            {isLoadingTokens ? (
              <p style={{ color: 'var(--text-muted)' }}>Loading tokens...</p>
            ) : tokens.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', border: '1px dashed var(--surface-glass-border)', borderRadius: '12px' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>No tokens generated yet.</p>
              </div>
            ) : (
              tokens.map(token => (
                <div key={token.id} style={{ 
                  background: 'rgba(255,255,255,0.02)', 
                  padding: '16px', 
                  borderRadius: '12px', 
                  border: '1px solid rgba(255,255,255,0.05)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ fontSize: '14px' }}>{token.name}</strong>
                    <button 
                      onClick={() => handleDeleteToken(token.id)}
                      style={{ color: '#ef4444', opacity: 0.8 }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <code style={{ 
                      background: '#000', 
                      padding: '8px 12px', 
                      borderRadius: '6px', 
                      flexGrow: 1, 
                      fontSize: '12px',
                      fontFamily: 'monospace',
                      color: 'var(--accent-cyan)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {token.token}
                    </code>
                    <button 
                      onClick={() => copyToClipboard(token.token)}
                      style={{ padding: '8px', borderRadius: '6px', background: 'var(--surface-elevated)', color: 'var(--text-secondary)' }}
                    >
                      <Copy size={16} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Danger Zone */}
        <section style={{ border: '1px solid rgba(239, 68, 68, 0.2)', background: 'rgba(239, 68, 68, 0.02)', borderRadius: '16px', padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
             <Shield size={20} color="#ef4444" />
             <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#ef4444' }}>Danger Zone</h2>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>Once you delete your account, there is no going back. Please be certain.</p>
          <button style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #ef4444', color: '#ef4444', fontSize: '13px', fontWeight: 700 }}>
             Delete Account
          </button>
        </section>

      </div>
    </div>
  );
}
