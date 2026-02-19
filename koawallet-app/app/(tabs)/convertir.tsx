import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    TextInput, Alert, ActivityIndicator
} from 'react-native';
import { Colors, Typography, Spacing } from '../../constants/Colors';
import api from '../../utils/api';

interface Balance {
    fiat: number;
    cacao: number;
    cacaoPricePerGram: number;
}

const DIRECTIONS = [
    { key: 'CONVERT_CACAO_TO_USD', from: '🍫 Cacao', to: '💵 USD', fromUnit: 'gramos', toUnit: 'USD' },
    { key: 'CONVERT_USD_TO_CACAO', from: '💵 USD', to: '🍫 Cacao', fromUnit: 'USD', toUnit: 'gramos' },
];

export default function ConvertirScreen() {
    const [direction, setDirection] = useState(DIRECTIONS[0]);
    const [amount, setAmount] = useState('');
    const [balance, setBalance] = useState<Balance | null>(null);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => { fetchBalance(); }, []);

    const fetchBalance = async () => {
        setLoading(true);
        try {
            const res = await api.get('/balance');
            setBalance(res.data);
        } catch { }
        setLoading(false);
    };

    const amountNum = parseFloat(amount) || 0;
    const price = balance?.cacaoPricePerGram ?? 3.50;

    const preview = direction.key === 'CONVERT_CACAO_TO_USD'
        ? (amountNum * price)
        : (amountNum / price);

    const handleConvert = async () => {
        if (!amount || amountNum <= 0) {
            Alert.alert('Error', 'Ingresa una cantidad válida');
            return;
        }
        setSubmitting(true);
        try {
            const res = await api.post('/convert', { type: direction.key, amount: amountNum });
            Alert.alert('✅ Conversión exitosa',
                `Nuevo saldo:\n${res.data.cacao.toFixed(4)} gramos de cacao\n$${res.data.fiat.toFixed(2)} USD`,
                [{ text: 'OK', onPress: () => { setAmount(''); fetchBalance(); } }]
            );
        } catch (err: any) {
            Alert.alert('Error', err.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.title}>🔄 Convertir</Text>
                <Text style={styles.subtitle}>Transforma tu cacao en USD y viceversa</Text>
            </View>

            {/* Balance info */}
            {loading ? (
                <ActivityIndicator color={Colors.gold} style={{ marginBottom: Spacing.lg }} />
            ) : (
                <View style={styles.balanceRow}>
                    <View style={styles.balanceChip}>
                        <Text style={styles.balanceChipLabel}>Tu cacao</Text>
                        <Text style={styles.balanceChipValue}>{balance?.cacao?.toFixed(4) ?? '0'} g</Text>
                    </View>
                    <View style={styles.balanceChip}>
                        <Text style={styles.balanceChipLabel}>Tus USD</Text>
                        <Text style={styles.balanceChipValue}>${balance?.fiat?.toFixed(2) ?? '0.00'}</Text>
                    </View>
                    <View style={styles.balanceChip}>
                        <Text style={styles.balanceChipLabel}>Precio/g</Text>
                        <Text style={styles.balanceChipValue}>${price.toFixed(2)}</Text>
                    </View>
                </View>
            )}

            {/* Selector de dirección */}
            <Text style={styles.sectionLabel}>Dirección</Text>
            <View style={styles.directionRow}>
                {DIRECTIONS.map((d) => (
                    <TouchableOpacity
                        key={d.key}
                        style={[styles.dirBtn, direction.key === d.key && styles.dirBtnActive]}
                        onPress={() => { setDirection(d); setAmount(''); }}
                    >
                        <Text style={styles.dirEmoji}>{d.from.split(' ')[0]}</Text>
                        <Text style={styles.dirArrow}>→</Text>
                        <Text style={styles.dirEmoji}>{d.to.split(' ')[0]}</Text>
                        <Text style={[styles.dirLabel, direction.key === d.key && styles.dirLabelActive]}>
                            {d.from.split(' ')[1]} → {d.to.split(' ')[1]}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Converter card */}
            <View style={styles.converterCard}>
                <View style={styles.converterTop}>
                    <Text style={styles.converterLabel}>{direction.from}</Text>
                    <TextInput
                        style={styles.converterInput}
                        placeholder="0.00"
                        placeholderTextColor={Colors.textMuted}
                        value={amount}
                        onChangeText={setAmount}
                        keyboardType="decimal-pad"
                    />
                    <Text style={styles.converterUnit}>{direction.fromUnit}</Text>
                </View>

                <View style={styles.converterDivider}>
                    <View style={styles.converterDividerLine} />
                    <View style={styles.arrowCircle}>
                        <Text style={styles.arrowText}>↓</Text>
                    </View>
                    <View style={styles.converterDividerLine} />
                </View>

                <View style={styles.converterBottom}>
                    <Text style={styles.converterLabel}>{direction.to}</Text>
                    <Text style={styles.converterResult}>
                        {amountNum > 0 ? preview.toFixed(4) : '—'}
                    </Text>
                    <Text style={styles.converterUnit}>{direction.toUnit}</Text>
                </View>

                {amountNum > 0 && (
                    <Text style={styles.rateNote}>
                        Tasa: $1 USD = {(1 / price).toFixed(4)} g · $1 g = ${price.toFixed(2)} USD
                    </Text>
                )}
            </View>

            <TouchableOpacity
                style={[styles.submitBtn, (submitting || amountNum <= 0) && styles.submitBtnDisabled]}
                onPress={handleConvert}
                disabled={submitting || amountNum <= 0}
            >
                {submitting
                    ? <ActivityIndicator color={Colors.background} />
                    : <Text style={styles.submitBtnText}>✅ Confirmar conversión</Text>
                }
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    content: { paddingHorizontal: Spacing.lg, paddingTop: 60, paddingBottom: 40 },
    header: { marginBottom: Spacing.xl },
    title: { ...Typography.h2, color: Colors.textPrimary },
    subtitle: { ...Typography.sm, color: Colors.textSecondary, marginTop: 4 },

    balanceRow: { flexDirection: 'row', gap: 8, marginBottom: Spacing.xl },
    balanceChip: {
        flex: 1, backgroundColor: Colors.surface, borderRadius: 12, padding: Spacing.sm,
        alignItems: 'center', borderWidth: 1, borderColor: Colors.border,
    },
    balanceChipLabel: { ...Typography.xs, color: Colors.textMuted },
    balanceChipValue: { ...Typography.sm, color: Colors.gold, fontWeight: '700', marginTop: 2 },

    sectionLabel: { ...Typography.sm, color: Colors.textSecondary, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1, fontSize: 11 },

    directionRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.xl },
    dirBtn: {
        flex: 1, backgroundColor: Colors.surface, borderRadius: 16, padding: Spacing.md,
        alignItems: 'center', borderWidth: 1, borderColor: Colors.border,
    },
    dirBtnActive: { borderColor: Colors.gold, backgroundColor: Colors.surfaceLight },
    dirEmoji: { fontSize: 22 },
    dirArrow: { color: Colors.textMuted, fontSize: 14, marginHorizontal: 4 },
    dirLabel: { ...Typography.xs, color: Colors.textMuted, marginTop: 6, textAlign: 'center' },
    dirLabelActive: { color: Colors.gold, fontWeight: '600' },

    converterCard: {
        backgroundColor: Colors.surface, borderRadius: 24, padding: Spacing.lg,
        borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.lg,
    },
    converterTop: { alignItems: 'center', paddingBottom: Spacing.md },
    converterLabel: { ...Typography.sm, color: Colors.textSecondary, marginBottom: 8 },
    converterInput: {
        fontSize: 40, fontWeight: '700', color: Colors.textPrimary,
        textAlign: 'center', width: '100%',
    },
    converterUnit: { ...Typography.sm, color: Colors.textMuted, marginTop: 4 },
    converterDivider: { flexDirection: 'row', alignItems: 'center', marginVertical: 4 },
    converterDividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
    arrowCircle: {
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: Colors.surfaceLight, borderWidth: 1, borderColor: Colors.gold,
        justifyContent: 'center', alignItems: 'center', marginHorizontal: Spacing.sm,
    },
    arrowText: { color: Colors.gold, fontSize: 18 },
    converterBottom: { alignItems: 'center', paddingTop: Spacing.md },
    converterResult: { fontSize: 36, fontWeight: '700', color: Colors.gold },
    rateNote: { ...Typography.xs, color: Colors.textMuted, textAlign: 'center', marginTop: Spacing.md },

    submitBtn: {
        backgroundColor: Colors.gold, borderRadius: 14, height: 56,
        justifyContent: 'center', alignItems: 'center',
        shadowColor: Colors.gold, shadowOpacity: 0.35, shadowRadius: 10, elevation: 6,
    },
    submitBtnDisabled: { opacity: 0.4 },
    submitBtnText: { ...Typography.bodyBold, color: Colors.background, fontSize: 17 },
});
