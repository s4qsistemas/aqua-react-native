import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet, useWindowDimensions } from 'react-native';
import { useAuth } from '../../src/context/AuthContext';
import { apiFetch } from '../../src/services/api';
import { Ionicons } from '@expo/vector-icons';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    
    const { login } = useAuth();
    const { width } = useWindowDimensions();
    const isWide = width > 768;

    const handleLogin = async () => {
        setErrorMsg(null);
        if (!email || !password) {
            setErrorMsg('Por favor, completa todos los campos');
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await apiFetch('/auth/login', {
                method: 'POST',
                body: JSON.stringify({ email, password }),
            });
            await login(response.token, response.user, response.requirePasswordChange);
        } catch (error: any) {
            setErrorMsg(error.message || 'Ocurrió un error inesperado');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <View style={styles.container}>
            <View style={[styles.loginCard, isWide && styles.wideCard]}>
                <View style={styles.header}>
                    <View style={styles.logoIcon}>
                        <Ionicons name="water" size={32} color="#38bdf8" />
                    </View>
                    <Text style={styles.title}>aqua <Text style={styles.highlight}>Sync Pro</Text></Text>
                    <Text style={styles.subtitle}>Gestión inteligente de recursos hídricos</Text>
                </View>

                <View style={styles.form}>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Correo Electrónico</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="ejemplo@aqua.com"
                            placeholderTextColor="#64748b"
                            value={email}
                            onChangeText={setEmail}
                            autoCapitalize="none"
                            keyboardType="email-address"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Contraseña</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="••••••••"
                            placeholderTextColor="#64748b"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                        />
                    </View>

                    {errorMsg && (
                        <View style={styles.errorContainer}>
                            <Ionicons name="alert-circle" size={18} color="#ef4444" />
                            <Text style={styles.errorText}>{errorMsg}</Text>
                        </View>
                    )}

                    <TouchableOpacity
                        style={[styles.button, isSubmitting && styles.buttonDisabled]}
                        onPress={handleLogin}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <>
                                <Text style={styles.buttonText}>Entrar al Panel</Text>
                                <Ionicons name="arrow-forward" size={18} color="white" />
                            </>
                        )}
                    </TouchableOpacity>
                </View>

                <View style={styles.footer}>
                    <Text style={styles.footerText}>¿Olvidaste tu contraseña?</Text>
                    <TouchableOpacity>
                        <Text style={styles.linkText}>Contactar a Soporte</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a', padding: 20 },
    loginCard: { width: '100%', backgroundColor: '#1e293b', padding: 32, borderRadius: 32, borderWidth: 1, borderColor: '#334155' },
    wideCard: { maxWidth: 450 },
    header: { alignItems: 'center', marginBottom: 32 },
    logoIcon: { width: 64, height: 64, backgroundColor: 'rgba(56, 189, 248, 0.1)', borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
    title: { fontSize: 28, fontWeight: '900', color: 'white', letterSpacing: 1 },
    highlight: { color: '#38bdf8' },
    subtitle: { color: '#94a3b8', fontSize: 14, textAlign: 'center', marginTop: 8 },
    form: { gap: 20 },
    inputGroup: { gap: 8 },
    label: { color: '#f8fafc', fontSize: 14, fontWeight: '600', marginLeft: 4 },
    input: { backgroundColor: '#0f172a', color: 'white', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#334155', fontSize: 16 },
    errorContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: 12, borderRadius: 12 },
    errorText: { color: '#ef4444', fontSize: 14, fontWeight: '500' },
    button: { backgroundColor: '#2563eb', padding: 18, borderRadius: 18, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, marginTop: 10 },
    buttonDisabled: { opacity: 0.6 },
    buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
    footer: { marginTop: 32, alignItems: 'center', gap: 8 },
    footerText: { color: '#64748b', fontSize: 14 },
    linkText: { color: '#38bdf8', fontWeight: '600' }
});