import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function Signup({ onNavigate }) {
  const { signup } = useAuth();
  const { showToast } = useToast();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signup(name, email, password);
      showToast('Store created! Please configure your store settings.', 'success');
      onNavigate('/setup');
    } catch (err) {
      setError(err.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
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
            Create Store Account
          </h1>
          <p style={{ fontSize: 13, color: 'var(--txm)', marginTop: 4 }}>
            Start managing expiry risk and retail AI actions
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
            <label>Full name / Owner name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ramesh Kumar"
              autoFocus
            />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label>Work email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ramesh@retailstore.in"
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label>Password (min 6 characters)</label>
            <input
              type="password"
              required
              minLength={6}
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
            {loading ? 'Creating store...' : 'Get Started'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'var(--txm)' }}>
          Already have an account?{' '}
          <span
            style={{ color: 'var(--acc-dk)', fontWeight: 600, cursor: 'pointer' }}
            onClick={() => onNavigate('/login')}
          >
            Sign in
          </span>
        </div>
      </div>
    </div>
  );
}
