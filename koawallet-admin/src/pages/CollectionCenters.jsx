import React, { useState, useEffect, useCallback } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { MapPin, Search, Plus, Edit2, Trash2, Clock, Phone, User, Globe, ChevronLeft, Loader2, Save, X, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import Sidebar from '../components/Sidebar';

const API_URL = 'http://localhost:3000';

const CollectionCenters = () => {
    const [centers, setCenters] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingCenter, setEditingCenter] = useState(null);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const token = localStorage.getItem('admin_token');
    const axiosConfig = React.useMemo(() => ({ headers: { Authorization: `Bearer ${token}` } }), [token]);

    const handleLogout = () => {
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_role');
        window.location.href = '/login';
    };

    const fetchCenters = useCallback(async () => {
        try {
            const response = await axios.get(`${API_URL}/admin/collection-centers`, axiosConfig);
            setCenters(response.data);
        } catch (err) {
            setError(err.response?.data?.error || 'Error al cargar los centros de acopio');
        } finally {
            setLoading(false);
        }
    }, [axiosConfig]);

    useEffect(() => {
        fetchCenters();
    }, [fetchCenters]);

    const handleSave = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData);

        try {
            if (editingCenter) {
                await axios.put(`${API_URL}/admin/collection-centers/${editingCenter.id}`, data, axiosConfig);
                setSuccess('Centro de acopio actualizado correctamente');
            } else {
                await axios.post(`${API_URL}/admin/collection-centers`, data, axiosConfig);
                setSuccess('Centro de acopio creado correctamente');
            }
            setShowModal(false);
            fetchCenters();
        } catch (err) {
            setError(err.response?.data?.error || 'Error al guardar el centro de acopio');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('¿Estás seguro de que deseas eliminar este centro de acopio?')) return;
        try {
            await axios.delete(`${API_URL}/admin/collection-centers/${id}`, axiosConfig);
            fetchCenters();
            setSuccess('Centro de acopio eliminado');
        } catch (err) {
            setError(err.response?.data?.error || 'Error al eliminar el centro de acopio');
        }
    };

    const filteredCenters = centers.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.city.toLowerCase().includes(searchTerm.toLowerCase())
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
                        <h1>Centros de <span className="gold-text">Acopio</span></h1>
                        <p style={{ color: 'var(--text-muted)' }}>Gestiona los puntos de depósito y retiro de cacao</p>
                    </div>
                    <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={() => { setEditingCenter(null); setShowModal(true); }}>
                        <Plus size={20} /> Nuevo Centro
                    </button>
                </div>

                <div className="glass-card" style={{ padding: '20px', marginBottom: '30px' }}>
                    <div style={{ position: 'relative' }}>
                        <Search size={20} style={{ position: 'absolute', left: '15px', top: '12px', color: 'var(--text-muted)' }} />
                        <input
                            type="text"
                            placeholder="Buscar por nombre o ciudad..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ paddingLeft: '50px', background: 'rgba(255,255,255,0.03)' }}
                        />
                    </div>
                </div>

                {error && <div style={{ color: 'var(--error)', marginBottom: '20px' }}>{error}</div>}
                {success && <div style={{ color: 'var(--success)', marginBottom: '20px' }}>{success}</div>}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '25px' }}>
                    {loading ? (
                        <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '100px' }}>
                            <Loader2 className="animate-spin" size={40} color="var(--primary)" />
                        </div>
                    ) : filteredCenters.length === 0 ? (
                        <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '100px', color: 'var(--text-muted)' }}>
                            No se encontraron centros de acopio.
                        </div>
                    ) : filteredCenters.map(center => (
                        <Motion.div key={center.id} whileHover={{ y: -5 }} className="glass-card" style={{ padding: '25px', position: 'relative' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                                <div>
                                    <h3 className="gold-text" style={{ fontSize: '1.4rem', marginBottom: '5px' }}>{center.name}</h3>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                        <Globe size={14} /> {center.city}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <button className="icon-btn" onClick={() => { setEditingCenter(center); setShowModal(true); }}><Edit2 size={18} /></button>
                                    <button className="icon-btn" style={{ color: 'var(--error)' }} onClick={() => handleDelete(center.id)}><Trash2 size={18} /></button>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', fontSize: '0.9rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <MapPin size={16} className="gold-text" /> <span>{center.address}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Clock size={16} className="gold-text" /> <span>{center.operatingHours}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <User size={16} className="gold-text" /> <span>{center.managerName || 'No asignado'}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Phone size={16} className="gold-text" /> <span>{center.phone || 'N/A'}</span>
                                </div>
                            </div>

                            <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ fontSize: '0.85rem' }}>
                                    Inventario: <strong className="gold-text">{center.currentStock} g</strong>
                                </div>
                                {center.googleMapsUrl && (
                                    <a href={center.googleMapsUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--primary)', textDecoration: 'none', fontSize: '0.85rem' }}>
                                        Ver en Maps <ExternalLink size={14} />
                                    </a>
                                )}
                            </div>
                        </Motion.div>
                    ))}
                </div>
            </div>

            {/* Modal Form */}
            <AnimatePresence>
                {showModal && (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }}>
                        <Motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="glass-card"
                            style={{ width: '100%', maxWidth: '600px', padding: '40px', position: 'relative', maxHeight: '90vh', overflowY: 'auto' }}
                        >
                            <button onClick={() => setShowModal(false)} style={{ position: 'absolute', right: '20px', top: '20px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                                <X size={24} />
                            </button>

                            <h2 style={{ marginBottom: '30px' }}>{editingCenter ? 'Editar Centro' : 'Nuevo Centro de Acopio'}</h2>

                            <form onSubmit={handleSave}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
                                    <div style={{ gridColumn: 'span 2' }}>
                                        <label className="label">Nombre del Centro</label>
                                        <input name="name" defaultValue={editingCenter?.name} required placeholder="Ej: Acopio Central Quevedo" />
                                    </div>
                                    <div style={{ gridColumn: 'span 2' }}>
                                        <label className="label">Dirección Exacta</label>
                                        <input name="address" defaultValue={editingCenter?.address} required placeholder="Calle 123 y Ave. Principal" />
                                    </div>
                                    <div>
                                        <label className="label">Ciudad</label>
                                        <input name="city" defaultValue={editingCenter?.city} required placeholder="Quevedo" />
                                    </div>
                                    <div>
                                        <label className="label">Teléfono</label>
                                        <input name="phone" defaultValue={editingCenter?.phone} placeholder="+593 ..." />
                                    </div>
                                    <div>
                                        <label className="label">Responsable (Manager)</label>
                                        <input name="managerName" defaultValue={editingCenter?.managerName} placeholder="Nombre del encargado" />
                                    </div>
                                    <div>
                                        <label className="label">Horario de Atención</label>
                                        <input name="operatingHours" defaultValue={editingCenter?.operatingHours} required placeholder="Lun-Vie 08:00 - 17:00" />
                                    </div>
                                    <div>
                                        <label className="label">Latitud (Opcional)</label>
                                        <input name="latitude" type="number" step="any" defaultValue={editingCenter?.latitude} placeholder="-1.0234" />
                                    </div>
                                    <div>
                                        <label className="label">Longitud (Opcional)</label>
                                        <input name="longitude" type="number" step="any" defaultValue={editingCenter?.longitude} placeholder="-79.4567" />
                                    </div>
                                    <div style={{ gridColumn: 'span 2' }}>
                                        <label className="label">Google Maps URL</label>
                                        <input name="googleMapsUrl" defaultValue={editingCenter?.googleMapsUrl} placeholder="https://maps.google.com/..." />
                                    </div>
                                    {editingCenter && (
                                        <div>
                                            <label className="label">Stock Actual (g)</label>
                                            <input name="currentStock" type="number" step="any" defaultValue={editingCenter?.currentStock} />
                                        </div>
                                    )}
                                </div>

                                <button type="submit" className="btn-primary" style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}>
                                    <Save size={20} /> {editingCenter ? 'Guardar Cambios' : 'Crear Centro de Acopio'}
                                </button>
                            </form>
                        </Motion.div>
                    </div>
                )}
            </AnimatePresence>

            <style>{`
                .label { display: block; font-size: 0.8rem; color: var(--text-muted); margin-bottom: 8px; }
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
            `}</style>
        </div>
    );
};


const SettingsIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
);

export default CollectionCenters;
