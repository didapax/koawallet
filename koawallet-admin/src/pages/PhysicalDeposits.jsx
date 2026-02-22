import React, { useState, useEffect, useCallback } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import {
    Plus,
    Search,
    Filter,
    CheckCircle,
    XCircle,
    Clock,
    Scale,
    Droplets,
    Layers,
    AlertCircle,
    ChevronDown,
    Info,
    LayoutDashboard,
    Users as UsersIcon,
    MapPin,
    Settings as SettingsIcon,
    ChevronLeft,
    Loader2,
    Save,
    X
} from 'lucide-react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const API_BASE = 'http://localhost:3000';

const PhysicalDeposits = () => {
    const [deposits, setDeposits] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [users, setUsers] = useState([]);
    const [centers, setCenters] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');

    const userRole = localStorage.getItem('admin_role') || 'user';
    const token = localStorage.getItem('admin_token');
    const axiosConfig = React.useMemo(() => ({ headers: { Authorization: `Bearer ${token}` } }), [token]);

    const [formData, setFormData] = useState({
        userId: '',
        centerId: '',
        grossWeight: '',
        qualityGrade: 'GRADO_1',
        moistureContent: '7',
        fermentationGrade: '75',
        impuritiesContent: '1',
        notes: ''
    });

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const [depositsRes, usersRes, centersRes] = await Promise.all([
                axios.get(`${API_BASE}/admin/physical-deposits`, axiosConfig),
                axios.get(`${API_BASE}/admin/users`, axiosConfig),
                axios.get(`${API_BASE}/admin/collection-centers`, axiosConfig)
            ]);

            setDeposits(depositsRes.data);
            setUsers(usersRes.data.filter(u => u.role === 'user'));
            setCenters(centersRes.data.filter(c => c.isActive));
            setError(null);
        } catch (err) {
            console.error('Error fetching data:', err);
            setError('Error al cargar datos. Verifica la conexión con el servidor.');
        } finally {
            setLoading(false);
        }
    }, [axiosConfig]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleCreateDeposit = async (e) => {
        e.preventDefault();
        try {
            await axios.post(`${API_BASE}/admin/physical-deposits`, formData, axiosConfig);
            setShowModal(false);
            fetchData();
            setFormData({
                userId: '',
                centerId: '',
                grossWeight: '',
                qualityGrade: 'GRADO_1',
                moistureContent: '7',
                fermentationGrade: '75',
                impuritiesContent: '1',
                notes: ''
            });
        } catch (err) {
            alert(err.response?.data?.error || 'Error al crear depósito');
        }
    };

    const handleVerify = async (id, status) => {
        if (!window.confirm(`¿Estás seguro de ${status === 'COMPLETED' ? 'APROBAR' : 'RECHAZAR'} este depósito?`)) return;
        try {
            await axios.put(`${API_BASE}/admin/physical-deposits/${id}/verify`, { status }, axiosConfig);
            fetchData();
        } catch (err) {
            alert(err.response?.data?.error || 'Error al verificar');
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'PENDING':
                return <span className="status-badge pending"><Clock size={12} /> Pendiente</span>;
            case 'COMPLETED':
                return <span className="status-badge success"><CheckCircle size={12} /> Aprobado</span>;
            case 'REJECTED':
                return <span className="status-badge error"><XCircle size={12} /> Rechazado</span>;
            default:
                return status;
        }
    };

    const filteredDeposits = deposits.filter(d =>
        d.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.user?.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-dark)' }}>
            {/* Sidebar */}
            <div className="glass-card" style={{ width: '80px', margin: '20px', padding: '30px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
                <Link to="/" style={{ color: 'var(--text-muted)' }}><LayoutDashboard /></Link>
                {['admin', 'oficinista'].includes(userRole) && (
                    <Link to="/users" style={{ color: 'var(--text-muted)' }}><UsersIcon /></Link>
                )}
                <Link to="/collection-centers" style={{ color: 'var(--text-muted)' }}><MapPin /></Link>
                <div style={{ color: 'var(--primary)' }}><TrendingUpIcon /></div>
                {userRole === 'admin' && (
                    <Link to="/config" style={{ color: 'var(--text-muted)', marginTop: 'auto' }}><SettingsIcon /></Link>
                )}
            </div>

            <div style={{ flex: 1, padding: '40px' }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
                    <div>
                        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--primary)', textDecoration: 'none', fontSize: '0.9rem', marginBottom: '10px' }}>
                            <ChevronLeft size={16} /> Volver al Dashboard
                        </Link>
                        <h1>Depósitos <span className="gold-text">Físicos</span></h1>
                        <p style={{ color: 'var(--text-muted)' }}>Gestión y certificación de entrada de cacao</p>
                    </div>
                    <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={() => setShowModal(true)}>
                        <Plus size={20} /> Nuevo Depósito
                    </button>
                </div>

                {error && (
                    <div className="glass-card" style={{ padding: '15px 20px', marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--error)', border: '1px solid rgba(244, 67, 54, 0.3)' }}>
                        <AlertCircle size={20} /> {error}
                    </div>
                )}

                {/* Quick Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '25px', marginBottom: '30px' }}>
                    <Motion.div whileHover={{ y: -5 }} className="glass-card" style={{ padding: '25px' }}>
                        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                            <div style={{ p: '12px', background: 'var(--primary-glow)', borderRadius: '12px', color: 'var(--primary)', padding: '10px' }}>
                                <Scale size={24} />
                            </div>
                            <div>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Total Recibido</p>
                                <h3 style={{ fontSize: '1.6rem' }}>
                                    {deposits.reduce((acc, d) => acc + (d.status === 'COMPLETED' ? d.grossWeight : 0), 0).toLocaleString()} <span style={{ fontSize: '0.9rem', fontWeight: 400, color: 'var(--text-muted)' }}>g</span>
                                </h3>
                            </div>
                        </div>
                    </Motion.div>
                    <Motion.div whileHover={{ y: -5 }} className="glass-card" style={{ padding: '25px' }}>
                        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                            <div style={{ p: '12px', background: 'rgba(255, 152, 0, 0.1)', borderRadius: '12px', color: 'var(--warning)', padding: '10px' }}>
                                <Clock size={24} />
                            </div>
                            <div>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Pendientes</p>
                                <h3 style={{ fontSize: '1.6rem' }}>{deposits.filter(d => d.status === 'PENDING').length}</h3>
                            </div>
                        </div>
                    </Motion.div>
                    <Motion.div whileHover={{ y: -5 }} className="glass-card" style={{ padding: '25px' }}>
                        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                            <div style={{ p: '12px', background: 'rgba(76, 175, 80, 0.1)', borderRadius: '12px', color: 'var(--success)', padding: '10px' }}>
                                <CheckCircle size={24} />
                            </div>
                            <div>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Tasa Aprobación</p>
                                <h3 style={{ fontSize: '1.6rem' }}>
                                    {deposits.length > 0 ? ((deposits.filter(d => d.status === 'COMPLETED').length / deposits.length) * 100).toFixed(1) : 0}%
                                </h3>
                            </div>
                        </div>
                    </Motion.div>
                </div>

                {/* Search & Actions Bar */}
                <div className="glass-card" style={{ padding: '20px', marginBottom: '30px' }}>
                    <div style={{ position: 'relative' }}>
                        <Search size={20} style={{ position: 'absolute', left: '15px', top: '12px', color: 'var(--text-muted)' }} />
                        <input
                            type="text"
                            placeholder="Buscar por productor o email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ paddingLeft: '50px', background: 'rgba(255,255,255,0.03)' }}
                        />
                    </div>
                </div>

                {/* Table */}
                <div className="glass-card" style={{ overflow: 'hidden' }}>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--glass-border)' }}>
                                    <th style={{ padding: '15px 25px', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Productor / Inspector</th>
                                    <th style={{ padding: '15px 25px', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Peso Bruto</th>
                                    <th style={{ padding: '15px 25px', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Calidad / Ajustes</th>
                                    <th style={{ padding: '15px 25px', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Tokens (KOA)</th>
                                    <th style={{ padding: '15px 25px', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Estado</th>
                                    <th style={{ padding: '15px 25px', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Fecha</th>
                                    <th style={{ padding: '15px 25px', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', textAlign: 'right' }}>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan="7" style={{ textAlign: 'center', padding: '100px' }}>
                                            <Loader2 className="animate-spin" size={40} color="var(--primary)" style={{ margin: '0 auto' }} />
                                        </td>
                                    </tr>
                                ) : filteredDeposits.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" style={{ textAlign: 'center', padding: '100px', color: 'var(--text-muted)' }}>
                                            No se encontraron depósitos físicos.
                                        </td>
                                    </tr>
                                ) : filteredDeposits.map((deposit) => (
                                    <tr key={deposit.id} style={{ borderBottom: '1px solid var(--glass-border)', transition: 'background 0.2s' }} className="table-row">
                                        <td style={{ padding: '20px 25px' }}>
                                            <div style={{ fontWeight: 600 }}>{deposit.user?.name || deposit.user?.email}</div>
                                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <Info size={10} /> Insp: {deposit.inspector?.name || 'Sistema'}
                                            </div>
                                        </td>
                                        <td style={{ padding: '20px 25px' }}>
                                            <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{deposit.grossWeight.toLocaleString()} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 400 }}>g</span></div>
                                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{deposit.center?.name}</div>
                                        </td>
                                        <td style={{ padding: '20px 25px' }}>
                                            <span style={{
                                                fontSize: '0.65rem',
                                                padding: '2px 8px',
                                                borderRadius: '4px',
                                                border: deposit.qualityGrade === 'PREMIUM' ? '1px solid var(--primary)' : '1px solid var(--text-muted)',
                                                color: deposit.qualityGrade === 'PREMIUM' ? 'var(--primary)' : 'var(--text-main)',
                                                fontWeight: 600
                                            }}>
                                                {deposit.qualityGrade}
                                            </span>
                                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                                                H: {deposit.moistureContent}% • I: {deposit.impuritiesContent}%
                                            </div>
                                        </td>
                                        <td style={{ padding: '20px 25px' }}>
                                            <div className="gold-text" style={{ fontWeight: 700, fontSize: '1.1rem' }}>
                                                {deposit.finalTokensIssued.toLocaleString()}
                                            </div>
                                            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                                Factor: {(deposit.conversionFactor * 100).toFixed(1)}%
                                            </div>
                                        </td>
                                        <td style={{ padding: '20px 25px' }}>{getStatusBadge(deposit.status)}</td>
                                        <td style={{ padding: '20px 25px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                            {new Date(deposit.createdAt).toLocaleDateString()}
                                        </td>
                                        <td style={{ padding: '20px 25px', textAlign: 'right' }}>
                                            {deposit.status === 'PENDING' && (
                                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                                                    <button
                                                        onClick={() => handleVerify(deposit.id, 'COMPLETED')}
                                                        className="action-btn success"
                                                        title="Aprobar"
                                                    >
                                                        <CheckCircle size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleVerify(deposit.id, 'REJECTED')}
                                                        className="action-btn error"
                                                        title="Rechazar"
                                                    >
                                                        <XCircle size={18} />
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Modal */}
            <AnimatePresence>
                {showModal && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }}>
                        <Motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="glass-card"
                            style={{ width: '100%', maxWidth: '650px', padding: '40px', position: 'relative', maxHeight: '90vh', overflowY: 'auto' }}
                        >
                            <button onClick={() => setShowModal(false)} style={{ position: 'absolute', right: '25px', top: '25px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', transition: 'color 0.2s' }} className="hover-white">
                                <X size={28} />
                            </button>

                            <h2 style={{ marginBottom: '30px' }}><span className="gold-text">Registrar</span> Depósito Físico</h2>

                            <form onSubmit={handleCreateDeposit}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '25px' }}>
                                    <div>
                                        <label className="label">Productor</label>
                                        <select
                                            required
                                            className="premium-input"
                                            value={formData.userId}
                                            onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                                        >
                                            <option value="">Seleccionar Productor...</option>
                                            {users.map(u => (
                                                <option key={u.id} value={u.id}>{u.name || u.email} ({u.cedula || 'Sin cédula'})</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="label">Centro de Acopio</label>
                                        <select
                                            required
                                            className="premium-input"
                                            value={formData.centerId}
                                            onChange={(e) => setFormData({ ...formData, centerId: e.target.value })}
                                        >
                                            <option value="">Seleccionar Centro...</option>
                                            {centers.map(c => (
                                                <option key={c.id} value={c.id}>{c.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="label">Peso Bruto (g)</label>
                                        <div style={{ position: 'relative' }}>
                                            <input
                                                type="number" required
                                                className="premium-input"
                                                placeholder="Ej: 50000"
                                                value={formData.grossWeight}
                                                onChange={(e) => setFormData({ ...formData, grossWeight: e.target.value })}
                                                style={{ paddingRight: '45px' }}
                                            />
                                            <Scale size={18} style={{ position: 'absolute', right: '15px', top: '13px', color: 'var(--text-muted)' }} />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="label">Grado de Calidad</label>
                                        <select
                                            className="premium-input"
                                            value={formData.qualityGrade}
                                            onChange={(e) => setFormData({ ...formData, qualityGrade: e.target.value })}
                                        >
                                            <option value="PREMIUM">Premium (Exportación)</option>
                                            <option value="GRADO_1">Grado 1 (Standard)</option>
                                            <option value="GRADO_2">Grado 2 (Industrial)</option>
                                        </select>
                                    </div>
                                </div>

                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: '1fr 1fr 1fr',
                                    gap: '15px',
                                    padding: '20px',
                                    background: 'rgba(255,255,255,0.02)',
                                    borderRadius: '16px',
                                    border: '1px solid var(--glass-border)',
                                    marginBottom: '25px'
                                }}>
                                    <div>
                                        <label className="mini-label"><Droplets size={12} /> Humedad %</label>
                                        <input
                                            type="number" step="0.1"
                                            className="premium-input compact"
                                            value={formData.moistureContent}
                                            onChange={(e) => setFormData({ ...formData, moistureContent: e.target.value })}
                                        />
                                        <p style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px', textAlign: 'center' }}>Meta: 7%</p>
                                    </div>
                                    <div>
                                        <label className="mini-label"><Layers size={12} /> Ferment. %</label>
                                        <input
                                            type="number" step="0.1"
                                            className="premium-input compact"
                                            value={formData.fermentationGrade}
                                            onChange={(e) => setFormData({ ...formData, fermentationGrade: e.target.value })}
                                        />
                                        <p style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px', textAlign: 'center' }}>Meta: {'>'}70%</p>
                                    </div>
                                    <div>
                                        <label className="mini-label"><AlertCircle size={12} /> Impurezas %</label>
                                        <input
                                            type="number" step="0.1"
                                            className="premium-input compact"
                                            value={formData.impuritiesContent}
                                            onChange={(e) => setFormData({ ...formData, impuritiesContent: e.target.value })}
                                        />
                                        <p style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px', textAlign: 'center' }}>Meta: {'<'}2%</p>
                                    </div>
                                </div>

                                <div style={{ marginBottom: '30px' }}>
                                    <label className="label">Notas / Observaciones</label>
                                    <textarea
                                        className="premium-input"
                                        style={{ height: '80px', resize: 'none' }}
                                        placeholder="Detalles adicionales sobre el lote..."
                                        value={formData.notes}
                                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    ></textarea>
                                </div>

                                <button type="submit" className="btn-primary" style={{ width: '100%', height: '55px', fontSize: '1.1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}>
                                    <Save size={22} /> Registrar Entrada de Cacao
                                </button>
                            </form>
                        </Motion.div>
                    </div>
                )}
            </AnimatePresence>

            <style>{`
                .label { display: block; font-size: 0.8rem; color: var(--text-muted); margin-bottom: 8px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px; }
                .mini-label { display: flex; align-items: center; justify-content: center; gap: 5px; font-size: 0.7rem; color: var(--text-muted); margin-bottom: 6px; font-weight: 600; text-transform: uppercase; }
                
                .premium-input {
                    background: rgba(0, 0, 0, 0.45);
                    border: 1px solid var(--glass-border);
                    color: #fff;
                    padding: 12px 16px;
                    border-radius: 12px;
                    width: 100%;
                    outline: none;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    font-size: 1rem;
                }
                .premium-input:focus { border-color: var(--primary); background: rgba(0, 0, 0, 0.6); box-shadow: 0 0 0 4px var(--primary-glow); }
                .premium-input.compact { padding: 8px 12px; text-align: center; }
                
                select.premium-input { cursor: pointer; }
                select.premium-input option { background: #1a1a1f; color: #fff; }

                .status-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    padding: 4px 12px;
                    border-radius: 20px;
                    font-size: 0.75rem;
                    font-weight: 600;
                }
                .status-badge.pending { background: rgba(255, 152, 0, 0.1); color: var(--warning); border: 1px solid rgba(255, 152, 0, 0.2); }
                .status-badge.success { background: rgba(76, 175, 80, 0.1); color: var(--success); border: 1px solid rgba(76, 175, 80, 0.2); }
                .status-badge.error { background: rgba(244, 67, 54, 0.1); color: var(--error); border: 1px solid rgba(244, 67, 54, 0.2); }

                .action-btn {
                    width: 38px;
                    height: 38px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 10px;
                    border: 1px solid var(--glass-border);
                    background: rgba(255, 255, 255, 0.03);
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .action-btn.success { color: var(--success); }
                .action-btn.success:hover { background: var(--success); color: #000; border-color: var(--success); }
                .action-btn.error { color: var(--error); }
                .action-btn.error:hover { background: var(--error); color: #fff; border-color: var(--error); }

                .table-row:hover { background: rgba(255, 255, 255, 0.035) !important; }
                .hover-white:hover { color: #fff !important; }
            `}</style>
        </div>
    );
};

const TrendingUpIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
);

export default PhysicalDeposits;

