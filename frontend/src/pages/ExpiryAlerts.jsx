import React, { useState, useEffect } from 'react';
import { apiRequest, formatINR, formatNumber } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import RiskPill from '../components/RiskPill';
import ExpiryBar from '../components/ExpiryBar';
import Modal from '../components/Modal';
import { CardSkeleton } from '../components/Skeleton';
import {
  CheckCircle2,
  Undo2,
  HelpCircle,
  TrendingDown,
  Layers,
  ArrowRight,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend
} from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function ExpiryAlerts({ onNavigate }) {
  const { user, store, refreshBadges } = useAuth();
  const { showToast } = useToast();

  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState(null);

  // Explanation Modal (F12 SHAP)
  const [explainModalOpen, setExplainModalOpen] = useState(false);
  const [explainData, setExplainData] = useState(null);
  const [explainingProduct, setExplainingProduct] = useState('');
  const [explainLoading, setExplainLoading] = useState(false);

  const isStaff = user?.role === 'staff';
  const sym = store?.currency_symbol || '₹';

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const data = await apiRequest('/alerts/expiry');
      setAlerts(data);
      await refreshBadges();
    } catch (err) {
      showToast(err.message || 'Failed to load alerts', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const handleApplyDiscount = async (alert) => {
    setActioningId(alert.batch_id);
    try {
      await apiRequest(`/alerts/${alert.batch_id}/apply-discount`, {
        method: 'POST',
        body: JSON.stringify({
          discount_pct: alert.recommended_discount,
          reason: 'AI recommended expiry prevention markdown',
        }),
      });
      showToast(`Applied ${alert.recommended_discount}% discount on ${alert.product_name}`, 'success');
      await fetchAlerts();
    } catch (err) {
      showToast(err.message || 'Failed to apply discount', 'error');
    } finally {
      setActioningId(null);
    }
  };

  const handleUndoDiscount = async (alert) => {
    setActioningId(alert.batch_id);
    try {
      await apiRequest(`/alerts/${alert.batch_id}/undo-discount`, {
        method: 'POST',
      });
      showToast(`Restored original price for ${alert.product_name}`, 'info');
      await fetchAlerts();
    } catch (err) {
      showToast(err.message || 'Failed to undo discount', 'error');
    } finally {
      setActioningId(null);
    }
  };

  const handleExplain = async (alert) => {
    setExplainingProduct(alert.product_name);
    setExplainModalOpen(true);
    setExplainLoading(true);
    try {
      const res = await apiRequest('/ai/explain', {
        method: 'POST',
        body: JSON.stringify({
          days_left: alert.days_left,
          stock: alert.stock,
          demand_rate: Math.max(1, alert.stock / 6),
          price: alert.current_price,
          cost: alert.cost_price,
        }),
      });
      setExplainData(res);
    } catch (err) {
      showToast(err.message || 'Failed to get explanation', 'error');
    } finally {
      setExplainLoading(false);
    }
  };

  // Compute total value at stake
  const totalWasteAtStake = alerts
    .filter((a) => !a.is_discounted)
    .reduce((sum, a) => sum + a.potential_waste_value, 0);

  const totalDiscountedValue = alerts
    .filter((a) => a.is_discounted)
    .reduce((sum, a) => sum + (a.stock * a.new_price), 0);

  // Recovery breakdown chart data
  const recoveryChartData = {
    labels: ['Actioned (Discounts Active)', 'Unactioned At Risk'],
    datasets: [
      {
        data: [
          alerts.filter((a) => a.is_discounted).length,
          alerts.filter((a) => !a.is_discounted).length,
        ],
        backgroundColor: ['#22c55e', '#ef4444'],
        borderWidth: 0,
      },
    ],
  };

  return (
    <div>
      {/* Summary Header */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 16,
          marginBottom: 20,
        }}
      >
        <div className="card" style={{ borderLeft: '4px solid #ef4444' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--txm)', textTransform: 'uppercase' }}>
            Potential Waste Value at Stake
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#dc2626', marginTop: 4 }}>
            {formatINR(totalWasteAtStake, sym)}
          </div>
          <div style={{ fontSize: 12, color: 'var(--txm)', marginTop: 4 }}>
            Across {alerts.filter((a) => !a.is_discounted).length} unactioned batches
          </div>
        </div>

        <div className="card" style={{ borderLeft: '4px solid #22c55e' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--txm)', textTransform: 'uppercase' }}>
            Protected Revenue (Markdowns Applied)
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#16a34a', marginTop: 4 }}>
            {formatINR(totalDiscountedValue, sym)}
          </div>
          <div style={{ fontSize: 12, color: 'var(--txm)', marginTop: 4 }}>
            {alerts.filter((a) => a.is_discounted).length} batches active with dynamic pricing
          </div>
        </div>
      </div>

      {/* Main Layout: Alert Cards + Recovery Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20, alignItems: 'start' }}>
        {/* Left: Alerts Card List */}
        <div>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
            </div>
          ) : alerts.length === 0 ? (
            <div className="card" style={{ padding: 48, textAlign: 'center' }}>
              <ShieldCheck size={36} color="#16a34a" style={{ margin: '0 auto 12px' }} />
              <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--tx)' }}>
                No Urgent Expiry Risks
              </h3>
              <p style={{ fontSize: 13, color: 'var(--txm)', marginTop: 4 }}>
                All current store batches have sufficient cover and shelf life.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {alerts.map((item) => {
                const isDisc = item.is_discounted;

                return (
                  <div
                    key={item.batch_id}
                    className="card"
                    style={{
                      borderLeft: isDisc ? '4px solid #22c55e' : item.days_left <= 2 ? '4px solid #ef4444' : '4px solid var(--acc)',
                      backgroundColor: isDisc ? '#f0fdf4' : 'var(--card)',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                      <div>
                        <span
                          style={{
                            fontSize: 15,
                            fontWeight: 700,
                            color: 'var(--tx)',
                            cursor: 'pointer',
                            textDecoration: 'underline',
                            textUnderlineOffset: 3,
                          }}
                          onClick={() => onNavigate(`/inventory?search=${encodeURIComponent(item.product_name)}`)}
                          title="View batch in inventory"
                        >
                          {item.product_name}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--txm)', marginLeft: 8 }}>
                          Batch: {item.batch_code}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <RiskPill label={item.risk_label} score={item.ai_risk} />
                        <button
                          className="btn-outline btn-xs"
                          onClick={() => handleExplain(item)}
                          title="Show SHAP model explanation"
                          style={{ gap: 4 }}
                        >
                          <HelpCircle size={12} />
                          <span>Why?</span>
                        </button>
                      </div>
                    </div>

                    {/* Batch Metrics Grid */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(4, 1fr)',
                        gap: 12,
                        padding: '10px 0',
                        borderTop: '1px solid var(--brd2)',
                        borderBottom: '1px solid var(--brd2)',
                        marginBottom: 12,
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 11, color: 'var(--txm)', textTransform: 'uppercase' }}>Days to Expiry</div>
                        <div style={{ marginTop: 4 }}>
                          <ExpiryBar daysLeft={item.days_left} />
                        </div>
                      </div>

                      <div>
                        <div style={{ fontSize: 11, color: 'var(--txm)', textTransform: 'uppercase' }}>Current Stock</div>
                        <div style={{ fontSize: 15, fontWeight: 700, marginTop: 2 }}>
                          {formatNumber(item.stock)} units
                        </div>
                      </div>

                      <div>
                        <div style={{ fontSize: 11, color: 'var(--txm)', textTransform: 'uppercase' }}>Potential Loss</div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: '#dc2626', marginTop: 2 }}>
                          {formatINR(item.potential_waste_value, sym)}
                        </div>
                      </div>

                      <div>
                        <div style={{ fontSize: 11, color: 'var(--txm)', textTransform: 'uppercase' }}>Current Price</div>
                        <div style={{ fontSize: 15, fontWeight: 700, marginTop: 2 }}>
                          {formatINR(item.current_price, sym)}
                        </div>
                      </div>
                    </div>

                    {/* Bottom Action Row */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ fontSize: 12 }}>
                        {isDisc ? (
                          <span style={{ color: '#166534', fontWeight: 600 }}>
                            ✓ Markdown active: {item.applied_discount_pct}% discount applied (New price: {formatINR(item.current_price, sym)})
                          </span>
                        ) : (
                          <span style={{ color: 'var(--txm)' }}>
                            Model Recommendation:{' '}
                            <strong style={{ color: 'var(--tx)' }}>
                              Apply {item.recommended_discount}% discount
                            </strong>{' '}
                            (Suggested price: {formatINR(item.new_price, sym)})
                          </span>
                        )}
                      </div>

                      {/* Staff is read-only according to PRD */}
                      {!isStaff ? (
                        <div>
                          {isDisc ? (
                            <button
                              className="btn-outline btn-sm"
                              onClick={() => handleUndoDiscount(item)}
                              disabled={actioningId === item.batch_id}
                              style={{ gap: 6 }}
                            >
                              <Undo2 size={13} />
                              <span>Undo</span>
                            </button>
                          ) : (
                            <button
                              className="btn-primary btn-sm"
                              onClick={() => handleApplyDiscount(item)}
                              disabled={actioningId === item.batch_id}
                            >
                              <span>Apply {item.recommended_discount}% discount</span>
                            </button>
                          )}
                        </div>
                      ) : (
                        <span style={{ fontSize: 11, color: 'var(--txm)' }}>
                          View-only mode (Manager approval required)
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Recovery Breakdown Chart */}
        <div className="card" style={{ position: 'sticky', top: 20 }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--tx)', marginBottom: 12 }}>
            Alert Action Status
          </h3>
          <div style={{ height: 180, display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
            <Doughnut
              data={recoveryChartData}
              options={{
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } } },
              }}
            />
          </div>
          <div style={{ borderTop: '1px solid var(--brd)', paddingTop: 12, fontSize: 12, color: 'var(--txm)', lineHeight: 1.5 }}>
            <p>
              Applying dynamic markdowns directly enhances clearance velocity before complete shelf-life expiration.
            </p>
          </div>
        </div>
      </div>

      {/* SHAP Explanation Modal (F12) */}
      <Modal
        isOpen={explainModalOpen}
        onClose={() => setExplainModalOpen(false)}
        title={`Expiry Risk Explanation — ${explainingProduct}`}
        maxWidth={520}
      >
        {explainLoading || !explainData ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--txm)' }}>
            Calculating feature contributions with SHAP...
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div>
                <span style={{ fontSize: 12, color: 'var(--txm)' }}>Predicted Expiry Risk:</span>
                <span style={{ fontSize: 18, fontWeight: 700, marginLeft: 8, color: explainData.risk_score > 0.6 ? '#dc2626' : '#92400e' }}>
                  {(explainData.risk_score * 100).toFixed(1)}%
                </span>
              </div>
              <RiskPill score={explainData.risk_score} />
            </div>

            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--txm)', textTransform: 'uppercase', marginBottom: 10 }}>
              Input Feature Impacts (SHAP Attribution)
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
              {explainData.features.map((f, idx) => {
                const isPositive = f.direction === 'increases_risk';
                const barColor = isPositive ? '#ef4444' : '#22c55e';
                const magnitude = Math.min(100, Math.max(10, Math.abs(f.impact) * 250));

                return (
                  <div key={idx} style={{ fontSize: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{ fontWeight: 600, color: 'var(--tx)' }}>{f.display_name}</span>
                      <span style={{ color: isPositive ? '#991b1b' : '#166534', fontWeight: 600 }}>
                        {isPositive ? `+${f.impact}` : `${f.impact}`} ({f.direction === 'increases_risk' ? 'Raises Risk' : 'Lowers Risk'})
                      </span>
                    </div>
                    <div style={{ height: 6, backgroundColor: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${magnitude}%`,
                          backgroundColor: barColor,
                          borderRadius: 3,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Mandatory PRD Disclaimer */}
            <div
              style={{
                backgroundColor: '#f8fafc',
                border: '1px solid var(--brd)',
                borderRadius: 6,
                padding: '8px 12px',
                fontSize: 11,
                color: 'var(--txm)',
                fontStyle: 'italic',
              }}
            >
              Note: {explainData.disclaimer}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
              <button className="btn-outline btn-sm" onClick={() => setExplainModalOpen(false)}>
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
