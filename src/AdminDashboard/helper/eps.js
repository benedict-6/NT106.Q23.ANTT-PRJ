'use client';

import React from 'react';
import { PieChart, Pie, ResponsiveContainer, Sector } from 'recharts';

const SEGMENTS = 24;
const TRACK = '#2A2A2A';

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

const hexToRgb = (hex) => {
  const cleaned = hex.replace('#', '');
  const num = parseInt(cleaned, 16);

  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
};

const rgbToHex = ({ r, g, b }) =>
  `#${[r, g, b]
    .map((v) => Math.round(v).toString(16).padStart(2, '0'))
    .join('')}`;

const mixColor = (color1, color2, amount) => {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);

  return rgbToHex({
    r: c1.r + (c2.r - c1.r) * amount,
    g: c1.g + (c2.g - c1.g) * amount,
    b: c1.b + (c2.b - c1.b) * amount,
  });
};

const getSegmentColor = (scalePos) => {
  if (scalePos <= 0.4) {
    const t = scalePos / 0.4;
    return mixColor('#0f766e', '#22c55e', t);
  }

  if (scalePos <= 0.7) {
    const t = (scalePos - 0.4) / 0.3;
    return mixColor('#a16207', '#facc15', t);
  }

  const t = (scalePos - 0.7) / 0.3;
  return mixColor('#fca5a5', '#ef4444', t);
};

const buildGaugeData = (value, max) => {
  const percent = clamp(value / max, 0, 1);
  const filledCount = Math.round(percent * SEGMENTS);

  return Array.from({ length: SEGMENTS }, (_, i) => {
    const scalePos = (i + 0.5) / SEGMENTS;

    return {
      value: 1,
      fill: i < filledCount ? getSegmentColor(scalePos) : TRACK,
    };
  });
};

const renderSector = (props) => {
  const { payload, fill, ...rest } = props;
  return <Sector {...rest} fill={payload?.fill ?? fill} />;
};

export const drawEPS = (value = 0, max = 1) => {
  const data = buildGaugeData(value, max);

  return (
    <div className="relative flex h-[350px] w-full items-center justify-center">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            startAngle={180}
            endAngle={0}
            cx="50%"
            cy="62%"
            innerRadius="72%"
            outerRadius="88%"
            paddingAngle={1}
            stroke="none"
            shape={renderSector}
            isAnimationActive
            animationDuration={650}
          />
        </PieChart>
      </ResponsiveContainer>

      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center translate-y-1">
        <div className="text-6xl font-light tracking-tight text-[#E8E8E8] mt-3">{value}</div>
        <div className="mt-7 text-base text-gray-400"> Overall Average of Count</div>
      </div>
    </div>
  );
};