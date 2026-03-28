import React from 'react';
import { ICONS } from '../utils/icons.js';

/**
 * Renders an inline SVG icon from the ICONS map.
 * Props:
 *   name        — key in ICONS object
 *   size        — number (default 20)
 *   color       — stroke color (default currentColor)
 *   strokeWidth — (default 1.8)
 *   fill        — fill color (default 'none')
 *   style, className — passthrough
 */
export default function Icon({
  name,
  size = 20,
  color = 'currentColor',
  strokeWidth = 1.8,
  fill = 'none',
  style,
  className,
}) {
  const d = ICONS[name];
  if (!d) return null;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill}
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0, ...style }}
      className={className}
    >
      <path d={d} />
    </svg>
  );
}
