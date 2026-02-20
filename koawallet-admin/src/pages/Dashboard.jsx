import React from 'react';
import { motion as Motion } from 'framer-motion';
import { Users, LayoutDashboard, LogOut, TrendingUp, Wallet, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const Dashboard = ({ onLogout }) => {
    const userRole = localStorage.getItem('admin_role') || 'user';
    const canViewUsers = userRole === 'admin' || userRole === 'oficinista';

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
                    <StatCard title="Total Usuarios" value="1,284" icon={<Users size={24} />} trend="+12% este mes" />
                    <StatCard title="Volumen Hoy" value="$45,230" icon={<TrendingUp size={24} />} trend="+5.4%" />
                    <StatCard title="Reservas Cacao" value="12,400 g" icon={<Wallet size={24} />} trend="Estable" />
                </div>

                <div className="glass-card" style={{ padding: '40px', textAlign: 'center' }}>
                    <h2 style={{ marginBottom: '20px' }}>Gestión de Personal y Clientes</h2>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '30px', maxWidth: '600px', margin: '0 auto 30px' }}>
                        Utiliza el apartado de gestión de usuarios para crear nuevos cajeros, oficinistas o administradores, así como para gestionar los estados de los clientes.
                    </p>
                    <Link to="/users" style={{ textDecoration: 'none' }}>
                        <button className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
                            Ir a Gestión de Usuarios <ArrowRight size={20} />
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
