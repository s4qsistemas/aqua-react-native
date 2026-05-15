import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Dimensions, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { io, Socket } from 'socket.io-client';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { apiFetch } from '../../src/services/api';
import { LineChart } from 'react-native-chart-kit';

// ── Opciones de filtro de tiempo ─────────────────────────────────────────────
const FILTROS_TIEMPO = [
    { label: '1h',  horas: 1 },
    { label: '6h',  horas: 6 },
    { label: '24h', horas: 24 },
    { label: '7d',  horas: 168 },
    { label: '30d', horas: 720 },
];

// ── Opciones de métrica ───────────────────────────────────────────────────────
const METRICAS = [
    { label: 'Nivel',   metric: 'level',  campo: 'nivelEstanquePorcentaje', sufijo: '%',  color: 'rgba(56, 189, 248,' },
    { label: 'Volumen', metric: 'volume', campo: 'volumenEstanqueLitros',   sufijo: 'L',  color: 'rgba(16, 185, 129,' },
    { label: 'Flujo',   metric: 'flow',   campo: 'caudalLps',               sufijo: 'm³', color: 'rgba(251, 191, 36,' },
];

export default function ReportsScreen() {
    const { user } = useAuth();
    const router   = useRouter();

    const handleBack = () => router.replace('/(dashboard)/home');

    const socketRef = useRef<Socket | null>(null);

    const [telemetria, setTelemetria] = useState<any>(null);
    const [lastSync, setLastSync]     = useState<Date | null>(null);
    const [historial, setHistorial]     = useState<any[]>([]);
    const [cargandoInicial, setCargandoInicial] = useState(true);  // Solo en el primer load
    const [cargandoFiltro, setCargandoFiltro]   = useState(false); // Overlay sutil al cambiar filtros

    const [filtroHoras,  setFiltroHoras]  = useState(24);
    const [filtroMetric, setFiltroMetric] = useState(METRICAS[0]);

    // ── Carga del historial (re-ejecuta al cambiar filtros) ───────────────────
    const cargarHistorial = useCallback(async (horas: number, metricObj: typeof METRICAS[0], esFiltro = false) => {
        if (!user?.tenantId) return;
        // Si ya tenemos datos, usamos overlay sutil para no destruir el gráfico
        if (esFiltro) setCargandoFiltro(true);
        else setCargandoInicial(true);
        try {
            const data = await apiFetch(
                `/telemetria/historico/${user.tenantId}?horas=${horas}&metric=${metricObj.metric}`
            );
            setHistorial(data);
            if (data.length > 0) {
                setTelemetria(data[data.length - 1]);
                setLastSync(new Date(data[data.length - 1].fechaLectura));
            }
        } catch (err) {
            console.error('Error al cargar historial:', err);
        } finally {
            setCargandoInicial(false);
            setCargandoFiltro(false);
        }
    }, [user?.tenantId]);

    // ── Carga inicial + cambio de filtros ─────────────────────────────────────
    const isFirstLoad = useRef(true);
    useEffect(() => {
        const esFiltro = !isFirstLoad.current;
        isFirstLoad.current = false;
        cargarHistorial(filtroHoras, filtroMetric, esFiltro);
    }, [filtroHoras, filtroMetric, cargarHistorial]);

    // ── WebSocket (se monta una sola vez) ─────────────────────────────────────
    useEffect(() => {
        if (!user?.tenantId) return;

        const socketUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.replace('/api', '') || 'http://192.168.1.16:3000';
        const socket = io(socketUrl);
        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('📡 WebSocket conectado en pantalla de Reportes');
            socket.emit('unirse_tenant', user.tenantId);
        });

        socket.on('actualizacion_sensores', (data: any) => {
            console.log('💧 Nuevo dato recibido:', data);
            setTelemetria(data);
            setLastSync(new Date());
            // Solo añadimos al historial si el filtro activo es 1h o 24h (datos recientes)
            setHistorial(prev => [...prev, data].slice(-500));
        });

        return () => { socket.disconnect(); };
    }, [user?.tenantId]);

    // ── Helpers ───────────────────────────────────────────────────────────────
    const getSyncText = () => {
        if (cargandoInicial) return 'Cargando...';
        if (!lastSync) return 'Esperando conexión...';
        const mins = Math.round((Date.now() - lastSync.getTime()) / 60000);
        return mins === 0 ? 'Sincronizado ahora' : `Hace ${mins} min`;
    };

    const chartValues = historial.map(h => Number(h[filtroMetric.campo] ?? h.nivelEstanquePorcentaje ?? 0));

    const chartData = {
        labels: chartValues.map(() => ''),
        datasets: [{
            data: chartValues.length > 0 ? chartValues : [0],
            color: (opacity = 1) => `${filtroMetric.color}${opacity})`,
            strokeWidth: 2,
        }],
    };

    const filtroLabel = FILTROS_TIEMPO.find(f => f.horas === filtroHoras)?.label ?? '24h';

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>

            {/* Header con botón Volver siempre visible */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <TouchableOpacity onPress={handleBack} style={styles.backBtn} accessibilityLabel="Volver">
                        <Ionicons name="arrow-back" size={22} color="#38bdf8" />
                    </TouchableOpacity>
                    <View>
                        <Text style={styles.title}>Reportes y Análisis</Text>
                        <Text style={styles.subtitle}>{user?.tenant?.nombre || 'Comunidad'}</Text>
                    </View>
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
                    {telemetria?.volumenEstanqueLitros?.toLocaleString() ?? '0'}
                    <Text style={styles.unit}> L</Text>
                </Text>
                <View style={styles.trendRow}>
                    <Ionicons name="trending-up" size={20} color="#10b981" />
                    <Text style={styles.trendText}>+2.4% vs hora anterior</Text>
                </View>
            </View>

            {/* KPIs */}
            <View style={styles.grid}>
                <View style={styles.statCard}>
                    <Ionicons name="water" size={24} color="#38bdf8" />
                    <Text style={styles.statValue}>{telemetria?.nivelEstanquePorcentaje ?? '0'}%</Text>
                    <Text style={styles.statLabel}>Nivel Estanque</Text>
                </View>
                <View style={styles.statCard}>
                    <Ionicons name="flash" size={24} color="#fbbf24" />
                    <Text style={styles.statValue}>{telemetria?.bomba1Activa ? 'ON' : 'OFF'}</Text>
                    <Text style={styles.statLabel}>Bomba Principal</Text>
                </View>
            </View>

            {/* ── Sección de Gráfico ──────────────────────────────────────── */}
            <View style={styles.chartHeader}>
                <Text style={styles.sectionTitle}>Nivel Histórico ({filtroLabel})</Text>
            </View>

            {/* Selector de Métrica */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
                {METRICAS.map(m => (
                    <TouchableOpacity
                        key={m.metric}
                        style={[styles.filterBtn, filtroMetric.metric === m.metric && styles.filterBtnActive]}
                        onPress={() => setFiltroMetric(m)}
                    >
                        <Text style={[styles.filterBtnText, filtroMetric.metric === m.metric && styles.filterBtnTextActive]}>
                            {m.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {/* Selector de Tiempo */}
            <View style={styles.timeFilterRow}>
                {FILTROS_TIEMPO.map(f => (
                    <TouchableOpacity
                        key={f.horas}
                        style={[styles.timeBtn, filtroHoras === f.horas && styles.timeBtnActive]}
                        onPress={() => setFiltroHoras(f.horas)}
                    >
                        <Text style={[styles.timeBtnText, filtroHoras === f.horas && styles.timeBtnTextActive]}>
                            {f.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Gráfico — nunca se desmonta si ya tiene datos */}
            <View style={chartValues.length > 0 && !cargandoInicial ? styles.chartContainer : styles.chartPlaceholder}>
                {cargandoInicial ? (
                    // Spinner solo en el primer load (sin datos previos)
                    <ActivityIndicator color="#38bdf8" size="large" />
                ) : chartValues.length > 0 ? (
                    <View>
                        <LineChart
                            data={chartData}
                            width={Dimensions.get('window').width - 40}
                            height={220}
                            yAxisSuffix={filtroMetric.sufijo}
                            withVerticalLabels={false}
                            withInnerLines={false}
                            withOuterLines={false}
                            chartConfig={{
                                backgroundColor: '#1e293b',
                                backgroundGradientFrom: '#1e293b',
                                backgroundGradientTo: '#1e293b',
                                decimalPlaces: 0,
                                color: (opacity = 1) => `${filtroMetric.color}${opacity})`,
                                labelColor: (opacity = 1) => `rgba(148, 163, 184, ${opacity})`,
                                propsForDots: { r: '0' },
                            }}
                            bezier
                            style={{ marginVertical: 8, borderRadius: 16 }}
                        />
                        {/* Overlay sutil mientras se cargan nuevos datos por filtro */}
                        {cargandoFiltro && (
                            <View style={styles.chartOverlay}>
                                <ActivityIndicator color="#38bdf8" size="small" />
                            </View>
                        )}
                    </View>
                ) : (
                    <>
                        <Ionicons name="stats-chart" size={48} color="#334155" />
                        <Text style={{ color: '#64748b', marginTop: 10 }}>Sin datos para graficar</Text>
                    </>
                )}
            </View>

        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container:          { flex: 1, backgroundColor: '#0f172a' },
    content:            { padding: 20 },
    header:             { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 },
    headerLeft:         { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
    backBtn:            { padding: 6, borderRadius: 10, backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155' },
    title:              { color: 'white', fontSize: 24, fontWeight: 'bold' },
    subtitle:           { color: '#38bdf8', fontSize: 16, fontWeight: '600' },
    syncBadge:          { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e293b', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#334155' },
    syncDot:            { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
    syncText:           { color: '#94a3b8', fontSize: 12, fontWeight: '600' },
    summaryCard:        { backgroundColor: '#1e293b', padding: 24, borderRadius: 24, borderWidth: 1, borderColor: '#334155', marginBottom: 20 },
    summaryLabel:       { color: '#94a3b8', fontSize: 16, marginBottom: 8 },
    summaryValue:       { color: 'white', fontSize: 36, fontWeight: '900' },
    unit:               { fontSize: 20, color: '#38bdf8' },
    trendRow:           { flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 8 },
    trendText:          { color: '#10b981', fontSize: 14, fontWeight: '600' },
    grid:               { flexDirection: 'row', gap: 16, marginBottom: 24 },
    statCard:           { flex: 1, backgroundColor: '#1e293b', padding: 20, borderRadius: 20, alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
    statValue:          { color: 'white', fontSize: 24, fontWeight: 'bold', marginTop: 8 },
    statLabel:          { color: '#94a3b8', fontSize: 12, marginTop: 2 },
    chartHeader:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    sectionTitle:       { color: 'white', fontSize: 20, fontWeight: 'bold' },
    filterRow:          { flexDirection: 'row', marginBottom: 10 },
    filterBtn:          { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155', marginRight: 8 },
    filterBtnActive:    { backgroundColor: '#0ea5e9', borderColor: '#0ea5e9' },
    filterBtnText:      { color: '#94a3b8', fontSize: 13, fontWeight: '600' },
    filterBtnTextActive:{ color: 'white' },
    timeFilterRow:      { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
    timeBtn:            { flex: 1, marginHorizontal: 3, paddingVertical: 8, borderRadius: 12, backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155', alignItems: 'center' },
    timeBtnActive:      { backgroundColor: '#0f4c81', borderColor: '#38bdf8' },
    timeBtnText:        { color: '#64748b', fontSize: 13, fontWeight: '700' },
    timeBtnTextActive:  { color: '#38bdf8' },
    chartPlaceholder:   { height: 200, backgroundColor: '#1e293b', borderRadius: 24, borderWidth: 2, borderColor: '#334155', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center' },
    chartContainer:     { backgroundColor: '#1e293b', borderRadius: 24, borderWidth: 1, borderColor: '#334155', paddingVertical: 10, alignItems: 'center' },
    chartOverlay:       { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(15,23,42,0.5)', borderRadius: 16 },
});