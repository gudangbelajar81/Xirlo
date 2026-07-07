import React, { useState } from 'react';
import { Shield, Key, Copy, CheckCircle } from 'lucide-react';
import { apiCall } from '../api';

export default function VendorPortal() {
  const [formData, setFormData] = useState({
    machine_id: '',
    tier: 'PRO',
    app_code: 'APP_KASIR',
    features: {
      feat_retail: true,
      feat_reports: true,
      feat_fnb: false,
      feat_shift_audit: true,
      feat_multi_user: true
    },
    duration: '365' // in days
  });
  
  const [generatedKey, setGeneratedKey] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleCheckbox = (feat) => {
    setFormData({
      ...formData,
      features: { ...formData.features, [feat]: !formData.features[feat] }
    });
  };

  const generateLicense = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Calculate expiry date
      let expiry_date = null;
      if (formData.duration !== 'lifetime') {
        const d = new Date();
        d.setDate(d.getDate() + parseInt(formData.duration));
        expiry_date = d.toISOString();
      }

      // Collect active features
      const activeFeatures = Object.keys(formData.features).filter(k => formData.features[k]);

      const res = await apiCall('/vendor/generate-key', {
        method: 'POST',
        body: JSON.stringify({
          machine_id: formData.machine_id,
          tier: formData.tier,
          app_code: formData.app_code,
          features: activeFeatures,
          expiry_date: expiry_date
        })
      });

      setGeneratedKey(res.token);
      setCopied(false);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="dashboard-layout glass-dark" style={{ padding: '24px', display: 'flex', justifyContent: 'center', color: 'var(--text-primary)', height: '100%', overflowY: 'auto' }}>
      <div style={{ maxWidth: '800px', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <Shield size={48} style={{ color: 'var(--warning)', marginBottom: '16px' }} />
          <h1 style={{ color: 'var(--warning)', letterSpacing: '2px', textTransform: 'uppercase' }}>Portal Vendor HT</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Mesin Pencetak Kunci Lisensi (Rahasia & Terenkripsi)</p>
        </div>

        <div className="settings-card glass" style={{ borderTop: '4px solid var(--warning)' }}>
          <form onSubmit={generateLicense} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ color: 'var(--warning)' }}>Machine ID Klien *</label>
                <input 
                  type="text" 
                  className="auth-input" 
                  placeholder="Contoh: HT-98A7B6C5"
                  value={formData.machine_id}
                  onChange={e => setFormData({...formData, machine_id: e.target.value.toUpperCase()})}
                  required
                  style={{ fontSize: '1.2rem', letterSpacing: '1px', border: '1px solid var(--warning)' }}
                />
              </div>

              <div>
                <label>Jenis Aplikasi</label>
                <select 
                  className="auth-input" 
                  value={formData.app_code}
                  onChange={e => setFormData({...formData, app_code: e.target.value})}
                >
                  <option value="APP_KASIR">Aplikasi Kasir (Default)</option>
                  <option value="APP_RESTO">Aplikasi Restoran / Cafe</option>
                  <option value="APP_KLINIK">Aplikasi Klinik</option>
                </select>
              </div>

              <div>
                <label>Durasi Lisensi</label>
                <select 
                  className="auth-input" 
                  value={formData.duration}
                  onChange={e => setFormData({...formData, duration: e.target.value})}
                >
                  <option value="30">1 Bulan (30 Hari)</option>
                  <option value="365">1 Tahun (365 Hari)</option>
                  <option value="lifetime">Seumur Hidup (Lifetime)</option>
                </select>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '12px', color: 'var(--accent-color)' }}>Modul / Fitur yang Dibuka:</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', background: 'var(--bg-primary)', padding: '16px', borderRadius: 'var(--border-radius)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={formData.features.feat_retail} onChange={() => handleCheckbox('feat_retail')} />
                  Gudang Retail (Kartu Stok & Min Stok)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={formData.features.feat_reports} onChange={() => handleCheckbox('feat_reports')} />
                  Laporan Keuangan & Analitik Cerdas
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={formData.features.feat_shift_audit} onChange={() => handleCheckbox('feat_shift_audit')} />
                  Sistem Shift & Audit Brankas
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={formData.features.feat_multi_user} onChange={() => handleCheckbox('feat_multi_user')} />
                  Multi-Akun (Hak Akses Karyawan)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={formData.features.feat_fnb} onChange={() => handleCheckbox('feat_fnb')} />
                  Modul F&B (Meja & Dapur)
                </label>
              </div>
            </div>

            <button type="submit" className="btn-primary" disabled={loading} style={{ background: 'var(--warning)', color: '#000', fontSize: '1.1rem', padding: '16px', marginTop: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
              <Key size={20} />
              {loading ? 'Memproses Enkripsi...' : 'CETAK KUNCI LISENSI'}
            </button>
          </form>
        </div>

        {generatedKey && (
          <div className="settings-card glass" style={{ marginTop: '24px', background: 'rgba(46, 125, 50, 0.1)', border: '1px solid var(--success)' }}>
            <h3 style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <CheckCircle size={24} /> Kunci Berhasil Dicetak!
            </h3>
            <p style={{ marginBottom: '12px', fontSize: '0.9rem' }}>Silakan berikan teks di bawah ini kepada Klien Anda.</p>
            
            <div style={{ position: 'relative' }}>
              <textarea 
                readOnly
                value={generatedKey}
                style={{ width: '100%', height: '120px', background: '#000', color: '#0f0', fontFamily: 'monospace', padding: '16px', borderRadius: '8px', border: 'none', resize: 'none' }}
              />
              <button 
                onClick={copyToClipboard}
                style={{ position: 'absolute', top: '12px', right: '12px', background: 'var(--success)', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
              >
                {copied ? <><CheckCircle size={16}/> Tersalin!</> : <><Copy size={16}/> Salin</>}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
