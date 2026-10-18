import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { LogIn, ArrowRight } from 'lucide-react';

export default function Login({ onNavigate }) {
  const { login } = useAuth();
  const { showToast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      showToast('Signed in successfully', 'success');
      onNavigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Email or password is incorrect');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (demoEmail, demoPass) => {
    setEmail(demoEmail);
    setPassword(demoPass);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--bg)',
        padding: 20,
      }}
    >
      <div
        className="card"
        style={{
          maxWidth: 420,
          width: '100%',
          padding: '36px 32px',
          borderRadius: 16,
          boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
        }}
      >
        {/* Brand Lockup */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              backgroundColor: 'var(--acc)',
              color: 'var(--sb)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: 24,
              marginBottom: 12,
            }}
          >
            S
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--tx)' }}>
            ShelfWise ERP
          </h1>
          <p
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: 'var(--txm)',
              textTransform: 'uppercase',
              letterSpacing: 1.5,
              marginTop: 4,
            }}
          >
            AI-Powered Retail OS
          </p>
        </div>

        {error && (
          <div
            style={{
              backgroundColor: 'var(--risk-high-bg)',
              color: 'var(--risk-high-tx)',
              border: '1px solid var(--risk-high-brd)',
              padding: '10px 14px',
              borderRadius: 8,
              fontSize: 13,
              marginBottom: 16,
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 14 }}>
            <label>Email address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="owner@freshmart.com"
              autoFocus
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label>Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            className="btn-primary"
            style={{ width: '100%', padding: '10px 0', fontSize: 14 }}
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign in to Store'}
          </button>
        </form>

        {/* Demo Quick Logins */}
        <div style={{ marginTop: 24, paddingTop: 18, borderTop: '1px solid var(--brd)' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--txm)', textTransform: 'uppercase', marginBottom: 8, textAlign: 'center' }}>
            Demo Store Accounts (Pre-configured)
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
            <button
              type="button"
              className="btn-outline btn-xs"
              onClick={() => handleQuickLogin('owner@freshmart.com', 'admin123')}
            >
              Owner
            </button>
            <button
              type="button"
              className="btn-outline btn-xs"
              onClick={() => handleQuickLogin('manager@freshmart.com', 'manager123')}
            >
              Manager
            </button>
            <button
              type="button"
              className="btn-outline btn-xs"
              onClick={() => handleQuickLogin('staff@freshmart.com', 'staff123')}
            >
              Staff
            </button>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'var(--txm)' }}>
          Don't have an account?{' '}
          <span
            style={{ color: 'var(--acc-dk)', fontWeight: 600, cursor: 'pointer' }}
            onClick={() => onNavigate('/signup')}
          >
            Create account
          </span>
        </div>
      </div>
    </div>
  );
}
