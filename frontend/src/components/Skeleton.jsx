import React from 'react';

export function Skeleton({ width = '100%', height = 20, borderRadius = 6, style = {} }) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius,
        backgroundColor: '#e2e8f0',
        animation: 'pulse 1.5s ease-in-out infinite',
        ...style,
      }}
    />
  );
}

export function TableSkeleton({ rows = 5, cols = 6 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 12 }}>
      <Skeleton height={24} width="100%" />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} height={36} width="100%" />
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Skeleton height={14} width="40%" />
      <Skeleton height={28} width="60%" />
      <Skeleton height={12} width="80%" />
    </div>
  );
}
