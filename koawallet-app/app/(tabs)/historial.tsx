import React, { useState, useCallback } from 'react';
import {
    View, Text, FlatList, StyleSheet, TouchableOpacity,
    RefreshControl, ActivityIndicator, Modal, ScrollView, Pressable
} from 'react-native';
import { Colors, Typography, Spacing } from '../../constants/Colors';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../utils/api';
import { Ionicons } from '@expo/vector-icons';

interface BankOption {
    id: number;
    country: string;
    bankName: string;
    accountHolder: string;
    accountNumber: string;
    accountType?: string;
    notes?: string;
}

interface Transaction {
    id: number;
    type: string;
    amount: number;
    amountUSD?: number;
    amountCacao?: number;
    fiatAmount?: number;
    gramsAmount?: number;
    priceAt?: number;
    cacaoPriceUSD?: number;
    exchangeRate?: number;
    status: string;
    reference?: string;
    adminNotes?: string;
    notes?: string;
    feeUSD?: number;
    method?: string;
    createdAt: string;
    updatedAt: string;
    bankOption?: BankOption;
}

const TX_LABELS: Record<string, { label: string; sign: string; color: string; icon: any }> = {
    BUY: { label: 'Compra de Cacao', sign: '+', color: Colors.gold, icon: 'cart' },
    SELL: { label: 'Venta de Cacao', sign: '-', color: Colors.goldLight, icon: 'cash' },
    DEPOSIT_USD: { label: 'Depósito USD', sign: '+', color: Colors.success, icon: 'arrow-down-circle' },
    DEPOSIT_CACAO: { label: 'Depósito Físico', sign: '+', color: Colors.gold, icon: 'leaf' },
    WITHDRAW_USD: { label: 'Retiro USD', sign: '-', color: Colors.error, icon: 'arrow-up-circle' },
    WITHDRAW_CACAO: { label: 'Retiro Cacao', sign: '-', color: Colors.error, icon: 'log-out' },
    MAINTENANCE_FEE: { label: 'Cuota de Mantenimiento', sign: '-', color: Colors.textMuted, icon: 'calendar' },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
    COMPLETED: { label: 'Completada', color: Colors.success, bg: '#1A3320', icon: 'checkmark-circle' },
    PENDING: { label: 'Pendiente', color: Colors.gold, bg: '#3A2810', icon: 'time' },
    REJECTED: { label: 'Rechazada', color: Colors.error, bg: '#331A1A', icon: 'close-circle' },
};

export default function HistoryScreen() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState<'ALL' | 'BUY/SELL' | 'CASH'>('ALL');
    const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

    const fetchTransactions = useCallback(async () => {
        try {
            const res = await api.get('/transactions');
            setTransactions(res.data);
        } catch (err) {
            console.error('Error fetching transactions:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            fetchTransactions();
            const interval = setInterval(fetchTransactions, 30000);
            return () => clearInterval(interval);
        }, [fetchTransactions])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchTransactions();
    };

    const filteredTransactions = transactions.filter(tx => {
        if (filter === 'ALL') return true;
        if (filter === 'BUY/SELL') return ['BUY', 'SELL'].includes(tx.type);
        if (filter === 'CASH') return ['DEPOSIT_USD', 'WITHDRAW_USD', 'DEPOSIT_CACAO', 'WITHDRAW_CACAO'].includes(tx.type);
        return true;
    });

    const formatDate = (iso: string) => {
        const d = new Date(iso);
        return d.toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    const formatDateTime = (iso: string) => {
        const d = new Date(iso);
        return d.toLocaleString('es-VE', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    const renderItem = ({ item: tx }: { item: Transaction }) => {
        const meta = TX_LABELS[tx.type] ?? { label: tx.type, sign: '', color: Colors.textSecondary, icon: 'help-circle' };
        const statusCfg = STATUS_CONFIG[tx.status] ?? { label: tx.status, color: Colors.textMuted, bg: Colors.surface, icon: 'help-circle' };

        return (
            <TouchableOpacity style={styles.txItem} onPress={() => setSelectedTx(tx)} activeOpacity={0.7}>
                <View style={[styles.iconContainer, { backgroundColor: `${meta.color}20` }]}>
                    <Ionicons name={meta.icon} size={22} color={meta.color} />
                </View>

                <View style={styles.txMain}>
                    <Text style={styles.txLabel}>{meta.label}</Text>
                    <Text style={styles.txDate}>{formatDate(tx.createdAt)}</Text>
                </View>

                <View style={styles.txRight}>
                    <Text style={[styles.txAmount, { color: meta.color }]}>
                        {meta.sign} {tx.amountCacao ? `${tx.amountCacao.toFixed(4)}g` : `$${tx.amountUSD?.toFixed(2)}`}
                    </Text>
                    <View style={[styles.statusBadge, { backgroundColor: statusCfg.bg }]}>
                        <Text style={[styles.statusText, { color: statusCfg.color }]}>
                            {statusCfg.label}
                        </Text>
                    </View>
                </View>

                <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} style={{ marginLeft: 4 }} />
            </TouchableOpacity>
        );
    };

    // ─── Detail Modal ───────────────────────────────────────────────────────────
    const renderDetailModal = () => {
        if (!selectedTx) return null;
        const tx = selectedTx;
        const meta = TX_LABELS[tx.type] ?? { label: tx.type, sign: '', color: Colors.textSecondary, icon: 'help-circle' };
        const statusCfg = STATUS_CONFIG[tx.status] ?? { label: tx.status, color: Colors.textMuted, bg: Colors.surface, icon: 'help-circle' };

        const DetailRow = ({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) => (
            <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>{label}</Text>
                <Text style={[styles.detailValue, mono && styles.detailMono]} selectable>{value}</Text>
            </View>
        );

        return (
            <Modal
                visible={!!selectedTx}
                transparent
                animationType="slide"
                onRequestClose={() => setSelectedTx(null)}
            >
                <Pressable style={styles.modalOverlay} onPress={() => setSelectedTx(null)} />
                <View style={styles.modalSheet}>
                    {/* Handle bar */}
                    <View style={styles.sheetHandle} />

                    {/* Header */}
                    <View style={styles.sheetHeader}>
                        <View style={[styles.sheetIconBg, { backgroundColor: `${meta.color}25` }]}>
                            <Ionicons name={meta.icon} size={28} color={meta.color} />
                        </View>
                        <View style={{ flex: 1, marginLeft: 14 }}>
                            <Text style={styles.sheetTitle}>{meta.label}</Text>
                            <Text style={styles.sheetDate}>{formatDateTime(tx.createdAt)}</Text>
                        </View>
                        <TouchableOpacity onPress={() => setSelectedTx(null)} style={styles.closeBtn}>
                            <Ionicons name="close" size={22} color={Colors.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    {/* Status banner */}
                    <View style={[styles.statusBanner, { backgroundColor: statusCfg.bg, borderColor: `${statusCfg.color}40` }]}>
                        <Ionicons name={statusCfg.icon} size={18} color={statusCfg.color} />
                        <Text style={[styles.statusBannerText, { color: statusCfg.color }]}>{statusCfg.label}</Text>
                    </View>

                    <ScrollView style={styles.sheetBody} showsVerticalScrollIndicator={false}>
                        {/* Amount section */}
                        <View style={styles.amountCard}>
                            {tx.amountCacao != null && (
                                <Text style={[styles.amountBig, { color: meta.color }]}>
                                    {meta.sign} {tx.amountCacao.toFixed(4)} g
                                </Text>
                            )}
                            {tx.amountUSD != null && (
                                <Text style={[styles.amountSub, { color: tx.amountCacao ? Colors.textMuted : meta.color }]}>
                                    {tx.amountCacao ? `≈ $${tx.amountUSD.toFixed(2)} USD` : `${meta.sign} $${tx.amountUSD.toFixed(2)} USD`}
                                </Text>
                            )}
                            {tx.fiatAmount != null && (
                                <Text style={styles.amountSub}>Monto fiat: {tx.fiatAmount.toFixed(2)}</Text>
                            )}
                        </View>

                        {/* Details section */}
                        <View style={styles.detailCard}>
                            <Text style={styles.cardSectionTitle}>Detalles de la transacción</Text>

                            <DetailRow label="ID de transacción" value={`#${tx.id}`} />
                            <DetailRow label="Tipo" value={meta.label} />
                            <DetailRow label="Fecha" value={formatDateTime(tx.createdAt)} />
                            {tx.updatedAt !== tx.createdAt && (
                                <DetailRow label="Última actualización" value={formatDateTime(tx.updatedAt)} />
                            )}

                            {tx.priceAt != null && tx.priceAt > 0 && (
                                <DetailRow label="Precio cacao al momento" value={`$${tx.priceAt.toFixed(4)} USD/g`} />
                            )}
                            {tx.cacaoPriceUSD != null && tx.cacaoPriceUSD > 0 && (
                                <DetailRow label="Precio cacao (operación)" value={`$${tx.cacaoPriceUSD.toFixed(4)} USD/g`} />
                            )}
                            {tx.exchangeRate != null && tx.exchangeRate > 0 && (
                                <DetailRow label="Tasa USD/VES" value={`${tx.exchangeRate.toFixed(2)} VES`} />
                            )}
                            {tx.gramsAmount != null && (
                                <DetailRow label="Gramos involucrados" value={`${tx.gramsAmount.toFixed(4)} g`} />
                            )}
                            {tx.feeUSD != null && tx.feeUSD > 0 && (
                                <DetailRow label="Comisión de red" value={`$${tx.feeUSD.toFixed(2)} USD`} />
                            )}
                        </View>

                        {/* Payment info */}
                        {(tx.bankOption || tx.method || tx.reference) && (
                            <View style={styles.detailCard}>
                                <Text style={styles.cardSectionTitle}>Método de pago</Text>
                                {tx.method && <DetailRow label="Método" value={tx.method === 'BANK' ? 'Transferencia bancaria' : tx.method === 'OFFICE' ? 'Pago en oficina' : tx.method} />}
                                {tx.bankOption && (
                                    <>
                                        <DetailRow label="Banco destino" value={tx.bankOption.bankName} />
                                        <DetailRow label="Titular" value={tx.bankOption.accountHolder} />
                                        <DetailRow label="Cuenta" value={tx.bankOption.accountNumber} mono />
                                        {tx.bankOption.accountType && <DetailRow label="Tipo de cuenta" value={tx.bankOption.accountType} />}
                                        {tx.bankOption.country && <DetailRow label="País" value={tx.bankOption.country} />}
                                    </>
                                )}
                                {tx.reference && (
                                    <DetailRow label="Referencia / Hash" value={tx.reference} mono />
                                )}
                            </View>
                        )}

                        {/* Notes */}
                        {(tx.notes || tx.adminNotes) && (
                            <View style={styles.detailCard}>
                                <Text style={styles.cardSectionTitle}>Notas</Text>
                                {!!tx.notes && <DetailRow label="Nota" value={tx.notes} />}
                                {!!tx.adminNotes && <DetailRow label="Nota del cajero" value={tx.adminNotes} />}
                            </View>
                        )}

                        {/* Claim help */}
                        <View style={styles.claimBox}>
                            <Ionicons name="information-circle-outline" size={18} color={Colors.textMuted} />
                            <Text style={styles.claimText}>
                                Para cualquier reclamo, cita el <Text style={{ color: Colors.gold, fontWeight: '700' }}>ID #{tx.id}</Text> al contactar soporte.
                            </Text>
                        </View>

                        <View style={{ height: 30 }} />
                    </ScrollView>
                </View>
            </Modal>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Mi Historial</Text>
                <Text style={styles.subtitle}>Toca una transacción para ver detalles</Text>
            </View>

            {/* Filtros */}
            <View style={styles.filtersContainer}>
                <TouchableOpacity
                    style={[styles.filterBtn, filter === 'ALL' && styles.filterBtnActive]}
                    onPress={() => setFilter('ALL')}
                >
                    <Text style={[styles.filterText, filter === 'ALL' && styles.filterTextActive]}>Todos</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.filterBtn, filter === 'BUY/SELL' && styles.filterBtnActive]}
                    onPress={() => setFilter('BUY/SELL')}
                >
                    <Text style={[styles.filterText, filter === 'BUY/SELL' && styles.filterTextActive]}>Mercado</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.filterBtn, filter === 'CASH' && styles.filterBtnActive]}
                    onPress={() => setFilter('CASH')}
                >
                    <Text style={[styles.filterText, filter === 'CASH' && styles.filterTextActive]}>Caja</Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={Colors.gold} />
                </View>
            ) : (
                <FlatList
                    data={filteredTransactions}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.gold} />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="receipt-outline" size={64} color={Colors.textMuted} />
                            <Text style={styles.emptyTitle}>Sin movimientos</Text>
                            <Text style={styles.emptyText}>No hemos encontrado transacciones con este filtro.</Text>
                        </View>
                    }
                />
            )}

            {renderDetailModal()}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    header: { paddingTop: 60, paddingHorizontal: Spacing.lg, marginBottom: Spacing.xl },
    title: { ...Typography.h2, color: Colors.textPrimary },
    subtitle: { ...Typography.sm, color: Colors.textMuted, marginTop: 4 },

    // Filters
    filtersContainer: {
        flexDirection: 'row',
        paddingHorizontal: Spacing.lg,
        marginBottom: Spacing.lg,
        gap: 8
    },
    filterBtn: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.border
    },
    filterBtnActive: {
        backgroundColor: Colors.gold,
        borderColor: Colors.gold
    },
    filterText: { ...Typography.sm, color: Colors.textMuted, fontWeight: '600' },
    filterTextActive: { color: Colors.background },

    // List
    listContent: { paddingHorizontal: Spacing.lg, paddingBottom: 40 },
    txItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surface,
        borderRadius: 16,
        padding: 14,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    txMain: { flex: 1 },
    txLabel: { ...Typography.bodyBold, color: Colors.textPrimary, fontSize: 15 },
    txDate: { ...Typography.xs, color: Colors.textMuted, marginTop: 2 },
    txRight: { alignItems: 'flex-end' },
    txAmount: { fontSize: 16, fontWeight: '700' },
    statusBadge: {
        borderRadius: 8,
        paddingHorizontal: 6,
        paddingVertical: 2,
        marginTop: 6,
    },
    statusText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },

    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100 },
    emptyTitle: { ...Typography.h3, color: Colors.textSecondary, marginTop: 16 },
    emptyText: { ...Typography.body, color: Colors.textMuted, textAlign: 'center', marginTop: 8, paddingHorizontal: 40 },

    // ── Modal / bottom sheet ──────────────────────────────────────────────────
    modalOverlay: {
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.55)',
    },
    modalSheet: {
        position: 'absolute',
        bottom: 0, left: 0, right: 0,
        backgroundColor: Colors.surface,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        maxHeight: '88%',
        paddingBottom: 0,
    },
    sheetHandle: {
        width: 40, height: 4,
        backgroundColor: Colors.border,
        borderRadius: 2,
        alignSelf: 'center',
        marginTop: 12, marginBottom: 4,
    },
    sheetHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    sheetIconBg: {
        width: 52, height: 52,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sheetTitle: { ...Typography.bodyBold, color: Colors.textPrimary, fontSize: 17 },
    sheetDate: { ...Typography.xs, color: Colors.textMuted, marginTop: 2 },
    closeBtn: {
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: Colors.background,
        justifyContent: 'center', alignItems: 'center',
    },

    // Status banner
    statusBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 20,
        marginTop: 14,
        marginBottom: 4,
        padding: 10,
        borderRadius: 12,
        borderWidth: 1,
        gap: 8,
    },
    statusBannerText: { fontWeight: '700', fontSize: 13, textTransform: 'uppercase' },

    sheetBody: { paddingHorizontal: 20, marginTop: 10 },

    // Amount card
    amountCard: {
        alignItems: 'center',
        paddingVertical: 20,
        marginBottom: 14,
        backgroundColor: Colors.background,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    amountBig: { fontSize: 32, fontWeight: '800', letterSpacing: -0.5 },
    amountSub: { ...Typography.sm, color: Colors.textSecondary, marginTop: 4 },

    // Detail card
    detailCard: {
        backgroundColor: Colors.background,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: Colors.border,
        paddingHorizontal: 16,
        paddingVertical: 12,
        marginBottom: 12,
    },
    cardSectionTitle: {
        ...Typography.xs,
        color: Colors.textMuted,
        textTransform: 'uppercase',
        letterSpacing: 1,
        fontWeight: '700',
        marginBottom: 10,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        paddingVertical: 7,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
        gap: 12,
    },
    detailLabel: { ...Typography.sm, color: Colors.textMuted, flex: 1 },
    detailValue: { ...Typography.sm, color: Colors.textPrimary, fontWeight: '600', flex: 1.4, textAlign: 'right' },
    detailMono: { fontFamily: 'monospace', fontSize: 12, letterSpacing: 0.3 },

    // Claim box
    claimBox: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: `${Colors.gold}12`,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: `${Colors.gold}30`,
        padding: 14,
        gap: 10,
        marginBottom: 10,
        marginTop: 4,
    },
    claimText: { ...Typography.sm, color: Colors.textMuted, flex: 1, lineHeight: 18 },
});
