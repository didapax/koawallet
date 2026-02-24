import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import {
    History,
    ArrowUpCircle,
    Loader2,
    AlertCircle,
    X,
    Briefcase,
    Plus,
    Wallet,
    TrendingUp,
    CreditCard
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';

const Treasury = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState(null);
    const [withdrawals, setWithdrawals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Form State
    const [amount, setAmount] = useState('');
    const [reason, setReason] = useState('');
    const [reference, setReference] = useState('');

    const token = localStorage.getItem('admin_token');
    const API_URL = 'http://localhost:3000';

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const [statsRes, withdrawalsRes] = await Promise.all([
                axios.get(`${API_URL}/api/admin/treasury/stats`, {
                    headers: { Authorization: `Bearer ${token}` }
                }),
                axios.get(`${API_URL}/api/admin/treasury/withdrawals`, {
                    headers: { Authorization: `Bearer ${token}` }
                })
            ]);
            setStats(statsRes.data);
            setWithdrawals(withdrawalsRes.data);
            setError(null);
        } catch (err) {
            setError('Error al cargar datos de tesorería');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [token, API_URL]);

    useEffect(() => {
        if (token) fetchData();
    }, [fetchData, token]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await axios.post(`${API_URL}/api/admin/treasury/withdrawals`, {
                amount: parseFloat(amount),
                reason,
                reference
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setAmount('');
            setReason('');
            setReference('');
            setIsModalOpen(false);
            fetchData();
        } catch (err) {
            alert(err.response?.data?.error || 'Error al procesar el retiro');
        } finally {
            setSubmitting(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_role');
        navigate('/login');
    };

    if (loading && !stats) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg-dark)' }}>
                <Loader2 className="animate-spin" style={{ color: 'var(--primary)' }} size={48} />
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-dark)' }}>
            <Sidebar onLogout={handleLogout} />

            {/* Main Content */}
            <div style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>
                <Motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    style={{ maxWidth: '1200px', margin: '0 auto', color: 'var(--text-main)' }}
                >
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                        <div>
                            <h1 className="gold-text" style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>Tesorería y Utilidades</h1>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Gestión de comisiones acumuladas y gastos operativos</p>
                        </div>
                        <Motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setIsModalOpen(true)}
                            className="btn-primary"
                            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                        >
                            <Plus size={20} />
                            Registrar Retiro
                        </Motion.button>
                    </div>

                    {error && (
                        <Motion.div
                            initial={{ y: -20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            className="glass-card"
                            style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem', borderColor: 'var(--error)', color: 'var(--error)' }}
                        >
                            <AlertCircle size={20} />
                            {error}
                        </Motion.div>
                    )}

                    {/* Stats Grid */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                        gap: '1.5rem',
                        marginBottom: '2rem'
                    }}>
                        <StatCard
                            title="Ganancias Históricas"
                            value={`$${stats?.totalFees?.toFixed(2) || '0.00'}`}
                            icon={<History size={24} />}
                            description="Suma de todas las comisiones"
                            delay={0.1}
                        />
                        <StatCard
                            title="Retiros Realizados"
                            value={`$${stats?.totalWithdrawals?.toFixed(2) || '0.00'}`}
                            icon={<ArrowUpCircle size={24} />}
                            description="Gastos y retiro de utilidades"
                            delay={0.2}
                        />
                        <StatCard
                            title="Saldo en Caja"
                            value={`$${stats?.availableBalance?.toFixed(2) || '0.00'}`}
                            icon={<Wallet size={24} />}
                            description="Disponible para retirar"
                            delay={0.3}
                            highlight
                        />
                    </div>

                    {/* Main Content Area */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                            {/* History Table */}
                            <Motion.div
                                className="glass-card"
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.4 }}
                                style={{ overflow: 'hidden' }}
                            >
                                <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <History size={22} style={{ color: 'var(--primary)' }} />
                                    <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>Historial de Movimientos</h2>
                                </div>
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                        <thead style={{ background: 'rgba(255,255,255,0.02)' }}>
                                            <tr>
                                                <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Fecha</th>
                                                <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Concepto</th>
                                                <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Monto</th>
                                                <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Admin</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {withdrawals.length === 0 ? (
                                                <tr>
                                                    <td colSpan="4" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                                        No se han registrado movimientos de salida.
                                                    </td>
                                                </tr>
                                            ) : (
                                                withdrawals.map((w) => (
                                                    <tr key={w.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                                                        <td style={{ padding: '1rem 1.5rem', fontSize: '0.875rem' }}>
                                                            {new Date(w.createdAt).toLocaleDateString()}
                                                        </td>
                                                        <td style={{ padding: '1rem 1.5rem' }}>
                                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                                <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>{w.reason}</span>
                                                                <span style={{ fontSize: '0.75rem', fontStyle: 'italic', color: 'var(--text-muted)' }}>{w.reference || 'Sin ref.'}</span>
                                                            </div>
                                                        </td>
                                                        <td style={{ padding: '1rem 1.5rem' }}>
                                                            <span style={{ fontSize: '0.875rem', fontWeight: 'bold', color: '#ff6b6b' }}>
                                                                -${w.amount.toFixed(2)}
                                                            </span>
                                                        </td>
                                                        <td style={{ padding: '1rem 1.5rem' }}>
                                                            <span style={{ fontSize: '0.875rem', color: 'var(--primary)' }}>{w.admin.name}</span>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </Motion.div>
                        </div>
                    </div>

                    {/* Distribution Section */}
                    <div style={{ marginTop: '2rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
                        <Motion.div
                            className="glass-card"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.6 }}
                            style={{ padding: '2rem' }}
                        >
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <TrendingUp size={22} style={{ color: 'var(--primary)' }} />
                                Distribución de Utilidades
                            </h2>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                                        <span style={{ color: 'var(--text-muted)' }}>Retirado acumulado</span>
                                        <span>{stats?.totalFees ? ((stats.totalWithdrawals / stats.totalFees) * 100).toFixed(1) : '0.0'}%</span>
                                    </div>
                                    <div style={{ width: '100%', height: '8px', background: 'rgba(0,0,0,0.3)', borderRadius: '4px', overflow: 'hidden' }}>
                                        <Motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${stats?.totalFees ? (stats.totalWithdrawals / stats.totalFees) * 100 : 0}%` }}
                                            style={{ height: '100%', background: 'linear-gradient(90deg, var(--secondary), var(--primary))' }}
                                        />
                                    </div>
                                </div>
                                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                                        <Briefcase size={20} style={{ color: 'var(--primary)', marginTop: '2px' }} />
                                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                                            Las utilidades se generan a partir de las comisiones de red y los cobros de mantenimiento mensual. Este balance representa el flujo neto disponible del negocio.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </Motion.div>
                    </div>
                </Motion.div>
            </div>

            {/* Modal Withdrawal */}
            <AnimatePresence>
                {isModalOpen && (
                    <div style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        zIndex: 1000,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '1rem'
                    }}>
                        <Motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsModalOpen(false)}
                            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
                        />
                        <Motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="glass-card"
                            style={{
                                position: 'relative',
                                width: '100%',
                                maxWidth: '450px',
                                padding: '2.5rem',
                                borderColor: 'var(--primary-glow)',
                                zIndex: 1001
                            }}
                        >
                            <button
                                onClick={() => setIsModalOpen(false)}
                                style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                            >
                                <X size={24} />
                            </button>

                            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                                <div style={{
                                    width: '64px',
                                    height: '64px',
                                    background: 'var(--primary-glow)',
                                    borderRadius: '1.5rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    margin: '0 auto 1.5rem auto',
                                    border: '1px solid var(--primary-glow)'
                                }}>
                                    <Wallet size={32} style={{ color: 'var(--primary)' }} />
                                </div>
                                <h3 className="gold-text" style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Retiro de Fondos</h3>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.5rem' }}>Retira utilidades o registra gastos</p>
                            </div>

                            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <label style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginLeft: '4px' }}>Monto a retirar (USD)</label>
                                    <div style={{ position: 'relative' }}>
                                        <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', fontWeight: 'bold', color: 'var(--primary)' }}>$</span>
                                        <input
                                            type="number"
                                            step="0.01"
                                            required
                                            value={amount}
                                            onChange={(e) => setAmount(e.target.value)}
                                            style={{ paddingLeft: '2.5rem' }}
                                            placeholder="0.00"
                                        />
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', padding: '0 4px', textTransform: 'uppercase' }}>
                                        <span style={{ color: 'var(--text-muted)' }}>Saldo en caja</span>
                                        <span style={{ color: 'var(--primary)' }}>${stats?.availableBalance?.toFixed(2) || '0.00'} USD</span>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <label style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginLeft: '4px' }}>Concepto / Razón</label>
                                    <input
                                        type="text"
                                        required
                                        value={reason}
                                        onChange={(e) => setReason(e.target.value)}
                                        placeholder="AWS, Alquiler, Utilidades..."
                                    />
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <label style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginLeft: '4px' }}>Referencia (Opcional)</label>
                                    <input
                                        type="text"
                                        value={reference}
                                        onChange={(e) => setReference(e.target.value)}
                                        placeholder="Nro de transferencia o hash"
                                    />
                                </div>

                                <div style={{ marginTop: '1rem' }}>
                                    <Motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        type="submit"
                                        disabled={submitting}
                                        className="btn-primary"
                                        style={{ width: '100%', padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                                    >
                                        {submitting ? (
                                            <Loader2 className="animate-spin" size={20} />
                                        ) : (
                                            <>
                                                <CreditCard size={20} />
                                                Confirmar Movimiento
                                            </>
                                        )}
                                    </Motion.button>
                                </div>
                            </form>
                        </Motion.div>
                    </div>
                )}
            </AnimatePresence>

            <style>{`
                .nav-item:hover {
                    background: rgba(255, 255, 255, 0.05);
                    color: #fff !important;
                }
                .logout-btn:hover {
                    background: rgba(255, 75, 75, 0.1);
                }
            `}</style>
        </div>
    );
};

const StatCard = ({ title, value, icon, description, delay, highlight }) => (
    <Motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay }}
        whileHover={{ y: -5 }}
        className="glass-card"
        style={{
            padding: '1.5rem',
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            borderLeft: highlight ? '4px solid var(--primary)' : '1px solid var(--glass-border)',
            background: highlight ? 'linear-gradient(135deg, rgba(212, 175, 55, 0.05) 0%, rgba(0,0,0,0) 100%)' : 'rgba(255,255,255,0.02)',
            minHeight: '160px'
        }}
    >
        <div style={{ position: 'absolute', top: '10px', right: '10px', opacity: 0.1, pointerEvents: 'none' }}>
            {React.cloneElement(icon, { size: 48 })}
        </div>

        <div style={{ marginBottom: '1rem' }}>
            <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: highlight ? 'var(--primary-glow)' : 'rgba(255,255,255,0.05)'
            }}>
                {React.cloneElement(icon, { size: 22, style: { color: highlight ? 'var(--primary)' : 'var(--text-muted)' } })}
            </div>
        </div>

        <div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '1px' }}>{title}</p>
            <h3 className={highlight ? 'gold-text' : ''} style={{ fontSize: '1.75rem', marginTop: '0.25rem' }}>{value}</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', marginTop: '0.5rem' }}>{description}</p>
        </div>
    </Motion.div>
);

export default Treasury;
