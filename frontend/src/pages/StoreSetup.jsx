import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function StoreSetup({ onNavigate }) {
  const { store, updateStoreProfile } = useAuth();
  const { showToast } = useToast();

  const [name, setName] = useState(store?.name || 'FreshMart Supermarket');
  const [city, setCity] = useState(store?.city || 'Chennai');
  const [currency, setCurrency] = useState(store?.currency_symbol || '₹');
  const [managerName, setManagerName] = useState(store?.manager_name || '');
  const [storeType, setStoreType] = useState(store?.store_type || 'Supermarket / Food Retail');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter your store name');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await updateStoreProfile({
        name: name.trim(),
        city: city.trim(),
        currency_symbol: currency.trim(),
        manager_name: managerName.trim(),
        store_type: storeType,
      });
      showToast('Store setup complete! Welcome to ShelfWise ERP.', 'success');
      onNavigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Failed to complete setup');
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
        padding: 24,
      }}
    >
      <div
        className="card"
        style={{
          maxWidth: 520,
          width: '100%',
          padding: '36px 32px',
          borderRadius: 16,
          boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
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
            Store Setup
          </h1>
          <p style={{ fontSize: 13, color: 'var(--txm)', marginTop: 4 }}>
            Configure your retail operating environment
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
              marginBottom: 18,
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label>Store Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="FreshMart Supermarket"
              autoFocus
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
            <div>
              <label>City / Location</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Chennai"
              />
            </div>
            <div>
              <label>Currency Symbol</label>
              <input
                type="text"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                placeholder="₹"
              />
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label>Manager Name</label>
            <input
              type="text"
              value={managerName}
              onChange={(e) => setManagerName(e.target.value)}
              placeholder="Ramesh Kumar"
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label>Store Type</label>
            <select
              value={storeType}
              onChange={(e) => setStoreType(e.target.value)}
            >
              <option value="Supermarket / Food Retail">Supermarket / Food Retail (Recommended)</option>
              <option value="Grocery Store">Grocery Store</option>
              <option value="Convenience Store">Convenience Store</option>
              <option value="Wholesale Distributor">Wholesale Distributor</option>
              <option value="Pharmacy / FMCG">Pharmacy / FMCG</option>
            </select>
          </div>

          <button
            type="submit"
            className="btn-primary"
            style={{ width: '100%', padding: '11px 0', fontSize: 14 }}
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Get Started'}
          </button>
        </form>
      </div>
    </div>
  );
}
