import { View, ActivityIndicator } from 'react-native';

export default function IndexPage() {
    // Esta pantalla es solo un "pasillo". 
    // El usuario casi no la verá porque el _layout.tsx 
    // actuará inmediatamente para enviarlo al Login o al Dashboard.
    return (
        <View style={{ flex: 1, backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#0ea5e9" />
        </View>
    );
}