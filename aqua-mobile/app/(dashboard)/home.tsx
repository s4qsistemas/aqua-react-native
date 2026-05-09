// app/(dashboard)/home.tsx
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import { apiFetch } from '../../src/services/api';

import SuperAdminView from '../../components/dashboards/SuperAdminView';
import AdminView from '../../components/dashboards/AdminView';
import SupervisorView from '../../components/dashboards/SupervisorView';

export default function MobileDashboard() {
    const { user, logout } = useAuth();
    const [tenants, setTenants] = useState([]);

    // Cuando carga el Home, si es SUPERADMIN, traemos las comunidades
    useEffect(() => {
        if (user?.rol === 'SUPERADMIN') {
            const cargarTenants = async () => {
                try {
                    const data = await apiFetch('/tenants');
                    setTenants(data);
                } catch (error) {
                    console.error("Error cargando tenants:", error);
                }
            };
            cargarTenants();
        }
    }, [user]);

    const renderDashboard = () => {
        switch (user?.rol) {
            case 'SUPERADMIN':
                return <SuperAdminView user={user} tenants={tenants} />;
            case 'ADMIN':
                return <AdminView user={user} />;
            case 'SUPERVISOR':
                return <SupervisorView user={user} />;
            default:
                return <View><Text style={{ color: 'white' }}>Rol no reconocido</Text></View>;
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.topBar}>
                <Text style={styles.logo}>
                    aqua <Text style={styles.logoAccent}>Sync Pro</Text>
                </Text>
                
                <View style={styles.userInfo}>
                    <Text style={styles.userName}>{user?.nombre || "Usuario"}</Text>
                    <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
                        <Ionicons name="log-out-outline" size={24} color="#ef4444" />
                    </TouchableOpacity>
                </View>
            </View>
            {renderDashboard()}
        </SafeAreaView>
    );
}

// ¡AQUÍ ESTÁ LO QUE FALTABA! Los estilos de la barra superior y el fondo
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f172a' },
    topBar: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        paddingHorizontal: 24, 
        paddingVertical: 16, 
        borderBottomWidth: 1, 
        borderBottomColor: '#1e293b' 
    },
    logo: { 
        color: '#38bdf8', 
        fontSize: 18, 
        fontWeight: '900', 
        letterSpacing: 1 
    },
    logoAccent: {
        color: '#94a3b8',
        fontWeight: '400'
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12
    },
    userName: {
        color: '#94a3b8',
        fontSize: 14,
        fontWeight: '600'
    },
    logoutBtn: { padding: 4 },
});