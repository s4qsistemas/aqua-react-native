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
            <Stack.Screen name="users" options={{ headerShown: false }} />
            <Stack.Screen name="reports" options={{ headerShown: false }} />
        </Stack>
    );
}
