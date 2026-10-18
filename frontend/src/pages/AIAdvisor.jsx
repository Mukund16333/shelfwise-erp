import React, { useState, useEffect } from 'react';
import { apiRequest, formatINR, formatNumber } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import RiskPill from '../components/RiskPill';
import {
  Sparkles,
  HelpCircle,
  RotateCcw,
  TrendingUp,
  Percent,
  Coins,
  Cpu,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export default function AIAdvisor({ initialParams = {} }) {
  const { store } = useAuth();
  const { showToast } = useToast();

  const sym = store?.currency_symbol || '₹';

  // 9 Validated Fields with sensible defaults
  const [form, setForm] = useState({
    days_left: initialParams.days_left ? parseInt(initialParams.days_left) : 3,
    stock: initialParams.stock ? parseInt(initialParams.stock) : 48,
    demand_rate: initialParams.demand_rate ? parseFloat(initialParams.demand_rate) : 12.0,
    price: initialParams.price ? parseFloat(initialParams.price) : 68.0,
    cost: initialParams.cost ? parseFloat(initialParams.cost) : 48.0,
    price_change_count: 0,
    lag1: 14.0,
    lag2: 12.0,
    category: initialParams.category || 'Dairy',
    shelf_life: 14,
  });

  const [recommendation, setRecommendation] = useState(null);
  const [loading, setLoading] = useState(false);

  // SHAP Explanation state
  const [explainData, setExplainData] = useState(null);
  const [explaining, setExplaining] = useState(false);

  const handleRunPipeline = async (e) => {
    e?.preventDefault();
    setLoading(true);
    setExplainData(null);
    try {
      const res = await apiRequest('/ai/recommend', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      setRecommendation(res);
      showToast('All 3 AI models evaluated successfully', 'success');
    } catch (err) {
      showToast(err.message || 'Pipeline evaluation failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleExplainRisk = async () => {
    setExplaining(true);
    try {
      const res = await apiRequest('/ai/explain', {
        method: 'POST',
        body: JSON.stringify({
          days_left: form.days_left,
          stock: form.stock,
          demand_rate: form.demand_rate,
          price: form.price,
          cost: form.cost,
        }),
      });
      setExplainData(res);
    } catch (err) {
      showToast(err.message || 'Failed to generate explanation', 'error');
    } finally {
      setExplaining(false);
    }
  };

  const handleReset = () => {
    setForm({
      days_left: 3,
      stock: 48,
      demand_rate: 12.0,
      price: 68.0,
      cost: 48.0,
      price_change_count: 0,
      lag1: 14.0,
      lag2: 12.0,
      category: 'Dairy',
      shelf_life: 14,
    });
    setRecommendation(null);
    setExplainData(null);
  };

  const categories = [
    'Dairy',
    'Bakery',
    'Fresh Produce',
    'Beverages',
    'Canned Goods',
    'Snacks',
    'Frozen',
  ];

  return (
    <div>
      {/* 3 Model Explainer Cards at Top */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 14,
          marginBottom: 20,
        }}
      >
        <div className="card" style={{ borderTop: '3px solid #ef4444' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ width: 22, height: 22, borderRadius: '50%', backgroundColor: 'var(--sb)', color: 'white', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>
              1
            </span>
            <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--tx)' }}>Expiry Waste Risk</h4>
          </div>
          <p style={{ fontSize: 12, color: 'var(--txm)', lineHeight: 1.4 }}>
            XGBoost binary classifier predicts probability (0–1) of unsold batch expiration.
          </p>
        </div>

        <div className="card" style={{ borderTop: '3px solid var(--acc)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ width: 22, height: 22, borderRadius: '50%', backgroundColor: 'var(--sb)', color: 'white', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>
              2
            </span>
            <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--tx)' }}>Demand Forecasting</h4>
          </div>
          <p style={{ fontSize: 12, color: 'var(--txm)', lineHeight: 1.4 }}>
            Ridge regression predicts clearance sales velocity using lag sales and price.
          </p>
        </div>

        <div className="card" style={{ borderTop: '3px solid #22c55e' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ width: 22, height: 22, borderRadius: '50%', backgroundColor: 'var(--sb)', color: 'white', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>
              3
            </span>
            <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--tx)' }}>Discount Optimization</h4>
          </div>
          <p style={{ fontSize: 12, color: 'var(--txm)', lineHeight: 1.4 }}>
            PyTorch Deep Q-Network selects optimal markdown percentage (0%–50%) maximizing net margin.
          </p>
        </div>
      </div>

      {/* Main Form & Results Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.3fr', gap: 20, alignItems: 'start' }}>
        {/* Form Panel: Dark Slate Card styling per Design Brief */}
        <div
          style={{
            backgroundColor: 'var(--sb)',
            color: '#f8fafc',
            borderRadius: 10,
            padding: '20px 24px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#f8fafc' }}>
                Batch What-If Parameters
              </h3>
              <p style={{ fontSize: 11, color: 'var(--sbt)', marginTop: 2 }}>
                Enter product properties to evaluate the live AI decision pipeline
              </p>
            </div>
            <button
              className="btn-outline btn-xs"
              onClick={handleReset}
              style={{ backgroundColor: 'transparent', color: 'var(--sbt)', borderColor: 'var(--sb3)' }}
            >
              <RotateCcw size={12} />
              <span>Reset</span>
            </button>
          </div>

          <form onSubmit={handleRunPipeline}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <div>
                <label style={{ color: 'var(--sbt)' }}>Category</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  style={{ backgroundColor: 'var(--sb2)', color: 'white', borderColor: 'var(--sb3)' }}
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ color: 'var(--sbt)' }}>Days to Expiry (0–365)</label>
                <input
                  type="number"
                  min="0"
                  max="365"
                  required
                  value={form.days_left}
                  onChange={(e) => setForm({ ...form, days_left: parseInt(e.target.value) || 0 })}
                  style={{ backgroundColor: 'var(--sb2)', color: 'white', borderColor: 'var(--sb3)' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 14 }}>
              <div>
                <label style={{ color: 'var(--sbt)' }}>Current Stock</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={form.stock}
                  onChange={(e) => setForm({ ...form, stock: parseInt(e.target.value) || 0 })}
                  style={{ backgroundColor: 'var(--sb2)', color: 'white', borderColor: 'var(--sb3)' }}
                />
              </div>

              <div>
                <label style={{ color: 'var(--sbt)' }}>Selling Price ({sym})</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.1"
                  required
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })}
                  style={{ backgroundColor: 'var(--sb2)', color: 'white', borderColor: 'var(--sb3)' }}
                />
              </div>

              <div>
                <label style={{ color: 'var(--sbt)' }}>Unit Cost ({sym})</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.1"
                  required
                  value={form.cost}
                  onChange={(e) => setForm({ ...form, cost: parseFloat(e.target.value) || 0 })}
                  style={{ backgroundColor: 'var(--sb2)', color: 'white', borderColor: 'var(--sb3)' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
              <div>
                <label style={{ color: 'var(--sbt)' }}>Demand Rate</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={form.demand_rate}
                  onChange={(e) => setForm({ ...form, demand_rate: parseFloat(e.target.value) || 0 })}
                  style={{ backgroundColor: 'var(--sb2)', color: 'white', borderColor: 'var(--sb3)' }}
                />
              </div>

              <div>
                <label style={{ color: 'var(--sbt)' }}>Sales Yesterday (T-1)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={form.lag1}
                  onChange={(e) => setForm({ ...form, lag1: parseFloat(e.target.value) || 0 })}
                  style={{ backgroundColor: 'var(--sb2)', color: 'white', borderColor: 'var(--sb3)' }}
                />
              </div>

              <div>
                <label style={{ color: 'var(--sbt)' }}>Sales T-2</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={form.lag2}
                  onChange={(e) => setForm({ ...form, lag2: parseFloat(e.target.value) || 0 })}
                  style={{ backgroundColor: 'var(--sb2)', color: 'white', borderColor: 'var(--sb3)' }}
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn-primary"
              style={{ width: '100%', padding: '10px 0', fontSize: 14 }}
              disabled={loading}
            >
              <Sparkles size={16} />
              <span>{loading ? 'Evaluating AI Pipeline...' : 'Run all 3 models'}</span>
            </button>
          </form>
        </div>

        {/* Results Panel */}
        <div>
          {!recommendation ? (
            <div className="card" style={{ padding: 48, textAlign: 'center', color: 'var(--txm)' }}>
              <Cpu size={36} color="var(--acc)" style={{ margin: '0 auto 12px' }} />
              <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--tx)' }}>
                Ready to Evaluate
              </h3>
              <p style={{ fontSize: 13, marginTop: 4 }}>
                Click "Run all 3 models" to execute the XGBoost, Ridge, and DQN models.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Main Recommendations Card */}
              <div className="card" style={{ borderLeft: '4px solid var(--acc)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div>
                    <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--tx)' }}>
                      AI Pipeline Recommendations
                    </h3>
                    <div style={{ fontSize: 11, color: 'var(--txm)', marginTop: 2 }}>
                      Evaluated on live backend models
                    </div>
                  </div>
                  <RiskPill label={recommendation.risk_label} score={recommendation.expiry_risk} />
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 12,
                    padding: '12px 0',
                    borderTop: '1px solid var(--brd)',
                    borderBottom: '1px solid var(--brd)',
                    marginBottom: 14,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--txm)', textTransform: 'uppercase' }}>Recommended Discount</div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--acc-dk)', marginTop: 2 }}>
                      {recommendation.recommended_discount}%
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: 11, color: 'var(--txm)', textTransform: 'uppercase' }}>Suggested Price</div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: '#16a34a', marginTop: 2 }}>
                      {formatINR(recommendation.suggested_price, sym)}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: 11, color: 'var(--txm)', textTransform: 'uppercase' }}>Forecast Demand</div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--tx)', marginTop: 2 }}>
                      {recommendation.demand_forecast} <span style={{ fontSize: 12, fontWeight: 500 }}>units/day</span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 14 }}>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--txm)', textTransform: 'uppercase' }}>Days of Cover</div>
                    <div style={{ fontSize: 16, fontWeight: 700, marginTop: 2 }}>
                      {recommendation.days_cover} days
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: 11, color: 'var(--txm)', textTransform: 'uppercase' }}>Expected Revenue</div>
                    <div style={{ fontSize: 16, fontWeight: 700, marginTop: 2 }}>
                      {formatINR(recommendation.expected_revenue, sym)}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: 11, color: 'var(--txm)', textTransform: 'uppercase' }}>Expected Profit</div>
                    <div
                      style={{
                        fontSize: 16,
                        fontWeight: 700,
                        marginTop: 2,
                        color: recommendation.expected_profit >= 0 ? '#16a34a' : '#dc2626',
                      }}
                    >
                      {formatINR(recommendation.expected_profit, sym)}
                    </div>
                  </div>
                </div>

                {/* Honest AI Model Source Attribution */}
                <div
                  style={{
                    backgroundColor: '#f8fafc',
                    borderRadius: 6,
                    padding: '8px 12px',
                    fontSize: 11,
                    color: 'var(--txm)',
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 12,
                    border: '1px solid var(--brd)',
                  }}
                >
                  <span><strong>Expiry:</strong> {recommendation.models_used.expiry}</span>
                  <span><strong>Demand:</strong> {recommendation.models_used.demand}</span>
                  <span><strong>Policy:</strong> {recommendation.models_used.discount}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
                  <button
                    className="btn-outline btn-sm"
                    onClick={handleExplainRisk}
                    disabled={explaining}
                    style={{ gap: 6 }}
                  >
                    <HelpCircle size={14} />
                    <span>{explaining ? 'Explaining...' : 'Explain Risk with SHAP (F12)'}</span>
                  </button>
                </div>
              </div>

              {/* DQN Action Q-Values Card */}
              {recommendation.q_values && (
                <div className="card">
                  <h4 style={{ fontSize: 12, fontWeight: 600, color: 'var(--txm)', textTransform: 'uppercase', marginBottom: 10 }}>
                    Deep Q-Network Action-Value Distribution (Q-Values)
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 }}>
                    {Object.entries(recommendation.q_values).map(([action, qVal]) => {
                      const isChosen = action === `${recommendation.recommended_discount}%`;

                      return (
                        <div
                          key={action}
                          style={{
                            padding: '8px 6px',
                            textAlign: 'center',
                            borderRadius: 6,
                            backgroundColor: isChosen ? 'var(--acc-lt)' : '#f8fafc',
                            border: `1px solid ${isChosen ? 'var(--acc)' : 'var(--brd)'}`,
                          }}
                        >
                          <div style={{ fontSize: 11, fontWeight: 600, color: isChosen ? 'var(--acc-dk)' : 'var(--txm)' }}>
                            {action}
                          </div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: isChosen ? 'var(--acc-dk)' : 'var(--tx)', marginTop: 2 }}>
                            {qVal}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* SHAP Explanation Result */}
              {explainData && (
                <div className="card" style={{ borderLeft: '4px solid #3b82f6' }}>
                  <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--tx)', marginBottom: 8 }}>
                    SHAP Feature Attribution for Expiry Risk
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                    {explainData.features.map((f, i) => {
                      const isUp = f.direction === 'increases_risk';

                      return (
                        <div key={i} style={{ fontSize: 12 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                            <span style={{ fontWeight: 600 }}>{f.display_name}</span>
                            <span style={{ color: isUp ? '#991b1b' : '#166534', fontWeight: 600 }}>
                              {isUp ? `+${f.impact} (Increases Risk)` : `${f.impact} (Decreases Risk)`}
                            </span>
                          </div>
                          <div style={{ height: 5, backgroundColor: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
                            <div
                              style={{
                                height: '100%',
                                width: `${Math.min(100, Math.max(15, Math.abs(f.impact) * 220))}%`,
                                backgroundColor: isUp ? '#ef4444' : '#22c55e',
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--txm)', fontStyle: 'italic' }}>
                    {explainData.disclaimer}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
