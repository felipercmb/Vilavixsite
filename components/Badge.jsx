import React from 'react';
import { STATUS_BADGE, STATUS_COLORS, PIPELINE_LABELS, PRIORITY_COLORS, PRIORITY_LABELS } from '../utils/helpers.js';

/**
 * Reusable badge component.
 * Props:
 *   status     — pipeline status key  → renders colored badge
 *   priority   — priority key         → renders dot badge
 *   variant    — manual CSS class (badge-navy, badge-red, etc.)
 *   dot        — show leading dot
 *   children   — custom label
 */
export default function Badge({ status, priority, variant, dot = false, children, style }) {
  if (status) {
    const cls   = STATUS_BADGE[status] || 'badge-gray';
    const label = PIPELINE_LABELS[status] || status;
    return (
      <span className={`badge ${cls}${dot ? ' badge-dot' : ''}`} style={style}>
        {label}
      </span>
    );
  }

  if (priority) {
    const color = PRIORITY_COLORS[priority] || '#8492a6';
    const label = PRIORITY_LABELS[priority] || priority;
    return (
      <span
        className="badge"
        style={{
          background: `${color}18`,
          color,
          ...style,
        }}
      >
        <span
          style={{
            display: 'inline-block',
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: color,
            marginRight: 2,
          }}
        />
        {label}
      </span>
    );
  }

  return (
    <span className={`badge ${variant || 'badge-gray'}${dot ? ' badge-dot' : ''}`} style={style}>
      {children}
    </span>
  );
}
