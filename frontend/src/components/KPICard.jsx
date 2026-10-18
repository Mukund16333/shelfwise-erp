import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function KPICard({ label, value, subtext, deltaType = 'neutral' }) {
  return (
    <div className="kpi-card">
      <div className="kpi-label">{label}</div>
      <div className="kpi-val">{value}</div>
      {subtext && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 11,
            fontWeight: 500,
            marginTop: 6,
            color:
              deltaType === 'up'
                ? '#16a34a'
                : deltaType === 'down'
                ? '#dc2626'
                : 'var(--txm)',
          }}
        >
          {deltaType === 'up' && <TrendingUp size={12} />}
          {deltaType === 'down' && <TrendingDown size={12} />}
          {deltaType === 'neutral' && <Minus size={12} />}
          <span>{subtext}</span>
        </div>
      )}
    </div>
  );
}
