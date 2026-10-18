import React from 'react';
import {
  LayoutDashboard,
  Layers,
  AlertTriangle,
  Sparkles,
  TrendingUp,
  Briefcase,
  ShieldAlert,
  BarChart2,
  Truck,
  Settings,
  Store as StoreIcon
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Sidebar({ currentRoute, onNavigate }) {
  const { user, store, badges } = useAuth();
  const role = user?.role || 'staff';

  const navGroups = [
    {
      group: 'Core',
      items: [
        {
          id: 'dashboard',
          label: 'Dashboard',
          route: '/dashboard',
          icon: LayoutDashboard,
          roles: ['owner', 'manager', 'staff'],
        },
        {
          id: 'inventory',
          label: 'Inventory',
          route: '/inventory',
          icon: Layers,
          badge: badges.high_risk_inventory,
          roles: ['owner', 'manager', 'staff'],
        },
        {
          id: 'alerts',
          label: 'Expiry Alerts',
          route: '/alerts',
          icon: AlertTriangle,
          badge: badges.unactioned_alerts,
          roles: ['owner', 'manager', 'staff'],
        },
      ],
    },
    {
      group: 'AI Modules',
      items: [
        {
          id: 'advisor',
          label: 'AI Advisor',
          route: '/advisor',
          icon: Sparkles,
          roles: ['owner', 'manager', 'staff'],
        },
        {
          id: 'demand',
          label: 'Demand Forecast',
          route: '/demand',
          icon: TrendingUp,
          roles: ['owner', 'manager'],
        },
        {
          id: 'b2b',
          label: 'B2B Hub',
          route: '/b2b',
          icon: Briefcase,
          roles: ['owner', 'manager'],
        },
        {
          id: 'fraud',
          label: 'Fraud Watch',
          route: '/fraud',
          icon: ShieldAlert,
          badge: badges.pending_fraud_flags,
          roles: ['owner', 'manager'],
        },
      ],
    },
    {
      group: 'Analytics',
      items: [
        {
          id: 'analytics',
          label: 'Analytics',
          route: '/analytics',
          icon: BarChart2,
          roles: ['owner', 'manager'],
        },
        {
          id: 'suppliers',
          label: 'Suppliers',
          route: '/suppliers',
          icon: Truck,
          roles: ['owner', 'manager'],
        },
      ],
    },
    {
      group: 'Account',
      items: [
        {
          id: 'settings',
          label: 'Store Settings',
          route: '/settings',
          icon: Settings,
          roles: ['owner', 'manager'],
        },
      ],
    },
  ];

  return (
    <aside className="sidebar">
      {/* Brand Header */}
      <div style={{ padding: '20px 16px 14px', borderBottom: '1px solid var(--sb2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Logo Mark: Letter S in bold slate on amber rounded square */}
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              backgroundColor: 'var(--acc)',
              color: 'var(--sb)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: 16,
              flexShrink: 0,
            }}
          >
            S
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#f8fafc', letterSpacing: '-0.3px', lineHeight: 1.2 }}>
              ShelfWise ERP
            </div>
            <div
              style={{
                fontSize: 9,
                fontWeight: 600,
                color: 'var(--sbt2)',
                textTransform: 'uppercase',
                letterSpacing: 1.2,
                marginTop: 2,
              }}
            >
              AI-Powered Retail OS
            </div>
          </div>
        </div>
      </div>

      {/* Nav Menu */}
      <div style={{ flex: 1, padding: '12px 0', overflowY: 'auto' }}>
        {navGroups.map((group) => {
          const visibleItems = group.items.filter((item) => item.roles.includes(role));
          if (visibleItems.length === 0) return null;

          return (
            <div key={group.group} style={{ marginBottom: 14 }}>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  color: '#94a3b8',
                  padding: '6px 16px',
                }}
              >
                {group.group}
              </div>
              {visibleItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentRoute === item.route;

                return (
                  <div
                    key={item.id}
                    onClick={() => onNavigate(item.route)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '9px 16px',
                      fontSize: 13,
                      cursor: 'pointer',
                      borderLeft: isActive ? '3px solid var(--acc)' : '3px solid transparent',
                      backgroundColor: isActive ? 'var(--sb2)' : 'transparent',
                      color: isActive ? '#f8fafc' : 'var(--sbt)',
                      fontWeight: isActive ? 600 : 400,
                      transition: 'all 0.12s ease',
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = 'var(--sb2)';
                        e.currentTarget.style.color = '#e2e8f0';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = 'var(--sbt)';
                      }
                    }}
                  >
                    <Icon size={16} />
                    <span style={{ flex: 1 }}>{item.label}</span>
                    {item.badge > 0 && (
                      <span className="nav-badge">{item.badge}</span>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Bottom Store Profile Button */}
      <div
        style={{
          padding: '12px 16px',
          borderTop: '1px solid var(--sb2)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          cursor: 'pointer',
          backgroundColor: 'rgba(0,0,0,0.15)',
        }}
        onClick={() => onNavigate('/settings')}
        title="Open Store Settings"
      >
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 6,
            backgroundColor: 'var(--sb2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--acc)',
            flexShrink: 0,
          }}
        >
          <StoreIcon size={16} />
        </div>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: '#f8fafc',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {store?.name || 'My Store'}
          </div>
          <div style={{ fontSize: 10, color: 'var(--sbt2)' }}>
            {store?.city || 'Retail Store'}
          </div>
        </div>
      </div>
    </aside>
  );
}
