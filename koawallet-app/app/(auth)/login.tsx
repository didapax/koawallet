import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    ScrollView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator
} from 'react-native';
import { router, Link } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { Colors, Typography, Spacing } from '../../constants/Colors';

export default function LoginScreen() {
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('Error', 'Por favor completa todos los campos');
            return;
        }
        setLoading(true);
        try {
            await login(email.trim(), password);
            router.replace('/');
        } catch (err: any) {
            Alert.alert('Error de acceso', err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                {/* Logo / Header */}
                <View style={styles.header}>
                    <View style={styles.logoCircle}>
                        <Text style={styles.logoEmoji}>🍫</Text>
                    </View>
                    <Text style={styles.title}>KoaWallet</Text>
                    <Text style={styles.subtitle}>La wallet del cacao venezolano</Text>
                </View>

                {/* Formulario */}
                <View style={styles.form}>
                    <Text style={styles.label}>Correo electrónico</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="tu@email.com"
                        placeholderTextColor={Colors.textMuted}
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                    />

                    <Text style={styles.label}>Contraseña</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="••••••••"
                        placeholderTextColor={Colors.textMuted}
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                    />

                    <TouchableOpacity
                        style={[styles.button, loading && styles.buttonDisabled]}
                        onPress={handleLogin}
                        disabled={loading}
                    >
                        {loading
                            ? <ActivityIndicator color={Colors.background} />
                            : <Text style={styles.buttonText}>Iniciar Sesión</Text>
                        }
                    </TouchableOpacity>

                    <View style={styles.footer}>
                        <Text style={styles.footerText}>¿No tienes cuenta? </Text>
                        <Link href="/register" asChild>
                            <TouchableOpacity>
                                <Text style={styles.link}>Regístrate</Text>
                            </TouchableOpacity>
                        </Link>
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.xxl },
    header: { alignItems: 'center', marginBottom: Spacing.xxl },
    logoCircle: {
        width: 90, height: 90, borderRadius: 45,
        backgroundColor: Colors.surfaceLight,
        justifyContent: 'center', alignItems: 'center',
        borderWidth: 2, borderColor: Colors.gold,
        marginBottom: Spacing.md,
        shadowColor: Colors.gold, shadowOpacity: 0.3, shadowRadius: 12, elevation: 8,
    },
    logoEmoji: { fontSize: 44 },
    title: { ...Typography.h1, color: Colors.gold, letterSpacing: 1 },
    subtitle: { ...Typography.sm, color: Colors.textSecondary, marginTop: 4 },
    form: {
        backgroundColor: Colors.surface,
        borderRadius: 20, padding: Spacing.lg,
        borderWidth: 1, borderColor: Colors.border,
    },
    label: { ...Typography.sm, color: Colors.textSecondary, marginBottom: 6, marginTop: Spacing.md },
    input: {
        backgroundColor: Colors.surfaceLight,
        borderRadius: 12, paddingHorizontal: Spacing.md, height: 50,
        color: Colors.textPrimary, ...Typography.body,
        borderWidth: 1, borderColor: Colors.border,
    },
    button: {
        backgroundColor: Colors.gold,
        borderRadius: 14, height: 52, justifyContent: 'center', alignItems: 'center',
        marginTop: Spacing.lg,
        shadowColor: Colors.gold, shadowOpacity: 0.4, shadowRadius: 10, elevation: 6,
    },
    buttonDisabled: { opacity: 0.6 },
    buttonText: { ...Typography.bodyBold, color: Colors.background, fontSize: 17 },
    footer: { flexDirection: 'row', justifyContent: 'center', marginTop: Spacing.lg },
    footerText: { color: Colors.textSecondary, ...Typography.sm },
    link: { color: Colors.gold, ...Typography.sm, fontWeight: '600' },
});
