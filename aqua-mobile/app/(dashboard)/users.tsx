import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiFetch } from '../../src/services/api';

export default function UsersScreen() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            // El endpoint correcto en el backend es /usuarios
            const data = await apiFetch('/usuarios').catch(() => [
                { id: '1', nombre: 'Juan Pérez', email: 'juan@example.com', rol: 'ADMIN', status: 'ACTIVO' },
                { id: '2', nombre: 'María García', email: 'maria@example.com', rol: 'SUPERVISOR', status: 'ACTIVO' },
                { id: '3', nombre: 'Pedro López', email: 'pedro@example.com', rol: 'RESIDENTE', status: 'INACTIVO' },
            ]);
            setUsers(data);
        } catch (error) {
            console.error("Error fetching users:", error);
        } finally {
            setLoading(false);
        }
    };

    const renderUser = ({ item }: { item: any }) => (
        <View style={styles.userCard}>
            <View style={styles.userIcon}>
                <Text style={styles.userInitials}>{item.nombre.substring(0, 2).toUpperCase()}</Text>
            </View>
            <View style={styles.userInfo}>
                <Text style={styles.userName}>{item.nombre}</Text>
                <Text style={styles.userEmail}>{item.email}</Text>
                <View style={styles.roleTag}>
                    <Text style={styles.roleText}>{item.rol}</Text>
                </View>
            </View>
            <View style={[styles.statusDot, { backgroundColor: item.status === 'ACTIVO' ? '#10b981' : '#ef4444' }]} />
        </View>
    );

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#38bdf8" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Usuarios Registrados</Text>
                <TouchableOpacity style={styles.addButton}>
                    <Ionicons name="add" size={24} color="white" />
                </TouchableOpacity>
            </View>

            <FlatList
                data={users}
                keyExtractor={(item) => item.id}
                renderItem={renderUser}
                contentContainerStyle={styles.list}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f172a', padding: 20 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    title: { color: 'white', fontSize: 24, fontWeight: 'bold' },
    addButton: { backgroundColor: '#38bdf8', padding: 10, borderRadius: 12 },
    list: { gap: 16 },
    userCard: { backgroundColor: '#1e293b', padding: 16, borderRadius: 20, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
    userIcon: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#334155', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
    userInitials: { color: '#38bdf8', fontWeight: 'bold', fontSize: 18 },
    userInfo: { flex: 1 },
    userName: { color: 'white', fontSize: 16, fontWeight: '600' },
    userEmail: { color: '#94a3b8', fontSize: 14 },
    roleTag: { alignSelf: 'flex-start', backgroundColor: 'rgba(56, 189, 248, 0.1)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginTop: 4 },
    roleText: { color: '#38bdf8', fontSize: 12, fontWeight: 'bold' },
    statusDot: { width: 10, height: 10, borderRadius: 5 }
});
