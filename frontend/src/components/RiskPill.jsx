import React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function RiskPill({ risk, label, score }) {
  // Determine risk level based on score or provided label
  let lvl = label ? label.toLowerCase() : 'low';
  if (score !== undefined) {
    if (score > 0.6) lvl = 'high';
    else if (score >= 0.3) lvl = 'medium';
    else lvl = 'low';
  }

  if (lvl === 'high') {
    return (
      <span className="pill pill-high" title={`Risk Score: ${score !== undefined ? (score * 100).toFixed(0) + '%' : 'High'}`}>
        <AlertCircle size={12} />
        <span>High Risk</span>
      </span>
    );
  }

  if (lvl === 'medium' || lvl === 'med') {
    return (
      <span className="pill pill-med" title={`Risk Score: ${score !== undefined ? (score * 100).toFixed(0) + '%' : 'Medium'}`}>
        <AlertTriangle size={12} />
        <span>Medium Risk</span>
      </span>
    );
  }

  return (
    <span className="pill pill-low" title={`Risk Score: ${score !== undefined ? (score * 100).toFixed(0) + '%' : 'Low'}`}>
      <CheckCircle2 size={12} />
      <span>Low Risk</span>
    </span>
  );
}
