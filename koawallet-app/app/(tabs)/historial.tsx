import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, FlatList, StyleSheet, TouchableOpacity,
    RefreshControl, ActivityIndicator
} from 'react-native';
import { Colors, Typography, Spacing } from '../../constants/Colors';
import api from '../../utils/api';
import { Ionicons } from '@expo/vector-icons';

interface Transaction {
    id: number;
    type: string;
    amount: number;
    amountUSD?: number;
    amountCacao?: number;
    priceAt?: number;
    status: string;
    createdAt: string;
}

const TX_LABELS: Record<string, { label: string; sign: string; color: string; icon: any }> = {
    BUY: { label: 'Compra de Cacao', sign: '+', color: Colors.gold, icon: 'cart' },
    SELL: { label: 'Venta de Cacao', sign: '-', color: Colors.goldLight, icon: 'cash' },
    DEPOSIT_USD: { label: 'Depósito USD', sign: '+', color: Colors.success, icon: 'arrow-down-circle' },
    DEPOSIT_CACAO: { label: 'Depósito Físico', sign: '+', color: Colors.gold, icon: 'leaf' },
    WITHDRAW_USD: { label: 'Retiro USD', sign: '-', color: Colors.error, icon: 'arrow-up-circle' },
    WITHDRAW_CACAO: { label: 'Retiro Cacao', sign: '-', color: Colors.error, icon: 'log-out' },
};

export default function HistoryScreen() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState<'ALL' | 'BUY/SELL' | 'CASH'>('ALL');

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

    useEffect(() => {
        fetchTransactions();
    }, [fetchTransactions]);

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

    const renderItem = ({ item: tx }: { item: Transaction }) => {
        const meta = TX_LABELS[tx.type] ?? { label: tx.type, sign: '', color: Colors.textSecondary, icon: 'help-circle' };

        return (
            <View style={styles.txItem}>
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
                    <View style={[
                        styles.statusBadge,
                        tx.status === 'COMPLETED' && styles.statusCompleted,
                        tx.status === 'PENDING' && styles.statusPending,
                        tx.status === 'REJECTED' && styles.statusRejected
                    ]}>
                        <Text style={styles.statusText}>
                            {tx.status === 'COMPLETED' ? 'Éxito' : tx.status === 'PENDING' ? 'Pendiente' : 'Fallido'}
                        </Text>
                    </View>
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Mi Historial</Text>
                <Text style={styles.subtitle}>Todos tus movimientos en un solo lugar</Text>
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
        backgroundColor: Colors.surfaceLight
    },
    statusCompleted: { backgroundColor: '#1A3320' },
    statusPending: { backgroundColor: '#3A2810' },
    statusRejected: { backgroundColor: '#331A1A' },
    statusText: { fontSize: 10, fontWeight: '700', color: Colors.textSecondary, textTransform: 'uppercase' },

    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100 },
    emptyTitle: { ...Typography.h3, color: Colors.textSecondary, marginTop: 16 },
    emptyText: { ...Typography.body, color: Colors.textMuted, textAlign: 'center', marginTop: 8, paddingHorizontal: 40 },
});
