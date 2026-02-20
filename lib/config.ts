import Constants from 'expo-constants';

/**
 * Get the backend URL dynamically.
 * In development, it uses the Expo host URI (your computer's IP).
 * In production, it uses the environment variable.
 */
const getBackendUrl = () => {
    // 1. If explicit env var is set, use it (Production)
    if (process.env.EXPO_PUBLIC_BACKEND_URL) {
        return process.env.EXPO_PUBLIC_BACKEND_URL;
    }

    // 2. In Development, derive from Expo Host URI (Computer's IP)
    const hostUri = Constants.expoConfig?.hostUri;
    if (hostUri) {
        const ip = hostUri.split(':')[0];
        return `http://${ip}:3000`;
    }

    // 3. Fallback (e.g. for simulators where hostUri might be different)
    return 'http://localhost:3000';
};

export const BACKEND_URL = getBackendUrl();
