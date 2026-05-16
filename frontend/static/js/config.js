// Central API base URL — adapts to browser, Electron, and Capacitor contexts.
// Use window.electronAPI.isElectron (set by preload BEFORE any JS runs) so
// this module evaluates correctly even though window.__ELECTRON__ is injected
// later via executeJavaScript (after did-finish-load).
const isCapacitor = !!(window.Capacitor?.isNativePlatform?.());
const isElectron  = !!(window.electronAPI?.isElectron);

// In Electron, Flask always listens on 127.0.0.1 at the same origin.
// window.__COILMS_API__ is set by executeJavaScript after load as a fallback
// for Capacitor (where origin is file://).
export const API_BASE =
  isElectron
    ? window.location.origin          // Flask is always at the same origin
    : isCapacitor
      ? (window.__COILMS_API__ || 'https://coilms.onrender.com')
      : window.location.origin;
