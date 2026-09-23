import { auth } from '../firebase';

let installed = false;

function isApiRequest(input: RequestInfo | URL): boolean {
  if (typeof window === 'undefined') return false;
  const value =
    typeof input === 'string'
      ? input
      : input instanceof URL
      ? input.toString()
      : input.url;
  return value.startsWith('/api/') || value.startsWith(`${window.location.origin}/api/`);
}

/**
 * Adds the current Firebase ID token to same-origin API requests. The server
 * remains authoritative: no user, role, or actor identity is sent by the UI.
 */
export function installAuthenticatedFetch(): void {
  if (installed || typeof window === 'undefined') return;
  installed = true;

  try {
    const nativeFetch = window.fetch ? window.fetch.bind(window) : undefined;
    if (!nativeFetch) return;

    const customFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      if (!isApiRequest(input)) return nativeFetch(input, init);

      try {
        const token = await auth.currentUser?.getIdToken();
        if (!token) return nativeFetch(input, init);

        const headers = new Headers(init?.headers);
        headers.set('Authorization', `Bearer ${token}`);
        return nativeFetch(input, { ...init, headers });
      } catch {
        return nativeFetch(input, init);
      }
    };

    try {
      Object.defineProperty(window, 'fetch', {
        value: customFetch,
        writable: true,
        configurable: true,
      });
    } catch {
      try {
        Object.defineProperty(Object.getPrototypeOf(window), 'fetch', {
          value: customFetch,
          writable: true,
          configurable: true,
        });
      } catch (innerErr) {
        console.warn('Could not override fetch via Object.defineProperty:', innerErr);
      }
    }
  } catch (err) {
    console.warn('installAuthenticatedFetch encountered an error:', err);
  }
}

