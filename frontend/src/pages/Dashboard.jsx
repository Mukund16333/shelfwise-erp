import React, { useEffect, useState } from 'react';
import { apiRequest, formatINR, formatNumber } from '../api/client';
import { useAuth } from '../context/AuthContext';
import KPICard from '../components/KPICard';
import { CardSkeleton } from '../components/Skeleton';
import {
  Layers,
  AlertTriangle,
  ShieldAlert,
  Briefcase,
  ArrowRight,
  TrendingUp,
  Percent,
  Coins,
  DollarSign
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function Dashboard({ onNavigate }) {
  const { store, badges, refreshBadges } = useAuth();
  const [kpis, setKpis] = useState(null);
  const [salesTrend, setSalesTrend] = useState([]);
  const [wasteData, setWasteData] = useState([]);
  const [topSellers, setTopSellers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        setLoading(true);
        const [kpiRes, trendRes, wasteRes, sellersRes] = await Promise.all([
          apiRequest('/dashboard/kpis'),
          apiRequest('/dashboard/sales-trend'),
          apiRequest('/dashboard/waste-by-category'),
          apiRequest('/dashboard/top-sellers'),
        ]);
        setKpis(kpiRes);
        setSalesTrend(trendRes);
        setWasteData(wasteRes);
        setTopSellers(sellersRes);
        await refreshBadges();
      } catch (e) {
        console.error('Failed to load dashboard:', e);
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, [refreshBadges]);

  if (loading || !kpis) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    );
  }

  const sym = store?.currency_symbol || '₹';

  // Chart 1: 15-day Sales Trend (Chart.js rules from Design Brief: solid slate line, no gradients, gridlines #e2e8f0)
  const lineChartData = {
    labels: salesTrend.map((t) => t.date),
    datasets: [
      {
        label: 'Units Sold',
        data: salesTrend.map((t) => t.units),
        borderColor: '#0f172a',
        backgroundColor: 'rgba(15, 23, 42, 0.05)',
        tension: 0.2,
        fill: true,
        pointBackgroundColor: '#0f172a',
        pointRadius: 3,
        pointHoverRadius: 5,
      },
    ],
  };

  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => `Units Sold: ${ctx.parsed.y} units`,
        },
      },
    },
    scales: {
      x: {
        grid: { color: '#e2e8f0' },
        ticks: { color: '#64748b', font: { size: 11, family: 'Segoe UI' } },
      },
      y: {
        grid: { color: '#e2e8f0' },
        ticks: { color: '#64748b', font: { size: 11, family: 'Segoe UI' } },
      },
    },
  };

  // Chart 2: Waste by Category
  const barChartData = {
    labels: wasteData.map((w) => w.category),
    datasets: [
      {
        label: 'Waste Value',
        data: wasteData.map((w) => w.waste_value),
        backgroundColor: '#ef4444',
        borderRadius: 4,
      },
    ],
  };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => `Waste: ${formatINR(ctx.parsed.y, sym)}`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#64748b', font: { size: 10, family: 'Segoe UI' } },
      },
      y: {
        grid: { color: '#e2e8f0' },
        ticks: { color: '#64748b', font: { size: 11, family: 'Segoe UI' } },
      },
    },
  };

  return (
    <div>
      {/* 7 KPI Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: 12,
          marginBottom: 20,
        }}
      >
        <KPICard
          label="Units Sold (MTD)"
          value={`${formatNumber(kpis.total_sold)} units`}
          subtext="+8.4% vs last mo"
          deltaType="up"
        />
        <KPICard
          label="Waste Rate"
          value={`${kpis.waste_pct}%`}
          subtext="-1.2% reduction"
          deltaType="up"
        />
        <KPICard
          label="Average Price"
          value={formatINR(kpis.avg_price, sym)}
          subtext="per sold unit"
          deltaType="neutral"
        />
        <KPICard
          label="Average Discount"
          value={`${kpis.avg_discount}%`}
          subtext="on markdowns"
          deltaType="neutral"
        />
        <KPICard
          label="Stock Turnover"
          value={`${kpis.turnover}x`}
          subtext="annualized"
          deltaType="up"
        />
        <KPICard
          label="Revenue (MTD)"
          value={formatINR(kpis.revenue_mtd, sym)}
          subtext="+14.2% pace"
          deltaType="up"
        />
        <KPICard
          label="Profit Margin"
          value={`${kpis.profitMargin || kpis.profit_margin}%`}
          subtext="net markup"
          deltaType="neutral"
        />
      </div>

      {/* Quick Action Shortcuts Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 12,
          marginBottom: 20,
        }}
      >
        <div
          className="card"
          style={{
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderLeft: '4px solid #ef4444',
          }}
          onClick={() => onNavigate('/alerts')}
        >
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--txm)', textTransform: 'uppercase' }}>
              Expiry Alerts
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--tx)', marginTop: 2 }}>
              {badges.unactioned_alerts} Unactioned
            </div>
          </div>
          <button className="btn-outline btn-xs" style={{ gap: 4 }}>
            <span>View Alerts</span>
            <ArrowRight size={12} />
          </button>
        </div>

        <div
          className="card"
          style={{
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderLeft: '4px solid var(--acc)',
          }}
          onClick={() => onNavigate('/inventory')}
        >
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--txm)', textTransform: 'uppercase' }}>
              Inventory Batches
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--tx)', marginTop: 2 }}>
              {badges.high_risk_inventory} High Risk
            </div>
          </div>
          <button className="btn-outline btn-xs" style={{ gap: 4 }}>
            <span>Check Stock</span>
            <ArrowRight size={12} />
          </button>
        </div>

        <div
          className="card"
          style={{
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderLeft: '4px solid #3b82f6',
          }}
          onClick={() => onNavigate('/fraud')}
        >
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--txm)', textTransform: 'uppercase' }}>
              Fraud Watch
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--tx)', marginTop: 2 }}>
              {badges.pending_fraud_flags} For Review
            </div>
          </div>
          <button className="btn-outline btn-xs" style={{ gap: 4 }}>
            <span>Investigate</span>
            <ArrowRight size={12} />
          </button>
        </div>

        <div
          className="card"
          style={{
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderLeft: '4px solid #8b5cf6',
          }}
          onClick={() => onNavigate('/b2b')}
        >
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--txm)', textTransform: 'uppercase' }}>
              B2B Wholesale
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--tx)', marginTop: 2 }}>
              Quotes & Hub
            </div>
          </div>
          <button className="btn-outline btn-xs" style={{ gap: 4 }}>
            <span>Open Hub</span>
            <ArrowRight size={12} />
          </button>
        </div>
      </div>

      {/* Charts Row: 2fr 1fr */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr',
          gap: 16,
          marginBottom: 20,
        }}
      >
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--tx)' }}>
              15-Day Sales Trend (Units Sold)
            </h3>
            <span style={{ fontSize: 11, color: 'var(--txm)' }}>Daily store sales</span>
          </div>
          <div style={{ height: 230 }}>
            <Line data={lineChartData} options={lineChartOptions} />
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--tx)' }}>
              Waste Loss by Category
            </h3>
            <span style={{ fontSize: 11, color: 'var(--txm)' }}>{sym} at risk</span>
          </div>
          <div style={{ height: 230 }}>
            <Bar data={barChartData} options={barChartOptions} />
          </div>
        </div>
      </div>

      {/* Top Sellers Table */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--tx)' }}>
            Top Selling Products
          </h3>
          <span style={{ fontSize: 11, color: 'var(--txm)' }}>Ranked by monthly volume</span>
        </div>
        <table>
          <thead>
            <tr>
              <th style={{ width: 50 }}>Rank</th>
              <th>Product Name</th>
              <th>Category</th>
              <th style={{ textAlign: 'right' }}>Base Price</th>
              <th style={{ textAlign: 'right' }}>Units Sold</th>
              <th style={{ textAlign: 'right' }}>Total Revenue</th>
              <th style={{ textAlign: 'center' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {topSellers.map((item, idx) => (
              <tr
                key={item.product_id}
                style={{ cursor: 'pointer' }}
                onClick={() => onNavigate(`/inventory?search=${encodeURIComponent(item.name)}`)}
              >
                <td style={{ fontWeight: 600, color: 'var(--txm)' }}>#{idx + 1}</td>
                <td style={{ fontWeight: 600, color: 'var(--tx)' }}>{item.name}</td>
                <td>
                  <span className="pill pill-info">{item.category}</span>
                </td>
                <td style={{ textAlign: 'right' }}>{formatINR(item.base_price, sym)}</td>
                <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatNumber(item.units_sold)} units</td>
                <td style={{ textAlign: 'right', fontWeight: 600, color: '#16a34a' }}>
                  {formatINR(item.revenue, sym)}
                </td>
                <td style={{ textAlign: 'center' }}>
                  <button
                    className="btn-outline btn-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      onNavigate(`/inventory?search=${encodeURIComponent(item.name)}`);
                    }}
                  >
                    View in Inventory
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
