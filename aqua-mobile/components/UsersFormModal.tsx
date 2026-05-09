import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, Modal, TextInput,
    TouchableOpacity, ScrollView, Alert, useWindowDimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (formData: any, userId?: number) => void;
    tenants: any[];
    initialData?: any;
    onToggleStatus?: (userId: number, nuevoEstado: string) => void;
    onResetPassword?: (userId: number) => void;
}

export default function UsersFormModal({
    isOpen, onClose, onConfirm, tenants, initialData, onToggleStatus, onResetPassword
}: Props) {
    const { width } = useWindowDimensions();
    const isWide = width > 768;

    const [formData, setFormData] = useState({
        nombre: "",
        email: "",
        rol: "ADMIN",
        tenantId: ""
    });
    const [showRolPicker, setShowRolPicker] = useState(false);
    const [showTenantPicker, setShowTenantPicker] = useState(false);

    const isEditing = !!initialData;
    const isActivo = initialData?.estado === "ACTIVO";

    useEffect(() => {
        if (isOpen) {
            if (isEditing) {
                setFormData({
                    nombre: initialData.nombre || "",
                    email: initialData.email || "",
                    rol: initialData.rol || "ADMIN",
                    tenantId: initialData.tenantId?.toString() || ""
                });
            } else {
                setFormData({ nombre: "", email: "", rol: "ADMIN", tenantId: "" });
            }
            setShowRolPicker(false);
            setShowTenantPicker(false);
        }
    }, [isOpen, initialData]);

    const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email);
    const canSave = formData.nombre.trim() !== "" && formData.tenantId !== "" && isEmailValid && formData.rol !== "SUPERADMIN";

    // Solo permitimos roles operativos desde la App
    const roles = ["ADMIN", "SUPERVISOR", "TECNICO"];

    const handleSave = () => {
        if (!canSave) {
            Alert.alert("Campos incompletos", "Por favor completa el nombre, un email válido y selecciona una comunidad.");
            return;
        }
        const dataToSend = {
            ...formData,
            tenantId: Number(formData.tenantId)
        };
        onConfirm(dataToSend, initialData?.id);
    };

    return (
        <Modal visible={isOpen} animationType="fade" transparent={true}>
            <View style={styles.overlay}>
                <View style={[styles.content, isWide && styles.contentWide, { padding: isWide ? 32 : 20 }]}>
                    <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                        <Ionicons name="close" size={24} color="#94a3b8" />
                    </TouchableOpacity>

                    <View style={styles.header}>
                        <View style={styles.iconContainer}>
                            <Ionicons name="person-add" size={32} color="#3b82f6" />
                        </View>
                        <Text style={styles.title}>{isEditing ? "Editar Usuario" : "Nuevo Usuario"}</Text>
                        <Text style={styles.subtitle}>
                            {isEditing ? "Modifica los datos y accesos." : "Configura el acceso para un nuevo miembro."}
                        </Text>
                    </View>

                    <ScrollView
                        showsVerticalScrollIndicator={true}
                        contentContainerStyle={{ paddingBottom: 10 }}
                        keyboardShouldPersistTaps="handled"
                        style={{ flexGrow: 0, flexShrink: 1 }}
                    >
                        <View style={styles.fieldGroup}>
                            <Text style={styles.label}>Nombre completo</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Ej: Juan Pérez"
                                placeholderTextColor="#64748b"
                                value={formData.nombre}
                                onChangeText={(val) => setFormData({ ...formData, nombre: val })}
                            />
                        </View>

                        <View style={styles.fieldGroup}>
                            <Text style={styles.label}>Email</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="email@ejemplo.com"
                                placeholderTextColor="#64748b"
                                keyboardType="email-address"
                                autoCapitalize="none"
                                value={formData.email}
                                onChangeText={(val) => setFormData({ ...formData, email: val })}
                            />
                        </View>

                        {/* Fila de Selectores Integrados */}
                        <View style={[isWide ? styles.row : styles.column, { zIndex: 100 }]}>

                            {/* Selector de Rol */}
                            <View style={[styles.fieldGroup, { flex: isWide ? 1 : 0, width: isWide ? 'auto' : '100%', marginRight: isWide ? 8 : 0, zIndex: showRolPicker ? 200 : 1 }]}>
                                <Text style={styles.label}>Rol</Text>
                                <TouchableOpacity
                                    style={styles.pickerTrigger}
                                    onPress={() => {
                                        setShowRolPicker(!showRolPicker);
                                        setShowTenantPicker(false);
                                    }}
                                >
                                    <Text style={styles.pickerText}>{formData.rol}</Text>
                                    <Ionicons name={showRolPicker ? "chevron-up" : "chevron-down"} size={16} color="#64748b" />
                                </TouchableOpacity>

                                {showRolPicker && (
                                    <View style={styles.dropdownAbsolute}>
                                        {roles.map(r => (
                                            <TouchableOpacity key={r} style={styles.dropdownOption} onPress={() => { setFormData({ ...formData, rol: r }); setShowRolPicker(false); }}>
                                                <Text style={[styles.dropdownText, formData.rol === r && { color: '#3b82f6' }]}>{r}</Text>
                                                {formData.rol === r && <Ionicons name="checkmark" size={16} color="#3b82f6" />}
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                )}
                            </View>

                            {/* Selector de Comunidad */}
                            <View style={[styles.fieldGroup, { flex: isWide ? 1 : 0, width: isWide ? 'auto' : '100%', marginLeft: isWide ? 8 : 0, marginTop: isWide ? 0 : 12, zIndex: showTenantPicker ? 200 : 1 }]}>
                                <Text style={styles.label}>Comunidad</Text>
                                <TouchableOpacity
                                    style={styles.pickerTrigger}
                                    onPress={() => {
                                        setShowTenantPicker(!showTenantPicker);
                                        setShowRolPicker(false);
                                    }}
                                >
                                    <Text style={styles.pickerText} numberOfLines={1}>
                                        {tenants.find(t => t.id.toString() === formData.tenantId)?.nombre || "Sel..."}
                                    </Text>
                                    <Ionicons name={showTenantPicker ? "chevron-up" : "chevron-down"} size={16} color="#64748b" />
                                </TouchableOpacity>

                                {showTenantPicker && (
                                    <View style={styles.dropdownAbsolute}>
                                        <ScrollView style={{ maxHeight: 160 }} nestedScrollEnabled={true} keyboardShouldPersistTaps="handled">
                                            {tenants.length === 0 ? (
                                                <Text style={[styles.dropdownText, { padding: 16, textAlign: 'center' }]}>No hay comunidades</Text>
                                            ) : (
                                                tenants.map(t => (
                                                    <TouchableOpacity key={t.id} style={styles.dropdownOption} onPress={() => { setFormData({ ...formData, tenantId: t.id.toString() }); setShowTenantPicker(false); }}>
                                                        <Text style={[styles.dropdownText, formData.tenantId === t.id.toString() && { color: '#3b82f6' }]}>{t.nombre}</Text>
                                                        {formData.tenantId === t.id.toString() && <Ionicons name="checkmark" size={16} color="#3b82f6" />}
                                                    </TouchableOpacity>
                                                ))
                                            )}
                                        </ScrollView>
                                    </View>
                                )}
                            </View>
                        </View>

                        {isEditing && (
                            <View style={styles.securitySection}>
                                <View style={styles.securityRow}>
                                    <Text style={styles.securityLabel}>Estado de cuenta</Text>
                                    <TouchableOpacity
                                        onPress={() => onToggleStatus?.(initialData.id, isActivo ? "INACTIVO" : "ACTIVO")}
                                        style={[styles.securityBtn, isActivo ? styles.btnDeactivate : styles.btnActivate]}
                                    >
                                        <Text style={[styles.securityBtnText, isActivo ? { color: '#ef4444' } : { color: '#10b981' }]}>
                                            {isActivo ? "Desactivar" : "Activar"}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                                <View style={[styles.securityRow, { marginTop: 12 }]}>
                                    <Text style={styles.securityLabel}>Credenciales</Text>
                                    <TouchableOpacity
                                        onPress={() => onResetPassword?.(initialData.id)}
                                        style={styles.securityBtn}
                                    >
                                        <Text style={styles.securityBtnText}>Resetear Clave</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}
                    </ScrollView>

                    <View style={styles.footer}>
                        <TouchableOpacity style={styles.btnCancel} onPress={onClose}>
                            <Text style={styles.btnCancelText}>Cancelar</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.btnConfirm, !canSave && { backgroundColor: '#334155' }]}
                            onPress={handleSave}
                        >
                            <Text style={[styles.btnConfirmText, !canSave && { color: '#64748b' }]}>
                                {isEditing ? "Guardar" : "Crear Usuario"}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(15, 23, 42, 0.85)', padding: 20 },
    content: { backgroundColor: '#1e293b', borderRadius: 32, borderWidth: 1, borderColor: '#334155', width: '100%', maxHeight: '90%' },
    contentWide: { maxWidth: 500 },
    closeBtn: { position: 'absolute', top: 20, right: 20, padding: 8, zIndex: 10 },
    header: { alignItems: 'center', marginBottom: 24 },
    iconContainer: { width: 64, height: 64, backgroundColor: 'rgba(59, 130, 246, 0.1)', borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
    title: { color: 'white', fontSize: 24, fontWeight: 'bold' },
    subtitle: { color: '#94a3b8', fontSize: 13, textAlign: 'center', marginTop: 8 },
    fieldGroup: { marginBottom: 20 },
    label: { color: '#f8fafc', fontSize: 14, fontWeight: 'bold', marginBottom: 8, marginLeft: 4 },
    input: { backgroundColor: '#0f172a', color: 'white', padding: 16, borderRadius: 18, borderWidth: 1, borderColor: '#334155', fontSize: 16 },
    row: { flexDirection: 'row' },
    column: { flexDirection: 'column' },

    pickerTrigger: { backgroundColor: '#0f172a', padding: 14, borderRadius: 18, borderWidth: 1, borderColor: '#334155', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    pickerText: { color: 'white', fontSize: 14, fontWeight: '600' },

    // Novedad: Dropdown pegado y flotante
    dropdownAbsolute: { position: 'absolute', bottom: 55, left: 0, right: 0, backgroundColor: '#0f172a', borderRadius: 18, borderWidth: 1, borderColor: '#334155', overflow: 'hidden', elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.3, shadowRadius: 5 },
    dropdownOption: { padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#1e293b' },
    dropdownText: { color: '#94a3b8', fontSize: 14, fontWeight: '600' },

    securitySection: { padding: 20, backgroundColor: 'rgba(15, 23, 42, 0.5)', borderRadius: 24, marginBottom: 24, borderWidth: 1, borderColor: '#334155' },
    securityRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    securityLabel: { color: '#cbd5e1', fontSize: 14, fontWeight: 'bold' },
    securityBtn: { paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#334155', borderRadius: 12 },
    securityBtnText: { color: '#cbd5e1', fontSize: 12, fontWeight: 'bold' },
    btnDeactivate: { backgroundColor: 'rgba(239, 68, 68, 0.1)' },
    btnActivate: { backgroundColor: 'rgba(16, 185, 129, 0.1)' },
    footer: { flexDirection: 'row', gap: 12, marginTop: 12 },
    btnCancel: { flex: 1, paddingVertical: 16, alignItems: 'center' },
    btnCancelText: { color: '#94a3b8', fontSize: 16, fontWeight: 'bold' },
    btnConfirm: { flex: 1, backgroundColor: '#2563eb', paddingVertical: 16, alignItems: 'center', borderRadius: 18 },
    btnConfirmText: { color: 'white', fontSize: 16, fontWeight: 'bold' }
});