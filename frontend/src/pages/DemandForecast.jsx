import React, { useState, useEffect } from 'react';
import { apiRequest, formatINR, formatNumber } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { TableSkeleton, CardSkeleton } from '../components/Skeleton';
import {
  TrendingUp,
  ShoppingCart,
  Copy,
  Upload,
  AlertTriangle,
  Package,
  Calendar
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
  Legend
);

export default function DemandForecast({ onNavigate }) {
  const { store } = useAuth();
  const { showToast } = useToast();

  const [horizon, setHorizon] = useState(14);
  const [category, setCategory] = useState('All');
  const [forecastData, setForecastData] = useState(null);
  const [reorders, setReorders] = useState([]);
  const [loading, setLoading] = useState(true);

  const sym = store?.currency_symbol || '₹';

  useEffect(() => {
    async function loadForecast() {
      try {
        setLoading(true);
        const [fRes, rRes] = await Promise.all([
          apiRequest(`/demand/forecast?horizon=${horizon}&category=${category}`),
          apiRequest(`/demand/reorder?category=${category}`),
        ]);
        setForecastData(fRes);
        setReorders(rRes);
      } catch (err) {
        showToast(err.message || 'Failed to load forecast', 'error');
      } finally {
        setLoading(false);
      }
    }
    loadForecast();
  }, [horizon, category, showToast]);

  const handleCopyQuantity = (qty, name) => {
    navigator.clipboard.writeText(qty.toString());
    showToast(`Copied ${qty} units for ${name} to clipboard`, 'success');
  };

  const categories = [
    'All',
    'Dairy',
    'Bakery',
    'Fresh Produce',
    'Beverages',
    'Canned Goods',
    'Snacks',
    'Frozen',
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
          <CardSkeleton />
          <CardSkeleton />
        </div>
        <TableSkeleton rows={6} />
      </div>
    );
  }

  // PRD edge case: Under 7 days of sales history
  if (forecastData && !forecastData.has_enough_history) {
    return (
      <div className="card" style={{ padding: 48, textAlign: 'center' }}>
        <AlertTriangle size={36} color="var(--acc)" style={{ margin: '0 auto 12px' }} />
        <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--tx)' }}>
          Not Enough Sales History to Forecast
        </h3>
        <p style={{ fontSize: 13, color: 'var(--txm)', marginTop: 4, maxWidth: 440, margin: '8px auto 16px' }}>
          At least 7 consecutive days of sales data are required to generate Ridge regression forecasts.
        </p>
        <button className="btn-primary btn-sm" onClick={() => onNavigate('/inventory')}>
          <Upload size={14} />
          <span>Import Sales CSV via Inventory</span>
        </button>
      </div>
    );
  }

  // Chart 1: Actual vs Forecast Line Chart (Chart rules from Design Brief: Actual = solid slate, Forecast = dashed amber)
  const lineLabels = forecastData?.series?.map((s) => s.date) || [];
  const actualValues = forecastData?.series?.map((s) => s.actual) || [];
  const forecastValues = forecastData?.series?.map((s) => s.forecast) || [];

  const lineData = {
    labels: lineLabels,
    datasets: [
      {
        label: 'Actual Sales',
        data: actualValues,
        borderColor: '#0f172a', // Solid slate line
        borderWidth: 2,
        tension: 0.2,
        pointBackgroundColor: '#0f172a',
        pointRadius: 3,
      },
      {
        label: 'Forecast Sales',
        data: forecastValues,
        borderColor: '#f59e0b', // Dashed amber line
        borderWidth: 2,
        borderDash: [5, 5],
        tension: 0.2,
        pointBackgroundColor: '#f59e0b',
        pointRadius: 3,
      },
    ],
  };

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top', labels: { boxWidth: 12, font: { size: 11, family: 'Segoe UI' } } },
    },
    scales: {
      x: { grid: { color: '#e2e8f0' }, ticks: { color: '#64748b', font: { size: 11 } } },
      y: { grid: { color: '#e2e8f0' }, ticks: { color: '#64748b', font: { size: 11 } } },
    },
  };

  // Chart 2: Top Products by Forecast Volume Bar Chart
  const barData = {
    labels: forecastData?.top_products?.map((p) => p.name) || [],
    datasets: [
      {
        label: 'Forecast Units',
        data: forecastData?.top_products?.map((p) => p.forecast_units) || [],
        backgroundColor: '#0f172a',
        borderRadius: 4,
      },
    ],
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#64748b', font: { size: 10 } } },
      y: { grid: { color: '#e2e8f0' }, ticks: { color: '#64748b', font: { size: 11 } } },
    },
  };

  return (
    <div>
      {/* Filters Bar */}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 500 }}>
            <Calendar size={14} color="var(--txm)" />
            <span>Horizon:</span>
          </div>
          <div className="tab-list" style={{ marginBottom: 0 }}>
            {[7, 14, 30].map((h) => (
              <div
                key={h}
                className={`tab-item ${horizon === h ? 'active' : ''}`}
                onClick={() => setHorizon(h)}
                style={{ padding: '4px 12px', fontSize: 12 }}
              >
                {h} Days
              </div>
            ))}
          </div>
        </div>

        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          style={{ width: 170 }}
        >
          {categories.map((c) => (
            <option key={c} value={c}>{c === 'All' ? 'All Categories' : c}</option>
          ))}
        </select>
      </div>

      {/* Charts Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1.2fr',
          gap: 16,
          marginBottom: 20,
        }}
      >
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--tx)' }}>
              Actual vs Forecast Daily Sales (Ridge Model)
            </h3>
            <span style={{ fontSize: 11, color: 'var(--txm)' }}>Solid: actual, Dashed: forecast</span>
          </div>
          <div style={{ height: 230 }}>
            <Line data={lineData} options={lineOptions} />
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--tx)' }}>
              Top Products by Forecast Volume
            </h3>
            <span style={{ fontSize: 11, color: 'var(--txm)' }}>Next {horizon} days</span>
          </div>
          <div style={{ height: 230 }}>
            <Bar data={barData} options={barOptions} />
          </div>
        </div>
      </div>

      {/* Reorder Recommendations Table */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div>
            <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--tx)' }}>
              AI Reorder Recommendations
            </h3>
            <p style={{ fontSize: 11, color: 'var(--txm)', marginTop: 2 }}>
              Comparing projected clearance demand against stock to prevent stockouts
            </p>
          </div>
          <span className="pill pill-info">{reorders.length} items flagged</span>
        </div>

        <table>
          <thead>
            <tr>
              <th>Product Name</th>
              <th>Category</th>
              <th style={{ textAlign: 'right' }}>Current Stock</th>
              <th style={{ textAlign: 'right' }}>Daily Run Rate</th>
              <th style={{ textAlign: 'center' }}>Days of Cover</th>
              <th style={{ textAlign: 'right' }}>Suggested Order</th>
              <th>Linked Supplier</th>
              <th style={{ textAlign: 'center' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {reorders.map((item) => (
              <tr key={item.product_id}>
                <td style={{ fontWeight: 600, color: 'var(--tx)' }}>{item.name}</td>
                <td>
                  <span className="pill pill-info">{item.category}</span>
                </td>
                <td style={{ textAlign: 'right', fontWeight: 600 }}>
                  {formatNumber(item.current_stock)} units
                </td>
                <td style={{ textAlign: 'right' }}>
                  {item.forecast_demand_daily.toFixed(1)} u/d
                </td>
                <td style={{ textAlign: 'center' }}>
                  <span
                    className={
                      item.days_of_cover < 3
                        ? 'pill pill-high'
                        : item.days_of_cover < 7
                        ? 'pill pill-med'
                        : 'pill pill-low'
                    }
                  >
                    {item.days_of_cover}d
                  </span>
                </td>
                <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--acc-dk)' }}>
                  +{formatNumber(item.suggested_quantity)} units
                </td>
                <td style={{ color: 'var(--txm)', fontSize: 12 }}>
                  {item.supplier_name || 'Direct Wholesale'}
                </td>
                <td style={{ textAlign: 'center' }}>
                  <button
                    className="btn-outline btn-xs"
                    onClick={() => handleCopyQuantity(item.suggested_quantity, item.name)}
                    style={{ gap: 4 }}
                    title="Copy suggested quantity"
                  >
                    <Copy size={11} />
                    <span>Copy Qty</span>
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
