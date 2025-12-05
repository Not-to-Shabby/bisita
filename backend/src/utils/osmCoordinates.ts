const OVERPASS_ENDPOINTS = [
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass-api.de/api/interpreter',
];

const ILIGAN_BOUNDS = {
  south: 8.10,
  west: 124.10,
  north: 8.30,
  east: 124.35,
};

type RuntimeFetch = (input: string, init: Record<string, unknown>) => Promise<any>;

const DEFAULT_TIMEOUT_MS = 12000;

const getRuntimeFetch = (): RuntimeFetch => {
  const runtimeFetch = (globalThis as unknown as { fetch?: RuntimeFetch }).fetch;
  if (typeof runtimeFetch !== 'function') {
    throw new Error('Fetch API is not available in this runtime');
  }
  return runtimeFetch;
};

export interface OsmCoordinateResult {
  lat: number;
  lng: number;
  sourceId: string;
}

const buildQuery = (name: string): string => {
  const sanitized = name.replace(/"/g, '\\"');

  return `
    [out:json][timeout:25];
    (
      node["name"~"${sanitized}",i]["tourism"]( ${ILIGAN_BOUNDS.south}, ${ILIGAN_BOUNDS.west}, ${ILIGAN_BOUNDS.north}, ${ILIGAN_BOUNDS.east});
      node["name"~"${sanitized}",i]["amenity"]( ${ILIGAN_BOUNDS.south}, ${ILIGAN_BOUNDS.west}, ${ILIGAN_BOUNDS.north}, ${ILIGAN_BOUNDS.east});
      node["name"~"${sanitized}",i]["leisure"]( ${ILIGAN_BOUNDS.south}, ${ILIGAN_BOUNDS.west}, ${ILIGAN_BOUNDS.north}, ${ILIGAN_BOUNDS.east});
      way["name"~"${sanitized}",i]["tourism"]( ${ILIGAN_BOUNDS.south}, ${ILIGAN_BOUNDS.west}, ${ILIGAN_BOUNDS.north}, ${ILIGAN_BOUNDS.east});
      relation["name"~"${sanitized}",i]["tourism"]( ${ILIGAN_BOUNDS.south}, ${ILIGAN_BOUNDS.west}, ${ILIGAN_BOUNDS.north}, ${ILIGAN_BOUNDS.east});
    );
    out center 1;
  `;
};

const parseElement = (element: any): OsmCoordinateResult | null => {
  const lat = element.lat || element.center?.lat;
  const lng = element.lon || element.center?.lon;

  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return null;
  }

  return {
    lat,
    lng,
    sourceId: element.id?.toString() || '',
  };
};

const withTimeout = async (
  runtimeFetch: RuntimeFetch,
  endpoint: string,
  body: URLSearchParams,
  timeoutMs: number,
) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await runtimeFetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        Accept: 'application/json',
      },
      body,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
};

export const fetchOsmCoordinates = async (name: string, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<OsmCoordinateResult | null> => {
  if (!name) {
    return null;
  }
  let runtimeFetch: RuntimeFetch | null = null;

  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      runtimeFetch = runtimeFetch || getRuntimeFetch();
      const body = new URLSearchParams({ data: buildQuery(name) });
      const response = await withTimeout(runtimeFetch, endpoint, body, timeoutMs);

      if (!response.ok) {
        continue;
      }

      const payload: any = await response.json();
      if (!Array.isArray(payload?.elements)) {
        continue;
      }

      const match = payload.elements
        .map((element: any) => parseElement(element))
        .find((element: OsmCoordinateResult | null): element is OsmCoordinateResult => Boolean(element));

      if (match) {
        return match;
      }
    } catch (error) {
      // Ignore and try next endpoint
      continue;
    }
  }

  return null;
};
