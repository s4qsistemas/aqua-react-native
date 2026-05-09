import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { useAuth } from '../../src/context/AuthContext';
import { apiFetch } from '../../src/services/api';
import { Ionicons } from '@expo/vector-icons';

export default function ForceChangePassword() {
    const { logout, resolvePasswordChange, user } = useAuth();
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async () => {
        setError("");

        if (newPassword.length < 6) {
            setError("La contraseña debe tener al menos 6 caracteres.");
            return;
        }

        if (newPassword !== confirmPassword) {
            setError("Las contraseñas no coinciden.");
            return;
        }

        setLoading(true);
        try {
            await apiFetch('/auth/change-password', {
                method: 'POST',
                body: JSON.stringify({ newPassword }),
            });
            
            Alert.alert("Éxito", "Contraseña actualizada correctamente");
            await resolvePasswordChange();
        } catch (err: any) {
            setError(err.message || "Error al actualizar la contraseña");
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.card}>
                <View style={styles.header}>
                    <View style={styles.iconContainer}>
                        <Ionicons name="lock-closed" size={32} color="#ef4444" />
                    </View>
                    <Text style={styles.title}>Cambio Obligatorio</Text>
                    <Text style={styles.subtitle}>
                        Hola <Text style={styles.bold}>{user?.nombre}</Text>, por seguridad debes cambiar la contraseña temporal antes de continuar.
                    </Text>
                </View>

                <View style={styles.form}>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Nueva Contraseña</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Mínimo 6 caracteres"
                            placeholderTextColor="#64748b"
                            secureTextEntry
                            value={newPassword}
                            onChangeText={setNewPassword}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Confirmar Contraseña</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Repita la nueva contraseña"
                            placeholderTextColor="#64748b"
                            secureTextEntry
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                        />
                    </View>

                    {error ? (
                        <View style={styles.errorBox}>
                            <Text style={styles.errorText}>{error}</Text>
                        </View>
                    ) : null}

                    <TouchableOpacity 
                        style={[styles.primaryButton, loading && styles.buttonDisabled]} 
                        onPress={handleSubmit}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <Text style={styles.primaryButtonText}>Actualizar y Entrar</Text>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.secondaryButton} onPress={logout}>
                        <Text style={styles.secondaryButtonText}>Cancelar y salir</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f172a', justifyContent: 'center', padding: 20 },
    card: { backgroundColor: '#1e293b', padding: 32, borderRadius: 32, borderWidth: 1, borderColor: '#334155' },
    header: { alignItems: 'center', marginBottom: 24 },
    iconContainer: { width: 64, height: 64, backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
    title: { fontSize: 24, fontWeight: 'bold', color: 'white', marginBottom: 8 },
    subtitle: { color: '#94a3b8', textAlign: 'center', lineHeight: 20 },
    bold: { color: 'white', fontWeight: 'bold' },
    form: { gap: 16 },
    inputGroup: { gap: 8 },
    label: { color: '#f8fafc', fontSize: 14, fontWeight: '600' },
    input: { backgroundColor: '#0f172a', color: 'white', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#334155' },
    errorBox: { backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: 12, borderRadius: 12 },
    errorText: { color: '#ef4444', textAlign: 'center', fontWeight: '500' },
    primaryButton: { backgroundColor: '#ef4444', padding: 18, borderRadius: 18, alignItems: 'center', marginTop: 8 },
    primaryButtonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
    buttonDisabled: { opacity: 0.5 },
    secondaryButton: { padding: 10, alignItems: 'center' },
    secondaryButtonText: { color: '#64748b', fontWeight: 'bold' }
});
