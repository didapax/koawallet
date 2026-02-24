import React, { useState, useEffect, useCallback } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
    Search, X, ChevronLeft, ChevronRight, Loader2,
    CheckCircle2, Clock, XCircle, Eye, Filter, Calendar,
    ArrowUpDown, User, Image as ImageIcon
} from 'lucide-react';
import axios from 'axios';
import Sidebar from '../components/Sidebar';

const API_URL = 'http://localhost:3000';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const TX_TYPES = [
    { value: 'ALL', label: 'Todos los tipos' },
    { value: 'BUY', label: 'Compra (BUY)' },
    { value: 'SELL', label: 'Venta (SELL)' },
    { value: 'DEPOSIT_CACAO', label: 'Depósito Físico' },
    { value: 'WITHDRAW_CACAO', label: 'Retiro Cacao' },
    { value: 'DEPOSIT_USD', label: 'Depósito USD' },
    { value: 'WITHDRAW_USD', label: 'Retiro USD' },
    { value: 'MAINTENANCE_FEE', label: 'Cuota Mantenimiento' },
];

const TX_STATUSES = [
    { value: 'ALL', label: 'Todos los estados' },
    { value: 'PENDING', label: 'Pendiente' },
    { value: 'COMPLETED', label: 'Completado' },
    { value: 'REJECTED', label: 'Rechazado' },
];

const STATUS_CONFIG = {
    PENDING: { label: 'PENDIENTE', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', icon: <Clock size={12} /> },
    COMPLETED: { label: 'COMPLETADO', color: '#10B981', bg: 'rgba(16,185,129,0.12)', icon: <CheckCircle2 size={12} /> },
    REJECTED: { label: 'RECHAZADO', color: '#EF4444', bg: 'rgba(239,68,68,0.12)', icon: <XCircle size={12} /> },
};

const TYPE_LABELS = {
    BUY: 'Compra',
    SELL: 'Venta',
    DEPOSIT_CACAO: 'Dep. Físico',
    WITHDRAW_CACAO: 'Retiro Cacao',
    DEPOSIT_USD: 'Dep. USD',
    WITHDRAW_USD: 'Retiro USD',
    MAINTENANCE_FEE: 'Cuota Mant.',
};

const TYPE_COLORS = {
    BUY: { color: '#10B981', bg: 'rgba(16,185,129,0.1)' },
    SELL: { color: '#EF4444', bg: 'rgba(239,68,68,0.1)' },
    DEPOSIT_CACAO: { color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)' },
    WITHDRAW_CACAO: { color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' },
    DEPOSIT_USD: { color: '#3B82F6', bg: 'rgba(59,130,246,0.1)' },
    WITHDRAW_USD: { color: '#F97316', bg: 'rgba(249,115,22,0.1)' },
    MAINTENANCE_FEE: { color: '#6B7280', bg: 'rgba(107,114,128,0.1)' },
};

// ─── Component ────────────────────────────────────────────────────────────────
const TransactionExplorer = () => {
    const [transactions, setTransactions] = useState([]);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [selectedTx, setSelectedTx] = useState(null);

    // Filters
    const [q, setQ] = useState('');
    const [type, setType] = useState('ALL');
    const [status, setStatus] = useState('ALL');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [filtersOpen, setFiltersOpen] = useState(false);

    const token = localStorage.getItem('admin_token');
    const axiosConfig = { headers: { Authorization: `Bearer ${token}` } };

    const handleLogout = () => {
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_role');
        window.location.href = '/login';
    };

    const fetchTransactions = useCallback(async (currentPage = 1) => {
        setLoading(true);
        try {
            const params = { page: currentPage, limit: 20 };
            if (q.trim()) params.q = q.trim();
            if (type !== 'ALL') params.type = type;
            if (status !== 'ALL') params.status = status;
            if (dateFrom) params.dateFrom = dateFrom;
            if (dateTo) params.dateTo = dateTo;

            const res = await axios.get(`${API_URL}/admin/transactions/search`, { ...axiosConfig, params });
            setTransactions(res.data.transactions);
            setTotal(res.data.total);
            setTotalPages(res.data.totalPages);
        } catch (err) {
            console.error('Error buscando transacciones:', err.message);
        } finally {
            setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [q, type, status, dateFrom, dateTo]);

    useEffect(() => {
        setPage(1);
        fetchTransactions(1);
    }, [fetchTransactions]);

    const handleSearch = (e) => {
        e.preventDefault();
        setPage(1);
        fetchTransactions(1);
    };

    const handlePageChange = (newPage) => {
        setPage(newPage);
        fetchTransactions(newPage);
    };

    const resetFilters = () => {
        setQ('');
        setType('ALL');
        setStatus('ALL');
        setDateFrom('');
        setDateTo('');
    };

    const activeFilterCount = [
        type !== 'ALL',
        status !== 'ALL',
        !!dateFrom,
        !!dateTo,
    ].filter(Boolean).length;

    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-dark)' }}>
            <Sidebar onLogout={handleLogout} />

            <div style={{ flex: 1, padding: '40px', minWidth: 0 }}>
                {/* Header */}
                <div style={{ marginBottom: '32px' }}>
                    <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--primary)', textDecoration: 'none', fontSize: '0.9rem', marginBottom: '10px' }}>
                        <ChevronLeft size={16} /> Volver al Dashboard
                    </Link>
                    <h1>Explorador de <span className="gold-text">Transacciones</span></h1>
                    <p style={{ color: 'var(--text-muted)', marginTop: '5px' }}>
                        Busca cualquier transacción del sistema para atender reclamos y consultas.
                    </p>
                </div>

                {/* Search bar + filter toggle */}
                <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', alignItems: 'center' }}>
                    <form onSubmit={handleSearch} style={{ flex: 1, display: 'flex', gap: '10px' }}>
                        <div style={{ position: 'relative', flex: 1 }}>
                            <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                            <input
                                type="text"
                                value={q}
                                onChange={e => setQ(e.target.value)}
                                placeholder="Buscar por ID, nombre, cédula, referencia de pago..."
                                style={{
                                    width: '100%',
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid var(--glass-border)',
                                    borderRadius: '12px',
                                    color: '#fff',
                                    padding: '12px 16px 12px 48px',
                                    fontSize: '0.95rem',
                                    outline: 'none',
                                    boxSizing: 'border-box',
                                }}
                            />
                            {q && (
                                <button type="button" onClick={() => setQ('')} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                                    <X size={16} />
                                </button>
                            )}
                        </div>
                        <button type="submit" className="btn-primary" style={{ padding: '12px 24px', whiteSpace: 'nowrap' }}>
                            Buscar
                        </button>
                    </form>

                    {/* Filter toggle button */}
                    <button
                        onClick={() => setFiltersOpen(o => !o)}
                        className="btn-outline"
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 18px', position: 'relative' }}
                    >
                        <Filter size={16} />
                        Filtros
                        {activeFilterCount > 0 && (
                            <span style={{ position: 'absolute', top: '-6px', right: '-6px', background: 'var(--primary)', color: '#000', borderRadius: '50%', width: '18px', height: '18px', fontSize: '0.7rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {activeFilterCount}
                            </span>
                        )}
                    </button>
                </div>

                {/* Collapsible filter panel */}
                <AnimatePresence>
                    {filtersOpen && (
                        <Motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            style={{ overflow: 'hidden', marginBottom: '16px' }}
                        >
                            <div className="glass-card" style={{ padding: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', alignItems: 'end' }}>
                                <div>
                                    <label style={labelStyle}>Tipo de Transacción</label>
                                    <select value={type} onChange={e => setType(e.target.value)} style={selectStyle}>
                                        {TX_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={labelStyle}>Estado</label>
                                    <select value={status} onChange={e => setStatus(e.target.value)} style={selectStyle}>
                                        {TX_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={labelStyle}><Calendar size={12} style={{ marginRight: '4px' }} />Desde</label>
                                    <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={inputStyle} />
                                </div>
                                <div>
                                    <label style={labelStyle}><Calendar size={12} style={{ marginRight: '4px' }} />Hasta</label>
                                    <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={inputStyle} />
                                </div>
                                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                                    <button onClick={resetFilters} className="btn-outline" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                        <X size={14} /> Limpiar filtros
                                    </button>
                                </div>
                            </div>
                        </Motion.div>
                    )}
                </AnimatePresence>

                {/* Results summary */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        {loading ? 'Buscando...' : (
                            <>
                                <span style={{ color: '#fff', fontWeight: 600 }}>{total}</span> transacciones encontradas
                                {page > 1 && <span> — página {page} de {totalPages}</span>}
                            </>
                        )}
                    </p>
                    {totalPages > 1 && (
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <button
                                onClick={() => handlePageChange(page - 1)}
                                disabled={page <= 1}
                                className="btn-outline"
                                style={{ padding: '6px 12px', opacity: page <= 1 ? 0.4 : 1 }}
                            >
                                <ChevronLeft size={16} />
                            </button>
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{page} / {totalPages}</span>
                            <button
                                onClick={() => handlePageChange(page + 1)}
                                disabled={page >= totalPages}
                                className="btn-outline"
                                style={{ padding: '6px 12px', opacity: page >= totalPages ? 0.4 : 1 }}
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    )}
                </div>

                {/* Table */}
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '80px' }}>
                        <Loader2 className="animate-spin" size={40} color="var(--primary)" />
                    </div>
                ) : transactions.length === 0 ? (
                    <div className="glass-card" style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        <Search size={48} style={{ marginBottom: '15px', opacity: 0.2 }} />
                        <p>No se encontraron transacciones con los filtros aplicados.</p>
                    </div>
                ) : (
                    <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.03)' }}>
                                    {[
                                        { label: 'ID', width: '70px' },
                                        { label: 'Fecha', width: '140px' },
                                        { label: 'Usuario', width: 'auto' },
                                        { label: 'Tipo', width: '120px' },
                                        { label: 'Monto', width: '150px' },
                                        { label: 'Referencia', width: '130px' },
                                        { label: 'Estado', width: '120px' },
                                        { label: '', width: '60px' },
                                    ].map((col, i) => (
                                        <th key={i} style={{ padding: '14px 16px', textAlign: 'left', fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, width: col.width }}>
                                            {col.label}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {transactions.map((tx, idx) => {
                                    const sc = STATUS_CONFIG[tx.status] || STATUS_CONFIG.PENDING;
                                    const tc = TYPE_COLORS[tx.type] || { color: '#9CA3AF', bg: 'rgba(156,163,175,0.1)' };
                                    const typeLabel = TYPE_LABELS[tx.type] || tx.type;
                                    const date = new Date(tx.createdAt);
                                    const mainAmount = tx.fiatAmount
                                        ? `${tx.fiatAmount} ${tx.paymentMethod?.currency || tx.userPaymentMethod?.paymentMethod?.currency || ''}`
                                        : tx.gramsAmount
                                            ? `${tx.gramsAmount}g`
                                            : `${tx.amount}`;

                                    return (
                                        <Motion.tr
                                            key={tx.id}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ delay: idx * 0.03 }}
                                            style={{
                                                borderBottom: '1px solid rgba(255,255,255,0.04)',
                                                cursor: 'pointer',
                                                transition: 'background 0.15s',
                                            }}
                                            onClick={() => setSelectedTx(tx)}
                                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                        >
                                            {/* ID */}
                                            <td style={{ padding: '14px 16px', fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                                                #{tx.id}
                                            </td>
                                            {/* Date */}
                                            <td style={{ padding: '14px 16px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                                <div>{date.toLocaleDateString('es-VE')}</div>
                                                <div style={{ fontSize: '0.7rem', opacity: 0.7 }}>{date.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })}</div>
                                            </td>
                                            {/* User */}
                                            <td style={{ padding: '14px 16px', overflow: 'hidden' }}>
                                                <div style={{ fontWeight: 600, fontSize: '0.88rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {tx.user?.name || '—'}
                                                </div>
                                                <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    CI: {tx.user?.cedula || '—'}
                                                </div>
                                            </td>
                                            {/* Type */}
                                            <td style={{ padding: '14px 16px' }}>
                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: tc.bg, color: tc.color, borderRadius: '8px', padding: '4px 10px', fontSize: '0.73rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
                                                    {typeLabel}
                                                </span>
                                            </td>
                                            {/* Amount */}
                                            <td style={{ padding: '14px 16px' }}>
                                                <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{mainAmount}</div>
                                                {tx.amountUSD && (
                                                    <div style={{ fontSize: '0.72rem', color: 'var(--primary)' }}>${tx.amountUSD.toFixed(2)} USD</div>
                                                )}
                                            </td>
                                            {/* Reference */}
                                            <td style={{ padding: '14px 16px', fontSize: '0.78rem', color: 'var(--text-muted)', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {tx.reference || '—'}
                                            </td>
                                            {/* Status */}
                                            <td style={{ padding: '14px 16px' }}>
                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: sc.bg, color: sc.color, borderRadius: '8px', padding: '4px 10px', fontSize: '0.7rem', fontWeight: 700 }}>
                                                    {sc.icon} {sc.label}
                                                </span>
                                            </td>
                                            {/* Action btn */}
                                            <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                                                <Eye size={17} style={{ color: 'var(--primary)', opacity: 0.8 }} />
                                            </td>
                                        </Motion.tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Bottom pagination */}
                {!loading && totalPages > 1 && (
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '24px' }}>
                        <button onClick={() => handlePageChange(page - 1)} disabled={page <= 1} className="btn-outline" style={{ padding: '8px 16px', opacity: page <= 1 ? 0.4 : 1 }}>
                            <ChevronLeft size={16} /> Anterior
                        </button>
                        {[...Array(totalPages)].map((_, i) => {
                            const p = i + 1;
                            if (totalPages <= 7 || Math.abs(p - page) <= 2 || p === 1 || p === totalPages) {
                                return (
                                    <button key={p} onClick={() => handlePageChange(p)} className={p === page ? 'btn-primary' : 'btn-outline'} style={{ padding: '8px 14px', minWidth: '40px' }}>
                                        {p}
                                    </button>
                                );
                            }
                            if (Math.abs(p - page) === 3) return <span key={p} style={{ color: 'var(--text-muted)', alignSelf: 'center' }}>…</span>;
                            return null;
                        })}
                        <button onClick={() => handlePageChange(page + 1)} disabled={page >= totalPages} className="btn-outline" style={{ padding: '8px 16px', opacity: page >= totalPages ? 0.4 : 1 }}>
                            Siguiente <ChevronRight size={16} />
                        </button>
                    </div>
                )}
            </div>

            {/* ─── Detail Modal ───────────────────────────────────────────────────── */}
            <AnimatePresence>
                {selectedTx && (
                    <div
                        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', display: 'flex', justifyContent: 'flex-end', zIndex: 1000 }}
                        onClick={() => setSelectedTx(null)}
                    >
                        <Motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', stiffness: 350, damping: 35 }}
                            className="glass-card"
                            style={{ width: '100%', maxWidth: '540px', height: '100vh', overflowY: 'auto', borderRadius: '24px 0 0 24px', padding: '40px', position: 'relative' }}
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Close btn */}
                            <button onClick={() => setSelectedTx(null)} style={{ position: 'absolute', right: '20px', top: '20px', background: 'rgba(255,255,255,0.07)', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '10px', padding: '6px', display: 'flex', alignItems: 'center' }}>
                                <X size={22} />
                            </button>

                            {/* Title */}
                            <h2 style={{ marginBottom: '4px' }}>Detalle de <span className="gold-text">Transacción</span></h2>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: '28px' }}>
                                #{selectedTx.id} — {new Date(selectedTx.createdAt).toLocaleString('es-VE')}
                            </p>

                            {/* Status + Type badges */}
                            <div style={{ display: 'flex', gap: '10px', marginBottom: '28px', flexWrap: 'wrap' }}>
                                {(() => {
                                    const sc = STATUS_CONFIG[selectedTx.status] || STATUS_CONFIG.PENDING;
                                    return (
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: sc.bg, color: sc.color, borderRadius: '10px', padding: '6px 14px', fontSize: '0.8rem', fontWeight: 700 }}>
                                            {sc.icon} {sc.label}
                                        </span>
                                    );
                                })()}
                                {(() => {
                                    const tc = TYPE_COLORS[selectedTx.type] || { color: '#9CA3AF', bg: 'rgba(156,163,175,0.1)' };
                                    return (
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: tc.bg, color: tc.color, borderRadius: '10px', padding: '6px 14px', fontSize: '0.8rem', fontWeight: 700 }}>
                                            <ArrowUpDown size={13} /> {TYPE_LABELS[selectedTx.type] || selectedTx.type}
                                        </span>
                                    );
                                })()}
                            </div>

                            {/* User info card */}
                            <Section title={<><User size={14} style={{ marginRight: '6px' }} />Datos del Usuario</>}>
                                <InfoRow label="Nombre" value={selectedTx.user?.name || '—'} highlight />
                                <InfoRow label="Cédula" value={selectedTx.user?.cedula || '—'} />
                                <InfoRow label="Teléfono" value={selectedTx.user?.phone || '—'} />
                                <InfoRow label="Email" value={selectedTx.user?.email || '—'} />
                            </Section>

                            {/* Transaction amounts */}
                            <Section title="Montos de la Transacción">
                                {selectedTx.fiatAmount != null && (
                                    <InfoRow
                                        label={selectedTx.type === 'SELL' ? 'Monto Neto a Pagar' : 'Monto Fiat'}
                                        value={`${selectedTx.fiatAmount} ${selectedTx.paymentMethod?.currency || selectedTx.userPaymentMethod?.paymentMethod?.currency || ''}`}
                                        highlight
                                    />
                                )}
                                {selectedTx.amountUSD != null && <InfoRow label="Valor en USD" value={`$${selectedTx.amountUSD.toFixed(2)}`} />}
                                {(selectedTx.gramsAmount || selectedTx.amountCacao) != null && (
                                    <InfoRow label="Gramos de Cacao" value={`${selectedTx.gramsAmount || selectedTx.amountCacao}g`} />
                                )}
                                {selectedTx.cacaoPriceUSD != null && <InfoRow label="Precio Cacao (precio momento)" value={`$${selectedTx.cacaoPriceUSD}/g`} />}
                                {selectedTx.feeUSD != null && <InfoRow label="Tasa de Red (fee)" value={`$${selectedTx.feeUSD} USD`} />}
                            </Section>

                            {/* Payment method for BUY */}
                            {selectedTx.paymentMethod && (
                                <Section title="Método de Pago (Compra)">
                                    <InfoRow label="Método" value={selectedTx.paymentMethod.name} />
                                    <InfoRow label="Moneda" value={selectedTx.paymentMethod.currency} />
                                    {selectedTx.reference && <InfoRow label="Referencia" value={selectedTx.reference} highlight />}
                                </Section>
                            )}

                            {/* Payment method for SELL */}
                            {selectedTx.userPaymentMethod && (
                                <Section title="Cuenta de Destino (Venta)">
                                    <InfoRow label="Método" value={`${selectedTx.userPaymentMethod.paymentMethod?.name} (${selectedTx.userPaymentMethod.paymentMethod?.currency})`} />
                                    {selectedTx.userPaymentMethod.paymentMethod?.type === 'FIAT' ? (
                                        <>
                                            <InfoRow label="Banco" value={selectedTx.userPaymentMethod.bankName || '—'} />
                                            <InfoRow label="Titular" value={selectedTx.userPaymentMethod.accountHolder} />
                                            <InfoRow label="Cuenta / Teléfono" value={selectedTx.userPaymentMethod.accountNumber} highlight />
                                            {selectedTx.userPaymentMethod.accountType && <InfoRow label="Tipo de Cuenta" value={selectedTx.userPaymentMethod.accountType} />}
                                        </>
                                    ) : (
                                        <>
                                            <InfoRow label="Red" value={selectedTx.userPaymentMethod.accountType || 'TRC20'} />
                                            <InfoRow label="Wallet" value={selectedTx.userPaymentMethod.accountNumber} highlight mono />
                                        </>
                                    )}
                                </Section>
                            )}

                            {/* Receipt image */}
                            {selectedTx.receiptImage && (
                                <Section title={<><ImageIcon size={14} style={{ marginRight: '6px' }} />Comprobante Adjunto</>}>
                                    <div
                                        style={{ borderRadius: '12px', overflow: 'hidden', height: '180px', cursor: 'pointer', border: '1px solid var(--glass-border)', position: 'relative' }}
                                        onClick={() => window.open(selectedTx.receiptImage)}
                                    >
                                        <img src={selectedTx.receiptImage} alt="Comprobante" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s' }}
                                            onMouseEnter={e => e.currentTarget.style.opacity = 1}
                                            onMouseLeave={e => e.currentTarget.style.opacity = 0}
                                        >
                                            <span style={{ color: '#fff', fontWeight: 600 }}>Ver en tamaño completo</span>
                                        </div>
                                    </div>
                                </Section>
                            )}

                            {/* Notes */}
                            {(selectedTx.notes || selectedTx.adminNotes) && (
                                <Section title="Notas">
                                    {selectedTx.notes && <InfoRow label="Notas Originales" value={selectedTx.notes} />}
                                    {selectedTx.adminNotes && <InfoRow label="Notas del Admin" value={selectedTx.adminNotes} highlight />}
                                </Section>
                            )}

                            {/* Timestamps */}
                            <Section title="Marcas de Tiempo">
                                <InfoRow label="Creada" value={new Date(selectedTx.createdAt).toLocaleString('es-VE')} />
                                {selectedTx.updatedAt && selectedTx.updatedAt !== selectedTx.createdAt && (
                                    <InfoRow label="Procesada" value={new Date(selectedTx.updatedAt).toLocaleString('es-VE')} />
                                )}
                            </Section>
                        </Motion.div>
                    </div>
                )}
            </AnimatePresence>

            <style>{`
                input[type=date]::-webkit-calendar-picker-indicator { filter: invert(0.7); cursor: pointer; }
                @keyframes spin { to { transform: rotate(360deg); } }
                .animate-spin { animation: spin 1s linear infinite; }
            `}</style>
        </div>
    );
};

// ─── Sub-components ───────────────────────────────────────────────────────────
const Section = ({ title, children }) => (
    <div style={{ marginBottom: '24px' }}>
        <h4 style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px', display: 'flex', alignItems: 'center' }}>
            {title}
        </h4>
        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {children}
        </div>
    </div>
);

const InfoRow = ({ label, value, highlight, mono }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', flexShrink: 0 }}>{label}:</span>
        <span style={{
            fontSize: mono ? '0.75rem' : '0.85rem',
            fontWeight: highlight ? 700 : 400,
            color: highlight ? 'var(--primary)' : '#e0e0e0',
            textAlign: 'right',
            wordBreak: mono ? 'break-all' : 'break-word',
            fontFamily: mono ? 'monospace' : 'inherit',
        }}>
            {value || '—'}
        </span>
    </div>
);

// ─── Shared styles ─────────────────────────────────────────────────────────────
const labelStyle = {
    display: 'flex',
    alignItems: 'center',
    fontSize: '0.72rem',
    color: 'var(--text-muted)',
    marginBottom: '6px',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
};

const selectStyle = {
    width: '100%',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid var(--glass-border)',
    borderRadius: '10px',
    color: '#fff',
    padding: '10px 14px',
    fontSize: '0.88rem',
    outline: 'none',
    cursor: 'pointer',
};

const inputStyle = {
    width: '100%',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid var(--glass-border)',
    borderRadius: '10px',
    color: '#fff',
    padding: '10px 14px',
    fontSize: '0.88rem',
    outline: 'none',
    boxSizing: 'border-box',
};

export default TransactionExplorer;
