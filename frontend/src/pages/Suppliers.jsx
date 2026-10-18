import React, { useState, useEffect } from 'react';
import { apiRequest, formatINR, formatNumber } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Modal from '../components/Modal';
import { TableSkeleton } from '../components/Skeleton';
import {
  Truck,
  Plus,
  Edit2,
  CheckCircle2,
  AlertTriangle,
  Mail,
  Phone,
  Clock
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

export default function Suppliers() {
  const { store } = useAuth();
  const { showToast } = useToast();

  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);

  const [form, setForm] = useState({
    name: '',
    categories: 'Dairy',
    contact: '',
    email: '',
    phone: '',
    lead_time_days: 2,
    reliability_score: 95.0,
    mtd_spend: 0,
    status: 'active',
  });

  const sym = store?.currency_symbol || '₹';

  const loadSuppliers = async () => {
    try {
      setLoading(true);
      const data = await apiRequest('/suppliers');
      setSuppliers(data);
    } catch (err) {
      showToast(err.message || 'Failed to load suppliers', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSuppliers();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await apiRequest('/suppliers', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      showToast(`Supplier ${form.name} added successfully`, 'success');
      setAddModalOpen(false);
      loadSuppliers();
    } catch (err) {
      showToast(err.message || 'Failed to add supplier', 'error');
    }
  };

  const handleEditSave = async (e) => {
    e.preventDefault();
    if (!selectedSupplier) return;
    try {
      await apiRequest(`/suppliers/${selectedSupplier.id}`, {
        method: 'PATCH',
        body: JSON.stringify(form),
      });
      showToast('Supplier updated successfully', 'success');
      setEditModalOpen(false);
      loadSuppliers();
    } catch (err) {
      showToast(err.message || 'Failed to update supplier', 'error');
    }
  };

  const toggleStatus = async (supplier) => {
    const newStatus = supplier.status === 'active' ? 'review' : 'active';
    try {
      await apiRequest(`/suppliers/${supplier.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      showToast(`Supplier status updated to ${newStatus}`, 'success');
      loadSuppliers();
    } catch (err) {
      showToast(err.message || 'Failed to toggle status', 'error');
    }
  };

  // Chart: Reliability Comparison
  const relChartData = {
    labels: suppliers.map((s) => s.name.split(' ')[0]),
    datasets: [
      {
        label: 'Reliability Score (%)',
        data: suppliers.map((s) => s.reliability_score),
        backgroundColor: '#0f172a',
        borderRadius: 4,
      },
    ],
  };

  return (
    <div>
      {/* Top Header & Chart */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.5fr 1fr',
          gap: 16,
          marginBottom: 20,
        }}
      >
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div>
              <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--tx)' }}>
                Supplier On-Time Reliability Comparison
              </h3>
              <p style={{ fontSize: 11, color: 'var(--txm)', marginTop: 2 }}>
                Measured against order fulfillment SLAs (%)
              </p>
            </div>
            <button className="btn-primary btn-sm" onClick={() => setAddModalOpen(true)}>
              <Plus size={14} />
              <span>Add Supplier</span>
            </button>
          </div>
          <div style={{ height: 160 }}>
            <Bar
              data={relChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                  x: { grid: { display: false }, ticks: { font: { size: 10 } } },
                  y: { min: 80, max: 100, grid: { color: '#e2e8f0' }, ticks: { callback: (v) => `${v}%`, font: { size: 10 } } },
                },
              }}
            />
          </div>
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--tx)', marginBottom: 8 }}>
            Procurement Lead Time Summary
          </h4>
          <p style={{ fontSize: 12, color: 'var(--txm)', lineHeight: 1.5 }}>
            Average supplier lead time across active vendors is{' '}
            <strong style={{ color: 'var(--tx)' }}>2.4 days</strong>. Early replenishment triggered for categories with lead time &gt; 3 days.
          </p>
        </div>
      </div>

      {/* Suppliers Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <TableSkeleton rows={5} />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Supplier Name</th>
                  <th>Categories</th>
                  <th>Contact Person</th>
                  <th>Phone / Email</th>
                  <th style={{ textAlign: 'center' }}>Lead Time</th>
                  <th style={{ textAlign: 'center' }}>Reliability</th>
                  <th style={{ textAlign: 'right' }}>MTD Spend</th>
                  <th style={{ textAlign: 'center' }}>Status</th>
                  <th style={{ textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.map((s) => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 600, color: 'var(--tx)' }}>{s.name}</td>
                    <td>
                      <span className="pill pill-info">{s.categories}</span>
                    </td>
                    <td>{s.contact}</td>
                    <td style={{ fontSize: 12, color: 'var(--txm)' }}>
                      <div>{s.phone}</div>
                      <div>{s.email}</div>
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 600 }}>{s.lead_time_days} days</td>
                    <td style={{ textAlign: 'center' }}>
                      <span
                        className={s.reliability_score >= 95 ? 'pill pill-low' : 'pill pill-med'}
                        style={{ fontWeight: 700 }}
                      >
                        {s.reliability_score.toFixed(1)}%
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>
                      {formatINR(s.mtd_spend, sym)}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span
                        className={s.status === 'active' ? 'pill pill-low' : 'pill pill-high'}
                        style={{ cursor: 'pointer', textTransform: 'capitalize' }}
                        onClick={() => toggleStatus(s)}
                        title="Click to toggle status"
                      >
                        {s.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        className="btn-outline btn-xs"
                        onClick={() => {
                          setSelectedSupplier(s);
                          setForm({ ...s });
                          setEditModalOpen(true);
                        }}
                      >
                        <Edit2 size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Supplier Modal */}
      <Modal
        isOpen={addModalOpen || editModalOpen}
        onClose={() => {
          setAddModalOpen(false);
          setEditModalOpen(false);
        }}
        title={editModalOpen ? `Edit Supplier — ${selectedSupplier?.name}` : 'Add New Supplier'}
      >
        <form onSubmit={editModalOpen ? handleEditSave : handleCreate}>
          <div style={{ marginBottom: 14 }}>
            <label>Supplier / Company Name *</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Amul Dairy Cooperative"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <label>Categories (comma separated)</label>
              <input
                type="text"
                required
                value={form.categories}
                onChange={(e) => setForm({ ...form, categories: e.target.value })}
                placeholder="Dairy, Beverages"
              />
            </div>
            <div>
              <label>Contact Person</label>
              <input
                type="text"
                value={form.contact}
                onChange={(e) => setForm({ ...form, contact: e.target.value })}
                placeholder="Anand K"
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <label>Email Address</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="orders@supplier.in"
              />
            </div>
            <div>
              <label>Phone Number</label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+91 98400 00000"
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
            <div>
              <label>Lead Time (days)</label>
              <input
                type="number"
                min="1"
                value={form.lead_time_days}
                onChange={(e) => setForm({ ...form, lead_time_days: parseInt(e.target.value) || 1 })}
              />
            </div>
            <div>
              <label>Reliability Score (%)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={form.reliability_score}
                onChange={(e) => setForm({ ...form, reliability_score: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div>
              <label>Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                <option value="active">Active</option>
                <option value="review">Review</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button
              type="button"
              className="btn-outline btn-sm"
              onClick={() => {
                setAddModalOpen(false);
                setEditModalOpen(false);
              }}
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary btn-sm">
              {editModalOpen ? 'Save Changes' : 'Add Supplier'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
