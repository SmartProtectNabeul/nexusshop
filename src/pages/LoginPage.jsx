import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import toast from 'react-hot-toast';
import { AuthContext } from '../context/AuthContext';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);
  const isGoogleOAuthConfigured = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
    try {
      const res = await fetch(`http://localhost:5000${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (res.ok) {
        login(data.user, data.token);
        toast.success(isRegister ? 'Account created successfully' : 'Welcome back');
        navigate('/');
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
        toast.success('Signed in with Google');
        navigate('/');
        return;
      }

      toast.error(data.error || 'Google login failed');
    } catch (error) {
      console.error(error);
      toast.error('Backend is unreachable. Start server on port 5000 and try again.');
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
    </div>
  );
}
