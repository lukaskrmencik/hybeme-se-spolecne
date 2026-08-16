import { Platform } from 'react-native';
import { getToken, saveToken, removeToken } from './storage';


const getBaseUrl = (): string => {
    if (!__DEV__) {
        return process.env.EXPO_PUBLIC_API_URL_PROD || 'https://hybemesespolecne.cz/api/';
    }

    return Platform.OS === 'web'
        ? (process.env.EXPO_PUBLIC_API_URL_WEB || 'http://localhost/api/')
        : (process.env.EXPO_PUBLIC_API_URL_MOBILE || 'http://192.168.1.50/api/');
};

export const apiFetch = async (endpoint: string, options: RequestInit = {}, isRetry = false): Promise<any> => {
    const token = await getToken();
    
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(options.headers as Record<string, string>),
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${getBaseUrl()}${endpoint}`, {
        ...options,
        headers,
    });

    const data = await response.json();

    if (response.status === 401 && !isRetry && !endpoint.includes('auth/login')) {
        try {
            const refreshedToken = await refreshApiToken();
            if (refreshedToken) {
                return apiFetch(endpoint, options, true);
            }
        } catch {
            await removeToken();
            throw new Error('Relace vypršela, přihlaste se znovu.');
        }
    }

    if (!response.ok || data.status === 'error') {
        throw data;
    }

    return data;
};

const refreshApiToken = async (): Promise<string | null> => {
    try {
        const token = await getToken();

        if (!token) return null;

        const response = await fetch(`${getBaseUrl()}auth/refresh`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
        });

        const data = await response.json();

        if (response.ok && data.status === 'success' && data.data?.token) {
            await saveToken(data.data.token);
            return data.data.token;
        }

    } catch {}

    return null;
};