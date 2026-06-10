import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Dimensions, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { io, Socket } from 'socket.io-client';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { apiFetch } from '../../src/services/api';
import { LineChart } from 'react-native-chart-kit';

const FILTROS_TIEMPO = [
    { label: '1h',  horas: 1 },
    { label: '6h',  horas: 6 },
    { label: '24h', horas: 24 },
    { label: '7d',  horas: 168 },
    { label: '30d', horas: 720 },
];

const METRICAS = [
    { label: 'Nivel',   metric: 'level',  campo: 'nivelEstanquePorcentaje', sufijo: '%',    color: 'rgba(56, 189, 248,' },
    { label: 'Volumen', metric: 'volume', campo: 'volumenEstanqueLitros',   sufijo: ' L',   color: 'rgba(16, 185, 129,' },
    { label: 'Flujo',   metric: 'flow',   campo: 'caudalLps',               sufijo: ' m³/h',color: 'rgba(251, 191, 36,' },
];

export default function ReportsScreen() {
    const { user } = useAuth();
    const router = useRouter();

    const socketRef = useRef<Socket | null>(null);

    const [telemetria, setTelemetria] = useState<any>(null);
    const [lastSync, setLastSync] = useState<Date | null>(null);
    const [historial, setHistorial] = useState<any[]>([]);
    
    const [cargandoInicial, setCargandoInicial] = useState(true);
    const [cargandoFiltro, setCargandoFiltro] = useState(false);
    const [filtroHoras, setFiltroHoras] = useState(24);
    const [filtroMetric, setFiltroMetric] = useState(METRICAS[0]);

    const [chartContainerWidth, setChartContainerWidth] = useState(Dimensions.get('window').width - 40);

    const cargarHistorial = useCallback(async (horas: number, metricObj: typeof METRICAS[0], esFiltro = false) => {
        if (!user?.tenantId) return;
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

    const isFirstLoad = useRef(true);
    useEffect(() => {
        const esFiltro = !isFirstLoad.current;
        isFirstLoad.current = false;
        cargarHistorial(filtroHoras, filtroMetric, esFiltro);
    }, [filtroHoras, filtroMetric, cargarHistorial]);

    useEffect(() => {
        if (!user?.tenantId) {
            console.warn('⚠️ tenantId no disponible:', user);
            return;
        }

        console.log('🔗 Iniciando conexión WebSocket...');
        console.log('👤 Usuario tenantId:', user.tenantId, 'Tipo:', typeof user.tenantId);

        const socketUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.replace('/api', '') || 'http://192.168.1.20:3000';
        console.log('🌐 Socket URL:', socketUrl);
        
        const socket = io(socketUrl, {
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            reconnectionAttempts: 5
        });
        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('✅ WebSocket conectado, ID:', socket.id);
            console.log(`📤 Emitiendo unirse_tenant con ID: ${user.tenantId}`);
            socket.emit('unirse_tenant', user.tenantId);
        });

        socket.on('connect_error', (err: any) => {
            console.error('❌ Error de conexión WebSocket:', err);
        });

        socket.on('actualizacion_sensores', (data: any) => {
            console.log('✨ DATO RECIBIDO POR WEBSOCKET:', data);
            setTelemetria(data);
            setLastSync(new Date());
            setHistorial(prev => [...prev, data].slice(-500));
        });

        return () => {
            console.log('🔌 Desconectando WebSocket');
            socket.disconnect();
        };
    }, [user?.tenantId]);

    const handleBack = () => router.replace('/(dashboard)/home');

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
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
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

            <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>Volumen Actual</Text>
                <Text style={styles.summaryValue}>
                    {telemetria?.volumenEstanqueLitros?.toLocaleString() ?? '0'}
                    <Text style={styles.unit}> L</Text>
                </Text>
            </View>

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

            <View style={styles.chartHeader}>
                <Text style={styles.sectionTitle}>Nivel Histórico ({filtroLabel})</Text>
            </View>

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

            <View style={chartValues.length > 0 && !cargandoInicial ? styles.chartContainer : styles.chartPlaceholder}>
                {cargandoInicial ? (
                    <ActivityIndicator color="#38bdf8" size="large" />
                ) : chartValues.length > 0 ? (
                    <View
                        style={{ overflow: 'hidden', width: '100%', alignItems: 'center' }}
                        onLayout={(event) => {
                            // Esta función "mide" la caja en tiempo real, ya sea en web o móvil.
                            const { width } = event.nativeEvent.layout;
                            setChartContainerWidth(width);
                        }}
                    >
                        <LineChart
                            data={chartData}
                            width={chartContainerWidth}
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
    container:          { flex: 1, backgroundColor: '#0f172a', minHeight: Dimensions.get('window').height },
    content:            { padding: 20, paddingBottom: 60 },
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
    chartContainer:     { backgroundColor: '#1e293b', borderRadius: 24, borderWidth: 1, borderColor: '#334155', paddingVertical: 10, paddingHorizontal: 0, alignItems: 'center', overflow: 'hidden', width: '100%' },
    chartOverlay:       { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(15,23,42,0.5)', borderRadius: 16 },
});