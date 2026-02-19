import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Typography, Spacing } from '../../constants/Colors';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import DepositWithdrawModal from '@/components/DepositWithdrawModal';

interface Balance {
  fiat: number;
  cacao: number;
  cacaoPricePerGram: number;
  cacaoValueInUSD: number;
}

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

const TX_LABELS: Record<string, { label: string; sign: string; color: string }> = {
  DEPOSIT_USD: { label: 'Depósito USD', sign: '+', color: Colors.success },
  DEPOSIT_CACAO: { label: 'Depósito Cacao', sign: '+', color: Colors.gold },
  WITHDRAW_USD: { label: 'Retiro USD', sign: '-', color: Colors.error },
  WITHDRAW_CACAO: { label: 'Retiro Cacao', sign: '-', color: Colors.error },
  CONVERT_CACAO_TO_USD: { label: 'Cacao → USD', sign: '⇄', color: Colors.goldLight },
  CONVERT_USD_TO_CACAO: { label: 'USD → Cacao', sign: '⇄', color: Colors.goldLight },
};

export default function DashboardScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [balance, setBalance] = useState<Balance | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [modalType, setModalType] = useState<'DEPOSIT' | 'WITHDRAW' | null>(null);


  const fetchData = useCallback(async () => {
    try {
      const [balRes, txRes] = await Promise.all([
        api.get('/balance'),
        api.get('/transactions'),
      ]);
      setBalance(balRes.data);
      setTransactions(txRes.data.slice(0, 10));
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.gold} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>¡Hola, {user?.name || user?.email?.split('@')[0]}! 👋</Text>
          <Text style={styles.headerSub}>KoaWallet</Text>
        </View>
        <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Salir</Text>
        </TouchableOpacity>
      </View>

      {/* Balance Card Principal */}
      <View style={styles.balanceCard}>
        <View style={styles.balanceCardHeader}>
          <Text style={styles.balanceLabelTop}>🍫 Granos de Cacao</Text>
          <View style={styles.priceBadge}>
            <Text style={styles.priceText}>${balance?.cacaoPricePerGram?.toFixed(2)}/g</Text>
          </View>
        </View>
        <Text style={styles.balanceCacao}>{balance?.cacao?.toFixed(4) ?? '0.0000'} <Text style={styles.balanceUnit}>gramos</Text></Text>
        <Text style={styles.balanceCacaoUSD}>≈ ${balance?.cacaoValueInUSD?.toFixed(2) ?? '0.00'} USD</Text>

        <View style={styles.divider} />

        <View style={styles.usdRow}>
          <Text style={styles.usdLabel}>💵 Saldo en USD</Text>
          <Text style={styles.usdAmount}>${balance?.fiat?.toFixed(2) ?? '0.00'}</Text>
        </View>
      </View>

      {/* Botones de acción */}
      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => setModalType('DEPOSIT')}>
          <Text style={styles.actionEmoji}>⬇️</Text>
          <Text style={styles.actionLabel}>Depositar</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionBtn, styles.actionBtnCenter]} onPress={() => setModalType('WITHDRAW')}>
          <Text style={styles.actionEmoji}>↗️</Text>
          <Text style={styles.actionLabel}>Retirar</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/convertir')}>
          <Text style={styles.actionEmoji}>🔄</Text>
          <Text style={styles.actionLabel}>Convertir</Text>
        </TouchableOpacity>
      </View>

      {/* Historial */}
      <Text style={styles.sectionTitle}>Movimientos recientes</Text>

      {transactions.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>Sin movimientos aún</Text>
          <Text style={styles.emptySubText}>Tus transacciones aparecerán aquí</Text>
        </View>
      ) : (
        transactions.map((tx) => {
          const meta = TX_LABELS[tx.type] ?? { label: tx.type, sign: '', color: Colors.textSecondary };
          return (
            <View key={tx.id} style={styles.txItem}>
              <View style={styles.txLeft}>
                <Text style={styles.txType}>{meta.label}</Text>
                <Text style={styles.txDate}>{formatDate(tx.createdAt)}</Text>
              </View>
              <View style={styles.txRight}>
                <Text style={[styles.txAmount, { color: meta.color }]}>
                  {meta.sign} {tx.amountCacao ? `${tx.amountCacao.toFixed(4)}g` : `$${tx.amountUSD?.toFixed(2)}`}
                </Text>
                <View style={[styles.txStatusBadge, tx.status === 'COMPLETED' && styles.txStatusCompleted, tx.status === 'PENDING' && styles.txStatusPending]}>
                  <Text style={styles.txStatusText}>{tx.status === 'COMPLETED' ? 'Completado' : tx.status === 'PENDING' ? 'Pendiente' : 'Rechazado'}</Text>
                </View>
              </View>
            </View>
          );
        })
      )}

      {/* Modal Depositar / Retirar */}
      {modalType && (
        <DepositWithdrawModal
          visible={!!modalType}
          type={modalType}
          onClose={() => setModalType(null)}
          onSuccess={() => { setModalType(null); fetchData(); }}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingHorizontal: Spacing.lg, paddingTop: 60, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xl },
  greeting: { ...Typography.h3, color: Colors.textPrimary },
  headerSub: { ...Typography.xs, color: Colors.textMuted, letterSpacing: 2, textTransform: 'uppercase' },
  logoutBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: Colors.border },
  logoutText: { color: Colors.textMuted, ...Typography.sm },

  // Balance card
  balanceCard: {
    backgroundColor: Colors.surface,
    borderRadius: 24, padding: Spacing.lg,
    borderWidth: 1, borderColor: Colors.border,
    marginBottom: Spacing.lg,
    shadowColor: Colors.gold, shadowOpacity: 0.08, shadowRadius: 16, elevation: 4,
  },
  balanceCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  balanceLabelTop: { ...Typography.sm, color: Colors.textSecondary },
  priceBadge: { backgroundColor: Colors.surfaceLight, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3, borderWidth: 1, borderColor: Colors.gold },
  priceText: { ...Typography.xs, color: Colors.gold, fontWeight: '600' },
  balanceCacao: { fontSize: 36, fontWeight: '700', color: Colors.textPrimary, marginVertical: 4 },
  balanceUnit: { fontSize: 18, color: Colors.textSecondary },
  balanceCacaoUSD: { ...Typography.sm, color: Colors.textSecondary, marginBottom: 12 },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: 12 },
  usdRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  usdLabel: { ...Typography.body, color: Colors.textSecondary },
  usdAmount: { ...Typography.h3, color: Colors.gold },

  // Action buttons
  actionsRow: { flexDirection: 'row', marginBottom: Spacing.xl },
  actionBtn: {
    flex: 1, backgroundColor: Colors.surface, borderRadius: 16,
    paddingVertical: Spacing.md, alignItems: 'center',
    borderWidth: 1, borderColor: Colors.border,
  },
  actionBtnCenter: { marginHorizontal: Spacing.sm },
  actionEmoji: { fontSize: 26, marginBottom: 4 },
  actionLabel: { ...Typography.sm, color: Colors.textPrimary, fontWeight: '600' },

  // Transactions
  sectionTitle: { ...Typography.bodyBold, color: Colors.textSecondary, marginBottom: Spacing.md, textTransform: 'uppercase', letterSpacing: 1, fontSize: 12 },
  emptyBox: { backgroundColor: Colors.surface, borderRadius: 16, padding: Spacing.xl, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  emptyText: { ...Typography.body, color: Colors.textMuted, fontWeight: '600' },
  emptySubText: { ...Typography.sm, color: Colors.textMuted, marginTop: 4 },
  txItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: 14,
    paddingHorizontal: Spacing.md, paddingVertical: 12,
    marginBottom: 8, borderWidth: 1, borderColor: Colors.border,
  },
  txLeft: { flex: 1 },
  txType: { ...Typography.bodyBold, color: Colors.textPrimary, fontSize: 14 },
  txDate: { ...Typography.xs, color: Colors.textMuted, marginTop: 2 },
  txRight: { alignItems: 'flex-end' },
  txAmount: { fontSize: 15, fontWeight: '700' },
  txStatusBadge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, marginTop: 4, backgroundColor: Colors.surfaceLight },
  txStatusCompleted: { backgroundColor: '#1A3320' },
  txStatusPending: { backgroundColor: '#3A2810' },
  txStatusText: { ...Typography.xs, color: Colors.textSecondary },
});
