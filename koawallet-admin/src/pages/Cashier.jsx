import React, { useState, useEffect } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { ClipboardList, CheckCircle, XCircle, X, Eye, ChevronLeft, Loader2, MessageSquare, ExternalLink, Image as ImageIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const API_URL = 'http://localhost:3000';

const Cashier = () => {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedTx, setSelectedTx] = useState(null);
    const [adminNotes, setAdminNotes] = useState('');
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState('');

    const token = localStorage.getItem('admin_token');
    const axiosConfig = { headers: { Authorization: `Bearer ${token}` } };

    useEffect(() => {
        fetchQueue();
        const interval = setInterval(fetchQueue, 10000); // Poll every 10s
        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchQueue = async () => {
        try {
            const response = await axios.get(`${API_URL}/admin/transactions/pending`, axiosConfig);
            setTransactions(response.data);
        } catch {
            setError('Error al cargar la cola');
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (id, action) => {
        if (!window.confirm(`¿Estás seguro de ${action === 'approve' ? 'APROBAR' : 'RECHAZAR'} esta transacción?`)) return;

        setProcessing(true);
        try {
            await axios.post(`${API_URL}/admin/transactions/${id}/${action}`, { adminNotes }, axiosConfig);
            setSelectedTx(null);
            setAdminNotes('');
            fetchQueue();
        } catch (err) {
            alert(err.response?.data?.error || 'Error al procesar');
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-dark)' }}>
            <div className="glass-card" style={{ width: '80px', margin: '20px', padding: '30px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
                <Link to="/" style={{ color: 'var(--text-muted)' }}><LayoutDashboardIcon /></Link>
                <div style={{ color: 'var(--primary)' }}><ClipboardList size={24} /></div>
                <Link to="/users" style={{ color: 'var(--text-muted)' }}><UsersIcon /></Link>
            </div>

            <div style={{ flex: 1, padding: '40px' }}>
                <div style={{ marginBottom: '40px' }}>
                    <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--primary)', textDecoration: 'none', fontSize: '0.9rem', marginBottom: '10px' }}>
                        <ChevronLeft size={16} /> Volver al Dashboard
                    </Link>
                    <h1>Cola del <span className="gold-text">Cajero (Oracle)</span></h1>
                    <p style={{ color: 'var(--text-muted)', marginTop: '5px' }}>Valida pagos P2P y libera tokens de cacao.</p>
                </div>

                {error && (
                    <div className="glass-card" style={{ padding: '15px', background: 'rgba(244, 67, 54, 0.1)', color: 'var(--error)', border: '1px solid rgba(244, 67, 54, 0.2)', borderRadius: '12px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <XCircle size={20} /> {error}
                    </div>
                )}

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '100px' }}><Loader2 className="animate-spin" size={40} color="var(--primary)" /></div>
                ) : (
                    <div style={{ display: 'grid', gap: '15px' }}>
                        {transactions.length === 0 ? (
                            <div className="glass-card" style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                <CheckCircle size={48} style={{ marginBottom: '15px', opacity: 0.2 }} />
                                <p>No hay transacciones pendientes en la cola.</p>
                            </div>
                        ) : (
                            transactions.map(tx => (
                                <Motion.div
                                    key={tx.id}
                                    className="glass-card"
                                    style={{ padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                                    layout
                                >
                                    <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                                        <div style={{
                                            width: '50px',
                                            height: '50px',
                                            borderRadius: '12px',
                                            background: tx.type === 'BUY' ? 'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: tx.type === 'BUY' ? 'var(--success)' : 'var(--error)'
                                        }}>
                                            {tx.type === 'BUY' ? 'BUY' : 'SELL'}
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 600 }}>{tx.user.name || 'Usuario'}</div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{tx.user.email}</div>
                                        </div>
                                        <div style={{ borderLeft: '1px solid var(--glass-border)', paddingLeft: '20px' }}>
                                            <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>
                                                {tx.fiatAmount ? `${tx.fiatAmount} ${tx.paymentMethod?.currency || 'VES'}` : `$${tx.amount}`}
                                            </div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--primary)' }}>
                                                {tx.gramsAmount || tx.amountCacao || tx.amount}g Cacao
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: '0.8rem', fontWeight: 500 }}>{tx.paymentMethod?.name || tx.method || 'Método no especificado'}</div>
                                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Ref: {tx.reference || 'Sin Ref'}</div>
                                        </div>
                                        <button className="btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={() => setSelectedTx(tx)}>
                                            <Eye size={16} /> Revisar
                                        </button>
                                    </div>
                                </Motion.div>
                            ))
                        )}
                    </div>
                )}
            </div>

            <AnimatePresence>
                {selectedTx && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }}>
                        <Motion.div
                            initial={{ y: 50, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 50, opacity: 0 }}
                            className="glass-card"
                            style={{ width: '100%', maxWidth: '600px', padding: '40px', position: 'relative' }}
                        >
                            <button onClick={() => setSelectedTx(null)} style={{ position: 'absolute', right: '20px', top: '20px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                                <X size={24} />
                            </button>

                            <h2 style={{ marginBottom: '5px' }}><span className="gold-text">Validación</span> de Transacción</h2>
                            <p style={{ color: 'var(--text-muted)', marginBottom: '30px' }}>ID: #{selectedTx.id} - {new Date(selectedTx.createdAt).toLocaleString()}</p>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '30px' }}>
                                <div>
                                    <h4 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '10px', textTransform: 'uppercase' }}>Datos del Usuario</h4>
                                    <div style={{ padding: '15px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', fontSize: '0.9rem' }}>
                                        <p><strong>Nombre:</strong> {selectedTx.user.name}</p>
                                        <p><strong>Cédula:</strong> {selectedTx.user.cedula || 'N/A'}</p>
                                        <p><strong>Teléfono:</strong> {selectedTx.user.phone || 'N/A'}</p>
                                        <p><strong>Email:</strong> {selectedTx.user.email}</p>
                                    </div>
                                </div>
                                <div>
                                    <h4 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '10px', textTransform: 'uppercase' }}>
                                        {selectedTx.type === 'SELL' ? 'Datos para Transferencia' : 'Datos del Pago'}
                                    </h4>
                                    <div style={{ padding: '15px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px' }}>
                                        <p style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '10px' }}>
                                            {selectedTx.fiatAmount} {selectedTx.paymentMethod?.currency || selectedTx.userPaymentMethod?.paymentMethod?.currency}
                                        </p>

                                        {selectedTx.type === 'SELL' && selectedTx.userPaymentMethod ? (
                                            <div style={{ fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                                <p><strong>Método:</strong> {selectedTx.userPaymentMethod.paymentMethod.name}</p>
                                                {selectedTx.userPaymentMethod.paymentMethod.type === 'FIAT' ? (
                                                    <>
                                                        <p><strong>Banco:</strong> {selectedTx.userPaymentMethod.bankName}</p>
                                                        <p><strong>Titular:</strong> {selectedTx.userPaymentMethod.accountHolder}</p>
                                                        <p><strong>Cuenta/Tel:</strong> <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{selectedTx.userPaymentMethod.accountNumber}</span></p>
                                                        {selectedTx.userPaymentMethod.accountType && <p><strong>Tipo:</strong> {selectedTx.userPaymentMethod.accountType}</p>}
                                                    </>
                                                ) : (
                                                    <>
                                                        <p><strong>Red:</strong> {selectedTx.userPaymentMethod.accountType || selectedTx.userPaymentMethod.paymentMethod.details?.Red || 'TRC20'}</p>
                                                        <p><strong>Wallet:</strong> <span style={{ color: 'var(--primary)', fontWeight: 600, wordBreak: 'break-all' }}>{selectedTx.userPaymentMethod.accountNumber}</span></p>
                                                    </>
                                                )}
                                            </div>
                                        ) : (
                                            <>
                                                <p style={{ fontSize: '0.9rem' }}>{selectedTx.paymentMethod?.name}</p>
                                                <p style={{ fontSize: '0.8rem', color: 'var(--primary)', marginTop: '5px' }}>Referencia: {selectedTx.reference || 'N/A'}</p>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {selectedTx.type !== 'SELL' && (
                                <div style={{ marginBottom: '30px' }}>
                                    <h4 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '10px', textTransform: 'uppercase' }}>Comprobante Adjunto</h4>
                                    {selectedTx.receiptImage ? (
                                        <div style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', height: '150px', cursor: 'pointer', border: '1px solid var(--glass-border)' }} onClick={() => window.open(selectedTx.receiptImage)}>
                                            <img src={selectedTx.receiptImage} alt="Receipt" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <ImageIcon size={32} />
                                            </div>
                                        </div>
                                    ) : (
                                        <div style={{ height: '80px', border: '1px dashed var(--glass-border)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '10px' }}>
                                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Sin imagen adjunta. Validar por referencia manual.</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div style={{ marginBottom: '30px' }}>
                                <label className="label">Notas del Administrador (opcional)</label>
                                <div style={{ position: 'relative' }}>
                                    <MessageSquare size={18} style={{ position: 'absolute', left: '15px', top: '15px', color: 'var(--text-muted)' }} />
                                    <textarea
                                        value={adminNotes}
                                        onChange={(e) => setAdminNotes(e.target.value)}
                                        placeholder="Ej: Pago verificado en Banesco / Captura ilegible"
                                        style={{
                                            width: '100%',
                                            background: 'rgba(0,0,0,0.3)',
                                            border: '1px solid var(--glass-border)',
                                            color: '#fff',
                                            padding: '12px 12px 12px 50px',
                                            borderRadius: '12px',
                                            height: '80px',
                                            resize: 'none'
                                        }}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                <button
                                    className="btn-outline"
                                    style={{ borderColor: 'var(--error)', color: 'var(--error)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                                    onClick={() => handleAction(selectedTx.id, 'reject')}
                                    disabled={processing}
                                >
                                    <XCircle size={20} /> Rechazar
                                </button>
                                <button
                                    className="btn-primary"
                                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                                    onClick={() => handleAction(selectedTx.id, 'approve')}
                                    disabled={processing}
                                >
                                    {processing ? <Loader2 className="animate-spin" size={20} /> : <><CheckCircle size={20} /> Aprobar Liberación</>}
                                </button>
                            </div>
                        </Motion.div>
                    </div>
                )}
            </AnimatePresence>

            <style>{`
                .label { display: block; font-size: 0.8rem; color: var(--text-muted); margin-bottom: 8px; }
            `}</style>
        </div>
    );
};

const LayoutDashboardIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9"></rect><rect x="14" y="3" width="7" height="5"></rect><rect x="14" y="12" width="7" height="9"></rect><rect x="3" y="16" width="7" height="5"></rect></svg>
);

const UsersIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
);

export default Cashier;
