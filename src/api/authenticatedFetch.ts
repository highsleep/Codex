import { auth } from '../firebase';

let installed = false;

function isApiRequest(input: RequestInfo | URL): boolean {
  const value = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
  return value.startsWith('/api/') || value.startsWith(`${window.location.origin}/api/`);
}

/**
 * Adds the current Firebase ID token to same-origin API requests. The server
 * remains authoritative: no user, role, or actor identity is sent by the UI.
 */
export function installAuthenticatedFetch(): void {
  if (installed || typeof window === 'undefined') return;
  installed = true;

  const nativeFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    if (!isApiRequest(input)) return nativeFetch(input, init);

    const token = await auth.currentUser?.getIdToken();
    if (!token) return nativeFetch(input, init);

    const headers = new Headers(init?.headers);
    headers.set('Authorization', `Bearer ${token}`);
    return nativeFetch(input, { ...init, headers });
  };
}
