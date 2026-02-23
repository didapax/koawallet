import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator
} from 'react-native';
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

    const fetchUserPaymentMethods = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/user/payment-methods');
            setUserPaymentMethods(res.data);
        } catch { }
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchUserPaymentMethods();
    }, [fetchUserPaymentMethods]);

    const handleDelete = (upm: UserPaymentMethod) => {
        Alert.alert(
            '¿Eliminar cuenta?',
            `¿Seguro que deseas eliminar la cuenta ${upm.accountNumber}?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Eliminar', style: 'destructive',
                    onPress: async () => {
                        try {
                            // En un flujo real, esto llamaría a DELETE /user/payment-methods/:id
                            // Por ahora lo removemos del estado para demostración
                            setUserPaymentMethods(prev => prev.filter(m => m.id !== upm.id));
                        } catch (err: any) {
                            Alert.alert('Error', err.response?.data?.error || err.message);
                        }
                    }
                }
            ]
        );
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
                        <TouchableOpacity onPress={() => handleDelete(upm)}>
                            <Text style={styles.upmDeleteBtn}>🗑️</Text>
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.upmRow}>Titular: <Text style={styles.upmVal}>{upm.accountHolder}</Text></Text>
                    {upm.bankName && <Text style={styles.upmRow}>Banco: <Text style={styles.upmVal}>{upm.bankName}</Text></Text>}
                    <Text style={styles.upmRow}>Cuenta: <Text style={styles.upmNum}>{upm.accountNumber}</Text></Text>
                    {upm.accountType && <Text style={styles.upmRow}>Tipo: <Text style={styles.upmVal}>{upm.accountType}</Text></Text>}
                </View>
            ))}
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
});
