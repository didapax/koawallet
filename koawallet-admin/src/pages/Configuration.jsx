import React, { useState, useEffect } from 'react';
import { motion as Motion } from 'framer-motion';
import { Settings, Save, RefreshCcw, DollarSign, Activity, Calendar, LayoutDashboard, LogOut, Users, Info } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

const API_URL = 'http://localhost:3000';

const Configuration = () => {
    const navigate = useNavigate();
    const userRole = localStorage.getItem('admin_role') || 'user';
    const token = localStorage.getItem('admin_token');

    const [config, setConfig] = useState({
        buyPrice: 0,
        sellPrice: 0,
        maintenanceFee: 0,
        networkFee: 0,
        lastZilaPrice: 0,
        currentZilaPrice: 0
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_URL}/admin/config`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setConfig(data);
            } else {
                setMessage({ type: 'error', text: 'Error al cargar la configuración' });
            }
        } catch (error) {
            console.error('Error fetching config:', error);
            setMessage({ type: 'error', text: 'Error de conexión con el servidor' });
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMessage({ type: '', text: '' });

        try {
            const response = await fetch(`${API_URL}/admin/config`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    buyPrice: parseFloat(config.buyPrice),
                    sellPrice: parseFloat(config.sellPrice),
                    maintenanceFee: parseFloat(config.maintenanceFee),
                    networkFee: parseFloat(config.networkFee)
                })
            });

            if (response.ok) {
                setMessage({ type: 'success', text: 'Configuración guardada exitosamente' });
                setTimeout(() => setMessage({ type: '', text: '' }), 3000);
            } else {
                const error = await response.json();
                setMessage({ type: 'error', text: error.error || 'Error al guardar' });
            }
        } catch (error) {
            console.error('Error saving config:', error);
            setMessage({ type: 'error', text: 'Error de conexión' });
        } finally {
            setSaving(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_role');
        navigate('/login');
    };

    if (loading) return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--bg-dark)' }}>
            <div className="loader"></div>
        </div>
    );

    return (
        <div style={{ display: 'flex', minHeight: '100vh' }}>
            {/* Sidebar */}
            <div className="glass-card" style={{
                width: '280px',
                margin: '20px',
                padding: '30px 20px',
                display: 'flex',
                flexDirection: 'column',
                borderRadius: '24px'
            }}>
                <div style={{ marginBottom: '40px', padding: '0 10px' }}>
                    <h2 className="gold-text">KoaWallet</h2>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>ADMIN PANEL</p>
                </div>

                <nav style={{ flex: 1 }}>
                    <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 15px', color: 'var(--text-muted)', borderRadius: '12px', marginBottom: '10px' }} className="nav-item">
                            <LayoutDashboard size={20} />
                            <span style={{ fontWeight: 500 }}>Dashboard</span>
                        </div>
                    </Link>

                    {(userRole === 'admin' || userRole === 'oficinista') && (
                        <Link to="/users" style={{ textDecoration: 'none', color: 'inherit' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 15px', color: 'var(--text-muted)', borderRadius: '12px', marginBottom: '10px' }} className="nav-item">
                                <Users size={20} />
                                <span style={{ fontWeight: 500 }}>Usuarios</span>
                            </div>
                        </Link>
                    )}

                    {userRole === 'admin' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 15px', color: 'var(--primary)', background: 'var(--primary-glow)', borderRadius: '12px', marginBottom: '10px' }}>
                            <Settings size={20} />
                            <span style={{ fontWeight: 500 }}>Configuración</span>
                        </div>
                    )}
                </nav>

                <button
                    onClick={handleLogout}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '12px 15px',
                        color: '#ff4b4b',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        borderRadius: '12px',
                        marginTop: 'auto'
                    }}
                    className="logout-btn"
                >
                    <LogOut size={20} />
                    <span style={{ fontWeight: 500 }}>Cerrar Sesión</span>
                </button>
            </div>

            {/* Main Content */}
            <div style={{ flex: 1, padding: '40px' }}>
                <header style={{ marginBottom: '40px' }}>
                    <h1 style={{ fontSize: '2rem' }}>Configuración del <span className="gold-text">Sistema</span></h1>
                    <p style={{ color: 'var(--text-muted)' }}>Ajusta precios, tasas y parámetros operativos de KoaWallet</p>
                </header>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
                    {/* Precios de Cacao */}
                    <div className="glass-card" style={{ padding: '30px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '25px' }}>
                            <div style={{ padding: '8px', background: 'var(--primary-glow)', borderRadius: '8px', color: 'var(--primary)' }}>
                                <Activity size={20} />
                            </div>
                            <h3 style={{ margin: 0 }}>Tasas de Cacao</h3>
                        </div>

                        <form onSubmit={handleSave}>
                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Precio de Compra (USD/g)</label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div className="input-group" style={{
                                        flex: 1,
                                        display: 'flex',
                                        alignItems: 'center',
                                        background: 'rgba(255, 255, 255, 0.05)',
                                        borderRadius: '12px',
                                        padding: '0 15px'
                                    }}>
                                        <DollarSign size={16} color="var(--primary)" />
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={config.buyPrice}
                                            onChange={(e) => setConfig({ ...config, buyPrice: e.target.value })}
                                            style={{
                                                background: 'transparent',
                                                border: 'none',
                                                color: '#fff',
                                                padding: '12px 10px',
                                                width: '100%',
                                                outline: 'none'
                                            }}
                                        />
                                    </div>
                                </div>
                                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '5px' }}>
                                    Precio al que KoaWallet compra cacao a los usuarios.
                                </p>
                            </div>

                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Precio de Venta (USD/g)</label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div className="input-group" style={{
                                        flex: 1,
                                        display: 'flex',
                                        alignItems: 'center',
                                        background: 'rgba(255, 255, 255, 0.05)',
                                        borderRadius: '12px',
                                        padding: '0 15px'
                                    }}>
                                        <DollarSign size={16} color="var(--primary)" />
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={config.sellPrice}
                                            onChange={(e) => setConfig({ ...config, sellPrice: e.target.value })}
                                            style={{
                                                background: 'transparent',
                                                border: 'none',
                                                color: '#fff',
                                                padding: '12px 10px',
                                                width: '100%',
                                                outline: 'none'
                                            }}
                                        />
                                    </div>
                                </div>
                                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '5px' }}>
                                    Precio al que KoaWallet vende cacao a los usuarios.
                                </p>
                            </div>

                            <button
                                type="submit"
                                className="btn-primary"
                                disabled={saving}
                                style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '10px' }}
                            >
                                {saving ? 'Guardando...' : <><Save size={18} /> Guardar Precios</>}
                            </button>
                        </form>
                    </div>

                    {/* Referencia Zila Labs */}
                    <div className="glass-card" style={{ padding: '30px', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '25px' }}>
                            <div style={{ padding: '8px', background: 'var(--primary-glow)', borderRadius: '8px', color: 'var(--primary)' }}>
                                <Info size={20} />
                            </div>
                            <h3 style={{ margin: 0 }}>Referencia de Mercado</h3>
                        </div>

                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center' }}>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '10px' }}>Precio Zila Labs (Mercado Mundial)</p>
                            <h2 style={{ fontSize: '3rem', margin: '10px 0' }} className="gold-text">
                                ${config.currentZilaPrice ? config.currentZilaPrice.toFixed(2) : '--.--'}
                            </h2>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>USD / por gramo</p>

                            <div style={{
                                marginTop: '30px',
                                padding: '15px',
                                background: 'rgba(212, 175, 55, 0.05)',
                                borderRadius: '12px',
                                borderLeft: '4px solid var(--primary)'
                            }}>
                                <p style={{ fontSize: '0.85rem', textAlign: 'left', margin: 0, color: '#ddd' }}>
                                    <strong>Nota:</strong> Los precios de Zila Labs son solo referenciales. Debes ajustar tus tasas manuales según la competencia local y los costos operativos.
                                </p>
                            </div>

                            <button
                                onClick={fetchConfig}
                                style={{
                                    marginTop: 'auto',
                                    background: 'transparent',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    color: '#fff',
                                    padding: '10px',
                                    borderRadius: '10px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    cursor: 'pointer'
                                }}
                            >
                                <RefreshCcw size={16} /> Actualizar Referencia
                            </button>
                        </div>
                    </div>

                    {/* Comisiones */}
                    <div className="glass-card" style={{ padding: '30px', gridColumn: 'span 2' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '25px' }}>
                            <div style={{ padding: '8px', background: 'var(--primary-glow)', borderRadius: '8px', color: 'var(--primary)' }}>
                                <Calendar size={20} />
                            </div>
                            <h3 style={{ margin: 0 }}>Comisiones y Tasas</h3>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Tasa de Mantenimiento Mensual (USD)</label>
                                <div className="input-group" style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    borderRadius: '12px',
                                    padding: '0 15px'
                                }}>
                                    <DollarSign size={16} color="var(--primary)" />
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={config.maintenanceFee}
                                        onChange={(e) => setConfig({ ...config, maintenanceFee: e.target.value })}
                                        style={{
                                            background: 'transparent',
                                            border: 'none',
                                            color: '#fff',
                                            padding: '12px 10px',
                                            width: '100%',
                                            outline: 'none'
                                        }}
                                    />
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Tasa de Uso de Red por Transacción (USD)</label>
                                <div className="input-group" style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    borderRadius: '12px',
                                    padding: '0 15px'
                                }}>
                                    <DollarSign size={16} color="var(--primary)" />
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={config.networkFee}
                                        onChange={(e) => setConfig({ ...config, networkFee: e.target.value })}
                                        style={{
                                            background: 'transparent',
                                            border: 'none',
                                            color: '#fff',
                                            padding: '12px 10px',
                                            width: '100%',
                                            outline: 'none'
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {message.text && (
                    <Motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        style={{
                            position: 'fixed',
                            bottom: '40px',
                            right: '40px',
                            padding: '15px 25px',
                            borderRadius: '12px',
                            background: message.type === 'success' ? 'var(--success)' : '#ff4b4b',
                            color: '#fff',
                            boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
                            zIndex: 1000
                        }}
                    >
                        {message.text}
                    </Motion.div>
                )}
            </div>

            <style>{`
                .nav-item:hover {
                    background: rgba(255, 255, 255, 0.05);
                    color: #fff !important;
                }
                .logout-btn:hover {
                    background: rgba(255, 75, 75, 0.1);
                }
                .loader {
                    width: 48px;
                    height: 48px;
                    border: 5px solid var(--primary);
                    border-bottom-color: transparent;
                    border-radius: 50%;
                    display: inline-block;
                    box-sizing: border-box;
                    animation: rotation 1s linear infinite;
                }
                @keyframes rotation {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

export default Configuration;
