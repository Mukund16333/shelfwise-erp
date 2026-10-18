import React, { useState, useEffect } from 'react';
import { apiRequest, formatINR, formatNumber } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Modal from '../components/Modal';
import { TableSkeleton } from '../components/Skeleton';
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Eye,
  Sliders,
  FileText
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

export default function FraudWatch() {
  const { store, updateStoreProfile, refreshBadges } = useAuth();
  const { showToast } = useToast();

  const [flags, setFlags] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  // Detail Drawer / Modal state
  const [selectedFlag, setSelectedFlag] = useState(null);
  const [reviewStatus, setReviewStatus] = useState('confirmed');
  const [reviewNote, setReviewNote] = useState('');
  const [savingReview, setSavingReview] = useState(false);

  // Threshold setting
  const [threshold, setThreshold] = useState(store?.fraud_threshold || 0.65);
  const [savingThreshold, setSavingThreshold] = useState(false);

  const sym = store?.currency_symbol || '₹';

  const loadData = async () => {
    try {
      setLoading(true);
      const [flagsRes, metricsRes] = await Promise.all([
        apiRequest(`/fraud/flags?status_filter=${statusFilter}`),
        apiRequest('/fraud/metrics'),
      ]);
      setFlags(flagsRes);
      setMetrics(metricsRes);
      await refreshBadges();
    } catch (err) {
      showToast(err.message || 'Failed to load fraud watch data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const handleOpenReview = (flag) => {
    setSelectedFlag(flag);
    setReviewStatus(flag.status === 'pending' ? 'confirmed' : flag.status);
    setReviewNote(flag.review_note || '');
  };

  const handleSaveReview = async (e) => {
    e.preventDefault();
    if (!selectedFlag) return;
    setSavingReview(true);
    try {
      await apiRequest(`/fraud/flags/${selectedFlag.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: reviewStatus,
          review_note: reviewNote,
        }),
      });
      showToast(`Flag updated to ${reviewStatus}`, 'success');
      setSelectedFlag(null);
      loadData();
    } catch (err) {
      showToast(err.message || 'Failed to save review', 'error');
    } finally {
      setSavingReview(false);
    }
  };

  const handleThresholdSave = async () => {
    setSavingThreshold(true);
    try {
      await updateStoreProfile({ fraud_threshold: parseFloat(threshold) });
      showToast(`Review threshold updated to ${threshold}`, 'success');
      loadData();
    } catch (err) {
      showToast(err.message || 'Failed to update threshold', 'error');
    } finally {
      setSavingThreshold(false);
    }
  };

  // Chart 1: Anomaly Score Distribution
  const distChartData = {
    labels: metrics?.score_distribution ? Object.keys(metrics.score_distribution) : [],
    datasets: [
      {
        label: 'Flagged Transactions',
        data: metrics?.score_distribution ? Object.values(metrics.score_distribution) : [],
        backgroundColor: '#f59e0b',
        borderRadius: 4,
      },
    ],
  };

  // Chart 2: Feature Importance
  const featChartData = {
    labels: metrics?.feature_importance?.map((f) => f.feature) || [],
    datasets: [
      {
        label: 'Isolation Forest Feature Weight',
        data: metrics?.feature_importance?.map((f) => f.weight) || [],
        backgroundColor: '#0f172a',
        borderRadius: 4,
      },
    ],
  };

  return (
    <div>
      {/* Top Banner: PRD Requirement: Never say "fraud" in heading; say "flagged for review" */}
      <div
        className="card"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 16,
        }}
      >
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--tx)' }}>
            Transactions Flagged for Review
          </h2>
          <p style={{ fontSize: 12, color: 'var(--txm)', marginTop: 2 }}>
            Isolation Forest scores unusual B2B order patterns for human decision-making
          </p>
        </div>

        {/* Threshold Adjustment Slider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--txm)' }}>
            Sensitivity Threshold: <strong style={{ color: 'var(--tx)' }}>{threshold}</strong>
          </div>
          <input
            type="range"
            min="0.5"
            max="0.95"
            step="0.05"
            value={threshold}
            onChange={(e) => setThreshold(parseFloat(e.target.value))}
            style={{ width: 110 }}
          />
          <button
            className="btn-outline btn-xs"
            onClick={handleThresholdSave}
            disabled={savingThreshold}
          >
            {savingThreshold ? 'Saving...' : 'Apply'}
          </button>
        </div>
      </div>

      {/* Charts Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 16,
          marginBottom: 20,
        }}
      >
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--tx)' }}>
              Anomaly Score Distribution
            </h3>
            <span style={{ fontSize: 11, color: 'var(--txm)' }}>Threshold: {threshold}</span>
          </div>
          <div style={{ height: 180 }}>
            <Bar
              data={distChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                  x: { grid: { display: false }, ticks: { font: { size: 10 } } },
                  y: { grid: { color: '#e2e8f0' }, ticks: { font: { size: 10 } } },
                },
              }}
            />
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--tx)' }}>
              Feature Importance in Flagging
            </h3>
            <span style={{ fontSize: 11, color: 'var(--txm)' }}>Model weights</span>
          </div>
          <div style={{ height: 180 }}>
            <Bar
              data={featChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                  x: { grid: { display: false }, ticks: { font: { size: 10 } } },
                  y: { grid: { color: '#e2e8f0' }, ticks: { font: { size: 10 } } },
                },
              }}
            />
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="tab-list">
        {[
          { id: 'all', label: 'All Transactions' },
          { id: 'pending', label: 'Pending Review' },
          { id: 'confirmed', label: 'Confirmed Anomalies' },
          { id: 'dismissed', label: 'Dismissed' },
          { id: 'needs_follow_up', label: 'Needs Follow-Up' },
        ].map((tab) => (
          <div
            key={tab.id}
            className={`tab-item ${statusFilter === tab.id ? 'active' : ''}`}
            onClick={() => setStatusFilter(tab.id)}
          >
            {tab.label}
          </div>
        ))}
      </div>

      {/* Flagged Transactions Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <TableSkeleton rows={5} />
        ) : flags.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--txm)' }}>
            No transactions flagged in this category.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Product</th>
                  <th style={{ textAlign: 'right' }}>Quantity</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                  <th style={{ textAlign: 'center' }}>Time / Mode</th>
                  <th style={{ textAlign: 'center' }}>Anomaly Score</th>
                  <th>Plain-Language Reason</th>
                  <th style={{ textAlign: 'center' }}>Review Status</th>
                  <th style={{ textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {flags.map((item) => {
                  let statusBadge = 'pill-med';
                  if (item.status === 'confirmed') statusBadge = 'pill-high';
                  else if (item.status === 'dismissed') statusBadge = 'pill-low';
                  else if (item.status === 'needs_follow_up') statusBadge = 'pill-info';

                  return (
                    <tr
                      key={item.id}
                      style={{ cursor: 'pointer', backgroundColor: item.status === 'pending' ? '#fffbeb' : 'inherit' }}
                      onClick={() => handleOpenReview(item)}
                    >
                      <td style={{ fontWeight: 600, color: 'var(--tx)' }}>{item.customer_name}</td>
                      <td style={{ color: 'var(--txm)' }}>{item.product_name}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatNumber(item.quantity)}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatINR(item.amount, sym)}</td>
                      <td style={{ textAlign: 'center', fontSize: 12 }}>
                        {item.hour}:00 • <span style={{ textTransform: 'uppercase' }}>{item.payment_mode}</span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span
                          className={item.anomaly_score > 0.8 ? 'pill pill-high' : 'pill pill-med'}
                          style={{ fontFamily: 'monospace' }}
                        >
                          {item.anomaly_score.toFixed(3)}
                        </span>
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--tx)' }}>{item.reason}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`pill ${statusBadge}`} style={{ textTransform: 'capitalize' }}>
                          {item.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          className="btn-outline btn-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenReview(item);
                          }}
                        >
                          Review
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Transaction Detail & Review Modal */}
      <Modal
        isOpen={!!selectedFlag}
        onClose={() => setSelectedFlag(null)}
        title="Transaction Flag Review"
        maxWidth={500}
      >
        {selectedFlag && (
          <form onSubmit={handleSaveReview}>
            <div style={{ backgroundColor: '#f8fafc', padding: 14, borderRadius: 8, marginBottom: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 13 }}>
                <div>
                  <span style={{ color: 'var(--txm)' }}>Customer:</span>
                  <div style={{ fontWeight: 600 }}>{selectedFlag.customer_name}</div>
                </div>
                <div>
                  <span style={{ color: 'var(--txm)' }}>Product:</span>
                  <div style={{ fontWeight: 600 }}>{selectedFlag.product_name}</div>
                </div>
                <div>
                  <span style={{ color: 'var(--txm)' }}>Quantity:</span>
                  <div style={{ fontWeight: 600 }}>{formatNumber(selectedFlag.quantity)} units</div>
                </div>
                <div>
                  <span style={{ color: 'var(--txm)' }}>Order Value:</span>
                  <div style={{ fontWeight: 600 }}>{formatINR(selectedFlag.amount, sym)}</div>
                </div>
                <div>
                  <span style={{ color: 'var(--txm)' }}>Transaction Hour:</span>
                  <div style={{ fontWeight: 600 }}>{selectedFlag.hour}:00 hrs</div>
                </div>
                <div>
                  <span style={{ color: 'var(--txm)' }}>Payment Mode:</span>
                  <div style={{ fontWeight: 600, textTransform: 'uppercase' }}>{selectedFlag.payment_mode}</div>
                </div>
              </div>

              <div style={{ marginTop: 12, borderTop: '1px solid var(--brd)', paddingTop: 10 }}>
                <span style={{ fontSize: 11, color: 'var(--txm)', textTransform: 'uppercase' }}>Plain-Language Finding</span>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#dc2626', marginTop: 2 }}>
                  {selectedFlag.reason}
                </div>
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label>Review Decision</label>
              <select
                value={reviewStatus}
                onChange={(e) => setReviewStatus(e.target.value)}
              >
                <option value="confirmed">Confirmed Anomaly (True Positive)</option>
                <option value="dismissed">Dismissed (Legitimate Wholesale Order)</option>
                <option value="needs_follow_up">Needs Follow-Up (Contact Buyer)</option>
              </select>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label>Reviewer Notes / Action Taken</label>
              <textarea
                rows={3}
                placeholder="e.g. Verified with store manager; authorized special festival order."
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                className="btn-outline btn-sm"
                onClick={() => setSelectedFlag(null)}
              >
                Cancel
              </button>
              <button type="submit" className="btn-primary btn-sm" disabled={savingReview}>
                {savingReview ? 'Saving...' : 'Save Decision'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
