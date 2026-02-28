const DEFAULT_STUN_SERVER: RTCIceServer = { urls: 'stun:stun.l.google.com:19302' };

const extractUrls = (value: unknown): string[] => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed ? [trimmed] : [];
  }

  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean);
};

const normalizeIceServer = (value: unknown): RTCIceServer | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  const urls = extractUrls(candidate.urls);
  if (urls.length === 0) {
    return null;
  }

  const server: RTCIceServer = {
    urls: urls.length === 1 ? urls[0] : urls,
  };

  if (typeof candidate.username === 'string' && candidate.username.trim()) {
    server.username = candidate.username.trim();
  }

  if (typeof candidate.credential === 'string' && candidate.credential.trim()) {
    server.credential = candidate.credential.trim();
  }

  return server;
};

const parseIceServersFromJsonEnv = (): RTCIceServer[] => {
  const raw = (import.meta.env.VITE_WEBRTC_ICE_SERVERS_JSON || '').trim();
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    const list =
      Array.isArray(parsed)
        ? parsed
        : parsed && typeof parsed === 'object' && Array.isArray((parsed as { iceServers?: unknown }).iceServers)
        ? ((parsed as { iceServers: unknown[] }).iceServers ?? [])
        : [];

    return list.map(normalizeIceServer).filter((server): server is RTCIceServer => server !== null);
  } catch (error) {
    // Keep app functional when optional JSON env config is malformed.
    // eslint-disable-next-line no-console
    console.warn('Invalid VITE_WEBRTC_ICE_SERVERS_JSON; using fallback ICE servers.', error);
    return [];
  }
};

const parseTurnIceServerFromEnv = (): RTCIceServer | null => {
  const urlsInput = String(import.meta.env.VITE_TURN_URLS || import.meta.env.VITE_TURN_URL || '').trim();
  if (!urlsInput) {
    return null;
  }

  const urls = urlsInput
    .split(',')
    .map((item: string) => item.trim())
    .filter(Boolean);

  if (urls.length === 0) {
    return null;
  }

  const server: RTCIceServer = {
    urls: urls.length === 1 ? urls[0] : urls,
  };

  const username = (import.meta.env.VITE_TURN_USERNAME || '').trim();
  const credential = (import.meta.env.VITE_TURN_CREDENTIAL || '').trim();

  if (username) {
    server.username = username;
  }

  if (credential) {
    server.credential = credential;
  }

  return server;
};

export const buildRtcConfiguration = (): RTCConfiguration => {
  const mergedServers: RTCIceServer[] = [];
  const knownServerKeys = new Set<string>();

  const addServer = (server: RTCIceServer | null) => {
    if (!server) {
      return;
    }

    const urls = Array.isArray(server.urls) ? server.urls : [server.urls];
    const serverKey = urls.join('|');
    if (knownServerKeys.has(serverKey)) {
      return;
    }

    knownServerKeys.add(serverKey);
    mergedServers.push(server);
  };

  parseIceServersFromJsonEnv().forEach((server) => addServer(server));
  addServer(parseTurnIceServerFromEnv());
  addServer(DEFAULT_STUN_SERVER);

  return {
    iceServers: mergedServers,
  };
};
