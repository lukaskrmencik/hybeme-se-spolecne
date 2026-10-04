import { Platform } from 'react-native';
import { config } from '../constants/config';
import { getToken, saveToken, removeToken } from './storage';

const REQUEST_TIMEOUT_MS = 15000;
const AUTH_ENDPOINTS = ['auth/login', 'auth/register', 'auth/refresh'];

export class ApiError extends Error {
    status_code: number;
    error_message: string;
    errors?: Record<string, string[]>;
    isNetworkError: boolean;
    /** Machine-readable reason from the backend, e.g. `email_not_verified`. */
    code?: string;
    /** The `data` part of an error response, when the backend sends one. */
    data?: any;

    constructor(
        message: string,
        statusCode: number,
        extra: { errors?: Record<string, string[]>; isNetworkError?: boolean; code?: string; data?: any } = {}
    ) {
        super(message);
        this.name = 'ApiError';
        this.status_code = statusCode;
        this.error_message = message;
        this.errors = extra.errors;
        this.isNetworkError = extra.isNetworkError ?? false;
        this.code = extra.code;
        this.data = extra.data;
    }

    /** Server rejected the request itself (validation, anti-cheat, ...); retrying won't help. */
    get isClientError(): boolean {
        return this.status_code >= 400 && this.status_code < 500 && this.status_code !== 401;
    }
}

export function getErrorMessage(err: unknown, fallback: string): string {
    if (err instanceof ApiError) return err.error_message || fallback;
    if (err instanceof Error && err.message) return err.message;
    return fallback;
}

export const getBaseUrl = (): string => {
    if (!__DEV__) return config.apiUrlProd;
    return Platform.OS === 'web' ? config.apiUrlWeb : config.apiUrlMobile;
};

const LOCAL_HOSTS = /^(https?:\/\/)(localhost|127\.0\.0\.1)(:\d+)?(?=\/)/i;

/**
 * Files on the backend get absolute URLs from APP_URL. In development that is often
 * http://localhost, which a phone cannot reach, so point it at the host the API is called on.
 */
export function resolveMediaUrl(url: string): string {
    if (!LOCAL_HOSTS.test(url)) return url;
    const origin = /^https?:\/\/[^/]+/i.exec(getBaseUrl())?.[0];
    return origin ? url.replace(LOCAL_HOSTS, origin) : url;
}

const sessionListeners = new Set<() => void>();

/** Fires when the token is gone for good (refresh failed) so the auth state can log the user out. */
export function onSessionExpired(fn: () => void): () => void {
    sessionListeners.add(fn);
    return () => {
        sessionListeners.delete(fn);
    };
}

export interface ApiOptions extends RequestInit {
    /** Uploads over mobile data need longer than the default 15 s. */
    timeoutMs?: number;
}

async function rawFetch(url: string, init: RequestInit, timeoutMs = REQUEST_TIMEOUT_MS): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        return await fetch(url, { ...init, signal: controller.signal });
    } catch {
        throw new ApiError('Není připojení k internetu.', 0, { isNetworkError: true });
    } finally {
        clearTimeout(timer);
    }
}

async function readJson(response: Response): Promise<any> {
    try {
        return await response.json();
    } catch {
        return {};
    }
}

// Refreshing blacklists the old token, so parallel 401s must share one refresh call.
let refreshInFlight: Promise<string | null> | null = null;

async function refreshToken(expiredToken: string): Promise<string | null> {
    if (!refreshInFlight) {
        refreshInFlight = (async () => {
            try {
                const response = await rawFetch(`${getBaseUrl()}auth/refresh`, {
                    method: 'POST',
                    headers: { Accept: 'application/json', Authorization: `Bearer ${expiredToken}` },
                });
                const data = await readJson(response);
                const token: string | undefined = data?.data?.token;
                if (response.ok && token) {
                    await saveToken(token);
                    return token;
                }
                return null;
            } catch (err) {
                if (err instanceof ApiError && err.isNetworkError) throw err;
                return null;
            } finally {
                refreshInFlight = null;
            }
        })();
    }
    return refreshInFlight;
}

async function expireSession(): Promise<never> {
    await removeToken();
    sessionListeners.forEach((fn) => fn());
    throw new ApiError('Relace vypršela, přihlas se prosím znovu.', 401);
}

export async function apiFetch<T = any>(endpoint: string, options: ApiOptions = {}, isRetry = false): Promise<T> {
    const { timeoutMs, ...init } = options;
    const token = await getToken();
    const isFormData = typeof FormData !== 'undefined' && init.body instanceof FormData;

    const headers: Record<string, string> = {
        Accept: 'application/json',
        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
        ...(init.headers as Record<string, string> | undefined),
    };
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await rawFetch(`${getBaseUrl()}${endpoint}`, { ...init, headers }, timeoutMs);
    const data = await readJson(response);

    const isAuthEndpoint = AUTH_ENDPOINTS.some((e) => endpoint.startsWith(e));
    if (response.status === 401 && token && !isAuthEndpoint && !isRetry) {
        const current = await getToken();
        if (current && current !== token) {
            return apiFetch<T>(endpoint, options, true);
        }
        const refreshed = await refreshToken(token);
        if (refreshed) return apiFetch<T>(endpoint, options, true);
        return expireSession();
    }

    if (!response.ok || data?.status === 'error') {
        const statusCode = data?.status_code ?? response.status;
        throw new ApiError(data?.error_message || `Chyba serveru (${statusCode}).`, statusCode, {
            errors: data?.errors,
            code: data?.code,
            data: data?.data,
        });
    }

    return data as T;
}
