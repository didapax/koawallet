import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    TextInput, Alert, ActivityIndicator
} from 'react-native';
import { Colors, Typography, Spacing } from '../../constants/Colors';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import UserPaymentMethodManager from '../../components/UserPaymentMethodManager';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Profile {
    name?: string;
    email: string;
    phone?: string;
    cedula?: string;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const Field = ({
    label, value, onChangeText, placeholder, editMode, keyboardType = 'default' as any
}: {
    label: string; value: string; onChangeText: (v: string) => void;
    placeholder: string; editMode: boolean; keyboardType?: any
}) => (
    <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>{label}</Text>
        {editMode ? (
            <TextInput
                style={styles.fieldInput}
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor={Colors.textMuted}
                keyboardType={keyboardType}
            />
        ) : (
            <Text style={styles.fieldValue}>{value || <Text style={styles.fieldEmpty}>No configurado</Text>}</Text>
        )}
    </View>
);

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PerfilScreen() {
    const { logout, updateUser } = useAuth();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editMode, setEditMode] = useState(false);

    // Campos editables
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [cedula, setCedula] = useState('');

    const fetchProfile = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/profile');
            const p = res.data;
            setProfile(p);
            setName(p.name || '');
            setPhone(p.phone || '');
            setCedula(p.cedula || '');
            // Sincronizar con AuthContext
            await updateUser({ name: p.name, phone: p.phone, cedula: p.cedula });
        } catch (err: any) {
            Alert.alert('Error', err.message);
        } finally {
            setLoading(false);
        }
    }, [updateUser]);

    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);

    const handleSave = async () => {
        setSaving(true);
        try {
            await api.put('/profile', { name, phone, cedula });
            await updateUser({ name, phone, cedula });
            Alert.alert('✅ Perfil actualizado');
            setEditMode(false);
            fetchProfile();
        } catch (err: any) {
            Alert.alert('Error', err.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.gold} />
            </View>
        );
    }

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {/* Avatar + nombre */}
            <View style={styles.avatarSection}>
                <View style={styles.avatar}>
                    <Text style={styles.avatarEmoji}>👤</Text>
                </View>
                <Text style={styles.avatarName}>{profile?.name || 'Sin nombre'}</Text>
                <Text style={styles.avatarEmail}>{profile?.email}</Text>
            </View>

            {/* Botón editar / guardar */}
            <View style={styles.editRow}>
                {editMode ? (
                    <>
                        <TouchableOpacity style={styles.cancelBtn} onPress={() => { setEditMode(false); fetchProfile(); }}>
                            <Text style={styles.cancelBtnText}>Cancelar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                            onPress={handleSave}
                            disabled={saving}
                        >
                            {saving
                                ? <ActivityIndicator size="small" color={Colors.background} />
                                : <Text style={styles.saveBtnText}>💾 Guardar</Text>
                            }
                        </TouchableOpacity>
                    </>
                ) : (
                    <TouchableOpacity style={styles.editBtn} onPress={() => setEditMode(true)}>
                        <Text style={styles.editBtnText}>✏️ Editar perfil</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Datos personales */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>👤 Datos personales</Text>
                <Field label="Nombre completo" value={name} onChangeText={setName} placeholder="Tu nombre completo" editMode={editMode} />
                <Field label="Cédula / DNI" value={cedula} onChangeText={setCedula} placeholder="Ej: V-12345678" editMode={editMode} />
                <Field label="Teléfono" value={phone} onChangeText={setPhone} placeholder="Ej: +58 414 1234567" keyboardType="phone-pad" editMode={editMode} />
            </View>

            {/* Mis cuentas de cobro (UserPaymentMethod) */}
            <UserPaymentMethodManager />

            {/* Logout */}
            <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
                <Text style={styles.logoutText}>🚪 Cerrar sesión</Text>
            </TouchableOpacity>
        </ScrollView>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    content: { paddingHorizontal: Spacing.lg, paddingTop: 60, paddingBottom: 60 },
    loadingContainer: { flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center' },

    avatarSection: { alignItems: 'center', marginBottom: Spacing.lg },
    avatar: {
        width: 80, height: 80, borderRadius: 40,
        backgroundColor: Colors.surfaceLight, borderWidth: 2, borderColor: Colors.gold,
        justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.sm,
    },
    avatarEmoji: { fontSize: 38 },
    avatarName: { ...Typography.h3, color: Colors.textPrimary },
    avatarEmail: { ...Typography.sm, color: Colors.textSecondary, marginTop: 2 },

    editRow: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.sm, marginBottom: Spacing.xl },
    editBtn: {
        backgroundColor: Colors.surface, borderRadius: 20, paddingHorizontal: 20, paddingVertical: 10,
        borderWidth: 1, borderColor: Colors.gold,
    },
    editBtnText: { color: Colors.gold, ...Typography.sm, fontWeight: '600' },
    saveBtn: {
        backgroundColor: Colors.gold, borderRadius: 20, paddingHorizontal: 24, paddingVertical: 10, flex: 1,
        alignItems: 'center',
    },
    saveBtnDisabled: { opacity: 0.5 },
    saveBtnText: { color: Colors.background, ...Typography.sm, fontWeight: '700' },
    cancelBtn: {
        borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10,
        borderWidth: 1, borderColor: Colors.border,
    },
    cancelBtnText: { color: Colors.textMuted, ...Typography.sm },

    section: {
        backgroundColor: Colors.surface, borderRadius: 20, padding: Spacing.lg,
        borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.lg,
    },
    sectionTitle: { ...Typography.bodyBold, color: Colors.textPrimary, marginBottom: 4 },
    sectionSub: { ...Typography.xs, color: Colors.textMuted, marginBottom: Spacing.md },

    fieldGroup: { marginBottom: Spacing.md },
    fieldLabel: { ...Typography.xs, color: Colors.textSecondary, marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5 },
    fieldInput: {
        backgroundColor: Colors.surfaceLight, borderRadius: 10, height: 46,
        paddingHorizontal: 12, color: Colors.textPrimary, ...Typography.body,
        borderWidth: 1, borderColor: Colors.border,
    },
    fieldValue: { ...Typography.body, color: Colors.textPrimary, paddingVertical: 4 },
    fieldEmpty: { color: Colors.textMuted, fontStyle: 'italic' },

    logoutBtn: {
        borderRadius: 12, height: 50, justifyContent: 'center', alignItems: 'center',
        borderWidth: 1, borderColor: Colors.border,
    },
    logoutText: { color: Colors.error, ...Typography.bodyBold },
});
