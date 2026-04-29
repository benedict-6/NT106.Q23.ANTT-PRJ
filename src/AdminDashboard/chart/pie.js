import React from "react";
import { PieChart, Pie, ResponsiveContainer, Tooltip, Sector } from "recharts";

const CustomSector = (props) => {
  const { payload, fill, ...rest } = props;
  return <Sector {...rest} fill={payload?.color ?? fill} />;
};

export const drawPie = (data) => {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          outerRadius={80}
          shape={CustomSector}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#1A1A1A",
            border: "1px solid #333",
            color: "#FFF",
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
};