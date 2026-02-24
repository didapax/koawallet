import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
    Users,
    LayoutDashboard,
    LogOut,
    TrendingUp,
    Wallet,
    Settings,
    MapPin,
    ClipboardList,
    CreditCard
} from 'lucide-react';
import { hasPermission } from '../utils/permissions';

const Sidebar = ({ onLogout, variant = 'full' }) => {
    const userRole = localStorage.getItem('admin_role') || 'user';
    const location = useLocation();

    const menuItems = [
        { path: '/', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
        { path: '/users', label: 'Usuarios', icon: <Users size={20} /> },
        { path: '/config', label: 'Configuración', icon: <Settings size={20} /> },
        { path: '/collection-centers', label: 'Centros de Acopio', icon: <MapPin size={20} /> },
        { path: '/physical-deposits', label: 'Depósitos Físicos', icon: <TrendingUp size={20} /> },
        { path: '/cashier', label: 'Cola del Cajero', icon: <ClipboardList size={20} /> },
        { path: '/payment-methods', label: 'Métodos de Pago', icon: <CreditCard size={20} /> },
        { path: '/treasury', label: 'Tesorería', icon: <Wallet size={20} /> },
    ];

    const filteredItems = menuItems.filter(item => hasPermission(userRole, item.path));

    const isSlim = variant === 'slim';

    return (
        <div className="glass-card" style={{
            width: isSlim ? '80px' : '280px',
            margin: '20px',
            padding: isSlim ? '30px 10px' : '30px 20px',
            display: 'flex',
            flexDirection: 'column',
            borderRadius: '24px',
            transition: 'width 0.3s ease',
            alignItems: isSlim ? 'center' : 'stretch',
            minHeight: 'calc(100vh - 40px)',
            position: 'sticky',
            top: '20px'
        }}>
            <div style={{ marginBottom: '40px', padding: isSlim ? '0' : '0 10px', textAlign: isSlim ? 'center' : 'left' }}>
                <h2 className="gold-text" style={{ fontSize: isSlim ? '1rem' : '1.5rem' }}>{isSlim ? 'KW' : 'KoaWallet'}</h2>
                {!isSlim && <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>ADMIN PANEL</p>}
            </div>

            <nav style={{ flex: 1, width: '100%', display: 'flex', flexDirection: 'column', alignItems: isSlim ? 'center' : 'stretch', gap: '10px' }}>
                {filteredItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                        <Link key={item.path} to={item.path} style={{ textDecoration: 'none', color: 'inherit', width: isSlim ? 'auto' : '100%' }}>
                            <div
                                className="nav-item"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: isSlim ? 'center' : 'flex-start',
                                    gap: isSlim ? '0' : '12px',
                                    padding: '12px 15px',
                                    color: isActive ? 'var(--primary)' : 'var(--text-muted)',
                                    background: isActive ? 'var(--primary-glow)' : 'transparent',
                                    borderRadius: '12px',
                                    transition: 'all 0.3s'
                                }}
                            >
                                {item.icon}
                                {!isSlim && <span style={{ fontWeight: 500 }}>{item.label}</span>}
                            </div>
                        </Link>
                    );
                })}
            </nav>

            <button
                onClick={onLogout}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: isSlim ? 'center' : 'flex-start',
                    gap: isSlim ? '0' : '12px',
                    padding: '12px 15px',
                    color: '#ff4b4b',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    borderRadius: '12px',
                    marginTop: 'auto',
                    width: '100%'
                }}
                className="logout-btn"
            >
                <LogOut size={20} />
                {!isSlim && <span style={{ fontWeight: 500 }}>Cerrar Sesión</span>}
            </button>

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

export default Sidebar;
