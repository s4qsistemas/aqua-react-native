// src/services/api.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

// ⚠️ REEMPLAZA LA IP POR LA DE TU PC EN TU RED WIFI LOCAL (ej. 192.168.1.50)
const getApiBaseUrl = () => {
    const defaultIP = "http://192.168.1.16:3000/api";
    const envUrl = process.env.EXPO_PUBLIC_API_BASE_URL;

    // Si estamos en la WEB y el hostname es localhost, usamos localhost
    if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
        return "http://localhost:3000/api";
    }

    return envUrl || defaultIP;
};

const API_BASE_URL = getApiBaseUrl();

export const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
    // 1. Obtener el token del almacenamiento seguro del teléfono (es asíncrono)
    const token = await AsyncStorage.getItem("token");

    const headers = {
        "Content-Type": "application/json",
        ...options.headers,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    try {
        const fullUrl = `${API_BASE_URL}${endpoint}`;
        console.log(`🌐 API Fetch: ${options.method || 'GET'} a ${fullUrl} (Token: ${token ? 'SÍ' : 'NO'})`);
        
        const response = await fetch(fullUrl, {
            ...options,
            headers,
        });

        // 2. Interceptar errores de Autenticación
        if ((response.status === 401 || response.status === 403) && !endpoint.includes('/auth/login')) {
            await AsyncStorage.removeItem("token");
            await AsyncStorage.removeItem("user");
            await AsyncStorage.removeItem("requirePasswordChange");
            // Nota: En React Native no usamos window.location.href. 
            // Al limpiar el token, el AuthContext actualizará el estado y el enrutador nos sacará.
            throw new Error("Sesión expirada o sin permisos");
        }

        if (response.status === 204) {
            return null;
        }

        const data = await response.json().catch(() => null);

        if (!response.ok) {
            throw new Error(data?.error || "Error en la petición a la API");
        }

        return data;
    } catch (error) {
        console.error(`[API Error] ${endpoint}:`, error);
        throw error;
    }
};