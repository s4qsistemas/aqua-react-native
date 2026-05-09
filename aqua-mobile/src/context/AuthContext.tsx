// src/context/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface User {
    id: number;
    nombre: string;
    email: string;
    rol: string;
    tenantId?: number | null;
    tenant?: any | null; // Tipado simplificado para el ejemplo
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    requirePasswordChange: boolean;
    isLoading: boolean; // NUEVO: Para saber si estamos leyendo la memoria
    login: (token: string, user: User, requirePasswordChange: boolean) => Promise<void>;
    logout: () => Promise<void>;
    resolvePasswordChange: () => Promise<void>;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [token, setToken] = useState<string | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [requirePasswordChange, setRequirePasswordChange] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    // Al abrir la app, revisa si hay una sesión guardada
    useEffect(() => {
        const bootstrapAsync = async () => {
            console.log("🛠️ AuthContext: Iniciando bootstrapAsync...");
            try {
                const storedToken = await AsyncStorage.getItem("token");
                console.log("🛠️ AuthContext: Token recuperado:", storedToken ? "SÍ" : "NO");
                
                const storedUser = await AsyncStorage.getItem("user");
                console.log("🛠️ AuthContext: Usuario recuperado:", storedUser ? "SÍ" : "NO");

                const storedRequirePasswordChange = await AsyncStorage.getItem("requirePasswordChange");

                if (storedToken && storedUser) {
                    setToken(storedToken);
                    setUser(JSON.parse(storedUser));
                    setRequirePasswordChange(storedRequirePasswordChange === "true");
                }
            } catch (e) {
                console.error("❌ Error restaurando sesión:", e);
            } finally {
                console.log("✅ AuthContext: bootstrapAsync terminado.");
                setIsLoading(false);
            }
        };

        // Timeout de seguridad: si en 5 segundos no termina, desbloqueamos la UI
        const safetyTimer = setTimeout(() => {
            if (isLoading) {
                console.warn("⚠️ AuthContext: El cargado tardó demasiado, forzando isLoading = false");
                setIsLoading(false);
            }
        }, 5000);

        bootstrapAsync();
        return () => clearTimeout(safetyTimer);
    }, []);

    const login = async (newToken: string, newUser: User, mustChangePass: boolean = false) => {
        setToken(newToken);
        setUser(newUser);
        setRequirePasswordChange(mustChangePass);

        await AsyncStorage.setItem("token", newToken);
        await AsyncStorage.setItem("user", JSON.stringify(newUser));
        await AsyncStorage.setItem("requirePasswordChange", String(mustChangePass));
    };

    const logout = async () => {
        setToken(null);
        setUser(null);
        setRequirePasswordChange(false);

        await AsyncStorage.removeItem("token");
        await AsyncStorage.removeItem("user");
        await AsyncStorage.removeItem("requirePasswordChange");
    };

    const resolvePasswordChange = async () => {
        setRequirePasswordChange(false);
        await AsyncStorage.removeItem("requirePasswordChange");
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                token,
                requirePasswordChange,
                isLoading,
                login,
                logout,
                resolvePasswordChange,
                isAuthenticated: !!token,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}