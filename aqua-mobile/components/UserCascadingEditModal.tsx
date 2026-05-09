import React, { useState, useEffect } from 'react';
import { 
    View, Text, StyleSheet, Modal, TouchableOpacity, 
    FlatList, ActivityIndicator, ScrollView, Platform 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiFetch } from '../src/services/api';
import { useAuth } from '../src/context/AuthContext';

export default function UserCascadingEditModal({
    isOpen,
    onClose,
    tenants = [],
    onEditUser
}: any) {
    const { user } = useAuth();
    const isSuperAdmin = user?.rol === 'SUPERADMIN';

    // Estados
    const [allUsers, setAllUsers] = useState<any[]>([]);
    const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Filtros
    const [filters, setFilters] = useState({
        tenantId: isSuperAdmin ? "" : user?.tenantId?.toString() || "",
        rol: "ADMIN",
        estado: "ACTIVO"
    });

    // Pickers visibility (for custom dropdowns in RN)
    const [showTenantPicker, setShowTenantPicker] = useState(false);
    const [showRolPicker, setShowRolPicker] = useState(false);
    const [showEstadoPicker, setShowEstadoPicker] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchUsers();
        }
    }, [isOpen]);

    const fetchUsers = async () => {
        setIsLoading(true);
        try {
            const data = await apiFetch("/usuarios");
            setAllUsers(data);
        } catch (error) {
            console.error("Error fetching users:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        let result = allUsers;

        if (filters.tenantId) {
            result = result.filter(u => u.tenantId?.toString() === filters.tenantId);
        }
        if (filters.rol) {
            result = result.filter(u => u.rol === filters.rol);
        }
        if (filters.estado) {
            result = result.filter(u => u.estado === filters.estado);
        }

        setFilteredUsers(result);
    }, [filters, allUsers]);

    if (!isOpen) return null;

    const renderChips = (label: string, value: string, options: any[], onSelect: (val: string) => void) => (
        <View style={styles.filterGroup}>
            <Text style={styles.filterLabel}>{label}</Text>
            <View style={styles.chipsRow}>
                {options.map(opt => (
                    <TouchableOpacity 
                        key={opt.value} 
                        style={[styles.chip, value === opt.value && styles.activeChip]}
                        onPress={() => onSelect(opt.value)}
                    >
                        <Text style={[styles.chipText, value === opt.value && styles.activeChipText]}>
                            {opt.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );

    const renderPicker = (label: string, value: string, options: any[], onSelect: (val: string) => void, visible: boolean, setVisible: (v: boolean) => void) => (
        <View style={[styles.filterGroup, visible && { zIndex: 100 }]}>
            <Text style={styles.filterLabel}>{label}</Text>
            <TouchableOpacity 
                style={styles.pickerTrigger} 
                onPress={() => setVisible(!visible)}
            >
                <Text style={styles.pickerText}>
                    {options.find(o => o.value === value)?.label || "Seleccionar..."}
                </Text>
                <Ionicons name={visible ? "chevron-up" : "chevron-down"} size={16} color="#94a3b8" />
            </TouchableOpacity>
            {visible && (
                <View style={styles.dropdown}>
                    {options.map(opt => (
                        <TouchableOpacity 
                            key={opt.value} 
                            style={styles.dropdownOption}
                            onPress={() => {
                                onSelect(opt.value);
                                setVisible(false);
                            }}
                        >
                            <Text style={[styles.dropdownText, value === opt.value && { color: '#38bdf8', fontWeight: 'bold' }]}>
                                {opt.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            )}
        </View>
    );

    return (
        <Modal visible={isOpen} animationType="slide" transparent={true}>
            <View style={styles.overlay}>
                <View style={styles.content}>
                    <View style={styles.header}>
                        <View style={styles.titleRow}>
                            <Ionicons name="options-outline" size={24} color="#38bdf8" />
                            <Text style={styles.title}>Gestión de Usuarios</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <Ionicons name="close" size={28} color="#94a3b8" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.filtersSection}>
                        {isSuperAdmin && renderPicker(
                            "Comunidad", 
                            filters.tenantId, 
                            [{label: "Todas", value: ""}, ...tenants.map((t: any) => ({label: t.nombre, value: t.id.toString()}))],
                            (val) => setFilters({...filters, tenantId: val}),
                            showTenantPicker,
                            setShowTenantPicker
                        )}

                        <View style={[Platform.OS === 'web' ? styles.row : styles.column, { zIndex: 1 }]}>
                            <View style={{flex: Platform.OS === 'web' ? 1.5 : 0}}>
                                {renderChips(
                                    "Rol", 
                                    filters.rol, 
                                    [{label: "ADMIN", value: "ADMIN"}, {label: "SUPERV.", value: "SUPERVISOR"}, {label: "TECNIC.", value: "TECNICO"}],
                                    (val) => setFilters({...filters, rol: val})
                                )}
                            </View>
                            <View style={{flex: Platform.OS === 'web' ? 1 : 0, marginLeft: Platform.OS === 'web' ? 16 : 0, marginTop: Platform.OS === 'web' ? 0 : 8}}>
                                {renderChips(
                                    "Estado", 
                                    filters.estado, 
                                    [{label: "ACT.", value: "ACTIVO"}, {label: "INACT.", value: "INACTIVO"}],
                                    (val) => setFilters({...filters, estado: val})
                                )}
                            </View>
                        </View>
                    </View>

                    <View style={styles.listSection}>
                        <Text style={styles.listTitle}>
                            Resultados ({filteredUsers.length})
                        </Text>
                        
                        {isLoading ? (
                            <ActivityIndicator size="large" color="#38bdf8" style={{marginTop: 20}} />
                        ) : filteredUsers.length === 0 ? (
                            <View style={styles.emptyContainer}>
                                <Ionicons name="search-outline" size={48} color="#334155" />
                                <Text style={styles.emptyText}>No se encontraron usuarios</Text>
                            </View>
                        ) : (
                            <FlatList
                                data={filteredUsers}
                                keyExtractor={(item) => item.id.toString()}
                                contentContainerStyle={{paddingBottom: 20}}
                                renderItem={({item}) => (
                                    <TouchableOpacity 
                                        style={styles.userItem}
                                        onPress={() => onEditUser(item)}
                                    >
                                        <View style={styles.userIcon}>
                                            <Ionicons name="person" size={20} color="#38bdf8" />
                                        </View>
                                        <View style={styles.userInfo}>
                                            <Text style={styles.userName}>{item.nombre}</Text>
                                            <Text style={styles.userEmail}>{item.email}</Text>
                                        </View>
                                        <Ionicons name="chevron-forward" size={20} color="#334155" />
                                    </TouchableOpacity>
                                )}
                            />
                        )}
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.8)', justifyContent: 'center' },
    content: { 
        backgroundColor: '#1e293b', 
        borderRadius: 32, 
        maxHeight: '90%', 
        width: '100%',
        maxWidth: 600,
        alignSelf: 'center',
        padding: 24,
        borderWidth: 1,
        borderColor: '#334155'
    },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    title: { color: 'white', fontSize: 20, fontWeight: 'bold' },
    closeBtn: { padding: 4, marginRight: 24 },
    
    filtersSection: { marginBottom: 20, zIndex: 10, position: 'relative' },
    filterGroup: { marginBottom: 16 },
    filterLabel: { color: '#94a3b8', fontSize: 11, fontWeight: 'bold', marginBottom: 10, textTransform: 'uppercase', marginLeft: 4, letterSpacing: 1 },
    pickerTrigger: { 
        backgroundColor: '#0f172a', 
        padding: 12, 
        borderRadius: 12, 
        borderWidth: 1, 
        borderColor: '#334155',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    pickerText: { color: 'white', fontSize: 13, fontWeight: '600' },
    chipsRow: { flexDirection: 'row', gap: 8 },
    chip: { 
        flex: 1,
        backgroundColor: '#0f172a', 
        paddingVertical: 10, 
        borderRadius: 12, 
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#334155'
    },
    activeChip: { backgroundColor: 'rgba(56, 189, 248, 0.1)', borderColor: '#38bdf8' },
    chipText: { color: '#94a3b8', fontSize: 11, fontWeight: 'bold' },
    activeChipText: { color: '#38bdf8' },
    row: { flexDirection: 'row' },
    column: { flexDirection: 'column' },
    
    dropdown: { 
        position: 'absolute',
        top: '100%', // Desplegar hacia abajo
        left: 0,
        right: 0,
        backgroundColor: '#0f172a', 
        borderRadius: 16, 
        marginTop: 8, // Separación del trigger
        borderWidth: 1, 
        borderColor: '#38bdf8',
        overflow: 'hidden',
        elevation: 10,
        zIndex: 1000
    },
    dropdownOption: { padding: 14, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
    dropdownText: { color: '#94a3b8', fontSize: 14 },
    
    listSection: { flexGrow: 1, flexShrink: 1, marginTop: 10, borderTopWidth: 1, borderTopColor: '#334155', paddingTop: 20, zIndex: 1, position: 'relative' },
    listTitle: { color: '#64748b', fontSize: 11, fontWeight: 'bold', marginBottom: 20, textTransform: 'uppercase', letterSpacing: 1 },
    userItem: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        backgroundColor: '#0f172a', 
        padding: 16, 
        borderRadius: 20, 
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#334155'
    },
    userIcon: { width: 40, height: 40, backgroundColor: 'rgba(56, 189, 248, 0.1)', borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
    userInfo: { flex: 1 },
    userName: { color: 'white', fontSize: 16, fontWeight: 'bold' },
    userEmail: { color: '#64748b', fontSize: 13, marginTop: 2 },
    
    emptyContainer: { alignItems: 'center', marginTop: 40, gap: 12 },
    emptyText: { color: '#475569', fontSize: 14 }
});
