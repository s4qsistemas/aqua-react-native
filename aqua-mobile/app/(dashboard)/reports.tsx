import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function ReportsScreen() {
    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>Consumo Total del Mes</Text>
                <Text style={styles.summaryValue}>1,240 <Text style={styles.unit}>m³</Text></Text>
                <View style={styles.trendRow}>
                    <Ionicons name="trending-down" size={16} color="#10b981" />
                    <Text style={styles.trendText}>12% menos que el mes anterior</Text>
                </View>
            </View>

            <View style={styles.grid}>
                <View style={styles.statCard}>
                    <Ionicons name="water" size={24} color="#38bdf8" />
                    <Text style={styles.statValue}>450</Text>
                    <Text style={styles.statLabel}>Lecturas</Text>
                </View>
                <View style={styles.statCard}>
                    <Ionicons name="alert-circle" size={24} color="#f59e0b" />
                    <Text style={styles.statValue}>12</Text>
                    <Text style={styles.statLabel}>Alertas</Text>
                </View>
            </View>

            <Text style={styles.sectionTitle}>Análisis de Red</Text>
            <View style={styles.chartPlaceholder}>
                <Ionicons name="stats-chart" size={48} color="#334155" />
                <Text style={styles.placeholderText}>Gráfico de consumo en tiempo real</Text>
            </View>

            <View style={styles.infoCard}>
                <View style={styles.infoRow}>
                    <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                    <Text style={styles.infoText}>Sistema operando con normalidad</Text>
                </View>
                <View style={[styles.infoRow, { marginTop: 12 }]}>
                    <Ionicons name="time" size={20} color="#38bdf8" />
                    <Text style={styles.infoText}>Última sincronización: hace 5 min</Text>
                </View>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f172a' },
    content: { padding: 20 },
    summaryCard: { backgroundColor: '#1e293b', padding: 24, borderRadius: 24, borderWidth: 1, borderColor: '#334155', marginBottom: 20 },
    summaryLabel: { color: '#94a3b8', fontSize: 16, marginBottom: 8 },
    summaryValue: { color: 'white', fontSize: 36, fontWeight: '900' },
    unit: { fontSize: 20, color: '#38bdf8' },
    trendRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 8 },
    trendText: { color: '#10b981', fontSize: 14, fontWeight: '600' },
    grid: { flexDirection: 'row', gap: 16, marginBottom: 24 },
    statCard: { flex: 1, backgroundColor: '#1e293b', padding: 20, borderRadius: 20, alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
    statValue: { color: 'white', fontSize: 24, fontWeight: 'bold', marginTop: 8 },
    statLabel: { color: '#94a3b8', fontSize: 12, marginTop: 2 },
    sectionTitle: { color: 'white', fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
    chartPlaceholder: { height: 200, backgroundColor: '#1e293b', borderRadius: 24, borderWidth: 2, borderColor: '#334155', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
    placeholderText: { color: '#475569', fontSize: 14, marginTop: 12 },
    infoCard: { backgroundColor: 'rgba(56, 189, 248, 0.05)', padding: 20, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(56, 189, 248, 0.2)' },
    infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    infoText: { color: '#e2e8f0', fontSize: 14 }
});
