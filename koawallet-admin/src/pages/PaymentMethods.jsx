import React, { useState, useEffect } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { CreditCard, Plus, Edit2, Trash2, CheckCircle, X, ChevronLeft, Loader2, Save, Info } from 'lucide-react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const API_URL = 'http://localhost:3000';

const PaymentMethods = () => {
    const [methods, setMethods] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingMethod, setEditingMethod] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const token = localStorage.getItem('admin_token');
    const axiosConfig = { headers: { Authorization: `Bearer ${token}` } };

    useEffect(() => {
        fetchMethods();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchMethods = async () => {
        try {
            const response = await axios.get(`${API_URL}/admin/payment-methods`, axiosConfig);
            setMethods(response.data);
        } catch {
            setError('Error al cargar métodos de pago');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        const formData = new FormData(e.target);
        const data = {
            name: formData.get('name'),
            type: formData.get('type'),
            currency: formData.get('currency'),
            instructions: formData.get('instructions'),
            isActive: formData.get('isActive') === 'on',
            details: JSON.parse(formData.get('details') || '{}')
        };

        try {
            if (editingMethod?.id) {
                await axios.put(`${API_URL}/admin/payment-methods/${editingMethod.id}`, data, axiosConfig);
                setSuccess('Método de pago actualizado');
            } else {
                await axios.post(`${API_URL}/admin/payment-methods`, data, axiosConfig);
                setSuccess('Método de pago creado');
            }
            setTimeout(() => {
                setShowModal(false);
                fetchMethods();
            }, 1500);
        } catch (err) {
            setError(err.response?.data?.error || 'Error al guardar');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('¿Estás seguro de desactivar este método de pago?')) return;
        try {
            await axios.delete(`${API_URL}/admin/payment-methods/${id}`, axiosConfig);
            fetchMethods();
        } catch {
            alert('Error al desactivar');
        }
    };

    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-dark)' }}>
            <div className="glass-card" style={{ width: '80px', margin: '20px', padding: '30px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
                <Link to="/" style={{ color: 'var(--text-muted)' }}><LayoutDashboardIcon /></Link>
                <Link to="/users" style={{ color: 'var(--text-muted)' }}><UsersIcon /></Link>
                <div style={{ color: 'var(--primary)' }}><CreditCard size={24} /></div>
            </div>

            <div style={{ flex: 1, padding: '40px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
                    <div>
                        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--primary)', textDecoration: 'none', fontSize: '0.9rem', marginBottom: '10px' }}>
                            <ChevronLeft size={16} /> Volver al Dashboard
                        </Link>
                        <h1>Cuentas de <span className="gold-text">Recepción</span></h1>
                    </div>
                    <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={() => { setEditingMethod(null); setShowModal(true); }}>
                        <Plus size={20} /> Nuevo Método
                    </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                    {loading ? (
                        <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '100px' }}><Loader2 className="animate-spin" size={40} color="var(--primary)" /></div>
                    ) : (
                        methods.map(method => (
                            <Motion.div
                                key={method.id}
                                className="glass-card"
                                style={{ padding: '25px', position: 'relative', border: method.isActive ? '1px solid var(--glass-border)' : '1px solid rgba(244, 67, 54, 0.2)' }}
                                whileHover={{ translateY: -5 }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                                    <span style={{
                                        fontSize: '0.7rem',
                                        padding: '4px 8px',
                                        borderRadius: '6px',
                                        background: 'rgba(255,255,255,0.05)',
                                        color: 'var(--text-muted)'
                                    }}>
                                        {method.type} - {method.currency}
                                    </span>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button className="icon-btn" onClick={() => { setEditingMethod(method); setShowModal(true); }}><Edit2 size={16} /></button>
                                        <button className="icon-btn" style={{ color: 'var(--error)' }} onClick={() => handleDelete(method.id)}><Trash2 size={16} /></button>
                                    </div>
                                </div>

                                <h3 style={{ marginBottom: '5px' }}>{method.name}</h3>
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '15px' }}>{method.instructions || 'Sin instrucciones adicionales'}</p>

                                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '10px', fontSize: '0.8rem' }}>
                                    {Object.entries(method.details).map(([key, val]) => (
                                        <div key={key} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                            <span style={{ color: 'var(--text-muted)' }}>{key}:</span>
                                            <span style={{ fontWeight: 500 }}>{val}</span>
                                        </div>
                                    ))}
                                </div>

                                {!method.isActive && (
                                    <div style={{ position: 'absolute', top: '10px', right: '10px', color: 'var(--error)', fontSize: '0.7rem', fontWeight: 600 }}>INACTIVO</div>
                                )}
                            </Motion.div>
                        ))
                    )}
                </div>
            </div>

            <AnimatePresence>
                {showModal && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }}>
                        <Motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="glass-card"
                            style={{ width: '100%', maxWidth: '500px', padding: '40px', position: 'relative', maxHeight: '90vh', overflowY: 'auto' }}
                        >
                            <button onClick={() => setShowModal(false)} style={{ position: 'absolute', right: '20px', top: '20px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                                <X size={24} />
                            </button>

                            <h2 style={{ marginBottom: '30px' }}>{editingMethod ? 'Editar Método' : 'Nuevo Método'}</h2>

                            <form onSubmit={handleSave}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                                    <div style={{ gridColumn: 'span 2' }}>
                                        <label className="label">Nombre del Método (ej: Banesco, Binance Pay)</label>
                                        <input name="name" defaultValue={editingMethod?.name} required placeholder="Nombre visible al usuario" />
                                    </div>
                                    <div>
                                        <label className="label">Tipo</label>
                                        <select name="type" defaultValue={editingMethod?.type || 'FIAT'}>
                                            <option value="FIAT">FIAT (Banco)</option>
                                            <option value="CRYPTO">CRYPTO</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="label">Moneda</label>
                                        <input name="currency" defaultValue={editingMethod?.currency || 'VES'} required placeholder="VES, USD, USDT..." />
                                    </div>
                                    <div style={{ gridColumn: 'span 2' }}>
                                        <label className="label">Detalles (JSON format)</label>
                                        <textarea
                                            name="details"
                                            defaultValue={JSON.stringify(editingMethod?.details || { "Cuenta": "", "Titular": "", "Cédula": "" }, null, 2)}
                                            style={{
                                                width: '100%',
                                                background: 'rgba(0,0,0,0.3)',
                                                border: '1px solid var(--glass-border)',
                                                color: '#fff',
                                                padding: '12px',
                                                borderRadius: '12px',
                                                fontFamily: 'monospace',
                                                height: '120px'
                                            }}
                                        />
                                        <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '5px' }}>Ej: {"{\"Nro\": \"123\", \"Nombre\": \"Koa\"}"}</p>
                                    </div>
                                    <div style={{ gridColumn: 'span 2' }}>
                                        <label className="label">Instrucciones Manuales</label>
                                        <input name="instructions" defaultValue={editingMethod?.instructions} placeholder="Ej: Enviar comprobante por WhatsApp" />
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px' }}>
                                        <input type="checkbox" name="isActive" defaultChecked={editingMethod ? editingMethod.isActive : true} style={{ width: '20px', height: '20px' }} />
                                        <label>Activo</label>
                                    </div>
                                </div>

                                {error && <div style={{ color: 'var(--error)', marginBottom: '20px', textAlign: 'center' }}>{error}</div>}
                                {success && <div style={{ color: 'var(--success)', marginBottom: '20px', textAlign: 'center' }}>{success}</div>}

                                <button type="submit" className="btn-primary" style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}>
                                    <Save size={20} /> Guardar Cambios
                                </button>
                            </form>
                        </Motion.div>
                    </div>
                )}
            </AnimatePresence>

            <style>{`
                .icon-btn { 
                    background: rgba(255,255,255,0.05); 
                    border: 1px solid var(--glass-border); 
                    color: var(--text-muted); 
                    padding: 8px; 
                    border-radius: 8px; 
                    cursor: pointer; 
                    transition: all 0.2s; 
                }
                .icon-btn:hover { background: var(--glass-border); color: var(--text-main); }
                .label { display: block; font-size: 0.8rem; color: var(--text-muted); margin-bottom: 5px; }
                select {
                    background: rgba(0,0,0,0.3);
                    border: 1px solid var(--glass-border);
                    color: #fff;
                    padding: 12px;
                    border-radius: 12px;
                    width: 100%;
                    outline: none;
                }
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

export default PaymentMethods;
