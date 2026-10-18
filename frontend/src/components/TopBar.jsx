import React, { useState } from 'react';
import { Cpu, LogOut, User as UserIcon, ChevronDown, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function TopBar({ title, onNavigate }) {
  const { user, store, modelStatus, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const loadedCount = modelStatus?.loaded_count ?? 5;
  const totalModels = modelStatus?.total_models ?? 5;
  const allLoaded = loadedCount === totalModels;

  const missingModels = modelStatus?.models
    ?.filter((m) => m.status !== 'loaded')
    ?.map((m) => m.name) || [];

  return (
    <header className="topbar">
      {/* Page Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <h1 style={{ fontSize: 15, fontWeight: 600, color: 'var(--tx)', margin: 0 }}>
          {title}
        </h1>

        {/* Fiscal Year Pill */}
        <div
          style={{
            backgroundColor: 'var(--acc-lt)',
            color: 'var(--acc-dk)',
            fontSize: 11,
            fontWeight: 600,
            padding: '2px 8px',
            borderRadius: 20,
          }}
        >
          {store?.fiscal_year || 'FY 2026–27'}
        </div>

        {/* AI Models Loaded Pill */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            fontSize: 11,
            fontWeight: 600,
            padding: '2px 10px',
            borderRadius: 20,
            backgroundColor: allLoaded ? 'var(--risk-low-bg)' : 'var(--risk-med-bg)',
            color: allLoaded ? 'var(--risk-low-tx)' : 'var(--risk-med-tx)',
            border: `1px solid ${allLoaded ? 'var(--risk-low-brd)' : 'var(--risk-med-brd)'}`,
            cursor: 'pointer',
          }}
          title={
            allLoaded
              ? 'All 5 AI Models loaded & active'
              : `Fallback mode active for: ${missingModels.join(', ')}`
          }
          onClick={() => onNavigate('/settings')}
        >
          <Cpu size={12} />
          <span>
            {loadedCount}/{totalModels} AI Models Active
          </span>
          {!allLoaded && <AlertTriangle size={11} />}
        </div>
      </div>

      {/* User Actions & Profile */}
      <div style={{ position: 'relative' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            cursor: 'pointer',
            padding: '4px 8px',
            borderRadius: 6,
          }}
          onClick={() => setDropdownOpen(!dropdownOpen)}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              backgroundColor: 'var(--sb)',
              color: '#f8fafc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div style={{ textAlign: 'left', lineHeight: 1.2 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--tx)' }}>
              {user?.name || 'Retail User'}
            </div>
            <div style={{ fontSize: 10, color: 'var(--txm)', textTransform: 'uppercase' }}>
              {user?.role || 'staff'}
            </div>
          </div>
          <ChevronDown size={14} color="var(--txm)" />
        </div>

        {/* Dropdown Menu */}
        {dropdownOpen && (
          <div
            style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: 6,
              width: 190,
              backgroundColor: 'var(--card)',
              border: '1px solid var(--brd)',
              borderRadius: 8,
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              padding: '6px 0',
              zIndex: 50,
            }}
          >
            <div
              style={{
                padding: '8px 14px',
                borderBottom: '1px solid var(--brd)',
                fontSize: 11,
                color: 'var(--txm)',
              }}
            >
              Signed in as <br />
              <strong style={{ color: 'var(--tx)' }}>{user?.email}</strong>
            </div>

            <div
              onClick={() => {
                setDropdownOpen(false);
                onNavigate('/settings');
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 14px',
                fontSize: 13,
                cursor: 'pointer',
                color: 'var(--tx)',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <UserIcon size={14} />
              <span>Store Profile</span>
            </div>

            <div
              onClick={() => {
                setDropdownOpen(false);
                logout();
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 14px',
                fontSize: 13,
                cursor: 'pointer',
                color: '#dc2626',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#fef2f2')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <LogOut size={14} />
              <span>Sign Out</span>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
