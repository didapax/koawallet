import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    ScrollView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator
} from 'react-native';
import { router, Link } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { Colors, Typography, Spacing } from '../../constants/Colors';

export default function RegisterScreen() {
    const { register } = useAuth();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [loading, setLoading] = useState(false);

    const handleRegister = async () => {
        if (!name || !email || !password) {
            Alert.alert('Error', 'Completa todos los campos');
            return;
        }
        if (password !== confirm) {
            Alert.alert('Error', 'Las contraseñas no coinciden');
            return;
        }
        if (password.length < 6) {
            Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres');
            return;
        }
        setLoading(true);
        try {
            await register(email.trim(), password, name.trim());
            router.replace('/');
        } catch (err: any) {
            Alert.alert('Error de registro', err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                <View style={styles.header}>
                    <Text style={styles.title}>Crear cuenta</Text>
                    <Text style={styles.subtitle}>Únete a la wallet del cacao</Text>
                </View>

                <View style={styles.form}>
                    <Text style={styles.label}>Nombre completo</Text>
                    <TextInput style={styles.input} placeholder="Tu nombre" placeholderTextColor={Colors.textMuted}
                        value={name} onChangeText={setName} />

                    <Text style={styles.label}>Correo electrónico</Text>
                    <TextInput style={styles.input} placeholder="tu@email.com" placeholderTextColor={Colors.textMuted}
                        value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />

                    <Text style={styles.label}>Contraseña</Text>
                    <TextInput style={styles.input} placeholder="Mínimo 6 caracteres" placeholderTextColor={Colors.textMuted}
                        value={password} onChangeText={setPassword} secureTextEntry />

                    <Text style={styles.label}>Confirmar contraseña</Text>
                    <TextInput style={styles.input} placeholder="Repite tu contraseña" placeholderTextColor={Colors.textMuted}
                        value={confirm} onChangeText={setConfirm} secureTextEntry />

                    <TouchableOpacity
                        style={[styles.button, loading && styles.buttonDisabled]}
                        onPress={handleRegister}
                        disabled={loading}
                    >
                        {loading
                            ? <ActivityIndicator color={Colors.background} />
                            : <Text style={styles.buttonText}>Crear Cuenta</Text>
                        }
                    </TouchableOpacity>

                    <View style={styles.footer}>
                        <Text style={styles.footerText}>¿Ya tienes cuenta? </Text>
                        <Link href="/login" asChild>
                            <TouchableOpacity>
                                <Text style={styles.link}>Inicia sesión</Text>
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
    scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.xl },
    header: { alignItems: 'center', marginBottom: Spacing.xl },
    title: { ...Typography.h2, color: Colors.gold },
    subtitle: { ...Typography.sm, color: Colors.textSecondary, marginTop: 4 },
    form: { backgroundColor: Colors.surface, borderRadius: 20, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border },
    label: { ...Typography.sm, color: Colors.textSecondary, marginBottom: 6, marginTop: Spacing.md },
    input: {
        backgroundColor: Colors.surfaceLight, borderRadius: 12, paddingHorizontal: Spacing.md, height: 50,
        color: Colors.textPrimary, ...Typography.body, borderWidth: 1, borderColor: Colors.border,
    },
    button: {
        backgroundColor: Colors.gold, borderRadius: 14, height: 52, justifyContent: 'center', alignItems: 'center',
        marginTop: Spacing.lg, shadowColor: Colors.gold, shadowOpacity: 0.4, shadowRadius: 10, elevation: 6,
    },
    buttonDisabled: { opacity: 0.6 },
    buttonText: { ...Typography.bodyBold, color: Colors.background, fontSize: 17 },
    footer: { flexDirection: 'row', justifyContent: 'center', marginTop: Spacing.lg },
    footerText: { color: Colors.textSecondary, ...Typography.sm },
    link: { color: Colors.gold, ...Typography.sm, fontWeight: '600' },
});
