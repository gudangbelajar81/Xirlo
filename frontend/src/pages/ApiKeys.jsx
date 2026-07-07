import React, { useState, useEffect } from 'react';
import { Key, Plus, Trash2, RotateCcw, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { apiCall } from '../api';

export default function ApiKeys() {
  const [keys, setKeys] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [formData, setFormData] = useState({ provider: 'Fonnte', name: '', api_key: '', base_url: 'https://api.fonnte.com/send' });

  const fetchKeys = async () => {
    try {
      const data = await apiCall('/keys');
      setKeys(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      await apiCall('/keys', { method: 'POST', body: JSON.stringify(formData) });
      setShowAdd(false);
      setFormData({ provider: 'Fonnte', name: '', api_key: '', base_url: 'https://api.fonnte.com/send' });
      fetchKeys();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Hapus API Key ini?')) return;
    try {
      await apiCall(`/keys/${id}`, { method: 'DELETE' });
      fetchKeys();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleReset = async (id) => {
    if (!window.confirm('Reset status Limit/Dead menjadi Alive?')) return;
    try {
      await apiCall(`/keys/${id}/reset`, { method: 'PUT' });
      fetchKeys();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="dashboard-layout glass-dark" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px', color: 'var(--text-primary)', height: '100%', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2>Omni-API Gateway</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Manajemen Kunci API & Rotator Anti-Blokir</p>
        </div>
        <button className="btn-primary" onClick={() => setShowAdd(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Plus size={18} /> Tambah API Key
        </button>
      </div>

      {showAdd && (
        <div className="settings-card glass" style={{ padding: '20px' }}>
          <h3>Tambah Kunci API Baru</h3>
          <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label>Provider</label>
                <select 
                  value={formData.provider} 
                  onChange={(e) => {
                    const provider = e.target.value;
                    let base_url = formData.base_url;
                    if (provider === 'Fonnte') base_url = 'https://api.fonnte.com/send';
                    setFormData({...formData, provider, base_url});
                  }}
                  className="auth-input"
                >
                  <option value="Fonnte">Fonnte (WhatsApp)</option>
                  <option value="Custom">Custom / Lainnya</option>
                </select>
              </div>
              <div>
                <label>Nama Akun (Alias)</label>
                <input 
                  type="text" 
                  className="auth-input" 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                  placeholder="Cth: WA Admin 1"
                  required 
                />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label>Endpoint URL</label>
                <input 
                  type="text" 
                  className="auth-input" 
                  value={formData.base_url} 
                  onChange={e => setFormData({...formData, base_url: e.target.value})} 
                  required 
                  readOnly={formData.provider === 'Fonnte'}
                />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label>API Key / Token Rahasia</label>
                <input 
                  type="password" 
                  className="auth-input" 
                  value={formData.api_key} 
                  onChange={e => setFormData({...formData, api_key: e.target.value})} 
                  required 
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button type="button" className="btn-outline" onClick={() => setShowAdd(false)}>Batal</button>
              <button type="submit" className="btn-primary">Simpan Kunci</button>
            </div>
          </form>
        </div>
      )}

      <div className="products-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
        {keys.map(k => (
          <div key={k.id} className="product-card glass" style={{ padding: '20px', borderLeft: `4px solid ${k.status === 'Alive' ? 'var(--success)' : k.status === 'Limit' ? 'var(--warning)' : 'var(--danger)'}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Key size={20} style={{ color: 'var(--accent-color)' }} />
                <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{k.name}</h3>
              </div>
              <span style={{ 
                padding: '4px 8px', 
                borderRadius: '12px', 
                fontSize: '0.75rem', 
                fontWeight: 'bold',
                backgroundColor: k.status === 'Alive' ? 'rgba(46, 125, 50, 0.2)' : k.status === 'Limit' ? 'rgba(237, 108, 2, 0.2)' : 'rgba(211, 47, 47, 0.2)',
                color: k.status === 'Alive' ? 'var(--success)' : k.status === 'Limit' ? 'var(--warning)' : 'var(--danger)',
                display: 'flex', alignItems: 'center', gap: '4px'
              }}>
                {k.status === 'Alive' ? <CheckCircle size={12}/> : k.status === 'Limit' ? <AlertCircle size={12}/> : <XCircle size={12}/>}
                {k.status}
              </span>
            </div>
            
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              <p><strong>Provider:</strong> {k.provider}</p>
              <p><strong>Total Hits:</strong> {k.used_count} request</p>
              <p style={{ marginTop: '8px', opacity: 0.5, wordBreak: 'break-all' }}>{k.base_url}</p>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                onClick={() => handleReset(k.id)} 
                className="btn-outline" 
                style={{ flex: 1, padding: '6px', fontSize: '0.8rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}
                disabled={k.status === 'Alive'}
              >
                <RotateCcw size={14} /> Reset
              </button>
              <button 
                onClick={() => handleDelete(k.id)} 
                style={{ padding: '6px 12px', border: '1px solid var(--danger)', backgroundColor: 'transparent', color: 'var(--danger)', borderRadius: 'var(--border-radius)', cursor: 'pointer' }}
                title="Hapus Kunci"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
        {keys.length === 0 && (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
            <Key size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
            <p>Belum ada Kunci API yang didaftarkan.</p>
          </div>
        )}
      </div>
    </div>
  );
}
