import router         from "./router.js";
import { API_BASE }  from "./js/config.js";
import { localdb }   from "./js/localdb.js";

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

// In Electron the Flask server is always local — internet connectivity is irrelevant.
const IS_ELECTRON = !!(window.electronAPI?.isElectron);

export const fetchWithAuth = async (url = '/', options = { auth: true }) => {
  const token = localStorage.getItem('user')
    ? JSON.parse(localStorage.getItem('user'))?.token
    : localStorage.getItem('auth-token');

  if (options.auth && !token) {
    router.push('/');
    return;
  }

  const method = (options.method ?? 'GET').toUpperCase();

  const fetchOptions = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authentication-Token': token } : {}),
      ...options.headers,
    },
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
    mode: 'cors',
  };

  // Remove keys that are not valid fetch options to avoid TypeError
  const { auth: _auth, ...rest } = options;
  Object.assign(fetchOptions, rest);
  // Restore correct body (stringify from options.body, not raw options)
  if (options.body) fetchOptions.body = JSON.stringify(options.body);

  try {
    const res = await fetch(`${API_BASE}${url}`, fetchOptions);

    if (res.status === 401 || res.status === 403 || res.status === 405) {
      // Clear stale credentials so "/" shows the info page, not dashboard.
      ['auth-token','role','full_name','user_id','user','business_name']
        .forEach(k => localStorage.removeItem(k));
      router.push('/');
      return;
    }

    return res;

  } catch (err) {
    // ── Offline fallback ───────────────────────────────────────────────────
    // Skip in Electron: Flask is always running locally regardless of internet.

    if (!IS_ELECTRON && !navigator.onLine) {
      if (WRITE_METHODS.has(method)) {
        // Queue the write for later sync
        try {
          await localdb.queueMutation({ endpoint: url, method, body: options.body });
        } catch (dbErr) {
          console.warn('[offline] Failed to queue mutation:', dbErr);
        }
        // Return a synthetic 202 so the calling component doesn't crash
        return new Response(
          JSON.stringify({ message: 'Saved offline — will sync when reconnected.', offline_queued: true }),
          { status: 202, headers: { 'Content-Type': 'application/json', 'X-Offline-Queued': 'true' } }
        );
      }

      // For GETs, the service worker already serves cached data automatically.
      // If we still end up here it means the SW didn't intercept (e.g. first visit).
      return new Response(
        JSON.stringify({ error: 'offline', message: 'No cached data available yet.' }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      );
    }

    throw err;
  }
};
