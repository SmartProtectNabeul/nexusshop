import React, { useState, useContext } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import toast from 'react-hot-toast';
import { AuthContext } from '../context/AuthContext';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [accountType, setAccountType] = useState('CONSUMER');
  const [pendingRoleUser, setPendingRoleUser] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { login, setUser } = useContext(AuthContext);
  const isGoogleOAuthConfigured = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID);
  const from = location.state?.from;
  const returnPath = from?.pathname && from.pathname !== '/login'
    ? `${from.pathname}${from.search || ''}${from.hash || ''}`
    : '/';

  const navigateAfterAuth = () => {
    navigate(returnPath, { replace: Boolean(from?.pathname) });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
    try {
      const res = await fetch(`http://localhost:5000${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role: isRegister ? accountType : undefined })
      });
      const data = await res.json();
      if (res.ok) {
        login(data.user, data.token);
        if (isRegister) {
          toast.success('Account created successfully');
        } else {
          toast.success('Welcome back');
        }
        navigateAfterAuth();
      } else {
        toast.error(data.error || 'Authentication failed');
      }
    } catch (err) {
      console.error(err);
      toast.error('An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLoginSuccess = async (credentialResponse) => {
    try {
      const res = await fetch('http://localhost:5000/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: credentialResponse.credential })
      });
      const data = await res.json();

      if (res.ok && data.user && data.token) {
        login(data.user, data.token);
        if (data.isNewUser) {
          setPendingRoleUser(data.user);
          return;
        }
        toast.success('Signed in with Google');
        navigateAfterAuth();
        return;
      }

      toast.error(data.error || 'Google login failed');
    } catch (error) {
      console.error(error);
      toast.error('Backend is unreachable. Start server on port 5000 and try again.');
    }
  };

  const completeAccountType = async (role) => {
    const activeUser = pendingRoleUser;
    if (!activeUser) return;
    setIsLoading(true);
    try {
      const res = await fetch(`http://localhost:5000/api/users/${activeUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save account type');
      setUser(data.user);
      localStorage.setItem('user', JSON.stringify(data.user));
      toast.success('Account type saved');
      navigateAfterAuth();
    } catch (error) {
      toast.error(error.message || 'Failed to save account type');
    } finally {
      setIsLoading(false);
      setPendingRoleUser(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '80px 20px', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ background: '#4444', padding: '40px', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', width: '100%', maxWidth: '400px' }}>
        <h1 style={{ marginBottom: '30px', textAlign: 'center', fontSize: '28px', color: '#fff' }}>
          {isRegister ? 'Create Account' : 'Welcome Back'}
        </h1>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            style={{ padding: '15px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '16px' }}
          />
          {isRegister && (
            <div style={{ display: 'grid', gap: '10px' }}>
              <span style={{ color: '#e5e7eb', fontSize: '13px', fontWeight: 700 }}>Account type</span>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {[
                  { value: 'CONSUMER', label: 'Customer', hint: 'Buy and review apps' },
                  { value: 'DEVELOPER', label: 'Developer', hint: 'Publish apps' },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setAccountType(option.value)}
                    style={{
                      padding: '12px',
                      borderRadius: '10px',
                      border: accountType === option.value ? '1px solid #67e8f9' : '1px solid rgba(255,255,255,0.18)',
                      background: accountType === option.value ? 'rgba(103,232,249,0.16)' : 'rgba(255,255,255,0.05)',
                      color: '#fff',
                      textAlign: 'left',
                    }}
                  >
                    <strong style={{ display: 'block', fontSize: '13px' }}>{option.label}</strong>
                    <span style={{ display: 'block', color: '#cbd5e1', fontSize: '11px', marginTop: '4px' }}>{option.hint}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            style={{ padding: '15px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '16px' }}
          />
          <button 
            type="submit" 
            disabled={isLoading}
            style={{ 
              padding: '15px', 
              borderRadius: '8px', 
              border: 'none', 
              background: isLoading ? '#888' : 'rgb(20, 50, 200)', 
              color: '#fff', 
              fontSize: '16px', 
              fontWeight: 'bold', 
              cursor: isLoading ? 'not-allowed' : 'pointer', 
              transition: 'all 0.2s ease',
              transform: isLoading ? 'scale(0.98)' : 'scale(1)',
              boxShadow: isLoading ? 'none' : '0 4px 14px rgba(20,50,200,0.4)'
            }}
            onMouseDown={(e) => { if(!isLoading) e.currentTarget.style.transform = 'scale(0.95)'; }}
            onMouseUp={(e) => { if(!isLoading) e.currentTarget.style.transform = 'scale(1)'; }}
            onMouseLeave={(e) => { if(!isLoading) e.currentTarget.style.transform = 'scale(1)'; }}
          >
            {isLoading ? 'Please wait...' : (isRegister ? 'Sign Up' : 'Sign In')}
          </button>
        </form>

        <div style={{ margin: '30px 0', textAlign: 'center', color: '#888', position: 'relative' }}>
          <span style={{ background: '#fff', padding: '0 10px', position: 'relative', zIndex: 1 }}>OR</span>
          <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '1px', background: '#eee', zIndex: 0 }}></div>
        </div>

        {isGoogleOAuthConfigured ? (
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <GoogleLogin
              onSuccess={handleGoogleLoginSuccess}
              onError={() => toast.error('Google OAuth blocked this origin. Add your Vite URL to Authorized JavaScript origins.')}
              shape="pill"
              text="continue_with"
            />
          </div>
        ) : (
          <button
            disabled
            style={{ width: '100%', padding: '15px', borderRadius: '8px', border: '1px solid #ddd', background: '#e5e7eb', color: '#6b7280', fontSize: '14px', fontWeight: 'bold', cursor: 'not-allowed' }}
          >
            Google Login unavailable (missing VITE_GOOGLE_CLIENT_ID)
          </button>
        )}

        <p style={{ marginTop: '30px', textAlign: 'center', color: '#666' }}>
          {isRegister ? 'Already have an account? ' : "Don't have an account? "}
          <span style={{ color: 'rgb(20, 50, 200)', textShadow: '1px 1px 10px darkBlue', fontWeight: 'bold', cursor: 'pointer' }} onClick={() => setIsRegister(!isRegister)}>
            {isRegister ? 'Log in' : 'Sign up'}
          </span>
        </p>
      </div>
      {pendingRoleUser && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(2,6,23,0.7)', backdropFilter: 'blur(10px)', display: 'grid', placeItems: 'center', padding: '20px', zIndex: 1000 }}>
          <div style={{ width: 'min(440px, 100%)', borderRadius: '18px', border: '1px solid rgba(255,255,255,0.18)', background: 'rgba(15,23,42,0.78)', boxShadow: '0 24px 80px rgba(0,0,0,0.35)', padding: '24px' }}>
            <h2 style={{ color: '#fff', fontSize: '22px', marginBottom: '8px' }}>Choose your account type</h2>
            <p style={{ color: '#cbd5e1', lineHeight: 1.6, marginBottom: '18px' }}>This helps NexusShop show the right tools from the start.</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <button type="button" disabled={isLoading} onClick={() => completeAccountType('CONSUMER')} style={{ padding: '16px', borderRadius: '12px', background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid rgba(255,255,255,0.16)', textAlign: 'left' }}>
                <strong>Customer</strong>
                <span style={{ display: 'block', color: '#cbd5e1', fontSize: '12px', marginTop: '6px' }}>Discover, buy, and review apps.</span>
              </button>
              <button type="button" disabled={isLoading} onClick={() => completeAccountType('DEVELOPER')} style={{ padding: '16px', borderRadius: '12px', background: 'rgba(103,232,249,0.14)', color: '#fff', border: '1px solid rgba(103,232,249,0.42)', textAlign: 'left' }}>
                <strong>Developer</strong>
                <span style={{ display: 'block', color: '#cbd5e1', fontSize: '12px', marginTop: '6px' }}>Publish apps after review.</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
