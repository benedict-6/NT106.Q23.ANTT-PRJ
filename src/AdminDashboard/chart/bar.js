import React from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const COLORS = ["#882D30", "#3E769D", "#D15886", "#845EC2", "#D65DB1"];

export const Top5PercentBarChart = ({ data }) => {
  const top5 = [...data].sort((a, b) => b.value - a.value).slice(0, 5);
  const total = top5.reduce((sum, item) => sum + item.value, 0) || 1;

  const chartData = top5.map((item, index) => ({
    name: item.name,
    percent: Number(((item.value / total) * 100).toFixed(1)),
    color: COLORS[index % COLORS.length],
  }));

  const renderCustomBar = (props) => {
    const { x, y, width, height, payload } = props;
    return (
      <rect
        x={x} y={y}
        width={width} height={height}
        rx={7} ry={7}
        fill={payload.color}
      />
    );
  };

  return (
    <div style={{ width: 600, height: 90 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 4, right: 4, left: 4, bottom: 12 }}
          barCategoryGap="20%"
        >
          <XAxis
            dataKey="name"
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            interval={0}
            height={16}
          />
          <YAxis hide />
          <Tooltip formatter={(value) => `${value}%`} />
          <Bar dataKey="percent" shape={renderCustomBar} barSize={60} maxBarSize={70} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};