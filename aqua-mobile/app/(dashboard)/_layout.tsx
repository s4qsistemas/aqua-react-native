import { Stack } from 'expo-router';

export default function DashboardLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: '#0f172a' },
                animation: 'slide_from_right',
            }}
        >
            <Stack.Screen name="home" />
            <Stack.Screen name="users" options={{ headerShown: true, title: 'Gestión de Usuarios', headerStyle: { backgroundColor: '#0f172a' }, headerTintColor: '#fff' }} />
            <Stack.Screen name="reports" options={{ headerShown: true, title: 'Reportes y Estadísticas', headerStyle: { backgroundColor: '#0f172a' }, headerTintColor: '#fff' }} />
        </Stack>
    );
}
