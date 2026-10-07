/**
 * Sample datasets for the stories. They are generated from a fixed seed, so every visit to a story
 * (and every screenshot) shows the same numbers.
 */

/** A small seeded random number generator (mulberry32): the same seed gives the same sequence. */
export function seeded(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** A year of revenue and costs, in thousands, growing with a summer dip. */
export const monthlyFinance = MONTHS.map((month, index) => {
  const revenue = Math.round(120 + index * 14 + Math.sin(index / 1.6) * 18);
  const costs = Math.round(80 + index * 6 + Math.cos(index / 2) * 8);
  return { month, revenue, costs, profit: revenue - costs };
});

/** Visitors and sign-ups for each of the last 90 days. */
export function dailyTraffic(days = 90, end = new Date(2025, 5, 30)) {
  const random = seeded(7);
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(end);
    date.setDate(end.getDate() - (days - 1 - index));
    const weekday = date.getDay();
    const base = weekday === 0 || weekday === 6 ? 900 : 1500;
    const visitors = Math.round(base + index * 8 + random() * 260);
    const signups = Math.round(visitors * (0.03 + random() * 0.02));
    return { date, visitors, signups };
  });
}

/** Sales by region for each quarter, for stacked and grouped bars. */
export const quarterlySales = ['Q1', 'Q2', 'Q3', 'Q4'].map((quarter, index) => ({
  quarter,
  north: 320 + index * 40,
  south: 210 + index * 25 + (index === 2 ? -30 : 0),
  east: 180 + index * 55,
  west: 260 + index * 10,
}));

/** Share of visits by browser, for pie and donut charts. */
export const browserShare = [
  { name: 'Chrome', value: 6480 },
  { name: 'Safari', value: 2290 },
  { name: 'Firefox', value: 780 },
  { name: 'Edge', value: 640 },
  { name: 'Other', value: 310 },
];

/** Marketing channels with spend, conversions and revenue, for a scatter chart. */
export const channels = (() => {
  const random = seeded(21);
  const groups = ['Search', 'Social', 'Email', 'Partners'];
  return Array.from({ length: 36 }, (_, index) => {
    const group = groups[index % groups.length]!;
    const spend = Math.round(500 + random() * 9500);
    const conversions = Math.round(spend / (35 + random() * 40));
    return {
      name: `${group} ${Math.floor(index / groups.length) + 1}`,
      group,
      spend,
      conversions,
      revenue: Math.round(conversions * (60 + random() * 90)),
    };
  });
})();

/** A team's skills compared with a target, for a radar chart. */
export const skills = [
  { skill: 'Design', current: 72, target: 80 },
  { skill: 'Frontend', current: 88, target: 85 },
  { skill: 'Backend', current: 64, target: 80 },
  { skill: 'Testing', current: 55, target: 75 },
  { skill: 'DevOps', current: 48, target: 65 },
  { skill: 'Product', current: 70, target: 70 },
];

/** Pull requests merged per weekday and hour, for a heatmap. */
export const weeklyActivity = (() => {
  const random = seeded(5);
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  const hours = ['9am', '11am', '1pm', '3pm', '5pm'];
  return days.flatMap((day, dayIndex) =>
    hours.map((hour, hourIndex) => ({
      day,
      hour,
      merged: Math.round(
        Math.max(0, 4 + random() * 10 - Math.abs(hourIndex - 2) * 2.2 - (dayIndex === 4 ? 4 : 0)),
      ),
    })),
  );
})();

/** A year of daily contributions, for a calendar heatmap. */
export function yearOfActivity(year = 2024) {
  const random = seeded(99);
  const rows: { date: Date; count: number }[] = [];
  for (
    let date = new Date(year, 0, 1);
    date.getFullYear() === year;
    date.setDate(date.getDate() + 1)
  ) {
    const weekend = date.getDay() === 0 || date.getDay() === 6;
    const busy = random() > (weekend ? 0.8 : 0.25);
    rows.push({
      date: new Date(date),
      count: busy ? Math.round(random() * (weekend ? 4 : 12)) : 0,
    });
  }
  return rows;
}

/** Twelve weeks of a metric, for sparklines and KPI cards. */
export const weeklyTrend = (() => {
  const random = seeded(3);
  let value = 100;
  return Array.from({ length: 12 }, () => {
    value += (random() - 0.35) * 14;
    return Math.round(value);
  });
})();
