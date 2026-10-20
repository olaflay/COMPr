export declare function apiFetch(path: string, init?: RequestInit): Promise<Response>;
/**
 * Absolute URL for an API-relative path (e.g. a downloadPath returned by the
 * jobs route). Mirrors apiFetch: in production the API lives on its own host
 * (NEXT_PUBLIC_API_URL), so hrefs and window.open targets must be prefixed
 * the same way or they would resolve against the frontend origin.
 */
export declare function apiUrl(path: string): string;
//# sourceMappingURL=api-client.d.ts.map