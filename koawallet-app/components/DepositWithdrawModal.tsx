import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    TextInput, ActivityIndicator, Linking, Modal
} from 'react-native';
import { Colors, Typography, Spacing } from '../constants/Colors';
import api from '../utils/api';
import StatusAlert from './ui/StatusAlert';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PaymentMethod {
    id: number;
    type: string;
    name: string;
    currency: string;
    details: any;
    instructions?: string;
    isActive: boolean;
}

interface CollectionCenter {
    id: number;
    name: string;
    address: string;
    city: string;
    phone?: string;
    managerName?: string;
    operatingHours: string;
    googleMapsUrl?: string;
}

interface UserPaymentMethod {
    id: number;
    paymentMethodId: number;
    paymentMethod: PaymentMethod;
    accountHolder: string;
    accountNumber: string;
    accountType?: string;
    bankName?: string;
}

interface SystemConfig {
    buyPrice: number;
    sellPrice: number;
    usdVesRate: number;
}

interface Props {
    visible: boolean;
    type: 'DEPOSIT' | 'WITHDRAW';
    userBalance?: number;
    onClose: () => void;
    onSuccess: () => void;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DepositWithdrawModal({ visible, type, userBalance = 0, onClose, onSuccess }: Props) {
    const [step, setStep] = useState(1);

    // Shared data
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
    const [centers, setCenters] = useState<CollectionCenter[]>([]);
    const [userMethods, setUserMethods] = useState<UserPaymentMethod[]>([]);
    const [config, setConfig] = useState<SystemConfig | null>(null);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Deposit state
    const [depositMode, setDepositMode] = useState<'PHYSICAL' | 'BUY' | null>(null);
    const [selectedCenter, setSelectedCenter] = useState<CollectionCenter | null>(null);
    const [selectedPayMethod, setSelectedPayMethod] = useState<PaymentMethod | null>(null);
    const [fiatAmount, setFiatAmount] = useState('');
    const [reference, setReference] = useState('');
    const [notes, setNotes] = useState('');

    // Withdraw state
    const [withdrawPayMethod, setWithdrawPayMethod] = useState<PaymentMethod | null>(null);
    const [selectedUserMethod, setSelectedUserMethod] = useState<UserPaymentMethod | null>(null);
    const [gramsAmount, setGramsAmount] = useState('');
    const [addingAccount, setAddingAccount] = useState(false);
    const [newAccountHolder, setNewAccountHolder] = useState('');
    const [newAccountNumber, setNewAccountNumber] = useState('');
    const [newAccountType, setNewAccountType] = useState('');
    const [newBankName, setNewBankName] = useState('');

    // Security: password confirmation for account edit
    const [editingMethodId, setEditingMethodId] = useState<number | null>(null);
    const [editPassword, setEditPassword] = useState('');
    const [savingAccount, setSavingAccount] = useState(false);

    // Spectacular Alert State
    const [alertVisible, setAlertVisible] = useState(false);
    const [alertConfig, setAlertConfig] = useState<{
        type: 'success' | 'error' | 'warning';
        title: string;
        message: string;
    }>({ type: 'success', title: '', message: '' });

    const showAlert = (type: 'success' | 'error' | 'warning', title: string, message: string) => {
        setAlertConfig({ type, title, message });
        setAlertVisible(true);
    };

    useEffect(() => {
        if (visible) {
            resetAll();
            loadAll();
        }
    }, [visible]);

    const resetAll = () => {
        setStep(1);
        setDepositMode(null); setSelectedCenter(null); setSelectedPayMethod(null);
        setFiatAmount(''); setReference(''); setNotes('');
        setWithdrawPayMethod(null); setSelectedUserMethod(null); setGramsAmount('');
        setAddingAccount(false); setNewAccountHolder(''); setNewAccountNumber('');
        setNewAccountType(''); setNewBankName('');
        setEditingMethodId(null); setEditPassword('');
    };

    const loadAll = async () => {
        setLoading(true);
        try {
            const [pmRes, centersRes, userMRes, cfgRes] = await Promise.all([
                api.get('/payment-methods'),
                api.get('/collection-centers'),
                api.get('/user/payment-methods').catch(() => ({ data: [] })),
                api.get('/cacao-price'),
            ]);
            setPaymentMethods(pmRes.data);
            setCenters(centersRes.data);
            setUserMethods(userMRes.data);
            setConfig({
                buyPrice: cfgRes.data.buyPrice,
                sellPrice: cfgRes.data.sellPrice,
                usdVesRate: cfgRes.data.usdVesRate || 36.5,
            });
        } catch { }
        setLoading(false);
    };

    // ─── Computed values ───────────────────────────────────────────────────────

    const calcGrams = (): number => {
        if (!fiatAmount || !config || !selectedPayMethod) return 0;
        const v = parseFloat(fiatAmount);
        if (isNaN(v) || v <= 0) return 0;
        if (selectedPayMethod.currency === 'VES') {
            return parseFloat(((v / config.usdVesRate) / config.buyPrice).toFixed(4));
        }
        return parseFloat((v / config.buyPrice).toFixed(4));
    };

    const calcWithdrawUSD = (): number => {
        if (!gramsAmount || !config) return 0;
        const g = parseFloat(gramsAmount);
        if (isNaN(g) || g <= 0) return 0;
        return parseFloat((g * config.sellPrice).toFixed(2));
    };

    const calcWithdrawFiat = (): string => {
        if (!withdrawPayMethod || !config) return '';
        const usd = calcWithdrawUSD();
        if (withdrawPayMethod.currency === 'VES') {
            return `${(usd * config.usdVesRate).toFixed(2)} Bs`;
        }
        return `$${usd.toFixed(2)} ${withdrawPayMethod.currency}`;
    };

    // ─── Handlers ─────────────────────────────────────────────────────────────

    const handleBuySubmit = async () => {
        if (!selectedPayMethod || !fiatAmount || parseFloat(fiatAmount) <= 0) {
            showAlert('error', 'Monto Inválido', 'Por favor ingresa un monto válido para continuar.');
            return;
        }
        setSubmitting(true);
        try {
            await api.post('/deposit', {
                type: 'BUY',
                paymentMethodId: selectedPayMethod.id,
                fiatAmount: parseFloat(fiatAmount),
                reference: reference || null,
                notes: notes || null,
            });
            showAlert('success', '✅ Solicitud enviada',
                `Tu compra está pendiente de confirmación por el cajero. Los gramos serán acreditados una vez verificado el pago.\n\nGramos estimados: ${calcGrams().toFixed(4)}g`);

            // Cerrar después de un tiempo o dejar que el usuario lo haga
            setTimeout(() => {
                if (alertVisible) {
                    setAlertVisible(false);
                    onSuccess();
                }
            }, 3000);
        } catch (err: any) {
            const errorMsg = err.response?.data?.error || err.message;
            if (errorMsg.includes('no hay suficiente cacao')) {
                showAlert('warning', 'Mercado no disponible', 'Lo sentimos, no hay suficiente cacao disponible para la venta en este momento. Intente más tarde.');
            } else {
                showAlert('error', 'Error en la operación', errorMsg);
            }
        } finally {
            setSubmitting(false);
        }
    };

    const handleAddAccount = async () => {
        if (!newAccountHolder || !newAccountNumber || !withdrawPayMethod) {
            showAlert('error', 'Campos incompletos', 'Completa todos los campos requeridos para registrar tu cuenta.');
            return;
        }
        setSavingAccount(true);
        try {
            const res = await api.post('/user/payment-methods', {
                paymentMethodId: withdrawPayMethod.id,
                accountHolder: newAccountHolder,
                accountNumber: newAccountNumber,
                accountType: newAccountType || null,
                bankName: newBankName || null,
            });
            const updated = [...userMethods, res.data];
            setUserMethods(updated);
            setSelectedUserMethod(res.data);
            setAddingAccount(false);
            setStep(3);
            showAlert('success', 'Cuenta guardada', 'Tu cuenta ha sido registrada exitosamente.');
        } catch (err: any) {
            showAlert('error', 'Error al guardar', err.response?.data?.error || err.message);
        } finally {
            setSavingAccount(false);
        }
    };

    const handleSellSubmit = async () => {
        if (!gramsAmount || parseFloat(gramsAmount) <= 0) {
            showAlert('error', 'Cantidad inválida', 'Ingresa una cantidad de gramos válida para vender.');
            return;
        }
        if (!selectedUserMethod) {
            showAlert('error', 'Cuenta requerida', 'Selecciona una cuenta de destino para recibir tu pago.');
            return;
        }

        const grams = parseFloat(gramsAmount);
        if (grams > userBalance) {
            showAlert('warning', 'Saldo insuficiente', `Tu saldo disponible es de ${userBalance.toFixed(4)}g. No puedes vender ${grams.toFixed(4)}g.`);
            return;
        }

        setSubmitting(true);
        try {
            await api.post('/withdraw', {
                type: 'SELL',
                gramsAmount: parseFloat(gramsAmount),
                userPaymentMethodId: selectedUserMethod.id,
                notes: notes || null,
            });
            showAlert('success', '✅ Venta registrada',
                `${gramsAmount}g de cacao han sido bloqueados. Un cajero procesará el pago a tu cuenta.\n\nMonto estimado: ${calcWithdrawFiat()}`);

            setTimeout(() => {
                if (alertVisible) {
                    setAlertVisible(false);
                    onSuccess();
                }
            }, 3000);
        } catch (err: any) {
            showAlert('error', 'Error en la venta', err.response?.data?.error || err.message);
        } finally {
            setSubmitting(false);
        }
    };

    // ─── Render helpers ────────────────────────────────────────────────────────

    const goBack = () => {
        if (step === 1) { onClose(); return; }
        // Smart back navigation
        if (type === 'DEPOSIT') {
            if (step === 2 && depositMode === 'BUY') { setDepositMode(null); setStep(1); }
            else if (step === 3) { setStep(2); }
            else { setStep(step - 1); }
        } else {
            if (step === 2) { setWithdrawPayMethod(null); setStep(1); }
            else if (step === 3) {
                if (addingAccount) { setAddingAccount(false); }
                else { setSelectedUserMethod(null); setStep(2); }
            }
            else { setStep(step - 1); }
        }
    };

    const totalSteps = type === 'DEPOSIT' ? (depositMode === 'PHYSICAL' ? 2 : 3) : 3;

    // ─── Render ───────────────────────────────────────────────────────────────

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
            <View style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={goBack} style={styles.backBtn}>
                        <Text style={styles.backText}>{step > 1 ? '← Atrás' : '✕ Cerrar'}</Text>
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>{type === 'DEPOSIT' ? 'Depositar' : 'Retirar'}</Text>
                    <View style={styles.stepBadge}>
                        <Text style={styles.stepText}>{step}/{totalSteps}</Text>
                    </View>
                </View>

                {loading ? (
                    <View style={styles.loadingBox}><ActivityIndicator size="large" color={Colors.gold} /></View>
                ) : (
                    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

                        {/* ══════════════════════════════════════════════════════════ */}
                        {/*  DEPOSIT FLOW                                              */}
                        {/* ══════════════════════════════════════════════════════════ */}

                        {/* DEPOSIT Step 1: ¿Qué deseas realizar? */}
                        {type === 'DEPOSIT' && step === 1 && (
                            <View>
                                <Text style={styles.stepLabel}>¿Qué deseas realizar?</Text>
                                <Text style={styles.stepSub}>Selecciona la operación que deseas ejecutar en tu wallet</Text>

                                <TouchableOpacity
                                    style={[styles.bigCard, depositMode === 'PHYSICAL' && styles.bigCardActive]}
                                    onPress={() => { setDepositMode('PHYSICAL'); }}
                                >
                                    <Text style={styles.bigCardEmoji}>🌱</Text>
                                    <View style={styles.bigCardText}>
                                        <Text style={styles.bigCardTitle}>Depositar Cacao</Text>
                                        <Text style={styles.bigCardSub}>Lleva cacao físico a un centro de acopio para tokenizarlo</Text>
                                    </View>
                                    {depositMode === 'PHYSICAL' && <Text style={styles.checkmark}>✓</Text>}
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.bigCard, depositMode === 'BUY' && styles.bigCardActive]}
                                    onPress={() => { setDepositMode('BUY'); }}
                                >
                                    <Text style={styles.bigCardEmoji}>💳</Text>
                                    <View style={styles.bigCardText}>
                                        <Text style={styles.bigCardTitle}>Comprar</Text>
                                        <Text style={styles.bigCardSub}>Paga con tu método preferido y recibe gramos de cacao tokenizados</Text>
                                    </View>
                                    {depositMode === 'BUY' && <Text style={styles.checkmark}>✓</Text>}
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.nextBtn, !depositMode && styles.nextBtnDisabled]}
                                    onPress={() => depositMode && setStep(2)}
                                    disabled={!depositMode}
                                >
                                    <Text style={styles.nextBtnText}>Continuar →</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* DEPOSIT Step 2A: Centros de acopio (Physical) */}
                        {type === 'DEPOSIT' && step === 2 && depositMode === 'PHYSICAL' && (
                            <View>
                                <Text style={styles.stepLabel}>🏭 Centros de Acopio Disponibles</Text>
                                <Text style={styles.stepSub}>Lleva tu cacao en grano al centro más cercano a tu ubicación</Text>

                                {centers.length === 0 ? (
                                    <View style={styles.emptyCard}>
                                        <Text style={styles.emptyCardText}>No hay centros de acopio disponibles en este momento</Text>
                                    </View>
                                ) : centers.map(c => (
                                    <TouchableOpacity
                                        key={c.id}
                                        style={[styles.centerCard, selectedCenter?.id === c.id && styles.centerCardActive]}
                                        onPress={() => setSelectedCenter(c)}
                                    >
                                        <View style={styles.centerCardHeader}>
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.centerName}>{c.name}</Text>
                                                <Text style={styles.centerCity}>📍 {c.city}</Text>
                                            </View>
                                            {selectedCenter?.id === c.id && <Text style={styles.checkmark}>✓</Text>}
                                        </View>
                                        <Text style={styles.centerDetail}>📬 {c.address}</Text>
                                        {c.phone && <Text style={styles.centerDetail}>📞 {c.phone}</Text>}
                                        {c.managerName && <Text style={styles.centerDetail}>👤 {c.managerName}</Text>}
                                        <Text style={styles.centerDetail}>🕐 {c.operatingHours}</Text>
                                        {c.googleMapsUrl && (
                                            <TouchableOpacity onPress={() => Linking.openURL(c.googleMapsUrl!)}>
                                                <Text style={styles.mapsLink}>🗺️ Ver en Google Maps →</Text>
                                            </TouchableOpacity>
                                        )}
                                    </TouchableOpacity>
                                ))}

                                {/* Instrucciones detalladas */}
                                <View style={styles.instructionBig}>
                                    <Text style={styles.instructionBigTitle}>📋 Instrucciones para el Depósito Físico</Text>

                                    <View style={styles.instructionStep}>
                                        <Text style={styles.instructionStepNum}>01</Text>
                                        <View style={styles.instructionStepContent}>
                                            <Text style={styles.instructionStepTitle}>Prepara tu Cacao</Text>
                                            <Text style={styles.instructionStepDesc}>
                                                Asegúrate de que el cacao esté correctamente fermentado y secado. El cacao
                                                de alta calidad favorece una mejor tasa de conversión en tokens.
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.instructionStep}>
                                        <Text style={styles.instructionStepNum}>02</Text>
                                        <View style={styles.instructionStepContent}>
                                            <Text style={styles.instructionStepTitle}>Traslado al Centro</Text>
                                            <Text style={styles.instructionStepDesc}>
                                                Dirígete al centro de acopio seleccionado dentro del horario de atención.
                                                Presenta tu documento de identidad y menciona que eres usuario de KoaWallet.
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.instructionStep}>
                                        <Text style={styles.instructionStepNum}>03</Text>
                                        <View style={styles.instructionStepContent}>
                                            <Text style={styles.instructionStepTitle}>Pesaje y Clasificación</Text>
                                            <Text style={styles.instructionStepDesc}>
                                                El inspector del centro realizará el gramaje y clasificará el cacao según
                                                su calidad (Premium, Grado 1, Grado 2), nivel de humedad y porcentaje de
                                                fermentación. Estos factores determinan los tokens que recibirás.
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.instructionStep}>
                                        <Text style={styles.instructionStepNum}>04</Text>
                                        <View style={styles.instructionStepContent}>
                                            <Text style={styles.instructionStepTitle}>Tokenización Automática</Text>
                                            <Text style={styles.instructionStepDesc}>
                                                Una vez verificado y aprobado, los gramos netos calculados serán
                                                acreditados directamente en tu wallet KoaWallet. Recibirás una notificación.
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.qualityBox}>
                                        <Text style={styles.qualityTitle}>🏆 Estándares de Calidad KoaWallet</Text>
                                        <Text style={styles.qualityRow}>• <Text style={styles.qualityBold}>PREMIUM:</Text> Fermentación {'>'} 75%, humedad ≤ 7%, conversión 100%</Text>
                                        <Text style={styles.qualityRow}>• <Text style={styles.qualityBold}>GRADO 1:</Text> Fermentación 50-75%, humedad ≤ 9%, conversión 90%</Text>
                                        <Text style={styles.qualityRow}>• <Text style={styles.qualityBold}>GRADO 2:</Text> Fermentación {'< '}50%, conversión 70%</Text>
                                    </View>
                                </View>

                                <TouchableOpacity style={styles.submitBtn} onPress={onClose}>
                                    <Text style={styles.submitBtnText}>✅ Entendido — Iré al Centro</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* DEPOSIT Step 2B: Elegir método de pago (Buy) */}
                        {type === 'DEPOSIT' && step === 2 && depositMode === 'BUY' && (
                            <View>
                                <Text style={styles.stepLabel}>💳 Método de Pago</Text>
                                <Text style={styles.stepSub}>Selecciona cómo realizarás el pago</Text>

                                {paymentMethods.length === 0 ? (
                                    <View style={styles.emptyCard}>
                                        <Text style={styles.emptyCardText}>No hay métodos de pago disponibles en este momento</Text>
                                    </View>
                                ) : paymentMethods.map(m => (
                                    <TouchableOpacity
                                        key={m.id}
                                        style={[styles.methodCard, selectedPayMethod?.id === m.id && styles.methodCardActive]}
                                        onPress={() => setSelectedPayMethod(m)}
                                    >
                                        <View style={styles.methodCardHeader}>
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.methodName}>
                                                    {m.currency === 'VES' ? '🏦' : m.type === 'CRYPTO' ? '🔐' : '💵'} {m.name}
                                                </Text>
                                                <Text style={styles.methodCurrency}>{m.currency}</Text>
                                            </View>
                                            {selectedPayMethod?.id === m.id && <Text style={styles.checkmark}>✓</Text>}
                                        </View>
                                        {m.instructions && <Text style={styles.methodInstructions}>{m.instructions}</Text>}
                                        {m.details && typeof m.details === 'object' && (
                                            <View style={styles.methodDetails}>
                                                {Object.entries(m.details as Record<string, string>).map(([k, v]) => (
                                                    <Text key={k} style={styles.methodDetailRow}>
                                                        <Text style={styles.methodDetailKey}>{k}: </Text>{v}
                                                    </Text>
                                                ))}
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                ))}

                                <TouchableOpacity
                                    style={[styles.nextBtn, !selectedPayMethod && styles.nextBtnDisabled]}
                                    onPress={() => selectedPayMethod && setStep(3)}
                                    disabled={!selectedPayMethod}
                                >
                                    <Text style={styles.nextBtnText}>Continuar →</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* DEPOSIT Step 3: Datos de compra */}
                        {type === 'DEPOSIT' && step === 3 && depositMode === 'BUY' && selectedPayMethod && config && (
                            <View>
                                <Text style={styles.stepLabel}>📝 Datos de la Compra</Text>

                                {/* Resumen método */}
                                <View style={styles.summaryCard}>
                                    <Text style={styles.summaryRow}>Método: <Text style={styles.summaryVal}>{selectedPayMethod.name}</Text></Text>
                                    <Text style={styles.summaryRow}>Moneda: <Text style={styles.summaryVal}>{selectedPayMethod.currency}</Text></Text>
                                    <Text style={styles.summaryRow}>Precio Cacao: <Text style={styles.summaryVal}>${config.buyPrice}/g</Text></Text>
                                    {selectedPayMethod.currency === 'VES' && (
                                        <Text style={styles.summaryRow}>Tasa USD/VES: <Text style={styles.summaryVal}>{config.usdVesRate} Bs</Text></Text>
                                    )}
                                </View>

                                {/* Datos de cuenta */}
                                {selectedPayMethod.details && typeof selectedPayMethod.details === 'object' && (
                                    <View style={styles.accountInfoBox}>
                                        <Text style={styles.accountInfoTitle}>🏦 Datos para el Pago</Text>
                                        {Object.entries(selectedPayMethod.details as Record<string, string>).map(([k, v]) => (
                                            <Text key={k} style={styles.accountInfoRow}>
                                                <Text style={styles.accountInfoKey}>{k}: </Text>{v}
                                            </Text>
                                        ))}
                                        {selectedPayMethod.instructions && (
                                            <Text style={styles.accountInfoInstr}>ℹ️ {selectedPayMethod.instructions}</Text>
                                        )}
                                    </View>
                                )}

                                {/* Monto */}
                                <Text style={styles.fieldLabel}>Monto a pagar ({selectedPayMethod.currency})</Text>
                                <TextInput
                                    style={styles.amountInput}
                                    placeholder={selectedPayMethod.currency === 'VES' ? 'Ej: 1500.00 Bs' : 'Ej: 50.00'}
                                    placeholderTextColor={Colors.textMuted}
                                    value={fiatAmount}
                                    onChangeText={setFiatAmount}
                                    keyboardType="decimal-pad"
                                />

                                {/* Preview de gramos */}
                                {calcGrams() > 0 && (
                                    <View style={styles.previewBox}>
                                        <Text style={styles.previewLabel}>Recibirás (estimado)</Text>
                                        <Text style={styles.previewValue}>{calcGrams().toFixed(4)}g</Text>
                                        <Text style={styles.previewSub}>de Token de Cacao KoaWallet</Text>
                                        {selectedPayMethod.currency === 'VES' && (
                                            <Text style={styles.previewFormula}>
                                                ({fiatAmount} Bs ÷ {config.usdVesRate} T/C) ÷ ${config.buyPrice}/g
                                            </Text>
                                        )}
                                    </View>
                                )}

                                {/* Referencia */}
                                <Text style={styles.fieldLabel}>N° de Referencia / Comprobante</Text>
                                <TextInput
                                    style={styles.textInput}
                                    placeholder="Ingresa el número de referencia del pago"
                                    placeholderTextColor={Colors.textMuted}
                                    value={reference}
                                    onChangeText={setReference}
                                />

                                {/* Notas opcionales */}
                                <Text style={styles.fieldLabel}>Notas adicionales (opcional)</Text>
                                <TextInput
                                    style={[styles.textInput, styles.textArea]}
                                    placeholder="Observaciones adicionales"
                                    placeholderTextColor={Colors.textMuted}
                                    value={notes}
                                    onChangeText={setNotes}
                                    multiline
                                />

                                {/* Aviso cajero */}
                                <View style={styles.warningBox}>
                                    <Text style={styles.warningText}>
                                        ⏳ Tu transacción será revisada por un cajero. Los gramos serán acreditados una vez confirmado el pago. Este proceso puede tomar entre minutos y algunas horas hábiles.
                                    </Text>
                                </View>

                                <TouchableOpacity
                                    style={[styles.submitBtn, submitting && styles.nextBtnDisabled]}
                                    onPress={handleBuySubmit}
                                    disabled={submitting}
                                >
                                    {submitting
                                        ? <ActivityIndicator color={Colors.background} />
                                        : <Text style={styles.submitBtnText}>✅ Confirmar Compra</Text>
                                    }
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* ══════════════════════════════════════════════════════════ */}
                        {/*  WITHDRAW FLOW                                             */}
                        {/* ══════════════════════════════════════════════════════════ */}

                        {/* WITHDRAW Step 1: ¿Cómo deseas retirar? */}
                        {type === 'WITHDRAW' && step === 1 && (
                            <View>
                                <Text style={styles.stepLabel}>¿Cómo deseas retirar?</Text>
                                <Text style={styles.stepSub}>Selecciona el método por el cual recibirás el pago de tu cacao</Text>

                                {paymentMethods.length === 0 ? (
                                    <View style={styles.emptyCard}>
                                        <Text style={styles.emptyCardText}>No hay métodos de pago disponibles en este momento</Text>
                                    </View>
                                ) : paymentMethods.map(m => {
                                    const userHasThis = userMethods.find(um => um.paymentMethodId === m.id);
                                    return (
                                        <TouchableOpacity
                                            key={m.id}
                                            style={[styles.methodCard, withdrawPayMethod?.id === m.id && styles.methodCardActive]}
                                            onPress={() => setWithdrawPayMethod(m)}
                                        >
                                            <View style={styles.methodCardHeader}>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={styles.methodName}>
                                                        {m.currency === 'VES' ? '🏦' : m.type === 'CRYPTO' ? '🔐' : '💵'} {m.name}
                                                    </Text>
                                                    <Text style={styles.methodCurrency}>{m.currency}</Text>
                                                </View>
                                                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                                                    {userHasThis && (
                                                        <View style={styles.accountExistsBadge}>
                                                            <Text style={styles.accountExistsText}>✓ Cuenta guardada</Text>
                                                        </View>
                                                    )}
                                                    {withdrawPayMethod?.id === m.id && <Text style={styles.checkmark}>✓</Text>}
                                                </View>
                                            </View>
                                        </TouchableOpacity>
                                    );
                                })}

                                <TouchableOpacity
                                    style={[styles.nextBtn, !withdrawPayMethod && styles.nextBtnDisabled]}
                                    onPress={() => {
                                        if (!withdrawPayMethod) return;
                                        const existing = userMethods.find(um => um.paymentMethodId === withdrawPayMethod.id);
                                        if (existing) {
                                            setSelectedUserMethod(existing);
                                            setAddingAccount(false);
                                        } else {
                                            setSelectedUserMethod(null);
                                            setAddingAccount(true);
                                        }
                                        setStep(2);
                                    }}
                                    disabled={!withdrawPayMethod}
                                >
                                    <Text style={styles.nextBtnText}>Continuar →</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* WITHDRAW Step 2: Cuenta de destino */}
                        {type === 'WITHDRAW' && step === 2 && withdrawPayMethod && (
                            <View>
                                <Text style={styles.stepLabel}>🏦 Cuenta de Destino</Text>
                                <Text style={styles.stepSub}>Esta es la cuenta donde recibirás el pago por tu cacao</Text>

                                {selectedUserMethod && !addingAccount ? (
                                    <>
                                        <View style={styles.existingAccountCard}>
                                            <View style={styles.existingAccountHeader}>
                                                <Text style={styles.existingAccountTitle}>{withdrawPayMethod.name}</Text>
                                                <TouchableOpacity onPress={() => setAddingAccount(true)}>
                                                    <Text style={styles.editAccountBtn}>✏️ Modificar</Text>
                                                </TouchableOpacity>
                                            </View>
                                            <Text style={styles.existingAccountRow}>
                                                Titular: <Text style={styles.existingAccountVal}>{selectedUserMethod.accountHolder}</Text>
                                            </Text>
                                            {selectedUserMethod.bankName && (
                                                <Text style={styles.existingAccountRow}>
                                                    Banco: <Text style={styles.existingAccountVal}>{selectedUserMethod.bankName}</Text>
                                                </Text>
                                            )}
                                            <Text style={styles.existingAccountRow}>
                                                Cuenta / N°: <Text style={styles.existingAccountNum}>{selectedUserMethod.accountNumber}</Text>
                                            </Text>
                                            {selectedUserMethod.accountType && (
                                                <Text style={styles.existingAccountRow}>
                                                    Tipo: <Text style={styles.existingAccountVal}>{selectedUserMethod.accountType}</Text>
                                                </Text>
                                            )}
                                        </View>

                                        <TouchableOpacity
                                            style={styles.nextBtn}
                                            onPress={() => setStep(3)}
                                        >
                                            <Text style={styles.nextBtnText}>Usar esta cuenta →</Text>
                                        </TouchableOpacity>
                                    </>
                                ) : (
                                    <>
                                        <View style={styles.addAccountForm}>
                                            <Text style={styles.addAccountTitle}>
                                                {editingMethodId ? '✏️ Modificar cuenta' : '➕ Registrar cuenta de cobro'}
                                            </Text>
                                            <Text style={styles.addAccountSub}>
                                                Para {withdrawPayMethod.name} ({withdrawPayMethod.currency})
                                            </Text>

                                            <Text style={styles.fieldLabel}>Nombre del titular *</Text>
                                            <TextInput
                                                style={styles.textInput}
                                                placeholder="Nombre como aparece en la cuenta"
                                                placeholderTextColor={Colors.textMuted}
                                                value={newAccountHolder}
                                                onChangeText={setNewAccountHolder}
                                            />

                                            {withdrawPayMethod.type === 'FIAT' && (
                                                <>
                                                    <Text style={styles.fieldLabel}>Banco</Text>
                                                    <TextInput
                                                        style={styles.textInput}
                                                        placeholder="Ej: Banesco, Mercantil, BOD"
                                                        placeholderTextColor={Colors.textMuted}
                                                        value={newBankName}
                                                        onChangeText={setNewBankName}
                                                    />
                                                    <Text style={styles.fieldLabel}>Tipo de cuenta</Text>
                                                    <TextInput
                                                        style={styles.textInput}
                                                        placeholder="Corriente / Ahorro / Pago móvil"
                                                        placeholderTextColor={Colors.textMuted}
                                                        value={newAccountType}
                                                        onChangeText={setNewAccountType}
                                                    />
                                                </>
                                            )}

                                            <Text style={styles.fieldLabel}>
                                                {withdrawPayMethod.type === 'CRYPTO' ? 'Dirección de wallet *' : 'Número de cuenta / teléfono *'}
                                            </Text>
                                            <TextInput
                                                style={styles.textInput}
                                                placeholder={withdrawPayMethod.type === 'CRYPTO' ? 'Dirección de la wallet' : 'Ej: 0412-1234567 o 0134-0000-11-...'}
                                                placeholderTextColor={Colors.textMuted}
                                                value={newAccountNumber}
                                                onChangeText={setNewAccountNumber}
                                            />

                                            {editingMethodId && (
                                                <>
                                                    <Text style={styles.fieldLabel}>🔒 Confirma tu contraseña *</Text>
                                                    <TextInput
                                                        style={styles.textInput}
                                                        placeholder="Tu contraseña actual"
                                                        placeholderTextColor={Colors.textMuted}
                                                        value={editPassword}
                                                        onChangeText={setEditPassword}
                                                        secureTextEntry
                                                    />
                                                </>
                                            )}

                                            <View style={styles.warningBox}>
                                                <Text style={styles.warningText}>
                                                    🔒 Por seguridad, solo puedes tener una cuenta guardada por método de pago. Para modificarla en el futuro se requerirá tu contraseña.
                                                </Text>
                                            </View>

                                            <TouchableOpacity
                                                style={[styles.submitBtn, savingAccount && styles.nextBtnDisabled]}
                                                onPress={handleAddAccount}
                                                disabled={savingAccount}
                                            >
                                                {savingAccount
                                                    ? <ActivityIndicator color={Colors.background} />
                                                    : <Text style={styles.submitBtnText}>💾 Guardar cuenta</Text>
                                                }
                                            </TouchableOpacity>
                                        </View>
                                    </>
                                )}
                            </View>
                        )}

                        {/* WITHDRAW Step 3: Cantidad de gramos */}
                        {type === 'WITHDRAW' && step === 3 && selectedUserMethod && config && (
                            <View>
                                <Text style={styles.stepLabel}>💰 Cantidad a Vender</Text>

                                {/* Resumen */}
                                <View style={styles.summaryCard}>
                                    <Text style={styles.summaryRow}>Método: <Text style={styles.summaryVal}>{withdrawPayMethod?.name}</Text></Text>
                                    <Text style={styles.summaryRow}>Cuenta: <Text style={styles.summaryVal}>{selectedUserMethod.accountNumber}</Text></Text>
                                    <Text style={styles.summaryRow}>Titular: <Text style={styles.summaryVal}>{selectedUserMethod.accountHolder}</Text></Text>
                                    <Text style={styles.summaryRow}>Precio Cacao: <Text style={styles.summaryVal}>${config.sellPrice}/g</Text></Text>
                                    {withdrawPayMethod?.currency === 'VES' && (
                                        <Text style={styles.summaryRow}>Tasa USD/VES: <Text style={styles.summaryVal}>{config.usdVesRate} Bs</Text></Text>
                                    )}
                                </View>

                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Text style={styles.fieldLabel}>Cantidad de gramos a vender</Text>
                                    <TouchableOpacity onPress={() => setGramsAmount(userBalance.toString())}>
                                        <Text style={{ color: Colors.gold, fontSize: 12, fontWeight: '700' }}>MÁXIMO: {userBalance.toFixed(4)}g</Text>
                                    </TouchableOpacity>
                                </View>
                                <TextInput
                                    style={styles.amountInput}
                                    placeholder="Ej: 250.00"
                                    placeholderTextColor={Colors.textMuted}
                                    value={gramsAmount}
                                    onChangeText={setGramsAmount}
                                    keyboardType="decimal-pad"
                                />

                                {calcWithdrawUSD() > 0 && (
                                    <View style={styles.previewBox}>
                                        <Text style={styles.previewLabel}>Recibirás aproximadamente</Text>
                                        <Text style={styles.previewValue}>{calcWithdrawFiat()}</Text>
                                        <Text style={styles.previewSub}>≈ ${calcWithdrawUSD().toFixed(2)} USD</Text>
                                        {withdrawPayMethod?.currency === 'VES' && (
                                            <Text style={styles.previewFormula}>
                                                {gramsAmount}g × ${config.sellPrice}/g × {config.usdVesRate} T/C
                                            </Text>
                                        )}
                                    </View>
                                )}

                                <View style={styles.warningBox}>
                                    <Text style={styles.warningText}>
                                        ⏳ Los gramos serán bloqueados de tu wallet mientras el cajero procesa el pago. Una vez confirmado el retiro, los gramos serán descontados definitivamente.
                                    </Text>
                                </View>

                                <TouchableOpacity
                                    style={[styles.submitBtn, submitting && styles.nextBtnDisabled]}
                                    onPress={handleSellSubmit}
                                    disabled={submitting}
                                >
                                    {submitting
                                        ? <ActivityIndicator color={Colors.background} />
                                        : <Text style={styles.submitBtnText}>✅ Confirmar Venta</Text>
                                    }
                                </TouchableOpacity>
                            </View>
                        )}

                    </ScrollView>
                )}
                <StatusAlert
                    visible={alertVisible}
                    type={alertConfig.type}
                    title={alertConfig.title}
                    message={alertConfig.message}
                    onClose={() => {
                        setAlertVisible(false);
                        // Si era un éxito y es una transacción finalizada, cerramos el modal
                        if (alertConfig.type === 'success' &&
                            (alertConfig.title.includes('enviada') || alertConfig.title.includes('registrada'))) {
                            onSuccess();
                        }
                    }}
                />
            </View>
        </Modal>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

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
    scroll: { padding: Spacing.lg, paddingBottom: 80 },

    stepLabel: { ...Typography.h3, color: Colors.textPrimary, marginBottom: 6 },
    stepSub: { ...Typography.sm, color: Colors.textMuted, marginBottom: Spacing.lg, lineHeight: 20 },

    // Big option cards (step 1 deposit)
    bigCard: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: Colors.surface, borderRadius: 18, padding: Spacing.md,
        borderWidth: 1.5, borderColor: Colors.border, marginBottom: 12, gap: 14,
    },
    bigCardActive: { borderColor: Colors.gold, backgroundColor: Colors.surfaceLight },
    bigCardEmoji: { fontSize: 32 },
    bigCardText: { flex: 1 },
    bigCardTitle: { ...Typography.bodyBold, color: Colors.textPrimary, fontSize: 16 },
    bigCardSub: { ...Typography.xs, color: Colors.textMuted, marginTop: 3, lineHeight: 17 },
    checkmark: { color: Colors.gold, fontSize: 20, fontWeight: '700' },

    // Collection centers
    centerCard: {
        backgroundColor: Colors.surface, borderRadius: 16, padding: Spacing.md,
        borderWidth: 1, borderColor: Colors.border, marginBottom: 12,
    },
    centerCardActive: { borderColor: Colors.gold },
    centerCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
    centerName: { ...Typography.bodyBold, color: Colors.textPrimary, fontSize: 15 },
    centerCity: { ...Typography.xs, color: Colors.gold, marginTop: 2 },
    centerDetail: { ...Typography.sm, color: Colors.textSecondary, marginBottom: 3 },
    mapsLink: { ...Typography.sm, color: Colors.gold, marginTop: 6, fontWeight: '600' },

    // Instruction box
    instructionBig: {
        backgroundColor: Colors.surfaceLight, borderRadius: 18, padding: Spacing.lg,
        borderWidth: 1, borderColor: Colors.border, marginTop: Spacing.lg, marginBottom: Spacing.md,
    },
    instructionBigTitle: { ...Typography.bodyBold, color: Colors.gold, fontSize: 15, marginBottom: Spacing.md },
    instructionStep: { flexDirection: 'row', gap: 12, marginBottom: Spacing.md },
    instructionStepNum: { fontSize: 22, fontWeight: '800', color: Colors.gold, opacity: 0.7, width: 30 },
    instructionStepContent: { flex: 1 },
    instructionStepTitle: { ...Typography.bodyBold, color: Colors.textPrimary, marginBottom: 3 },
    instructionStepDesc: { ...Typography.sm, color: Colors.textSecondary, lineHeight: 20 },
    qualityBox: {
        backgroundColor: '#1A1200', borderRadius: 12, padding: Spacing.md,
        borderWidth: 1, borderColor: '#4A3800', marginTop: 8,
    },
    qualityTitle: { ...Typography.bodyBold, color: Colors.gold, marginBottom: 8 },
    qualityRow: { ...Typography.sm, color: Colors.textSecondary, marginBottom: 4, lineHeight: 20 },
    qualityBold: { fontWeight: '700', color: Colors.textPrimary },

    // Method cards
    methodCard: {
        backgroundColor: Colors.surface, borderRadius: 16, padding: Spacing.md,
        borderWidth: 1, borderColor: Colors.border, marginBottom: 10,
    },
    methodCardActive: { borderColor: Colors.gold, backgroundColor: Colors.surfaceLight },
    methodCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    methodName: { ...Typography.bodyBold, color: Colors.textPrimary, fontSize: 15 },
    methodCurrency: { ...Typography.xs, color: Colors.gold, marginTop: 2 },
    methodInstructions: { ...Typography.xs, color: Colors.textMuted, marginTop: 6, lineHeight: 18 },
    methodDetails: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: Colors.border },
    methodDetailRow: { ...Typography.xs, color: Colors.textSecondary, marginBottom: 2 },
    methodDetailKey: { fontWeight: '700', color: Colors.textPrimary },
    accountExistsBadge: {
        backgroundColor: '#1A3320', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2,
        borderWidth: 1, borderColor: '#2A5040',
    },
    accountExistsText: { ...Typography.xs, color: '#4ADE80', fontWeight: '600' },

    // Existing account card
    existingAccountCard: {
        backgroundColor: Colors.surfaceLight, borderRadius: 16, padding: Spacing.md,
        borderWidth: 1, borderColor: Colors.gold, marginBottom: Spacing.md,
    },
    existingAccountHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    existingAccountTitle: { ...Typography.bodyBold, color: Colors.gold },
    editAccountBtn: { ...Typography.xs, color: Colors.textMuted },
    existingAccountRow: { ...Typography.sm, color: Colors.textMuted, marginBottom: 4 },
    existingAccountVal: { color: Colors.textPrimary, fontWeight: '600' },
    existingAccountNum: { color: Colors.gold, fontWeight: '700', fontFamily: 'monospace' },

    // Add account form
    addAccountForm: {
        backgroundColor: Colors.surfaceLight, borderRadius: 16, padding: Spacing.md,
        borderWidth: 1, borderColor: Colors.border,
    },
    addAccountTitle: { ...Typography.bodyBold, color: Colors.textPrimary, marginBottom: 4 },
    addAccountSub: { ...Typography.xs, color: Colors.textMuted, marginBottom: Spacing.md },

    // Form fields
    fieldLabel: { ...Typography.xs, color: Colors.textSecondary, marginBottom: 6, marginTop: Spacing.sm, textTransform: 'uppercase', letterSpacing: 0.5 },
    textInput: {
        backgroundColor: Colors.surfaceLight, borderRadius: 12, height: 48,
        paddingHorizontal: Spacing.md, color: Colors.textPrimary, ...Typography.body,
        borderWidth: 1, borderColor: Colors.border, marginBottom: 4,
    },
    textArea: { height: 80, paddingTop: 12, textAlignVertical: 'top' },
    amountInput: {
        backgroundColor: Colors.surfaceLight, borderRadius: 14, height: 64,
        paddingHorizontal: Spacing.md, fontSize: 28, fontWeight: '700', color: Colors.textPrimary,
        borderWidth: 1, borderColor: Colors.border, marginBottom: 8,
    },

    // Summary
    summaryCard: {
        backgroundColor: Colors.surfaceLight, borderRadius: 14, padding: Spacing.md,
        borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.md,
    },
    summaryRow: { ...Typography.sm, color: Colors.textMuted, marginBottom: 4 },
    summaryVal: { color: Colors.textPrimary, fontWeight: '600' },

    // Account info
    accountInfoBox: {
        backgroundColor: '#1A1200', borderRadius: 14, padding: Spacing.md,
        borderWidth: 1, borderColor: '#4A3800', marginBottom: Spacing.md,
    },
    accountInfoTitle: { ...Typography.bodyBold, color: Colors.gold, marginBottom: 8 },
    accountInfoRow: { ...Typography.sm, color: Colors.textSecondary, marginBottom: 4 },
    accountInfoKey: { fontWeight: '700', color: Colors.textPrimary },
    accountInfoInstr: { ...Typography.xs, color: Colors.textMuted, marginTop: 6, lineHeight: 18 },

    // Preview box
    previewBox: {
        backgroundColor: '#0D1A00', borderRadius: 16, padding: Spacing.md,
        borderWidth: 1.5, borderColor: Colors.gold, alignItems: 'center',
        marginVertical: Spacing.sm,
    },
    previewLabel: { ...Typography.xs, color: Colors.textMuted, marginBottom: 4 },
    previewValue: { fontSize: 32, fontWeight: '800', color: Colors.gold },
    previewSub: { ...Typography.sm, color: Colors.textSecondary, marginTop: 4 },
    previewFormula: { ...Typography.xs, color: Colors.textMuted, marginTop: 6, fontFamily: 'monospace' },

    // Warning box
    warningBox: {
        backgroundColor: '#1A1400', borderRadius: 12, padding: Spacing.md,
        borderWidth: 1, borderColor: '#4A3800', marginVertical: Spacing.sm,
    },
    warningText: { ...Typography.sm, color: '#B8941A', lineHeight: 20 },

    // Empty state
    emptyCard: {
        backgroundColor: Colors.surface, borderRadius: 14, padding: Spacing.xl,
        borderWidth: 1, borderColor: Colors.border, alignItems: 'center',
    },
    emptyCardText: { ...Typography.body, color: Colors.textMuted, textAlign: 'center' },

    // Buttons
    nextBtn: {
        backgroundColor: Colors.gold, borderRadius: 14, height: 54,
        justifyContent: 'center', alignItems: 'center', marginTop: Spacing.lg,
    },
    nextBtnDisabled: { opacity: 0.35 },
    nextBtnText: { ...Typography.bodyBold, color: Colors.background, fontSize: 16 },
    submitBtn: {
        backgroundColor: Colors.gold, borderRadius: 14, height: 58,
        justifyContent: 'center', alignItems: 'center', marginTop: Spacing.lg,
        shadowColor: Colors.gold, shadowOpacity: 0.4, shadowRadius: 10, elevation: 6,
    },
    submitBtnText: { ...Typography.bodyBold, color: Colors.background, fontSize: 17 },
});
