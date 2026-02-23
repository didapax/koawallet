import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator,
    Modal, TextInput
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, Typography, Spacing } from '../constants/Colors';
import api from '../utils/api';

interface UserPaymentMethod {
    id: number;
    paymentMethod: { id: number; name: string; currency: string };
    accountHolder: string;
    accountNumber: string;
    accountType?: string;
    bankName?: string;
}

export default function UserPaymentMethodManager() {
    const [userPaymentMethods, setUserPaymentMethods] = useState<UserPaymentMethod[]>([]);
    const [loading, setLoading] = useState(false);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [password, setPassword] = useState('');
    const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);

    const fetchUserPaymentMethods = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/user/payment-methods');
            setUserPaymentMethods(res.data);
        } catch { }
        setLoading(false);
    }, []);

    useFocusEffect(
        useCallback(() => {
            fetchUserPaymentMethods();
        }, [fetchUserPaymentMethods])
    );

    const handleDeletePress = (upm: UserPaymentMethod) => {
        setDeletingId(upm.id);
        setIsDeleteModalVisible(true);
        setPassword('');
    };

    const confirmDelete = async () => {
        if (!password) {
            Alert.alert('Error', 'Debes ingresar tu contraseña');
            return;
        }

        setLoading(true);
        try {
            await api.delete(`/user/payment-methods/${deletingId}`, { data: { password } });
            Alert.alert('Éxito', 'Cuenta eliminada correctamente');
            setIsDeleteModalVisible(false);
            fetchUserPaymentMethods();
        } catch (err: any) {
            Alert.alert('Error', err.response?.data?.error || 'No se pudo eliminar la cuenta');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.sectionTitle}>💳 Mis cuentas de cobro</Text>
            <Text style={styles.sectionSub}>Cuentas que usas para recibir pagos al vender cacao</Text>

            {loading ? (
                <ActivityIndicator size="small" color={Colors.gold} />
            ) : userPaymentMethods.length === 0 ? (
                <Text style={styles.fieldEmpty}>
                    Sin cuentas registradas. Agrega una en el flujo de retiro.
                </Text>
            ) : userPaymentMethods.map(upm => (
                <View key={upm.id} style={styles.upmCard}>
                    <View style={styles.upmCardHeader}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.upmMethodName}>{upm.paymentMethod.name}</Text>
                            <Text style={styles.upmCurrency}>{upm.paymentMethod.currency}</Text>
                        </View>
                        <TouchableOpacity onPress={() => handleDeletePress(upm)}>
                            <Text style={styles.upmDeleteBtn}>🗑️</Text>
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.upmRow}>Titular: <Text style={styles.upmVal}>{upm.accountHolder}</Text></Text>
                    {upm.bankName && <Text style={styles.upmRow}>Banco: <Text style={styles.upmVal}>{upm.bankName}</Text></Text>}
                    <Text style={styles.upmRow}>Cuenta: <Text style={styles.upmNum}>{upm.accountNumber}</Text></Text>
                    {upm.accountType && <Text style={styles.upmRow}>Tipo: <Text style={styles.upmVal}>{upm.accountType}</Text></Text>}
                </View>
            ))}

            {/* Modal de confirmación de contraseña */}
            <Modal
                visible={isDeleteModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setIsDeleteModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Confirmar eliminación</Text>
                        <Text style={styles.modalSub}>Por seguridad, ingresa tu contraseña para eliminar esta cuenta.</Text>

                        <TextInput
                            style={styles.passwordInput}
                            placeholder="Tu contraseña"
                            placeholderTextColor={Colors.textMuted}
                            secureTextEntry
                            value={password}
                            onChangeText={setPassword}
                        />

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={styles.cancelModalBtn}
                                onPress={() => setIsDeleteModalVisible(false)}
                            >
                                <Text style={styles.cancelModalTxt}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.confirmModalBtn}
                                onPress={confirmDelete}
                                disabled={loading}
                            >
                                {loading ? (
                                    <ActivityIndicator size="small" color={Colors.surface} />
                                ) : (
                                    <Text style={styles.confirmModalTxt}>Eliminar</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: Colors.surface, borderRadius: 20, padding: Spacing.lg,
        borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.lg,
    },
    sectionTitle: { ...Typography.bodyBold, color: Colors.textPrimary, marginBottom: 4 },
    sectionSub: { ...Typography.xs, color: Colors.textMuted, marginBottom: Spacing.md },
    fieldEmpty: { ...Typography.body, color: Colors.textMuted, fontStyle: 'italic', paddingVertical: 4 },

    upmCard: {
        backgroundColor: Colors.surfaceLight, borderRadius: 14, padding: Spacing.md,
        borderWidth: 1, borderColor: Colors.border, marginBottom: 10,
    },
    upmCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
    upmMethodName: { ...Typography.bodyBold, color: Colors.textPrimary },
    upmCurrency: { ...Typography.xs, color: Colors.gold, marginTop: 2 },
    upmDeleteBtn: { fontSize: 18, paddingLeft: 8 },
    upmRow: { ...Typography.sm, color: Colors.textMuted, marginBottom: 3 },
    upmVal: { color: Colors.textPrimary, fontWeight: '600' },
    upmNum: { color: Colors.gold, fontWeight: '700', fontFamily: 'monospace' },

    // Modal Styles
    modalOverlay: {
        flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center', alignItems: 'center', padding: Spacing.xl
    },
    modalContent: {
        backgroundColor: Colors.surface, borderRadius: 20, padding: Spacing.xl,
        width: '100%', borderWidth: 1, borderColor: Colors.border
    },
    modalTitle: { ...Typography.h3, color: Colors.textPrimary, marginBottom: 8, textAlign: 'center' },
    modalSub: { ...Typography.sm, color: Colors.textSecondary, marginBottom: Spacing.lg, textAlign: 'center' },
    passwordInput: {
        backgroundColor: Colors.surfaceLight, borderRadius: 12, height: 50,
        paddingHorizontal: 15, color: Colors.textPrimary, marginBottom: Spacing.xl,
        borderWidth: 1, borderColor: Colors.border, ...Typography.body
    },
    modalButtons: { flexDirection: 'row', gap: Spacing.md },
    cancelModalBtn: {
        flex: 1, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center',
        borderWidth: 1, borderColor: Colors.border
    },
    cancelModalTxt: { color: Colors.textSecondary, ...Typography.bodyBold },
    confirmModalBtn: {
        flex: 1, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center',
        backgroundColor: Colors.error
    },
    confirmModalTxt: { color: Colors.surface, ...Typography.bodyBold },
});
