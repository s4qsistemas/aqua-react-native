import { Slot, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';

// Importamos los contextos que armaste
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { ThemeProvider } from '../src/context/ThemeContext';

// Este sub-componente actúa como el "guardia de seguridad"
function RootNavigation() {
    const { token, isLoading, requirePasswordChange } = useAuth();
    const segments = useSegments();
    const router = useRouter();

    useEffect(() => {
        // Log para depurar qué está pasando
        const currentPath = segments.join('/');
        console.log(`🛣️ RootNavigation: isLoading=${isLoading}, token=${token ? 'SÍ' : 'NO'}, path="${currentPath}"`);

        if (isLoading) return;
        const inAuthGroup = (segments as string[]).includes('(auth)');
        const isForceChangePage = (segments as string[]).includes('force-change-password');

        if (!token) {
            // 🔴 Sin sesión
            if (!inAuthGroup) {
                console.log("🔄 Redirigiendo a Login...");
                router.replace('/(auth)/login');
            }
        } else {
            // 🟢 Con sesión
            if (requirePasswordChange) {
                if (!isForceChangePage) {
                    console.log("🔄 Redirigiendo a cambio forzoso...");
                    router.replace('/(auth)/force-change-password');
                }
            } else {
                // Si está en el login o en la raíz, mandarlo al dashboard
                if (inAuthGroup || isForceChangePage || segments.length < 1) {
                    console.log("🔄 Redirigiendo a Dashboard Home...");
                    router.replace('/(dashboard)/home');
                }
            }
        }
    }, [token, isLoading, segments, requirePasswordChange]);

    // Pantalla de carga mientras se lee el token del teléfono
    if (isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' }}>
                <ActivityIndicator size="large" color="#0ea5e9" />
            </View>
        );
    }

    // Slot le dice a Expo Router: "Renderiza la pantalla que corresponda aquí"
    return <Slot />;
}

// El Layout principal que envuelve toda tu aplicación móvil
export default function RootLayout() {
    return (
        <ThemeProvider>
            <AuthProvider>
                <RootNavigation />
            </AuthProvider>
        </ThemeProvider>
    );
}