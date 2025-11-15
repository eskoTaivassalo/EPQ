// Simple date utilities for slot generation

export const toISODate = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const parseTimeHM = (hm) => {
  // hm like '09:00'
  const [h, m] = (hm || '00:00').split(':').map(Number);
  return { h: h || 0, m: m || 0 };
};

export const addMinutes = (date, minutes) => {
  const d = new Date(date.getTime());
  d.setMinutes(d.getMinutes() + minutes);
  return d;
};

export const eachDay = (startDate, endDate, cb) => {
  const d = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
  for (; d <= end; d.setDate(d.getDate() + 1)) {
    cb(new Date(d));
  }
};

export const dayOfWeek = (date) => {
  // 0=Sunday .. 6=Saturday
  return date.getDay();
};
