import React, { useState, useEffect } from 'react';
import { apiRequest, formatINR, formatNumber } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { CardSkeleton, TableSkeleton } from '../components/Skeleton';
import {
  BarChart2,
  PieChart,
  TrendingDown,
  Download,
  Calendar,
  AlertTriangle,
  Lightbulb
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend);

export default function Analytics() {
  const { store } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState('pareto');
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const sym = store?.currency_symbol || '₹';

  useEffect(() => {
    async function loadAnalytics() {
      try {
        setLoading(true);
        if (activeTab === 'pareto') {
          const res = await apiRequest(`/analytics/pareto?days=${days}`);
          setData(res);
        } else if (activeTab === 'discount') {
          const res = await apiRequest(`/analytics/discount-impact?days=${days}`);
          setData(res);
        } else if (activeTab === 'waste') {
          const res = await apiRequest(`/analytics/waste-deep-dive?days=${days}`);
          setData(res);
        }
      } catch (err) {
        showToast(err.message || 'Failed to load analytics', 'error');
      } finally {
        setLoading(false);
      }
    }
    loadAnalytics();
  }, [activeTab, days, showToast]);

  const handleExportCSV = () => {
    if (!data) return;
    let csvContent = 'data:text/csv;charset=utf-8,';

    if (activeTab === 'pareto' && data.products) {
      csvContent += 'Product,Category,Units Sold,Revenue,Cumulative Pct,Class\n';
      data.products.forEach((p) => {
        csvContent += `"${p.name}","${p.category}",${p.units_sold},${p.revenue},${p.cumulative_pct}%,${p.classification}\n`;
      });
    } else if (activeTab === 'discount' && data.points) {
      csvContent += 'Category,Discount Pct,Sales Velocity (units/day)\n';
      data.points.forEach((pt) => {
        csvContent += `"${pt.category}",${pt.discount_pct}%,${pt.sales_velocity}\n`;
      });
    } else if (activeTab === 'waste' && data.categories) {
      csvContent += 'Category,Units Sold,Units Wasted,Waste Loss (INR),Waste Rate Pct\n';
      data.categories.forEach((c) => {
        csvContent += `"${c.category}",${c.sold_units},${c.wasted_units},${c.waste_loss},${c.waste_rate_pct}%\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `shelfwise_analytics_${activeTab}_${days}d.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    showToast('Analytics CSV exported', 'success');
  };

  // Pareto Chart (Cumulative sales curve with 80% line)
  const paretoChartData = {
    labels: data?.products?.map((p) => p.name.split(' ')[0]) || [],
    datasets: [
      {
        type: 'line',
        label: 'Cumulative %',
        data: data?.products?.map((p) => p.cumulative_pct) || [],
        borderColor: '#f59e0b',
        borderWidth: 2,
        yAxisID: 'y1',
        pointRadius: 2,
      },
      {
        type: 'bar',
        label: 'Revenue',
        data: data?.products?.map((p) => p.revenue) || [],
        backgroundColor: '#0f172a',
        yAxisID: 'y',
        borderRadius: 4,
      },
    ],
  };

  // Waste Chart
  const wasteChartData = {
    labels: data?.categories?.map((c) => c.category) || [],
    datasets: [
      {
        label: 'Waste Loss',
        data: data?.categories?.map((c) => c.waste_loss) || [],
        backgroundColor: '#ef4444',
        borderRadius: 4,
      },
    ],
  };

  return (
    <div>
      {/* Tab Navigation and Date Controls */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 16,
        }}
      >
        <div className="tab-list" style={{ marginBottom: 0 }}>
          <div
            className={`tab-item ${activeTab === 'pareto' ? 'active' : ''}`}
            onClick={() => setActiveTab('pareto')}
          >
            Pareto 80/20 Analysis
          </div>
          <div
            className={`tab-item ${activeTab === 'discount' ? 'active' : ''}`}
            onClick={() => setActiveTab('discount')}
          >
            Discount Velocity Impact
          </div>
          <div
            className={`tab-item ${activeTab === 'waste' ? 'active' : ''}`}
            onClick={() => setActiveTab('waste')}
          >
            Waste Deep Dive
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--txm)' }}>
            <Calendar size={13} />
            <span>Range:</span>
          </div>
          <select
            value={days}
            onChange={(e) => setDays(parseInt(e.target.value))}
            style={{ width: 110, padding: '4px 8px', fontSize: 12 }}
          >
            <option value={7}>7 Days</option>
            <option value={30}>30 Days</option>
            <option value={90}>90 Days</option>
          </select>
          <button className="btn-outline btn-sm" onClick={handleExportCSV}>
            <Download size={13} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {loading ? (
        <CardSkeleton />
      ) : activeTab === 'pareto' ? (
        <div>
          {/* Pareto Summary KPI */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 14,
              marginBottom: 16,
            }}
          >
            <div className="card">
              <div className="kpi-label">Class A Products (80% Revenue)</div>
              <div className="kpi-val" style={{ color: 'var(--acc-dk)' }}>
                {data?.class_a_count} of {data?.total_products} items
              </div>
              <div style={{ fontSize: 11, color: 'var(--txm)', marginTop: 4 }}>
                {data?.class_a_pct}% of catalog drives 80% of sales
              </div>
            </div>

            <div className="card">
              <div className="kpi-label">Analyzed Total Revenue</div>
              <div className="kpi-val">{formatINR(data?.total_revenue, sym)}</div>
              <div style={{ fontSize: 11, color: 'var(--txm)', marginTop: 4 }}>
                Past {days} days store revenue
              </div>
            </div>

            <div className="card">
              <div className="kpi-label">Inventory Focus Rule</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--tx)', marginTop: 4, lineHeight: 1.4 }}>
                Protect stock freshness on Class A items; apply early automated markdowns on Class C.
              </div>
            </div>
          </div>

          {/* Pareto Chart */}
          <div className="card" style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--tx)', marginBottom: 12 }}>
              Cumulative Sales Contribution Curve (80/20 Rule)
            </h3>
            <div style={{ height: 240 }}>
              <Line
                data={paretoChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    x: { grid: { display: false }, ticks: { font: { size: 10 } } },
                    y: {
                      type: 'linear',
                      position: 'left',
                      grid: { color: '#e2e8f0' },
                      ticks: { font: { size: 10 } },
                    },
                    y1: {
                      type: 'linear',
                      position: 'right',
                      min: 0,
                      max: 100,
                      grid: { display: false },
                      ticks: { callback: (v) => `${v}%`, font: { size: 10 } },
                    },
                  },
                }}
              />
            </div>
          </div>

          {/* Top Products Table */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th style={{ textAlign: 'right' }}>Units Sold</th>
                  <th style={{ textAlign: 'right' }}>Revenue ({sym})</th>
                  <th style={{ textAlign: 'right' }}>Cumulative %</th>
                  <th style={{ textAlign: 'center' }}>ABC Class</th>
                </tr>
              </thead>
              <tbody>
                {data?.products?.map((p) => (
                  <tr key={p.product_id}>
                    <td style={{ fontWeight: 600 }}>{p.name}</td>
                    <td><span className="pill pill-info">{p.category}</span></td>
                    <td style={{ textAlign: 'right' }}>{formatNumber(p.units_sold)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatINR(p.revenue, sym)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{p.cumulative_pct}%</td>
                    <td style={{ textAlign: 'center' }}>
                      <span
                        className={
                          p.classification === 'A'
                            ? 'pill pill-gold'
                            : p.classification === 'B'
                            ? 'pill pill-silver'
                            : 'pill pill-bronze'
                        }
                      >
                        Class {p.classification}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeTab === 'discount' ? (
        <div>
          <div className="card" style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--tx)', marginBottom: 8 }}>
              Discount % vs Clearance Sales Velocity
            </h3>
            <p style={{ fontSize: 12, color: 'var(--txm)', marginBottom: 16 }}>
              {data?.elasticity_summary}
            </p>
            <table>
              <thead>
                <tr>
                  <th>Category</th>
                  <th style={{ textAlign: 'center' }}>Markdown Applied</th>
                  <th style={{ textAlign: 'right' }}>Clearance Velocity</th>
                </tr>
              </thead>
              <tbody>
                {data?.points?.map((pt, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{pt.category}</td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="pill pill-med">{pt.discount_pct}%</span>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: '#16a34a' }}>
                      {pt.sales_velocity} units/day
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div>
          {/* Waste Deep Dive */}
          <div className="card" style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--tx)', marginBottom: 12 }}>
              Waste Loss by Product Category (Total: {formatINR(data?.total_waste_loss, sym)})
            </h3>
            <div style={{ height: 220, marginBottom: 16 }}>
              <Bar data={wasteChartData} options={{ responsive: true, maintainAspectRatio: false }} />
            </div>

            <table>
              <thead>
                <tr>
                  <th>Category</th>
                  <th style={{ textAlign: 'right' }}>Sold Units</th>
                  <th style={{ textAlign: 'right' }}>Wasted Units</th>
                  <th style={{ textAlign: 'right' }}>Financial Loss</th>
                  <th style={{ textAlign: 'center' }}>Waste Rate</th>
                </tr>
              </thead>
              <tbody>
                {data?.categories?.map((c, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{c.category}</td>
                    <td style={{ textAlign: 'right' }}>{formatNumber(c.sold_units)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: '#dc2626' }}>{formatNumber(c.wasted_units)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: '#dc2626' }}>{formatINR(c.waste_loss, sym)}</td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={c.waste_rate_pct > 8 ? 'pill pill-high' : 'pill pill-med'}>
                        {c.waste_rate_pct}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Actionable Suggestions */}
          <div className="card" style={{ borderLeft: '4px solid var(--acc)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: 13, color: 'var(--tx)', marginBottom: 8 }}>
              <Lightbulb size={16} color="var(--acc)" />
              <span>AI Waste-Reduction Action Directives</span>
            </div>
            <ul style={{ paddingLeft: 20, fontSize: 13, color: 'var(--txm)', lineHeight: 1.6 }}>
              {data?.actionable_suggestions?.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
