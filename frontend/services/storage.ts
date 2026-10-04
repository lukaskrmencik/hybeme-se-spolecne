import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const TOKEN_KEY = 'auth_token';

const webStorage = (): Storage | null =>
    typeof window !== 'undefined' && window.localStorage ? window.localStorage : null;

export const saveToken = async (token: string): Promise<void> => {
    if (Platform.OS === 'web') {
        webStorage()?.setItem(TOKEN_KEY, token);
    } else {
        await SecureStore.setItemAsync(TOKEN_KEY, token);
    }
};

export const getToken = async (): Promise<string | null> => {
    if (Platform.OS === 'web') {
        return webStorage()?.getItem(TOKEN_KEY) ?? null;
    }
    return SecureStore.getItemAsync(TOKEN_KEY);
};

export const removeToken = async (): Promise<void> => {
    if (Platform.OS === 'web') {
        webStorage()?.removeItem(TOKEN_KEY);
    } else {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
    }
};
