import React from 'react';

export default function ExpiryBar({ daysLeft }) {
  const d = Math.max(0, Number(daysLeft));

  // Design brief rule: Red at 2 days or fewer, amber at 5 or fewer, green above
  let color = '#22c55e'; // green
  let widthPct = Math.min(100, Math.max(10, (d / 14) * 100));

  if (d <= 2) {
    color = '#ef4444'; // red
    widthPct = Math.max(12, (d / 7) * 40);
  } else if (d <= 5) {
    color = '#f59e0b'; // amber
    widthPct = Math.max(25, (d / 10) * 60);
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 90 }}>
      <div className="progress-track" style={{ flex: 1 }}>
        <div
          className="progress-fill"
          style={{
            width: `${widthPct}%`,
            backgroundColor: color,
          }}
        />
      </div>
      <span
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: d <= 2 ? '#991b1b' : d <= 5 ? '#92400e' : '#166534',
          minWidth: 24,
        }}
      >
        {d}d
      </span>
    </div>
  );
}
