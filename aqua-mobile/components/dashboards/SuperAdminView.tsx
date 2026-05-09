import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    Modal, TextInput, Alert, ActivityIndicator, ScrollView,
    useWindowDimensions, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { apiFetch } from '../../src/services/api';
import UsersFormModal from '../UsersFormModal';
import UserCascadingEditModal from '../UserCascadingEditModal';
import { io } from 'socket.io-client';

// 0. Define qué puede recibir
interface Props {
    user?: any;
    tenants?: any[];
}

export default function SuperAdminView({ user, tenants: externalTenants }: Props) {
    const { width } = useWindowDimensions();
    const isWide = width > 768; // Punto de quiebre para considerar la pantalla "ancha" (Web/Tablet)

    // 1. Estados principales
    const [listaComunidades, setListaComunidades] = useState<any[]>(externalTenants || []);
    const [planes, setPlanes] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);
    const [userModalVisible, setUserModalVisible] = useState(false);
    const [cascadeModalVisible, setCascadeModalVisible] = useState(false);
    const [historyEvents, setHistoryEvents] = useState<any[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPlanPicker, setShowPlanPicker] = useState(false);
    const [showAdminPicker, setShowAdminPicker] = useState(false);
    const [nombre, setNombre] = useState('');
    const [planId, setPlanId] = useState<string | number | null>(null);
    const [adminId, setAdminId] = useState<string | number | null>(null);
    const [currentTenantUsers, setCurrentTenantUsers] = useState<any[]>([]);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [modalTab, setModalTab] = useState<'GENERAL' | 'HISTORY'>('GENERAL');

    // 3. Lógica de red
    const cargarComunidades = async () => {
        console.log("🚀 SuperAdminView: Intentando cargar comunidades...");
        try {
            setIsLoading(true);
            const data = await apiFetch('/tenants');
            console.log("✅ SuperAdminView: Comunidades cargadas.");
            if (Array.isArray(data)) {
                setListaComunidades(data);
            }
        } catch (error: any) {
            console.error("❌ SuperAdminView Error Comunidades:", error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const cargarPlanes = async () => {
        console.log("🚀 SuperAdminView: Intentando cargar planes...");
        try {
            const data = await apiFetch('/tenants/planes');
            console.log("✅ SuperAdminView: Planes cargados.");
            setPlanes(data);
        } catch (error: any) {
            console.error("❌ SuperAdminView Error Planes:", error.message);
        }
    };

    useEffect(() => {
        cargarComunidades();
        cargarPlanes();
    }, []);

    useEffect(() => {
        const envUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
        const defaultIP = "http://192.168.1.8:3000/api";

        let apiBase = envUrl || defaultIP;

        if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
            apiBase = "http://localhost:3000/api";
        }

        const socketUrl = apiBase.replace('/api', '');
        console.log("🔗 Intentando conectar Socket a:", socketUrl);

        const socket = io(socketUrl, {
            transports: ['websocket', 'polling'], // Permitir polling si websocket falla
            forceNew: true
        });

        socket.on('connect', () => {
            console.log("✅ Socket conectado con ID:", socket.id);
        });

        socket.on('connect_error', (err) => {
            console.error("❌ Error de conexión Socket:", err.message);
        });

        socket.on('comunidades_actualizadas', () => {
            console.log("🔄 Actualización recibida vía Socket");
            cargarComunidades();
        });

        return () => {
            console.log("🔌 Desconectando Socket...");
            socket.disconnect();
        };
    }, []);

    // 4. Manejadores de Modales y Acciones
    const openCreateModal = () => {
        setEditingId(null);
        setNombre('');
        setPlanId(null);
        setAdminId(null);
        setCurrentTenantUsers([]);
        setShowPlanPicker(false);
        setModalTab('GENERAL');
        setModalVisible(true);
    };

    const openUserManagement = () => {
        setSelectedUser(null);
        setUserModalVisible(true);
    };

    const openCascadeManagement = () => {
        setCascadeModalVisible(true);
    };

    const openEditModal = (tenant: any) => {
        setEditingId(tenant.id);
        setNombre(tenant.nombre);
        setPlanId(tenant.planId || null);
        setCurrentTenantUsers(tenant.usuarios || []);
        if (tenant.usuarios && tenant.usuarios.length > 0) {
            setAdminId(tenant.usuarios[0].id);
        } else {
            setAdminId(null);
        }
        setShowAdminPicker(false);
        setModalTab('GENERAL');
        setModalVisible(true);
        // Cargar historial automáticamente al editar
        openHistory(tenant.id, tenant.nombre, false);
    };

    const handleSave = async () => {
        if (!nombre.trim()) {
            Alert.alert('Validación', 'El nombre es obligatorio');
            return;
        }
        if (!editingId && !planId) {
            Alert.alert('Validación', 'El plan es obligatorio');
            return;
        }
        setIsSubmitting(true);
        try {
            if (editingId) {
                // Obtenemos el tenant actual para ver si el plan cambió
                const tenantActual = listaComunidades.find(t => t.id === editingId);
                const planHaCambiado = tenantActual && tenantActual.planId !== planId;

                await apiFetch(`/tenants/${editingId}`, {
                    method: 'PUT',
                    body: JSON.stringify({
                        nombre,
                        planId: planId ? Number(planId) : undefined,
                        adminId: adminId ? Number(adminId) : undefined,
                        nota: planHaCambiado ? `Cambio de plan a ${planes.find(p => p.id === planId)?.nombre}` : "Actualización de información general"
                    })
                });
                Alert.alert('Éxito', 'Comunidad actualizada correctamente');
            } else {
                await apiFetch('/tenants', {
                    method: 'POST',
                    body: JSON.stringify({
                        nombre,
                        planId: planId ? Number(planId) : undefined,
                        estado: 'ACTIVO'
                    })
                });
                Alert.alert('Éxito', 'Comunidad creada correctamente');
            }
            setModalVisible(false);
            cargarComunidades();
        } catch (error: any) {
            Alert.alert('Error', error.message || 'No se pudo guardar la comunidad');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleConfirmUserForm = async (formData: any, userId?: number) => {
        try {
            setIsSubmitting(true);
            if (userId) {
                await apiFetch(`/usuarios/${userId}`, { method: 'PUT', body: JSON.stringify(formData) });
                Alert.alert('Éxito', 'Usuario actualizado correctamente');
            } else {
                const response = await apiFetch('/usuarios', { method: 'POST', body: JSON.stringify(formData) });
                Alert.alert('¡Usuario creado!', `Email: ${response.email}\nClave: ${response.tempPassword}`);
            }
            setUserModalVisible(false);
            cargarComunidades();
        } catch (error: any) {
            Alert.alert('Error', error.message || 'No se pudo guardar el usuario');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleToggleUserStatus = (userId: number, nuevoEstado: string) => {
        const ejecutarCambio = async () => {
            try {
                setIsSubmitting(true);
                await apiFetch(`/usuarios/${userId}/estado`, { method: 'PATCH', body: JSON.stringify({ estado: nuevoEstado }) });
                cargarComunidades();
                setUserModalVisible(false);
            } catch (e) { Alert.alert('Error', 'No se pudo cambiar el estado'); } finally { setIsSubmitting(false); }
        };

        if (Platform.OS === 'web') {
            if (window.confirm("¿Seguro que deseas cambiar el estado de este usuario?")) {
                ejecutarCambio();
            }
        } else {
            Alert.alert("Confirmar", "¿Seguro que deseas cambiar el estado de este usuario?", [
                { text: "Cancelar", style: "cancel" },
                { text: "Confirmar", onPress: ejecutarCambio }
            ]);
        }
    };

    const handleResetUserPassword = async (userId: number) => {
        try {
            const response = await apiFetch(`/usuarios/${userId}/reset-password`, { method: 'POST' });
            Alert.alert('Clave Reseteada', `Nueva Clave: ${response.tempPassword}`);
        } catch (e) { Alert.alert('Error', 'No se pudo resetear la clave'); }
    };

    const openHistory = async (tenantId: string, tenantNombre: string, showModal = true) => {
        try {
            const data = await apiFetch(`/tenants/${tenantId}/historial`);
            setHistoryEvents(data);
            setNombre(tenantNombre);
            if (showModal) {
                setModalTab('HISTORY');
                setEditingId(tenantId);
                setModalVisible(true);
            }
        } catch (e) {
            console.error("Error al cargar historial:", e);
        }
    };

    const toggleStatus = (tenant: any) => {
        const nuevoEstado = tenant.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';

        const ejecutarCambio = async () => {
            try {
                await apiFetch(`/tenants/${tenant.id}/estado`, {
                    method: 'PATCH',
                    body: JSON.stringify({
                        estado: nuevoEstado,
                        nota: `Cambio de estado a ${nuevoEstado} por administrador`
                    })
                });
                cargarComunidades();
                if (modalVisible && editingId === tenant.id) {
                    openHistory(tenant.id, tenant.nombre, false);
                }
            } catch (e) { Alert.alert('Error', 'No se pudo cambiar el estado'); }
        };

        if (Platform.OS === 'web') {
            if (window.confirm(`¿Deseas cambiar el estado a ${nuevoEstado} para la comunidad ${tenant.nombre}?`)) {
                ejecutarCambio();
            }
        } else {
            Alert.alert("Confirmar", `¿Deseas cambiar el estado a ${nuevoEstado}?`, [
                { text: "Cancelar", style: "cancel" },
                { text: "Confirmar", onPress: ejecutarCambio }
            ]);
        }
    };

    const renderTenantItem = ({ item: t }: { item: any }) => {
        const adminPrincipal = t.usuarios?.find((u: any) => u.isPrimary) || t.usuarios?.[0];

        return (
            <View style={[styles.tenantCard, isWide && styles.tenantCardWide]}>
                <View style={styles.tenantHeader}>
                    <Text style={styles.tenantTitle}>{t.nombre}</Text>
                    <View style={[styles.statusBadge, t.estado === 'INACTIVO' && { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                        <Text style={[styles.statusText, t.estado === 'INACTIVO' && { color: '#ef4444' }]}>{t.estado || 'ACTIVO'}</Text>
                    </View>
                </View>
                <View style={styles.tenantInfo}>
                    <View style={styles.infoRow}>
                        <Ionicons name="person-outline" size={14} color="#94a3b8" />
                        <Text style={styles.tenantAdmin}>{adminPrincipal?.nombre || 'Sin admin'}</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Ionicons name="ribbon-outline" size={14} color="#3b82f6" />
                        <Text style={styles.tenantPlan}>Plan: {t.plan?.nombre || "Básico"}</Text>
                    </View>
                </View>
                <View style={styles.tenantActions}>
                    <TouchableOpacity style={styles.iconBtn} onPress={() => openEditModal(t)}><Ionicons name="create-outline" size={20} color="#3b82f6" /></TouchableOpacity>
                    <TouchableOpacity style={styles.iconBtn} onPress={() => toggleStatus(t)}><Ionicons name={t.estado === 'ACTIVO' ? "power" : "refresh-outline"} size={20} color={t.estado === 'ACTIVO' ? "#ef4444" : "#10b981"} /></TouchableOpacity>
                    <TouchableOpacity style={styles.iconBtn} onPress={() => openHistory(t.id, t.nombre)}><Ionicons name="time-outline" size={20} color="#818cf8" /></TouchableOpacity>
                </View>
            </View>
        );
    };

    const renderEmptyState = () => (
        <View style={styles.emptyStateCard}>
            <View style={styles.emptyStateIconContainer}>
                <Ionicons name="business-outline" size={48} color="#38bdf8" />
            </View>
            <Text style={styles.emptyStateTitle}>No hay comunidades</Text>
            <Text style={styles.emptyStateDesc}>
                Aún no has registrado ninguna comunidad. Crea la primera para empezar a gestionar usuarios y planes.
            </Text>
            <TouchableOpacity style={styles.emptyStateBtn} onPress={openCreateModal}>
                <Ionicons name="add-circle-outline" size={20} color="white" />
                <Text style={styles.emptyStateBtnText}>Nueva Comunidad</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={[styles.headerRow, isWide && styles.wideContainer]}>
                <View style={{ flex: 1 }}><Text style={styles.title}>Gestión de <Text style={styles.highlight}>Comunidades</Text></Text></View>
                <View style={styles.headerActions}>
                    <TouchableOpacity
                        style={[styles.usersButton, { backgroundColor: 'rgba(56, 189, 248, 0.1)' }]}
                        onPress={openCascadeManagement}
                    >
                        <Ionicons name="create-outline" size={20} color="#38bdf8" />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.usersButton} onPress={openUserManagement}>
                        <Ionicons name="people-outline" size={20} color="#818cf8" /><Text style={styles.usersButtonText}></Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.fabButton} onPress={openCreateModal}><Ionicons name="add" size={24} color="white" /></TouchableOpacity>
                </View>
            </View>

            <View style={[isWide && styles.wideContainer, { flex: 1 }]}>
                <Text style={styles.sectionTitle}>Comunidades Activas</Text>
                {isLoading ? (
                    <ActivityIndicator size="large" color="#38bdf8" style={{ marginTop: 50 }} />
                ) : (
                    <FlatList
                        data={listaComunidades}
                        keyExtractor={(item) => item.id?.toString()}
                        renderItem={renderTenantItem}
                        ListEmptyComponent={renderEmptyState}
                        // Lógica responsiva para las columnas
                        numColumns={isWide ? 2 : 1}
                        key={isWide ? 'wide-grid' : 'mobile-list'}
                        contentContainerStyle={styles.listContent}
                        // Si hay más de 1 columna, le decimos cómo espaciarlas
                        columnWrapperStyle={isWide ? styles.columnWrapper : undefined}
                    />
                )}
            </View>

            {/* Modal Responsivo */}
            <Modal visible={modalVisible} animationType="fade" transparent={true}>
                <View style={styles.modalOverlay}>
                    {/* El contenedor principal ahora respeta el maxWidth en web */}
                    <View style={[styles.modalContent, isWide && styles.modalContentWide]}>
                        <TouchableOpacity style={styles.closeBtn} onPress={() => setModalVisible(false)}>
                            <Ionicons name="close" size={24} color="#94a3b8" />
                        </TouchableOpacity>
                        <View style={styles.modalHeader}>
                            <View style={styles.iconContainer}><Ionicons name="business" size={32} color="#3b82f6" /></View>
                            <Text style={styles.modalTitle}>{editingId ? 'Gestionar Comunidad' : 'Nueva Comunidad'}</Text>
                        </View>

                        {/* Selector de Pestañas (Solo en Edición) */}
                        {editingId && (
                            <View style={styles.tabContainer}>
                                <TouchableOpacity
                                    style={[styles.tab, modalTab === 'GENERAL' && styles.activeTab]}
                                    onPress={() => setModalTab('GENERAL')}
                                >
                                    <Text style={[styles.tabText, modalTab === 'GENERAL' && styles.activeTabText]}>Información</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.tab, modalTab === 'HISTORY' && styles.activeTab]}
                                    onPress={() => setModalTab('HISTORY')}
                                >
                                    <Text style={[styles.tabText, modalTab === 'HISTORY' && styles.activeTabText]}>Historial</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        <ScrollView
                            showsVerticalScrollIndicator={true}
                            style={{ flexGrow: 0, flexShrink: 1 }}
                            contentContainerStyle={{ paddingBottom: 20 }}
                        >
                            {modalTab === 'GENERAL' ? (
                                <>
                                    <View style={styles.fieldGroup}>
                                        <Text style={styles.fieldLabel}>Nombre</Text>
                                        <TextInput style={styles.input} value={nombre} onChangeText={setNombre} placeholder="Nombre de la comunidad" placeholderTextColor="#64748b" />
                                    </View>

                                    <View style={[isWide ? styles.row : styles.column, { zIndex: 100 }]}>
                                        {/* Selector de Plan */}
                                        <View style={[styles.fieldGroup, { flex: isWide ? 1 : 0, width: isWide ? 'auto' : '100%', marginRight: isWide ? 8 : 0, zIndex: showPlanPicker ? 200 : 1 }]}>
                                            <Text style={styles.fieldLabel}>Plan</Text>
                                            <TouchableOpacity style={styles.pickerTrigger} onPress={() => { setShowPlanPicker(!showPlanPicker); setShowAdminPicker(false); }}>
                                                <Text style={styles.pickerText}>{planes.find(p => p.id === planId)?.nombre || "Sel. Plan"}</Text>
                                                <Ionicons name={showPlanPicker ? "chevron-up" : "chevron-down"} size={16} color="#64748b" />
                                            </TouchableOpacity>
                                            {showPlanPicker && (
                                                <View style={styles.dropdownAbsolute}>
                                                    {planes.map(p => (
                                                        <TouchableOpacity key={p.id} style={styles.dropdownOption} onPress={() => { setPlanId(p.id); setShowPlanPicker(false); }}>
                                                            <Text style={[styles.dropdownText, planId === p.id && { color: '#3b82f6' }]}>{p.nombre}</Text>
                                                        </TouchableOpacity>
                                                    ))}
                                                </View>
                                            )}
                                        </View>

                                        {/* Selector de Administrador (Solo en Edición) */}
                                        {editingId && (
                                            <View style={[styles.fieldGroup, { flex: isWide ? 1 : 0, width: isWide ? 'auto' : '100%', marginLeft: isWide ? 8 : 0, marginTop: isWide ? 0 : 16, zIndex: showAdminPicker ? 200 : 1 }]}>
                                                <Text style={styles.fieldLabel}>Administrador</Text>
                                                <TouchableOpacity style={styles.pickerTrigger} onPress={() => { setShowAdminPicker(!showAdminPicker); setShowPlanPicker(false); }}>
                                                    <Text style={styles.pickerText} numberOfLines={1}>{currentTenantUsers.find(u => u.id === adminId)?.nombre || "Sin Admin"}</Text>
                                                    <Ionicons name={showAdminPicker ? "chevron-up" : "chevron-down"} size={16} color="#64748b" />
                                                </TouchableOpacity>
                                                {showAdminPicker && (
                                                    <View style={styles.dropdownAbsolute}>
                                                        <ScrollView style={{ maxHeight: 150 }} nestedScrollEnabled={true}>
                                                            {currentTenantUsers.length === 0 ? (
                                                                <Text style={styles.dropdownText}>No hay usuarios</Text>
                                                            ) : (
                                                                currentTenantUsers.map(u => (
                                                                    <TouchableOpacity key={u.id} style={styles.dropdownOption} onPress={() => { setAdminId(u.id); setShowAdminPicker(false); }}>
                                                                        <Text style={[styles.dropdownText, adminId === u.id && { color: '#3b82f6' }]}>{u.nombre}</Text>
                                                                    </TouchableOpacity>
                                                                ))
                                                            )}
                                                        </ScrollView>
                                                    </View>
                                                )}
                                            </View>
                                        )}
                                    </View>

                                    {/* Sección de Estado (Solo en Edición) */}
                                    {editingId && (
                                        <View style={styles.securitySection}>
                                            <View style={styles.securityRow}>
                                                <Text style={styles.securityLabel}>Estado de Comunidad</Text>
                                                <TouchableOpacity
                                                    onPress={() => toggleStatus(listaComunidades.find(t => t.id === editingId))}
                                                    style={[styles.securityBtn, listaComunidades.find(t => t.id === editingId)?.estado === 'ACTIVO' ? styles.btnDeactivate : styles.btnActivate]}
                                                >
                                                    <Text style={[styles.securityBtnText, listaComunidades.find(t => t.id === editingId)?.estado === 'ACTIVO' ? { color: '#ef4444' } : { color: '#10b981' }]}>
                                                        {listaComunidades.find(t => t.id === editingId)?.estado === 'ACTIVO' ? "Desactivar" : "Activar"}
                                                    </Text>
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    )}
                                </>
                            ) : (
                                <View style={styles.historyContainer}>
                                    {historyEvents.length === 0 ? (
                                        <View style={styles.emptyHistory}>
                                            <Ionicons name="document-text-outline" size={48} color="#334155" />
                                            <Text style={styles.emptyHistoryText}>No hay eventos registrados</Text>
                                        </View>
                                    ) : (
                                        historyEvents.map((event, idx) => (
                                            <View key={event.id || idx} style={styles.historyItem}>
                                                <View style={styles.historyIconLine}>
                                                    <View style={[
                                                        styles.historyIcon,
                                                        {
                                                            backgroundColor:
                                                                event.tipo === 'CAMBIO_PLAN' ? 'rgba(59, 130, 246, 0.2)' :
                                                                    event.tipo === 'CAMBIO_ADMIN' ? 'rgba(129, 140, 248, 0.2)' :
                                                                        'rgba(16, 185, 129, 0.2)'
                                                        }
                                                    ]}>
                                                        <Ionicons
                                                            name={
                                                                event.tipo === 'CAMBIO_PLAN' ? "ribbon" :
                                                                    event.tipo === 'CAMBIO_ADMIN' ? "person" :
                                                                        "power"
                                                            }
                                                            size={16}
                                                            color={
                                                                event.tipo === 'CAMBIO_PLAN' ? "#3b82f6" :
                                                                    event.tipo === 'CAMBIO_ADMIN' ? "#818cf8" :
                                                                        "#10b981"
                                                            }
                                                        />
                                                    </View>
                                                    {idx !== historyEvents.length - 1 && <View style={styles.historyLine} />}
                                                </View>
                                                <View style={styles.historyBody}>
                                                    <Text style={styles.historyTitle}>
                                                        {event.tipo === 'CAMBIO_PLAN' ? 'Cambio de Plan' :
                                                            event.tipo === 'CAMBIO_ADMIN' ? 'Cambio de Administrador' :
                                                                event.tipo === 'ACTIVACION' ? 'Comunidad Activada' : 'Comunidad Desactivada'}
                                                    </Text>
                                                    <Text style={styles.historyDesc}>{event.nota || 'Sin detalles adicionales'}</Text>
                                                    <View style={styles.historyMeta}>
                                                        <Text style={styles.historyTime}>{new Date(event.createdAt).toLocaleDateString()} {new Date(event.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                                                        <Text style={styles.historyUser}>• {event.usuario?.nombre || 'Sistema'}</Text>
                                                    </View>
                                                </View>
                                            </View>
                                        ))
                                    )}
                                </View>
                            )}
                        </ScrollView>

                        {modalTab === 'GENERAL' && (
                            <View style={styles.modalFooter}>
                                <TouchableOpacity style={[styles.btnConfirm, isSubmitting && { opacity: 0.7 }]} onPress={handleSave} disabled={isSubmitting}>
                                    {isSubmitting ? <ActivityIndicator color="white" /> : <Text style={styles.btnConfirmText}>Guardar</Text>}
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </View>
            </Modal>

            <UsersFormModal isOpen={userModalVisible} onClose={() => setUserModalVisible(false)} onConfirm={handleConfirmUserForm} tenants={listaComunidades} initialData={selectedUser} onToggleStatus={handleToggleUserStatus} onResetPassword={handleResetUserPassword} />
            <UserCascadingEditModal
                isOpen={cascadeModalVisible}
                onClose={() => setCascadeModalVisible(false)}
                tenants={listaComunidades}
                onEditUser={(u: any) => {
                    setSelectedUser(u);
                    setCascadeModalVisible(false);
                    setUserModalVisible(true);
                }}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f172a' },
    wideContainer: { width: '100%', maxWidth: 1200, alignSelf: 'center' },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24 },
    title: { fontSize: 24, fontWeight: '900', color: '#f8fafc' },
    highlight: { color: '#38bdf8' },
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    usersButton: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(129, 140, 248, 0.1)', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 16 },
    usersButtonText: { color: '#818cf8', fontWeight: 'bold', fontSize: 14 },
    fabButton: { backgroundColor: '#2563eb', width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
    sectionTitle: { color: '#94a3b8', fontSize: 14, fontWeight: 'bold', marginHorizontal: 24, marginBottom: 16, textTransform: 'uppercase' },

    // Estilos de la lista y la grilla responsiva
    listContent: { paddingHorizontal: 24, paddingBottom: 24, gap: 16 },
    columnWrapper: { gap: 16 }, // Espacio horizontal entre tarjetas en la Web
    tenantCard: { backgroundColor: '#1e293b', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: '#334155' },
    tenantCardWide: { flex: 1 }, // Flex 1 hace que ocupen el 50% exacto de la pantalla ancha sin romper los márgenes

    tenantHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
    tenantTitle: { color: 'white', fontSize: 18, fontWeight: 'bold' },
    statusBadge: { backgroundColor: 'rgba(16, 185, 129, 0.1)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    statusText: { color: '#10b981', fontSize: 10, fontWeight: 'bold' },
    tenantInfo: { marginBottom: 16 },
    infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
    tenantAdmin: { color: '#94a3b8', fontSize: 13 },
    tenantPlan: { color: '#3b82f6', fontSize: 13, fontWeight: '600' },
    tenantActions: { flexDirection: 'row', gap: 10, justifyContent: 'flex-end' },
    iconBtn: { width: 40, height: 40, backgroundColor: '#0f172a', borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#334155' },

    // Estilos del Empty State
    emptyStateCard: { backgroundColor: '#1e293b', borderRadius: 24, padding: 32, alignItems: 'center', borderWidth: 1, borderColor: '#334155', marginTop: 20 },
    emptyStateIconContainer: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(56, 189, 248, 0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
    emptyStateTitle: { color: 'white', fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
    emptyStateDesc: { color: '#94a3b8', fontSize: 14, textAlign: 'center', marginBottom: 24, lineHeight: 20 },
    emptyStateBtn: { flexDirection: 'row', backgroundColor: '#2563eb', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 16, alignItems: 'center', gap: 8 },
    emptyStateBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' },

    // Estilos responsivos del Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.85)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    modalContent: { backgroundColor: '#1e293b', borderRadius: 32, padding: Platform.OS === 'web' ? 32 : 20, borderWidth: 1, borderColor: '#334155', width: '100%', maxHeight: '90%' },
    modalContentWide: { maxWidth: 500 }, // Tope máximo para que no se estire en monitores grandes

    closeBtn: { position: 'absolute', top: 20, right: 20, zIndex: 10 },
    modalHeader: { alignItems: 'center', marginBottom: 24 },
    iconContainer: { width: 64, height: 64, backgroundColor: 'rgba(59, 130, 246, 0.1)', borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
    modalTitle: { color: 'white', fontSize: 24, fontWeight: 'bold' },
    fieldGroup: { marginBottom: 20 },
    fieldLabel: { color: '#f8fafc', fontSize: 14, fontWeight: 'bold', marginBottom: 10 },
    input: { backgroundColor: '#0f172a', color: 'white', padding: 16, borderRadius: 18, borderWidth: 1, borderColor: '#334155' },
    row: { flexDirection: 'row' },
    column: { flexDirection: 'column' },
    pickerTrigger: { backgroundColor: '#0f172a', padding: 14, borderRadius: 18, borderWidth: 1, borderColor: '#334155', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    pickerText: { color: 'white', fontSize: 13, fontWeight: '600' },
    dropdownAbsolute: { position: 'absolute', bottom: 55, left: 0, right: 0, backgroundColor: '#0f172a', borderRadius: 18, borderWidth: 1, borderColor: '#334155', overflow: 'hidden', elevation: 10, zIndex: 300 },
    dropdownOption: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
    dropdownText: { color: '#94a3b8', fontSize: 13 },
    securitySection: { padding: 16, backgroundColor: 'rgba(15, 23, 42, 0.5)', borderRadius: 20, marginTop: 10, borderWidth: 1, borderColor: '#334155' },
    securityRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    securityLabel: { color: '#cbd5e1', fontSize: 13, fontWeight: 'bold' },
    securityBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
    securityBtnText: { fontSize: 12, fontWeight: 'bold' },
    btnDeactivate: { backgroundColor: 'rgba(239, 68, 68, 0.1)' },
    btnActivate: { backgroundColor: 'rgba(16, 185, 129, 0.1)' },
    modalFooter: { marginTop: 16 },

    // Estilos de Pestañas
    tabContainer: { flexDirection: 'row', backgroundColor: '#0f172a', borderRadius: 16, padding: 4, marginBottom: 24 },
    tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 12 },
    activeTab: { backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155' },
    tabText: { color: '#64748b', fontSize: 14, fontWeight: 'bold' },
    activeTabText: { color: 'white' },

    // Estilos de Historial
    historyContainer: { paddingBottom: 20 },
    emptyHistory: { alignItems: 'center', paddingVertical: 40 },
    emptyHistoryText: { color: '#475569', marginTop: 12, fontSize: 14 },
    historyItem: { flexDirection: 'row', gap: 16, marginBottom: 4 },
    historyIconLine: { alignItems: 'center', width: 32 },
    historyIcon: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', zIndex: 1 },
    historyLine: { flex: 1, width: 2, backgroundColor: '#334155', marginVertical: 4 },
    historyBody: { flex: 1, paddingBottom: 24 },
    historyTitle: { color: 'white', fontSize: 15, fontWeight: 'bold', marginBottom: 4 },
    historyDesc: { color: '#94a3b8', fontSize: 13, lineHeight: 18, marginBottom: 8 },
    historyMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    historyTime: { color: '#64748b', fontSize: 11 },
    historyUser: { color: '#3b82f6', fontSize: 11, fontWeight: 'bold' },
    btnConfirm: { backgroundColor: '#2563eb', paddingVertical: 16, alignItems: 'center', borderRadius: 18 },
    btnConfirmText: { color: 'white', fontSize: 16, fontWeight: 'bold' }
});