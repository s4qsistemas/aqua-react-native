import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { io } from 'socket.io-client';
import { useAuth } from '../../src/context/AuthContext';
import { apiFetch } from '../../src/services/api'; // Importación necesaria para el histórico

export default function ReportsScreen() {
    const { user } = useAuth();

    // Estado para el dato vivo (La Foto Actual)
    const [telemetria, setTelemetria] = useState<any>(null);
    const [lastSync, setLastSync] = useState<Date | null>(null);

    // Estados para el historial (La Película)
    const [historial, setHistorial] = useState<any[]>([]);
    const [cargandoHistorial, setCargandoHistorial] = useState(true);

    useEffect(() => {
        if (!user?.tenantId) return;

        // 1. CARGA INICIAL: Obtener las últimas 24 horas de la DB
        const cargarHistorial = async () => {
            try {
                const data = await apiFetch(`/telemetria/historico/${user.tenantId}?horas=24`);
                setHistorial(data);
                // Si hay datos en el historial, tomamos el último como "foto actual" inicial
                if (data.length > 0) {
                    setTelemetria(data[data.length - 1]);
                    setLastSync(new Date(data[data.length - 1].fechaLectura));
                }
            } catch (error) {
                console.error("Error al cargar historial:", error);
            } finally {
                setCargandoHistorial(false);
            }
        };

        cargarHistorial();

        // 2. CONEXIÓN REAL-TIME: Escuchar actualizaciones futuras
        const socketUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.replace('/api', '') || 'http://192.168.1.16:3000';
        const socket = io(socketUrl);

        socket.on('connect', () => {
            console.log('📡 WebSocket conectado en pantalla de Reportes');
            socket.emit('unirse_tenant', user.tenantId);
        });

        socket.on('actualizacion_sensores', (data) => {
            console.log('💧 Nuevo dato recibido:', data);
            setTelemetria(data);
            setLastSync(new Date());

            // Inyectamos el nuevo dato al arreglo del historial para que el gráfico se mueva solo
            setHistorial(prev => [...prev, data].slice(-288));
        });

        return () => {
            socket.disconnect();
        };
    }, [user?.tenantId]);

    const getSyncText = () => {
        if (cargandoHistorial) return 'Cargando historial...';
        if (!lastSync) return 'Esperando conexión...';
        const diffMs = new Date().getTime() - lastSync.getTime();
        const diffMins = Math.round(diffMs / 60000);
        return diffMins === 0 ? 'Sincronizado ahora' : `Sincronizado hace ${diffMins} min`;
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>Reportes y Análisis</Text>
                    <Text style={styles.subtitle}>{user?.tenant?.nombre || 'Comunidad'}</Text>
                </View>
                <View style={styles.syncBadge}>
                    <View style={[styles.syncDot, { backgroundColor: lastSync ? '#10b981' : '#f59e0b' }]} />
                    <Text style={styles.syncText}>{getSyncText()}</Text>
                </View>
            </View>

            {/* Resumen Principal */}
            <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>Volumen Actual</Text>
                <Text style={styles.summaryValue}>
                    {telemetria?.volumenEstanqueLitros?.toLocaleString() || '0'}
                    <Text style={styles.unit}> L</Text>
                </Text>
                <View style={styles.trendRow}>
                    <Ionicons name="trending-up" size={20} color="#10b981" />
                    <Text style={styles.trendText}>+2.4% vs hora anterior</Text>
                </View>
            </View>

            {/* Grid de KPIs */}
            <View style={styles.grid}>
                <View style={styles.statCard}>
                    <Ionicons name="water" size={24} color="#38bdf8" />
                    <Text style={styles.statValue}>{telemetria?.nivelEstanquePorcentaje || '0'}%</Text>
                    <Text style={styles.statLabel}>Nivel Estanque</Text>
                </View>
                <View style={styles.statCard}>
                    <Ionicons name="flash" size={24} color="#fbbf24" />
                    <Text style={styles.statValue}>{telemetria?.bomba1Activa ? 'ON' : 'OFF'}</Text>
                    <Text style={styles.statLabel}>Bomba Principal</Text>
                </View>
            </View>

            {/* Sección de Gráfico */}
            <Text style={styles.sectionTitle}>Nivel Histórico (24h)</Text>
            <View style={styles.chartPlaceholder}>
                {cargandoHistorial ? (
                    <ActivityIndicator color="#38bdf8" size="large" />
                ) : (
                    <>
                        <Ionicons name="stats-chart" size={48} color="#334155" />
                        <Text style={{ color: '#64748b', marginTop: 10 }}>
                            {historial.length} puntos listos para graficar
                        </Text>
                    </>
                )}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f172a' },
    content: { padding: 20 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 30 },
    title: { color: 'white', fontSize: 28, fontWeight: 'bold' },
    subtitle: { color: '#38bdf8', fontSize: 16, fontWeight: '600' },
    syncBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e293b', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#334155' },
    syncDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
    syncText: { color: '#94a3b8', fontSize: 12, fontWeight: '600' },
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
    chartPlaceholder: { height: 200, backgroundColor: '#1e293b', borderRadius: 24, borderWidth: 2, borderColor: '#334155', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center' }
});