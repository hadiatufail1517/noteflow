/**
 * localStorage utility — simulates DB before real backend is connected.
 * Replace with real API calls via services/api.js when backend is ready.
 */

export const LS = {
  get: (key, defaultValue = null) => {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : defaultValue;
    } catch {
      return defaultValue;
    }
  },
  set: (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  },
  remove: (key) => {
    try {
      localStorage.removeItem(key);
    } catch {}
  },
  clear: () => {
    try {
      localStorage.clear();
    } catch {}
  }
};

export const genId = () =>
  Math.random().toString(36).slice(2) + Date.now().toString(36);

export const fmtDate = (dateStr) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};
