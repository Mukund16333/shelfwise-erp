import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import ConfirmDialog from '../components/ConfirmDialog';
import Modal from '../components/Modal';
import {
  Store as StoreIcon,
  Cpu,
  Database,
  UserPlus,
  Trash2,
  RotateCcw,
  Download,
  CheckCircle2,
  AlertTriangle,
  Lock
} from 'lucide-react';

export default function StoreSettings() {
  const { user, store, modelStatus, updateStoreProfile, refreshModelStatus, refreshBadges } = useAuth();
  const { showToast } = useToast();

  const isOwner = user?.role === 'owner';

  // Profile form state
  const [profile, setProfile] = useState({
    name: store?.name || '',
    city: store?.city || '',
    currency_symbol: store?.currency_symbol || '₹',
    manager_name: store?.manager_name || '',
    store_type: store?.store_type || 'Supermarket / Food Retail',
    fiscal_year: store?.fiscal_year || 'FY 2026–27',
  });
  const [savingProfile, setSavingProfile] = useState(false);

  // Invite modal state
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('staff');
  const [inviting, setInviting] = useState(false);

  // Destructive actions dialogs
  const [clearDiscountsOpen, setClearDiscountsOpen] = useState(false);
  const [resetDataOpen, setResetDataOpen] = useState(false);

  useEffect(() => {
    refreshModelStatus();
  }, [refreshModelStatus]);

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await updateStoreProfile(profile);
      showToast('Store settings saved successfully', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to update store profile', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleInviteSubmit = async (e) => {
    e.preventDefault();
    setInviting(true);
    try {
      await apiRequest('/auth/invite', {
        method: 'POST',
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });
      showToast(`Invitation sent to ${inviteEmail} as ${inviteRole}`, 'success');
      setInviteModalOpen(false);
      setInviteEmail('');
    } catch (err) {
      showToast(err.message || 'Failed to invite user', 'error');
    } finally {
      setInviting(false);
    }
  };

  const handleClearDiscounts = async () => {
    try {
      const res = await apiRequest('/store/clear-discounts', { method: 'POST' });
      showToast(res.message, 'success');
      await refreshBadges();
    } catch (err) {
      showToast(err.message || 'Failed to clear discounts', 'error');
    }
  };

  const handleResetStoreData = async () => {
    try {
      await apiRequest('/store/reset', {
        method: 'POST',
        body: JSON.stringify({ store_name: store?.name }),
      });
      showToast('Store inventory and sales data reset', 'info');
      await refreshBadges();
    } catch (err) {
      showToast(err.message || 'Failed to reset store data', 'error');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 900 }}>
      {/* Card 1: Store Profile */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <StoreIcon size={18} color="var(--acc)" />
          <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)' }}>Store Profile</h3>
        </div>

        <form onSubmit={handleProfileSave}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div>
              <label>Store Name *</label>
              <input
                type="text"
                required
                disabled={!isOwner}
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              />
            </div>
            <div>
              <label>City / Location</label>
              <input
                type="text"
                disabled={!isOwner}
                value={profile.city}
                onChange={(e) => setProfile({ ...profile, city: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 14 }}>
            <div>
              <label>Currency Symbol</label>
              <input
                type="text"
                disabled={!isOwner}
                value={profile.currency_symbol}
                onChange={(e) => setProfile({ ...profile, currency_symbol: e.target.value })}
              />
            </div>
            <div>
              <label>Manager Name</label>
              <input
                type="text"
                disabled={!isOwner}
                value={profile.manager_name}
                onChange={(e) => setProfile({ ...profile, manager_name: e.target.value })}
              />
            </div>
            <div>
              <label>Fiscal Year</label>
              <input
                type="text"
                disabled={!isOwner}
                value={profile.fiscal_year}
                onChange={(e) => setProfile({ ...profile, fiscal_year: e.target.value })}
              />
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label>Store Type</label>
            <select
              disabled={!isOwner}
              value={profile.store_type}
              onChange={(e) => setProfile({ ...profile, store_type: e.target.value })}
            >
              <option value="Supermarket / Food Retail">Supermarket / Food Retail</option>
              <option value="Grocery Store">Grocery Store</option>
              <option value="Wholesale Distributor">Wholesale Distributor</option>
              <option value="Pharmacy / FMCG">Pharmacy / FMCG</option>
            </select>
          </div>

          {isOwner && (
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="btn-primary btn-sm" disabled={savingProfile}>
                {savingProfile ? 'Saving...' : 'Save Profile Changes'}
              </button>
            </div>
          )}
        </form>
      </div>

      {/* Card 2: AI Models Status */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Cpu size={18} color="var(--acc)" />
            <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)' }}>
              AI Model Engine Status
            </h3>
          </div>
          <span className="pill pill-low">
            {modelStatus?.loaded_count}/{modelStatus?.total_models} Models Operational
          </span>
        </div>

        <table>
          <thead>
            <tr>
              <th>Model Name</th>
              <th>Algorithm</th>
              <th>Version</th>
              <th>Status</th>
              <th>Training Date</th>
              <th>Held-Out Validation Metric</th>
            </tr>
          </thead>
          <tbody>
            {modelStatus?.models?.map((m, idx) => (
              <tr key={idx}>
                <td style={{ fontWeight: 600 }}>{m.name}</td>
                <td style={{ color: 'var(--txm)' }}>{m.algorithm}</td>
                <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{m.version}</td>
                <td>
                  <span className={m.status === 'loaded' ? 'pill pill-low' : 'pill pill-med'}>
                    {m.status}
                  </span>
                </td>
                <td style={{ fontSize: 12, color: 'var(--txm)' }}>{m.trained_at || 'Pre-trained'}</td>
                <td style={{ fontSize: 12, fontWeight: 600, color: 'var(--tx)' }}>
                  {m.metrics && Object.keys(m.metrics).length > 0
                    ? Object.entries(m.metrics).map(([k, v]) => `${k}: ${v}`).join(' | ')
                    : 'Held-out evaluated'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Card 3: Data Management (Owner Only) */}
      {isOwner ? (
        <div className="card" style={{ borderLeft: '4px solid #dc2626' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Database size={18} color="#dc2626" />
            <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)' }}>
              Data Management & Administration
            </h3>
          </div>
          <p style={{ fontSize: 12, color: 'var(--txm)', marginBottom: 16 }}>
            Store-level administrative operations. Actions require confirmation and are logged to audit trails.
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            <button className="btn-outline btn-sm" onClick={() => setInviteModalOpen(true)}>
              <UserPlus size={14} />
              <span>Invite Manager / Staff</span>
            </button>

            <button
              className="btn-outline btn-sm"
              onClick={() => setClearDiscountsOpen(true)}
              style={{ color: 'var(--acc-dk)' }}
            >
              <RotateCcw size={14} />
              <span>Clear All Applied Discounts</span>
            </button>

            <button
              className="btn-outline btn-sm"
              onClick={() => setResetDataOpen(true)}
              style={{ color: '#dc2626', borderColor: '#fecaca' }}
            >
              <Trash2 size={14} />
              <span>Reset Store Data</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="card" style={{ backgroundColor: '#f8fafc', color: 'var(--txm)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Lock size={16} />
            <span style={{ fontSize: 12 }}>
              Data management and store reset actions are restricted to Owner role.
            </span>
          </div>
        </div>
      )}

      {/* Invite User Modal */}
      <Modal isOpen={inviteModalOpen} onClose={() => setInviteModalOpen(false)} title="Invite User to Store">
        <form onSubmit={handleInviteSubmit}>
          <div style={{ marginBottom: 14 }}>
            <label>Team Member Email *</label>
            <input
              type="email"
              required
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="colleague@freshmart.com"
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label>Assigned Role</label>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
            >
              <option value="manager">Manager (Pricing, B2B, purchasing)</option>
              <option value="staff">Staff (Inventory check, batch entry, read-only alerts)</option>
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button type="button" className="btn-outline btn-sm" onClick={() => setInviteModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn-primary btn-sm" disabled={inviting}>
              {inviting ? 'Sending...' : 'Send Invitation'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Clear Discounts Confirmation Dialog */}
      <ConfirmDialog
        isOpen={clearDiscountsOpen}
        onClose={() => setClearDiscountsOpen(false)}
        onConfirm={handleClearDiscounts}
        title="Clear All Applied Discounts"
        message="This will reverse all active markdown discounts across all store batches and restore their original baseline prices. An audit log entry will be recorded."
        confirmLabel="Reverse All Discounts"
        isDestructive={false}
      />

      {/* Reset Store Data Confirmation Dialog */}
      <ConfirmDialog
        isOpen={resetDataOpen}
        onClose={() => setResetDataOpen(false)}
        onConfirm={handleResetStoreData}
        title="Reset Store Data"
        message="This will permanently delete all batches, transaction logs, price changes, and sales records for your store. To confirm this destructive action, please type your store name below:"
        confirmWord={store?.name}
        confirmLabel="Reset Store Data"
        isDestructive={true}
      />
    </div>
  );
}
