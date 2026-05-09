// src/context/ThemeContext.tsx
import React, { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Appearance, ColorSchemeName } from "react-native";

type Theme = "light" | "dark" | "system";

type ThemeProviderProps = {
    children: ReactNode;
    defaultTheme?: Theme;
    storageKey?: string;
};

type ThemeProviderState = {
    theme: Theme;
    activeColorScheme: "light" | "dark"; // El tema real calculado
    setTheme: (theme: Theme) => Promise<void>;
};

const initialState: ThemeProviderState = {
    theme: "system",
    activeColorScheme: "light",
    setTheme: async () => { },
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
    children,
    defaultTheme = "system",
    storageKey = "aqua-ui-theme",
    ...props
}: ThemeProviderProps) {
    const systemColorScheme = Appearance.getColorScheme(); // 'light' o 'dark' nativo
    const [theme, setThemeState] = useState<Theme>(defaultTheme);
    const [activeColorScheme, setActiveColorScheme] = useState<"light" | "dark">(systemColorScheme || "light");

    // Carga la preferencia guardada al iniciar
    useEffect(() => {
        const loadTheme = async () => {
            const storedTheme = (await AsyncStorage.getItem(storageKey)) as Theme | null;
            if (storedTheme) {
                setThemeState(storedTheme);
            }
        };
        loadTheme();
    }, [storageKey]);

    // Calcula el tema real cada vez que cambia la preferencia o el sistema
    useEffect(() => {
        if (theme === "system") {
            setActiveColorScheme(systemColorScheme || "light");
        } else {
            setActiveColorScheme(theme);
        }
    }, [theme, systemColorScheme]);

    const setTheme = async (newTheme: Theme) => {
        await AsyncStorage.setItem(storageKey, newTheme);
        setThemeState(newTheme);
    };

    const value = {
        theme,
        activeColorScheme,
        setTheme,
    };

    return (
        <ThemeProviderContext.Provider {...props} value={value}>
            {children}
        </ThemeProviderContext.Provider>
    );
}

export const useTheme = () => {
    const context = useContext(ThemeProviderContext);
    if (context === undefined) {
        throw new Error("useTheme must be used within a ThemeProvider");
    }
    return context;
};