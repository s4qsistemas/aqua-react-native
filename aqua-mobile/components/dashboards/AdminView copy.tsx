// components/dashboards/AdminView.tsx
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function AdminView({ user }: { user: any }) {
    return (
        <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.header}>
                <Text style={styles.title}>Panel de <Text style={styles.highlight}>Control</Text></Text>
                <Text style={styles.subtitle}>
                    Gestión administrativa de <Text style={styles.boldWhite}>{user?.tenant?.nombre || "Comunidad"}</Text>
                </Text>
            </View>

            {/* Card de Membresía */}
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <Text style={styles.badgeText}>ESTADO DE CUENTA</Text>
                    <Ionicons name="shield-checkmark" size={24} color="#10b981" />
                </View>
                <Text style={styles.tenantName}>{user?.tenant?.nombre}</Text>
                <View style={styles.planRow}>
                    <Text style={styles.planLabel}>Plan actual:</Text>
                    <Text style={styles.planBadge}>{user?.tenant?.plan?.nombre || "PRO"}</Text>
                </View>
            </View>

            <View style={styles.grid}>
                <TouchableOpacity style={styles.menuItem}>
                    <View style={[styles.iconCircle, { backgroundColor: 'rgba(56, 189, 248, 0.1)' }]}>
                        <Ionicons name="people" size={24} color="#38bdf8" />
                    </View>
                    <Text style={styles.menuLabel}>Usuarios</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.menuItem}>
                    <View style={[styles.iconCircle, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                        <Ionicons name="stats-chart" size={24} color="#10b981" />
                    </View>
                    <Text style={styles.menuLabel}>Reportes</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    scrollContent: { padding: 24 },
    header: { marginBottom: 32 },
    title: { fontSize: 32, fontWeight: '900', color: '#f8fafc' },
    highlight: { color: '#38bdf8' },
    subtitle: { color: '#94a3b8', fontSize: 16, marginTop: 8 },
    boldWhite: { color: '#f8fafc', fontWeight: '600' },
    card: { backgroundColor: '#1e293b', padding: 24, borderRadius: 24, borderWidth: 1, borderColor: '#334155', marginBottom: 24 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
    badgeText: { color: '#64748b', fontSize: 12, fontWeight: 'bold', letterSpacing: 1 },
    tenantName: { color: '#f8fafc', fontSize: 24, fontWeight: 'bold', marginBottom: 12 },
    planRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    planLabel: { color: '#94a3b8', fontSize: 14 },
    planBadge: { color: '#38bdf8', fontWeight: 'bold', fontSize: 14 },
    grid: { flexDirection: 'row', gap: 16 },
    menuItem: { flex: 1, backgroundColor: '#1e293b', padding: 20, borderRadius: 20, alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
    iconCircle: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
    menuLabel: { color: '#f8fafc', fontWeight: '600', fontSize: 14 }
});