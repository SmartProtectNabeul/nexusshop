import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AuthContext } from '../context/AuthContext';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const auth = useContext(AuthContext);

  if (!auth) return null;
  const { login } = auth;

  const handleSubmit = async (e: React.FormEvent) => {
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
        navigate('/store'); 
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '20px' }}>
      <div style={{ background: 'var(--surface-card)', padding: '40px', borderRadius: '16px', border: '1px solid var(--surface-glass-border)', boxShadow: 'var(--shadow-lg)', width: '100%', maxWidth: '400px' }}>
        <h1 style={{ marginBottom: '30px', textAlign: 'center', fontSize: '28px', color: 'var(--text-primary)' }}>
          {isRegister ? 'Create Account' : 'Welcome Back'}
        </h1>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            style={{ padding: '15px', borderRadius: '8px', border: '1px solid var(--surface-glass-border)', background: 'var(--surface-dark)', color: 'var(--text-primary)', fontSize: '16px' }}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            style={{ padding: '15px', borderRadius: '8px', border: '1px solid var(--surface-glass-border)', background: 'var(--surface-dark)', color: 'var(--text-primary)', fontSize: '16px' }}
          />
          <button 
            type="submit" 
            disabled={isLoading}
            style={{ 
              padding: '15px', 
              borderRadius: '8px', 
              border: 'none', 
              background: isLoading ? 'var(--text-muted)' : 'var(--accent-gradient)', 
              color: '#fff', 
              fontSize: '16px', 
              fontWeight: 'bold', 
              cursor: isLoading ? 'not-allowed' : 'pointer', 
              transition: 'all 0.2s ease',
              boxShadow: isLoading ? 'none' : 'var(--shadow-md)'
            }}
          >
            {isLoading ? 'Please wait...' : (isRegister ? 'Sign Up' : 'Sign In')}
          </button>
        </form>

        <p style={{ marginTop: '30px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          {isRegister ? 'Already have an account? ' : "Don't have an account? "}
          <span style={{ color: 'var(--accent-cyan)', fontWeight: 'bold', cursor: 'pointer' }} onClick={() => setIsRegister(!isRegister)}>
            {isRegister ? 'Log in' : 'Sign up'}
          </span>
        </p>
      </div>
    </div>
  );
}
