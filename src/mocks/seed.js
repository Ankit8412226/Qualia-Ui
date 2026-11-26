/* Deterministic fake data helpers so screens look the same on every reload. */
let s = 42;
export const rand = () => {
  s = (s * 16807) % 2147483647;
  return (s - 1) / 2147483646;
};
export const reseed = (n) => {
  s = n;
};
export const int = (a, b) => Math.floor(a + rand() * (b - a + 1));
export const pick = (arr) => arr[Math.floor(rand() * arr.length)];
export const pickWeighted = (pairs) => {
  const total = pairs.reduce((a, [, w]) => a + w, 0);
  let r = rand() * total;
  for (const [v, w] of pairs) if ((r -= w) <= 0) return v;
  return pairs[0][0];
};
export const range = (n, fn) => Array.from({ length: n }, (_, i) => fn(i));
export const phone = () => `9${int(100000000, 999999999)}`;
export const id = (prefix) => `${prefix}_${Math.floor(rand() * 1e8).toString(36)}`;

const NOW = new Date('2026-11-26T15:30:00+05:30');
export const now = () => new Date(NOW);
export const minutesAgo = (m) => new Date(NOW.getTime() - m * 60000);
export const daysAgo = (d, hour = 11) => {
  const x = new Date(NOW);
  x.setDate(x.getDate() - d);
  x.setHours(hour, int(0, 59), 0, 0);
  return x;
};
export const dayLabel = (d) => daysAgo(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

/** A series of the last n days: [{date:'12 Nov', ...fn(i)}] oldest first. */
export const lastDays = (n, fn) => range(n, (i) => ({ date: dayLabel(n - 1 - i), ...fn(i) }));

export const FIRST = ['Aarav', 'Priya', 'Rohan', 'Ananya', 'Vikram', 'Sneha', 'Arjun', 'Kavya', 'Rahul', 'Neha', 'Karan', 'Pooja', 'Aditya', 'Isha', 'Manish', 'Ritika', 'Sahil', 'Meera', 'Nikhil', 'Divya', 'Amit', 'Simran', 'Varun', 'Tanvi'];
export const LAST = ['Sharma', 'Verma', 'Gupta', 'Iyer', 'Reddy', 'Nair', 'Mehta', 'Kapoor', 'Joshi', 'Singh', 'Patel', 'Das', 'Malhotra', 'Bose', 'Chauhan', 'Kulkarni'];
export const person = () => `${pick(FIRST)} ${pick(LAST)}`;
export const CITIES = ['Mumbai', 'Delhi', 'Bengaluru', 'Pune', 'Hyderabad', 'Chennai', 'Jaipur', 'Lucknow', 'Indore', 'Kolkata'];
