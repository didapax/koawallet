import React, { useState, useEffect } from 'react';
import { motion as Motion } from 'framer-motion';
import { Users, LayoutDashboard, LogOut, TrendingUp, Wallet, ArrowRight, Settings, Info } from 'lucide-react';
import { Link } from 'react-router-dom';

const API_URL = 'http://localhost:3000';

const Dashboard = ({ onLogout }) => {
    const userRole = localStorage.getItem('admin_role') || 'user';
    const token = localStorage.getItem('admin_token');
    const canViewUsers = userRole === 'admin' || userRole === 'oficinista';

    const [stats, setStats] = useState({
        totalUsers: 0,
        volumeToday: 0,
        reserve: {
            totalCacaoStock: 0,
            tokensIssued: 0,
            availableStock: 0,
            totalReserveValueUSD: 0
        }
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                // Fetch reserve
                const reserveRes = await fetch(`${API_URL}/admin/reserve`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const reserveData = await reserveRes.json();

                // Fetch users count (actually we'd need an endpoint or calculate from /admin/users)
                const usersRes = await fetch(`${API_URL}/admin/users`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const usersData = await usersRes.json();

                setStats({
                    totalUsers: usersData.length,
                    volumeToday: 0, // Placeholder for now or calculate from transactions
                    reserve: reserveData
                });
            } catch (err) {
                console.error("Error fetching dashboard stats:", err);
            } finally {
                setLoading(false);
            }
        };

        if (token) fetchStats();
    }, [token]);

    return (
        <div style={{ display: 'flex', minHeight: '100vh' }}>
            {/* Sidebar code... skipped for brevity in target but included in replacement if needed */}
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 15px', color: 'var(--primary)', background: 'var(--primary-glow)', borderRadius: '12px', marginBottom: '10px' }}>
                        <LayoutDashboard size={20} />
                        <span style={{ fontWeight: 500 }}>Dashboard</span>
                    </div>

                    {canViewUsers && (
                        <Link to="/users" style={{ textDecoration: 'none', color: 'inherit' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 15px', color: 'var(--text-muted)', borderRadius: '12px', marginBottom: '10px', transition: 'all 0.3s' }} className="nav-item">
                                <Users size={20} />
                                <span style={{ fontWeight: 500 }}>Usuarios</span>
                            </div>
                        </Link>
                    )}

                    {userRole === 'admin' && (
                        <Link to="/config" style={{ textDecoration: 'none', color: 'inherit' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 15px', color: 'var(--text-muted)', borderRadius: '12px', marginBottom: '10px', transition: 'all 0.3s' }} className="nav-item">
                                <Settings size={20} />
                                <span style={{ fontWeight: 500 }}>Configuración</span>
                            </div>
                        </Link>
                    )}
                </nav>

                <button
                    onClick={onLogout}
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
                <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
                    <div>
                        <h1 style={{ fontSize: '2rem' }}>Bienvenido, <span className="gold-text" style={{ textTransform: 'capitalize' }}>{userRole}</span></h1>
                        <p style={{ color: 'var(--text-muted)' }}>Vista general de las operaciones de KoaWallet</p>
                    </div>
                </header>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '25px', marginBottom: '40px' }}>
                    <StatCard
                        title="Total Usuarios"
                        value={loading ? "..." : stats.totalUsers.toLocaleString()}
                        icon={<Users size={24} />}
                        trend="Clientes registrados"
                    />
                    <StatCard
                        title="Cacao Disponible"
                        value={loading ? "..." : `${stats.reserve.availableStock.toLocaleString()} g`}
                        icon={<Wallet size={24} />}
                        trend="Gramos para la venta"
                    />
                    <StatCard
                        title="Pasivo (Clientes)"
                        value={loading ? "..." : `${stats.reserve.tokensIssued.toLocaleString()} g`}
                        icon={<Info size={24} />}
                        trend="Gramos en manos de clientes"
                    />
                    <StatCard
                        title="Valor Reserva"
                        value={loading ? "..." : `~$${stats.reserve.totalReserveValueUSD.toLocaleString()}`}
                        icon={<TrendingUp size={24} />}
                        trend="Respaldo físico total"
                    />
                </div>

                <div className="glass-card" style={{ padding: '40px', textAlign: 'center' }}>
                    <h2 style={{ marginBottom: '20px' }}>Gestión de Reserva Física</h2>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '30px', maxWidth: '600px', margin: '0 auto 30px' }}>
                        Actualmente tienes <strong className="gold-text">{stats.reserve.totalCacaoStock.toLocaleString()} g</strong> de cacao físico en bóveda.
                        Ajusta este inventario desde la sección de configuración.
                    </p>
                    <Link to="/config" style={{ textDecoration: 'none' }}>
                        <button className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
                            Gestionar Inventario <Settings size={20} />
                        </button>
                    </Link>
                </div>
            </div>

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

const StatCard = ({ title, value, icon, trend }) => (
    <Motion.div whileHover={{ y: -5 }} className="glass-card" style={{ padding: '25px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
            <div style={{ padding: '10px', background: 'var(--primary-glow)', borderRadius: '12px', color: 'var(--primary)' }}>
                {icon}
            </div>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{title}</p>
        <h3 style={{ fontSize: '1.8rem', margin: '5px 0' }}>{value}</h3>
        <p style={{ fontSize: '0.75rem', color: trend.includes('+') ? 'var(--success)' : 'var(--text-muted)' }}>{trend}</p>
    </Motion.div>
);

export default Dashboard;
