import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, Alert
} from 'react-native';
import { Colors, Typography, Spacing } from '../../constants/Colors';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import DepositWithdrawModal from '@/components/DepositWithdrawModal';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

interface Balance {
  fiat: number;
  cacao: number;
  cacaoLocked: number;
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
  BUY: { label: '💳 Compra de Cacao', sign: '+', color: Colors.gold },
  SELL: { label: '💰 Venta de Cacao', sign: '-', color: Colors.goldLight },
  DEPOSIT_USD: { label: 'Depósito USD', sign: '+', color: Colors.success },
  DEPOSIT_CACAO: { label: 'Depósito Físico', sign: '+', color: Colors.gold },
  WITHDRAW_USD: { label: 'Retiro USD', sign: '-', color: Colors.error },
  WITHDRAW_CACAO: { label: 'Retiro Cacao', sign: '-', color: Colors.error },
};

export default function DashboardScreen() {
  const { user, logout } = useAuth();
  const [balance, setBalance] = useState<Balance | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [modalType, setModalType] = useState<'DEPOSIT' | 'WITHDRAW' | null>(null);

  const isProfileComplete = user?.name && user?.phone && user?.cedula;

  const handleAction = (type: 'DEPOSIT' | 'WITHDRAW') => {
    if (!isProfileComplete) {
      Alert.alert(
        'Perfil Incompleto',
        'Para realizar operaciones de depósito o retiro, primero debes completar tus datos personales (Nombre, Cédula y Teléfono) en la pestaña de Perfil.',
        [{ text: 'Entendido' }]
      );
      return;
    }
    setModalType(type);
  };


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

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000); // Poll every 15s
    return () => clearInterval(interval);
  }, [fetchData]);

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
          <Text style={styles.balanceLabelTop}>🍫 Token de Cacao</Text>
          <View style={styles.priceBadge}>
            <Text style={styles.priceText}>${balance?.cacaoPricePerGram?.toFixed(2)}/g</Text>
          </View>
        </View>
        <Text style={styles.balanceCacao}>
          {balance?.cacao?.toFixed(4) ?? '0.0000'} <Text style={styles.balanceUnit}>gramos</Text>
        </Text>
        <Text style={styles.balanceCacaoUSD}>≈ ${balance?.cacaoValueInUSD?.toFixed(2) ?? '0.00'} USD</Text>

        {balance && balance.cacaoLocked > 0 && (
          <View style={styles.lockedBadge}>
            <Text style={styles.lockedText}>🔒 {balance.cacaoLocked.toFixed(4)}g en proceso de retiro</Text>
          </View>
        )}
      </View>

      {/* Botones de acción */}
      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.specBtn} onPress={() => handleAction('DEPOSIT')}>
          <LinearGradient
            colors={[Colors.gold, '#D4AF37']}
            style={styles.specBtnGradient}
          >
            <Ionicons name="add-circle-outline" size={28} color={Colors.background} />
            <Text style={styles.specBtnLabel}>Comprar / Depositar</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity style={styles.specBtn} onPress={() => handleAction('WITHDRAW')}>
          <LinearGradient
            colors={['#2A2A2A', '#1A1A1A']}
            style={[styles.specBtnGradient, { borderColor: Colors.border, borderWidth: 1 }]}
          >
            <Ionicons name="arrow-up-circle-outline" size={28} color={Colors.gold} />
            <Text style={[styles.specBtnLabel, { color: Colors.gold }]}>Vender / Retirar</Text>
          </LinearGradient>
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
          userBalance={balance?.cacao || 0}
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
  lockedBadge: {
    flexDirection: 'row', alignItems: 'center', marginTop: 10,
    backgroundColor: '#2A1A00', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: '#7A4A00', alignSelf: 'flex-start',
  },
  lockedText: { ...Typography.xs, color: '#FFB347', fontWeight: '600' },

  // Spectacular buttons
  actionsRow: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.xl },
  specBtn: { flex: 1, height: 100, borderRadius: 20, overflow: 'hidden' },
  specBtnGradient: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  specBtnLabel: {
    ...Typography.sm, color: Colors.background, fontWeight: '700',
    marginTop: 8, textAlign: 'center',
  },

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
