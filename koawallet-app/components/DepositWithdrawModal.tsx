import React, { useState, useEffect } from 'react';
import {
    View, Text, Modal, StyleSheet, TouchableOpacity, ScrollView,
    TextInput, Alert, ActivityIndicator
} from 'react-native';
import { Colors, Typography, Spacing } from '../constants/Colors';
import api from '../utils/api';

interface BankOption {
    id: number;
    country: string;
    bankName: string;
    accountHolder: string;
    accountNumber: string;
    accountType?: string;
    notes?: string;
}

interface PaymentMethod {
    id: number;
    code: string;
    label: string;
    description?: string;
}

interface Props {
    visible: boolean;
    type: 'DEPOSIT' | 'WITHDRAW';
    onClose: () => void;
    onSuccess: () => void;
}

const ASSET_TYPES = [
    { key: 'CACAO', label: '🍫 Gramos de Cacao', unit: 'gramos' },
    { key: 'USD', label: '💵 Dólares (USD)', unit: 'USD' },
];

export default function DepositWithdrawModal({ visible, type, onClose, onSuccess }: Props) {
    const [step, setStep] = useState(1); // 1: asset, 2: method, 3: bank, 4: amount
    const [assetType, setAssetType] = useState<'CACAO' | 'USD' | null>(null);
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
    const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
    const [banks, setBanks] = useState<BankOption[]>([]);
    const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
    const [selectedBank, setSelectedBank] = useState<BankOption | null>(null);
    const [amount, setAmount] = useState('');
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const title = type === 'DEPOSIT' ? 'Depositar' : 'Retirar';

    useEffect(() => {
        if (visible) {
            resetState();
            loadData();
        }
    }, [visible]);

    const resetState = () => {
        setStep(1); setAssetType(null); setSelectedMethod(null);
        setSelectedCountry(null); setSelectedBank(null); setAmount('');
    };

    const loadData = async () => {
        setLoading(true);
        try {
            const [methodsRes, banksRes] = await Promise.all([
                api.get('/payment-methods'),
                api.get('/banks'),
            ]);
            setPaymentMethods(methodsRes.data);
            setBanks(banksRes.data);
        } catch { }
        setLoading(false);
    };

    const countries = [...new Set(banks.map((b) => b.country))];
    const banksForCountry = banks.filter((b) => b.country === selectedCountry);

    const handleSubmit = async () => {
        if (!amount || parseFloat(amount) <= 0) {
            Alert.alert('Error', 'Ingresa un monto válido');
            return;
        }
        setSubmitting(true);
        try {
            const txType = type === 'DEPOSIT'
                ? (assetType === 'USD' ? 'DEPOSIT_USD' : 'DEPOSIT_CACAO')
                : (assetType === 'USD' ? 'WITHDRAW_USD' : 'WITHDRAW_CACAO');

            const endpoint = type === 'DEPOSIT' ? '/deposit' : '/withdraw';
            await api.post(endpoint, {
                type: txType,
                amount: parseFloat(amount),
                method: selectedMethod?.code || null,
                bankOptionId: selectedBank?.id || null,
            });

            Alert.alert('✅ Éxito', `${title} enviado correctamente. Estado: Pendiente de confirmación.`);
            onSuccess();
        } catch (err: any) {
            Alert.alert('Error', err.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
            <View style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={step > 1 ? () => setStep(step - 1) : onClose} style={styles.backBtn}>
                        <Text style={styles.backText}>{step > 1 ? '← Atrás' : '✕ Cerrar'}</Text>
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>{title}</Text>
                    <View style={styles.stepBadge}>
                        <Text style={styles.stepText}>{step}/4</Text>
                    </View>
                </View>

                {loading ? (
                    <View style={styles.loadingBox}><ActivityIndicator size="large" color={Colors.gold} /></View>
                ) : (
                    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

                        {/* STEP 1: Elegir activo */}
                        {step === 1 && (
                            <View>
                                <Text style={styles.stepLabel}>¿Qué deseas {type === 'DEPOSIT' ? 'depositar' : 'retirar'}?</Text>
                                {ASSET_TYPES.map((a) => (
                                    <TouchableOpacity
                                        key={a.key}
                                        style={[styles.optionCard, assetType === a.key && styles.optionCardActive]}
                                        onPress={() => { setAssetType(a.key as 'CACAO' | 'USD'); }}
                                    >
                                        <Text style={styles.optionLabel}>{a.label}</Text>
                                        {assetType === a.key && <Text style={styles.checkmark}>✓</Text>}
                                    </TouchableOpacity>
                                ))}
                                <TouchableOpacity
                                    style={[styles.nextBtn, !assetType && styles.nextBtnDisabled]}
                                    onPress={() => assetType && setStep(2)}
                                    disabled={!assetType}
                                >
                                    <Text style={styles.nextBtnText}>Continuar →</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* STEP 2: Método de pago */}
                        {step === 2 && (
                            <View>
                                <Text style={styles.stepLabel}>Método de {type === 'DEPOSIT' ? 'depósito' : 'retiro'}</Text>
                                {paymentMethods.map((m) => (
                                    <TouchableOpacity
                                        key={m.code}
                                        style={[styles.optionCard, selectedMethod?.code === m.code && styles.optionCardActive]}
                                        onPress={() => setSelectedMethod(m)}
                                    >
                                        <View>
                                            <Text style={styles.optionLabel}>{m.code === 'BANK' ? '🏦' : '🏢'} {m.label}</Text>
                                            {m.description && <Text style={styles.optionSub}>{m.description}</Text>}
                                        </View>
                                        {selectedMethod?.code === m.code && <Text style={styles.checkmark}>✓</Text>}
                                    </TouchableOpacity>
                                ))}
                                <TouchableOpacity
                                    style={[styles.nextBtn, !selectedMethod && styles.nextBtnDisabled]}
                                    onPress={() => {
                                        if (!selectedMethod) return;
                                        setStep(selectedMethod.code === 'BANK' ? 3 : 4);
                                    }}
                                    disabled={!selectedMethod}
                                >
                                    <Text style={styles.nextBtnText}>Continuar →</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* STEP 3: Banco */}
                        {step === 3 && (
                            <View>
                                <Text style={styles.stepLabel}>Selecciona el banco de KoaWallet</Text>

                                <Text style={styles.subLabel}>País</Text>
                                <View style={styles.pillRow}>
                                    {countries.map((c) => (
                                        <TouchableOpacity
                                            key={c}
                                            style={[styles.pill, selectedCountry === c && styles.pillActive]}
                                            onPress={() => { setSelectedCountry(c); setSelectedBank(null); }}
                                        >
                                            <Text style={[styles.pillText, selectedCountry === c && styles.pillTextActive]}>{c}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                {selectedCountry && (
                                    <>
                                        <Text style={styles.subLabel}>Banco</Text>
                                        {banksForCountry.map((b) => (
                                            <TouchableOpacity
                                                key={b.id}
                                                style={[styles.bankCard, selectedBank?.id === b.id && styles.bankCardActive]}
                                                onPress={() => setSelectedBank(b)}
                                            >
                                                <View style={styles.bankCardHeader}>
                                                    <Text style={styles.bankName}>{b.bankName}</Text>
                                                    {selectedBank?.id === b.id && <Text style={styles.checkmark}>✓</Text>}
                                                </View>
                                                <Text style={styles.bankHolder}>{b.accountHolder}</Text>
                                                <Text style={styles.bankAccount}>{b.accountNumber}</Text>
                                                {b.accountType && <Text style={styles.bankType}>{b.accountType}</Text>}
                                                {b.notes && <Text style={styles.bankNotes}>📋 {b.notes}</Text>}
                                            </TouchableOpacity>
                                        ))}
                                    </>
                                )}

                                <TouchableOpacity
                                    style={[styles.nextBtn, !selectedBank && styles.nextBtnDisabled]}
                                    onPress={() => selectedBank && setStep(4)}
                                    disabled={!selectedBank}
                                >
                                    <Text style={styles.nextBtnText}>Continuar →</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* STEP 4: Monto y confirmar */}
                        {step === 4 && (
                            <View>
                                <Text style={styles.stepLabel}>Monto a {type === 'DEPOSIT' ? 'depositar' : 'retirar'}</Text>

                                {/* Resumen */}
                                <View style={styles.summaryCard}>
                                    <Text style={styles.summaryRow}>Activo: <Text style={styles.summaryVal}>{assetType === 'CACAO' ? '🍫 Gramos de Cacao' : '💵 USD'}</Text></Text>
                                    <Text style={styles.summaryRow}>Método: <Text style={styles.summaryVal}>{selectedMethod?.label}</Text></Text>
                                    {selectedBank && <Text style={styles.summaryRow}>Banco: <Text style={styles.summaryVal}>{selectedBank.bankName}</Text></Text>}
                                </View>

                                <Text style={styles.subLabel}>Cantidad ({assetType === 'CACAO' ? 'gramos' : 'USD'})</Text>
                                <TextInput
                                    style={styles.amountInput}
                                    placeholder={assetType === 'CACAO' ? 'Ej: 500.00' : 'Ej: 50.00'}
                                    placeholderTextColor={Colors.textMuted}
                                    value={amount}
                                    onChangeText={setAmount}
                                    keyboardType="decimal-pad"
                                />

                                {selectedBank && (
                                    <View style={styles.instructionBox}>
                                        <Text style={styles.instructionTitle}>📋 Instrucciones</Text>
                                        <Text style={styles.instructionText}>Realiza la transferencia a la cuenta indicada arriba y luego confirma aquí. Un agente verificará tu pago.</Text>
                                        {selectedBank.notes && <Text style={styles.instructionText}>{selectedBank.notes}</Text>}
                                    </View>
                                )}

                                <TouchableOpacity
                                    style={[styles.submitBtn, submitting && styles.nextBtnDisabled]}
                                    onPress={handleSubmit}
                                    disabled={submitting}
                                >
                                    {submitting
                                        ? <ActivityIndicator color={Colors.background} />
                                        : <Text style={styles.submitBtnText}>✅ Confirmar {title}</Text>
                                    }
                                </TouchableOpacity>
                            </View>
                        )}
                    </ScrollView>
                )}
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: Spacing.lg, paddingTop: 56, paddingBottom: Spacing.md,
        borderBottomWidth: 1, borderBottomColor: Colors.border,
    },
    backBtn: { paddingHorizontal: 4, paddingVertical: 6 },
    backText: { color: Colors.gold, ...Typography.sm },
    headerTitle: { ...Typography.h3, color: Colors.textPrimary },
    stepBadge: { backgroundColor: Colors.surfaceLight, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 },
    stepText: { ...Typography.xs, color: Colors.textSecondary },
    loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    scroll: { padding: Spacing.lg, paddingBottom: 60 },
    stepLabel: { ...Typography.h3, color: Colors.textPrimary, marginBottom: Spacing.lg },
    subLabel: { ...Typography.sm, color: Colors.textSecondary, marginBottom: 8, marginTop: Spacing.md },

    optionCard: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        backgroundColor: Colors.surface, borderRadius: 14, padding: Spacing.md,
        borderWidth: 1, borderColor: Colors.border, marginBottom: 10,
    },
    optionCardActive: { borderColor: Colors.gold, backgroundColor: Colors.surfaceLight },
    optionLabel: { ...Typography.bodyBold, color: Colors.textPrimary },
    optionSub: { ...Typography.xs, color: Colors.textMuted, marginTop: 3 },
    checkmark: { color: Colors.gold, fontSize: 18, fontWeight: '700' },

    nextBtn: {
        backgroundColor: Colors.gold, borderRadius: 14, height: 52,
        justifyContent: 'center', alignItems: 'center', marginTop: Spacing.lg,
    },
    nextBtnDisabled: { opacity: 0.4 },
    nextBtnText: { ...Typography.bodyBold, color: Colors.background, fontSize: 16 },

    pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    pill: {
        paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
        backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, marginBottom: 4,
    },
    pillActive: { backgroundColor: Colors.gold, borderColor: Colors.gold },
    pillText: { ...Typography.sm, color: Colors.textSecondary },
    pillTextActive: { color: Colors.background, fontWeight: '700' },

    bankCard: {
        backgroundColor: Colors.surface, borderRadius: 14, padding: Spacing.md,
        borderWidth: 1, borderColor: Colors.border, marginBottom: 10,
    },
    bankCardActive: { borderColor: Colors.gold },
    bankCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    bankName: { ...Typography.bodyBold, color: Colors.textPrimary },
    bankHolder: { ...Typography.sm, color: Colors.textSecondary, marginTop: 4 },
    bankAccount: { ...Typography.bodyBold, color: Colors.gold, marginTop: 2, fontFamily: 'monospace' },
    bankType: { ...Typography.xs, color: Colors.textMuted, marginTop: 2 },
    bankNotes: { ...Typography.xs, color: Colors.textSecondary, marginTop: 6 },

    summaryCard: {
        backgroundColor: Colors.surfaceLight, borderRadius: 14, padding: Spacing.md,
        borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.md,
    },
    summaryRow: { ...Typography.sm, color: Colors.textMuted, marginBottom: 4 },
    summaryVal: { color: Colors.textPrimary, fontWeight: '600' },

    amountInput: {
        backgroundColor: Colors.surfaceLight, borderRadius: 12, height: 56,
        paddingHorizontal: Spacing.md, ...Typography.h3, color: Colors.textPrimary,
        borderWidth: 1, borderColor: Colors.border,
    },

    instructionBox: {
        backgroundColor: Colors.surfaceLight, borderRadius: 14, padding: Spacing.md,
        marginTop: Spacing.md, borderWidth: 1, borderColor: Colors.border,
    },
    instructionTitle: { ...Typography.bodyBold, color: Colors.gold, marginBottom: 6 },
    instructionText: { ...Typography.sm, color: Colors.textSecondary, lineHeight: 20, marginBottom: 4 },

    submitBtn: {
        backgroundColor: Colors.gold, borderRadius: 14, height: 56,
        justifyContent: 'center', alignItems: 'center', marginTop: Spacing.lg,
        shadowColor: Colors.gold, shadowOpacity: 0.4, shadowRadius: 10, elevation: 6,
    },
    submitBtnText: { ...Typography.bodyBold, color: Colors.background, fontSize: 17 },
});
