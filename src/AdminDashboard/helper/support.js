import { headerTitle } from "./titles.js";

export const formatCount = (value) => {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${Math.round(value / 1000)}K`;
  return value;
};


export const processedEventLocationData = (data) => {
    return [...data].map(e => ({
        name: e.name,
        value: e.syslog + e.journald + e.virustotal + e.audit,
    }
  ))
}

export const findTitle = (route) => {
  return [...headerTitle].find(e => e.route === route).title;
}