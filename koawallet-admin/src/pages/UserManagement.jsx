import React, { useState, useEffect } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { Users, Search, Plus, Edit2, Ban, CheckCircle, X, ChevronLeft, Loader2, Save, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import Sidebar from '../components/Sidebar';

const API_URL = 'http://localhost:3000';

const UserManagement = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingUser, setEditingUser] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [error, setError] = useState('');

    const token = localStorage.getItem('admin_token');
    const userRole = localStorage.getItem('admin_role');
    const isAdmin = userRole === 'admin';
    const canCreateUsers = userRole === 'admin'; // Restrict creation to admin only
    const axiosConfig = { headers: { Authorization: `Bearer ${token}` } };

    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' });
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [passwordError, setPasswordError] = useState('');
    const [passwordSuccess, setPasswordSuccess] = useState('');

    const handleLogout = () => {
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_role');
        window.location.href = '/login';
    };

    useEffect(() => {
        fetchUsers();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchUsers = async () => {
        try {
            const response = await axios.get(`${API_URL}/admin/users`, axiosConfig);
            setUsers(response.data);
        } catch {
            setError('Error al cargar usuarios');
        } finally {
            setLoading(false);
        }
    };

    const handleStatusToggle = async (user) => {
        if (!isAdmin) {
            alert('Solo el administrador puede bloquear o desbloquear usuarios.');
            return;
        }
        const newStatus = user.status === 'active' ? 'blocked' : 'active';
        try {
            await axios.put(`${API_URL}/admin/users/${user.id}`, { ...user, status: newStatus }, axiosConfig);
            fetchUsers();
        } catch {
            alert('Error al cambiar estado');
        }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        setPasswordError('');
        setPasswordSuccess('');

        if (passwordForm.new !== passwordForm.confirm) {
            setPasswordError('Las nuevas contraseñas no coinciden');
            return;
        }

        setPasswordLoading(true);
        try {
            await axios.post(`${API_URL}/auth/change-password`, {
                currentPassword: passwordForm.current,
                newPassword: passwordForm.new
            }, axiosConfig);
            setPasswordSuccess('Contraseña actualizada con éxito');
            setTimeout(() => {
                setShowPasswordModal(false);
                setPasswordForm({ current: '', new: '', confirm: '' });
                setPasswordSuccess('');
            }, 2000);
        } catch (err) {
            setPasswordError(err.response?.data?.error || 'Error al cambiar la contraseña');
        } finally {
            setPasswordLoading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setError('');
        const userData = Object.fromEntries(new FormData(e.target));

        try {
            if (editingUser?.id) {
                await axios.put(`${API_URL}/admin/users/${editingUser.id}`, userData, axiosConfig);
            } else {
                await axios.post(`${API_URL}/admin/users`, userData, axiosConfig);
            }
            setShowModal(false);
            fetchUsers();
        } catch (err) {
            setError(err.response?.data?.error || 'Error al guardar usuario');
        }
    };

    const filteredUsers = users.filter(u =>
        u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.name && u.name.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-dark)' }}>
            <Sidebar onLogout={handleLogout} />

            <div style={{ flex: 1, padding: '40px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
                    <div>
                        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--primary)', textDecoration: 'none', fontSize: '0.9rem', marginBottom: '10px' }}>
                            <ChevronLeft size={16} /> Volver al Dashboard
                        </Link>
                        <h1>Gestión de <span className="gold-text">Usuarios</span></h1>
                    </div>
                    {canCreateUsers && (
                        <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={() => { setEditingUser(null); setShowModal(true); }}>
                            <Plus size={20} /> Nuevo Usuario
                        </button>
                    )}
                </div>

                <div className="glass-card" style={{ padding: '20px', marginBottom: '30px' }}>
                    <div style={{ position: 'relative' }}>
                        <Search size={20} style={{ position: 'absolute', left: '15px', top: '12px', color: 'var(--text-muted)' }} />
                        <input
                            type="text"
                            placeholder="Buscar por email o nombre..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ paddingLeft: '50px', background: 'rgba(255,255,255,0.03)' }}
                        />
                    </div>
                </div>

                <div className="glass-card" style={{ overflow: 'hidden' }}>
                    {error && (
                        <div style={{ background: 'rgba(244, 67, 54, 0.1)', color: 'var(--error)', padding: '15px', borderRadius: '12px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <XCircle size={20} /> {error}
                        </div>
                    )}

                    {loading ? (
                        <div style={{ padding: '100px', textAlign: 'center' }}><Loader2 className="animate-spin" size={40} color="var(--primary)" /></div>
                    ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--glass-border)' }}>
                                    <th style={{ padding: '20px' }}>Usuario</th>
                                    <th style={{ padding: '20px' }}>Rol</th>
                                    <th style={{ padding: '20px' }}>Estado</th>
                                    <th style={{ padding: '20px' }}>Balance</th>
                                    <th style={{ padding: '20px', textAlign: 'right' }}>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredUsers.map(user => (
                                    <tr key={user.id} style={{ borderBottom: '1px solid var(--glass-border)', transition: 'background 0.3s' }} className="table-row">
                                        <td style={{ padding: '20px' }}>
                                            <div style={{ fontWeight: 500 }}>{user.name || 'Sin nombre'}</div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{user.email}</div>
                                        </td>
                                        <td style={{ padding: '20px' }}>
                                            <span style={{
                                                padding: '4px 10px',
                                                borderRadius: '6px',
                                                fontSize: '0.75rem',
                                                background: user.role === 'admin' ? 'rgba(212, 175, 55, 0.1)' : 'rgba(255,255,255,0.05)',
                                                color: user.role === 'admin' ? 'var(--primary)' : 'var(--text-muted)',
                                                border: `1px solid ${user.role === 'admin' ? 'var(--primary)' : 'transparent'}`
                                            }}>
                                                {user.role.toUpperCase()}
                                            </span>
                                        </td>
                                        <td style={{ padding: '20px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: user.status === 'active' ? 'var(--success)' : 'var(--error)' }}>
                                                {user.status === 'active' ? <CheckCircle size={16} /> : <Ban size={16} />}
                                                <span style={{ fontSize: '0.9rem' }}>{user.status === 'active' ? 'Activo' : 'Bloqueado'}</span>
                                            </div>
                                        </td>
                                        <td style={{ padding: '20px' }}>
                                            <div style={{ fontSize: '0.9rem' }}>${user.fiatBalance.toFixed(2)}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--secondary)' }}>{user.cacaoBalance.toFixed(2)}g Cacao</div>
                                        </td>
                                        <td style={{ padding: '20px', textAlign: 'right' }}>
                                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                                                <button className="icon-btn" title="Editar" onClick={() => { setEditingUser(user); setShowModal(true); }}><Edit2 size={18} /></button>
                                                {isAdmin && (
                                                    <button
                                                        className="icon-btn"
                                                        style={{ color: user.status === 'active' ? 'var(--error)' : 'var(--success)' }}
                                                        onClick={() => handleStatusToggle(user)}
                                                        title={user.status === 'active' ? 'Bloquear' : 'Desbloquear'}
                                                    >
                                                        {user.status === 'active' ? <Ban size={18} /> : <CheckCircle size={18} />}
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Modal User Edit/Create */}
            <AnimatePresence>
                {showModal && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }}>
                        <Motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="glass-card"
                            style={{ width: '100%', maxWidth: '500px', padding: '40px', position: 'relative' }}
                        >
                            <button onClick={() => setShowModal(false)} style={{ position: 'absolute', right: '20px', top: '20px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                                <X size={24} />
                            </button>

                            <h2 style={{ marginBottom: '30px' }}>{editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}</h2>

                            <form onSubmit={handleSave}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                                    <div style={{ gridColumn: 'span 2' }}>
                                        <label className="label">Email</label>
                                        <input name="email" defaultValue={editingUser?.email} required type="email" readOnly={!!editingUser} />
                                    </div>
                                    {!editingUser && (
                                        <div style={{ gridColumn: 'span 2' }}>
                                            <label className="label">Contraseña</label>
                                            <input name="password" required type="password" />
                                        </div>
                                    )}
                                    <div>
                                        <label className="label">Nombre</label>
                                        <input name="name" defaultValue={editingUser?.name} />
                                    </div>
                                    <div>
                                        <label className="label">Rol</label>
                                        <select name="role" defaultValue={editingUser?.role || 'user'}>
                                            <option value="user">Usuario</option>
                                            <option value="admin">Administrador</option>
                                            <option value="cajero">Cajero</option>
                                            <option value="oficinista">Oficinista</option>
                                        </select>
                                    </div>
                                    {editingUser && (
                                        <>
                                            <div>
                                                <label className="label">Saldo USD</label>
                                                <input name="fiatBalance" type="number" step="0.01" defaultValue={editingUser?.fiatBalance} />
                                            </div>
                                            <div>
                                                <label className="label">Gramos Cacao</label>
                                                <input name="cacaoBalance" type="number" step="0.0001" defaultValue={editingUser?.cacaoBalance} />
                                            </div>
                                        </>
                                    )}
                                </div>

                                {error && <div style={{ color: 'var(--error)', marginBottom: '20px', textAlign: 'center' }}>{error}</div>}

                                <button type="submit" className="btn-primary" style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}>
                                    <Save size={20} /> Guardar Cambios
                                </button>
                            </form>
                        </Motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Change Password Modal */}
            <AnimatePresence>
                {showPasswordModal && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100, padding: '20px' }}>
                        <Motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="glass-card"
                            style={{ width: '100%', maxWidth: '400px', padding: '40px', position: 'relative' }}
                        >
                            <button onClick={() => setShowPasswordModal(false)} style={{ position: 'absolute', right: '20px', top: '20px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                                <X size={24} />
                            </button>

                            <h2 style={{ marginBottom: '30px' }} className="gold-text">Cambiar Contraseña</h2>

                            <form onSubmit={handleChangePassword}>
                                <div style={{ marginBottom: '15px' }}>
                                    <label className="label">Contraseña Actual</label>
                                    <input
                                        type="password"
                                        required
                                        value={passwordForm.current}
                                        onChange={(e) => setPasswordForm({ ...passwordForm, current: e.target.value })}
                                    />
                                </div>
                                <div style={{ marginBottom: '15px' }}>
                                    <label className="label">Nueva Contraseña</label>
                                    <input
                                        type="password"
                                        required
                                        value={passwordForm.new}
                                        onChange={(e) => setPasswordForm({ ...passwordForm, new: e.target.value })}
                                    />
                                </div>
                                <div style={{ marginBottom: '25px' }}>
                                    <label className="label">Confirmar Nueva Contraseña</label>
                                    <input
                                        type="password"
                                        required
                                        value={passwordForm.confirm}
                                        onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                                    />
                                </div>

                                {passwordError && <div style={{ color: 'var(--error)', marginBottom: '20px', textAlign: 'center' }}>{passwordError}</div>}
                                {passwordSuccess && <div style={{ color: 'var(--success)', marginBottom: '20px', textAlign: 'center' }}>{passwordSuccess}</div>}

                                <button type="submit" className="btn-primary" style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }} disabled={passwordLoading}>
                                    {passwordLoading ? <Loader2 className="animate-spin" size={20} /> : <><Save size={20} /> Actualizar Clave</>}
                                </button>
                            </form>
                        </Motion.div>
                    </div>
                )}
            </AnimatePresence>

            <style>{`
        .table-row:hover { background: rgba(255,255,255,0.03); }
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


export default UserManagement;
