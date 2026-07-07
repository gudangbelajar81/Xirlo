import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, KeyRound, Lock, Trash2, CheckCircle, Store, PaintBucket, ShieldCheck, Users, Webhook } from 'lucide-react';
import { apiCall } from '../api';

export default function Settings({ appSettings, onSettingsChange, machineId, license }) {
  const [activeTab, setActiveTab] = useState('profil');
  const [appName, setAppName] = useState(appSettings?.app_name || '');
  const [logoUrl, setLogoUrl] = useState(appSettings?.logo_url || '');
  const [phoneNumber, setPhoneNumber] = useState(appSettings?.phone_number || '');
  const [themeMode, setThemeMode] = useState(appSettings?.theme_mode || 'light');
  const [themeColor, setThemeColor] = useState(appSettings?.theme_color || '#A0522D');
  const [borderRadius, setBorderRadius] = useState(appSettings?.border_radius || '12px');
  const [fontFamily, setFontFamily] = useState(appSettings?.font_family || "'Inter', sans-serif");
  const [marginAlertThreshold, setMarginAlertThreshold] = useState(appSettings?.margin_alert_threshold ?? 10);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const [newAdmin, setNewAdmin] = useState({ username: '', password: '', role: 'admin' });
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [adminMsg, setAdminMsg] = useState('');
  const [uploading, setUploading] = useState(false);
  const [newLicenseKey, setNewLicenseKey] = useState('');
  const [licenseMsg, setLicenseMsg] = useState('');

  // API Keys State
  const [apiKeys, setApiKeys] = useState([]);
  const [newKey, setNewKey] = useState({ provider: 'fonnte', name: '', api_key: '', base_url: 'https://api.fonnte.com/send' });
  const [keyMsg, setKeyMsg] = useState('');

  React.useEffect(() => {
    fetchApiKeys();
  }, []);

  const fetchApiKeys = async () => {
    try {
      const data = await apiCall('/keys');
      setApiKeys(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddKey = async (e) => {
    e.preventDefault();
    try {
      await apiCall('/keys', { method: 'POST', body: JSON.stringify(newKey) });
      setKeyMsg('Kunci berhasil ditambahkan!');
      setNewKey({ provider: 'fonnte', name: '', api_key: '', base_url: 'https://api.fonnte.com/send' });
      fetchApiKeys();
      setTimeout(() => setKeyMsg(''), 3000);
    } catch (err) {
      setKeyMsg('Gagal: ' + err.message);
    }
  };

  const handleDeleteKey = async (id) => {
    if (!window.confirm('Hapus kunci ini?')) return;
    try {
      await apiCall(`/keys/${id}`, { method: 'DELETE' });
      fetchApiKeys();
    } catch (err) {
      alert('Gagal menghapus');
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const body = new FormData();
      body.append('image', file);
      const res = await apiCall('/upload', { method: 'POST', body });
      setLogoUrl(res.url);
    } catch (err) {
      alert('Upload gagal: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiCall('/settings', {
        method: 'PUT',
        body: JSON.stringify({ 
          app_name: appName, 
          logo_url: logoUrl, 
          theme_mode: themeMode, 
          phone_number: phoneNumber, 
          margin_alert_threshold: Number(marginAlertThreshold),
          theme_color: themeColor,
          border_radius: borderRadius,
          font_family: fontFamily
        })
      });
      setMsg('Pengaturan berhasil disimpan!');
      onSettingsChange({ 
        ...appSettings, 
        app_name: appName, 
        logo_url: logoUrl, 
        theme_mode: themeMode, 
        phone_number: phoneNumber, 
        margin_alert_threshold: Number(marginAlertThreshold),
        theme_color: themeColor,
        border_radius: borderRadius,
        font_family: fontFamily
      });
      setTimeout(() => setMsg(''), 3000);
    } catch (err) {
      setMsg('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    try {
      await apiCall('/users', {
        method: 'POST',
        body: JSON.stringify(newAdmin)
      });
      setAdminMsg('Admin berhasil dibuat!');
      setNewAdmin({ username: '', password: '', role: 'admin' });
      setTimeout(() => setAdminMsg(''), 3000);
    } catch (err) {
      setAdminMsg('Error: ' + err.message);
    }
  };

  return (
    <div className="settings-layout">
      <h2>Pengaturan Aplikasi</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>Konfigurasi pintar untuk menyesuaikan toko Anda.</p>

      <div className="settings-container">
        <div className="settings-sidebar">
          <button className={`settings-tab ${activeTab === 'profil' ? 'active' : ''}`} onClick={() => setActiveTab('profil')}>
            <Store size={18} /> Profil Toko
          </button>
          <button className={`settings-tab ${activeTab === 'tema' ? 'active' : ''}`} onClick={() => setActiveTab('tema')}>
            <PaintBucket size={18} /> Tema & Tampilan
          </button>
          <button className={`settings-tab ${activeTab === 'lisensi' ? 'active' : ''}`} onClick={() => setActiveTab('lisensi')}>
            <ShieldCheck size={18} /> Lisensi & Keamanan
          </button>
          <button className={`settings-tab ${activeTab === 'staf' ? 'active' : ''}`} onClick={() => setActiveTab('staf')}>
            <Users size={18} /> Staf & Karyawan
          </button>
          <button className={`settings-tab ${activeTab === 'api' ? 'active' : ''}`} onClick={() => setActiveTab('api')}>
            <Webhook size={18} /> Pusat Integrasi
          </button>
        </div>

        <div className="settings-content">
          {activeTab === 'profil' && (
            <div className="settings-card glass" style={{ border: 'none', padding: 0, marginBottom: 0 }}>
              <h3><Store size={20} /> Profil Toko</h3>
              {msg && <div style={{ color: 'var(--success)', marginBottom: '16px' }}>{msg}</div>}
              <form onSubmit={handleSaveSettings}>
                <div className="input-group">
                  <label>Nama Aplikasi / Toko</label>
                  <input type="text" value={appName} onChange={(e) => setAppName(e.target.value)} required />
                </div>
                <div className="input-group">
                  <label>Logo Aplikasi</label>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    {logoUrl ? (
                      <img src={logoUrl} alt="Logo" style={{ width: '60px', height: '60px', borderRadius: `var(--border-radius)`, objectFit: 'contain', backgroundColor: 'var(--bg-secondary)' }} />
                    ) : (
                      <div style={{ width: '60px', height: '60px', borderRadius: `var(--border-radius)`, backgroundColor: 'var(--bg-secondary)', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Kosong</div>
                    )}
                    <input type="file" accept="image/*" onChange={handleLogoUpload} disabled={uploading} style={{ flex: 1, padding: '10px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: `var(--border-radius)` }} />
                  </div>
                  {uploading && <small style={{ color: 'var(--accent-color)' }}>Mengunggah logo...</small>}
                </div>
                <div className="input-group">
                  <label>Nomor Telepon Toko (Opsional)</label>
                  <input type="text" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="Misal: 08123456789" />
                </div>
                <button type="submit" className="btn-primary" style={{ marginTop: '20px', width: '100%' }} disabled={loading}>
                  {loading ? 'Menyimpan...' : 'Simpan Profil Toko'}
                </button>
              </form>
            </div>
          )}

          {activeTab === 'tema' && (
            <div className="settings-card glass" style={{ border: 'none', padding: 0, marginBottom: 0 }}>
              <h3><PaintBucket size={20} /> Tema & Tampilan</h3>
              {msg && <div style={{ color: 'var(--success)', marginBottom: '16px' }}>{msg}</div>}
              <form onSubmit={handleSaveSettings}>
                <div className="settings-grid">
                  <div className="input-group" style={{ opacity: license?.features?.includes('feat_custom_theme') ? 1 : 0.6, position: 'relative' }}>
                    <label>Tema Dasar (Mode Terang/Gelap)</label>
                    <select value={themeMode} onChange={(e) => setThemeMode(e.target.value)} style={{ width: '100%', padding: '14px', borderRadius: `var(--border-radius)`, border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
                      <option value="light">Terang (Light)</option>
                      <option value="dark">Gelap (Dark)</option>
                    </select>
                  </div>
                </div>

                <div style={{ marginTop: '24px', padding: '16px', backgroundColor: 'var(--bg-primary)', borderRadius: `var(--border-radius)`, border: '1px solid var(--border-color)', position: 'relative', opacity: license?.features?.includes('feat_custom_theme') ? 1 : 0.6 }}>
                  {!license?.features?.includes('feat_custom_theme') && (
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10, cursor: 'not-allowed' }} onClick={() => alert('🔒 FITUR PREMIUM BRANDING TERKUNCI\n\nSilakan upgrade ke Premium untuk mengustomisasi Warna, Bentuk, dan Font toko Anda!')}></div>
                  )}
                  <h4 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    🎨 Theme Builder Pro
                    {!license?.features?.includes('feat_custom_theme') && <Lock size={16} color="var(--warning)" />}
                  </h4>
                  
                  <div className="settings-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                    <div className="input-group">
                      <label>Warna Aksen (Brand)</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <input type="color" value={themeColor} onChange={(e) => setThemeColor(e.target.value)} style={{ width: '40px', height: '40px', padding: '0', border: 'none', borderRadius: `var(--border-radius)`, cursor: 'pointer' }} disabled={!license?.features?.includes('feat_custom_theme')} />
                        <input type="text" value={themeColor} onChange={(e) => setThemeColor(e.target.value)} style={{ flex: 1, padding: '10px', borderRadius: `var(--border-radius)`, border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }} disabled={!license?.features?.includes('feat_custom_theme')} />
                      </div>
                    </div>
                    <div className="input-group">
                      <label>Bentuk Tampilan</label>
                      <select value={borderRadius} onChange={(e) => setBorderRadius(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: `var(--border-radius)`, border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }} disabled={!license?.features?.includes('feat_custom_theme')}>
                        <option value="0px">Kaku (Sharp)</option>
                        <option value="8px">Standar (Rounded)</option>
                        <option value="16px">Luwes (Smooth)</option>
                        <option value="9999px">Bulat (Pill)</option>
                      </select>
                    </div>
                    <div className="input-group">
                      <label>Gaya Huruf (Font)</label>
                      <select value={fontFamily} onChange={(e) => setFontFamily(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: `var(--border-radius)`, border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }} disabled={!license?.features?.includes('feat_custom_theme')}>
                        <option value="'Inter', sans-serif">Modern (Inter)</option>
                        <option value="'Roboto', sans-serif">Klasik (Roboto)</option>
                        <option value="'Poppins', sans-serif">Playful (Poppins)</option>
                        <option value="'Playfair Display', serif">Elegan (Playfair)</option>
                        <option value="monospace">Teknikal (Monospace)</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="input-group" style={{ marginTop: '24px' }}>
                  <label>Batas Keuntungan (Margin) Detektif HPP (%)</label>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input type="number" value={marginAlertThreshold} onChange={(e) => setMarginAlertThreshold(e.target.value)} required min="1" max="100" style={{ maxWidth: '100px' }} />
                    <span>%</span>
                  </div>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', opacity: 0.7 }}>Produk dengan keuntungan di bawah persentase ini akan ditandai oleh AI margin monitor di Dashboard.</p>
                </div>
                
                <button type="submit" className="btn-primary" style={{ marginTop: '20px', width: '100%' }} disabled={loading}>
                  {loading ? 'Menyimpan...' : 'Simpan Pengaturan Tema'}
                </button>
              </form>
            </div>
          )}

          {activeTab === 'lisensi' && (
            <div className="settings-card glass" style={{ border: 'none', padding: 0, marginBottom: 0 }}>
              <h3 style={{ color: 'var(--accent-color)' }}><KeyRound size={20} /> Lisensi & Hardware ID</h3>
              {licenseMsg && <div style={{ color: 'var(--success)', marginBottom: '16px' }}>{licenseMsg}</div>}
              
              <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: 'var(--bg-secondary)', borderRadius: `var(--border-radius)`, border: '1px solid var(--border-color)' }}>
                <p style={{ margin: '0 0 8px 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>ID Hardware Komputer Ini:</p>
                <code style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--accent-color)' }}>{machineId || 'Sedang memuat...'}</code>
                <p style={{ margin: '8px 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Berikan ID Hardware ini ke Pabrik Kunci untuk mencetak lisensi baru.</p>
              </div>

              <form onSubmit={async (e) => {
                e.preventDefault();
                try {
                  await apiCall('/license/activate', { method: 'POST', body: JSON.stringify({ key: newLicenseKey }) });
                  setLicenseMsg('Lisensi berhasil diupgrade! Halaman akan direfresh...');
                  setTimeout(() => window.location.reload(), 2000);
                } catch (err) {
                  setLicenseMsg('Gagal: Kunci tidak valid!');
                }
              }}>
                <div className="input-group">
                  <label>Upgrade Lisensi (Masukkan Kunci Baru)</label>
                  <input type="text" value={newLicenseKey} onChange={(e) => setNewLicenseKey(e.target.value)} placeholder="Paste Kunci Panjang di sini..." required />
                </div>
                <button type="submit" className="btn-primary">Aktivasi Lisensi Baru</button>
              </form>
            </div>
          )}

          {activeTab === 'staf' && (
            <div className="settings-card glass" style={{ border: 'none', padding: 0, marginBottom: 0 }}>
              <h3><Users size={20} /> Tambah Kasir / Admin Baru</h3>
              {adminMsg && <div style={{ color: 'var(--success)', marginBottom: '16px' }}>{adminMsg}</div>}
              <form onSubmit={handleCreateAdmin}>
                <div className="input-group">
                  <label>Username</label>
                  <input type="text" value={newAdmin.username} onChange={(e) => setNewAdmin({ ...newAdmin, username: e.target.value })} required />
                </div>
                <div className="input-group">
                  <label>Password</label>
                  <div className="input-wrapper">
                    <input type={showAdminPassword ? "text" : "password"} value={newAdmin.password} onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })} required />
                    <button type="button" className="password-toggle-btn" onClick={() => setShowAdminPassword(!showAdminPassword)}>
                      {showAdminPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                <div className="input-group">
                  <label>Peran (Role)</label>
                  <select value={newAdmin.role} onChange={(e) => setNewAdmin({ ...newAdmin, role: e.target.value })} style={{ width: '100%', padding: '14px', borderRadius: `var(--border-radius)`, border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
                    <option value="admin">Kasir (Admin)</option>
                    <option value="super_admin">Pemilik (Super Admin)</option>
                  </select>
                </div>
                <button type="submit" className="btn-primary">Buat Akun Baru</button>
              </form>
            </div>
          )}

          {activeTab === 'api' && (
            <div className="settings-card glass" style={{ border: 'none', padding: 0, marginBottom: 0 }}>
              <h3><Webhook size={20} /> Pusat API Key (WhatsApp Rotator)</h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '24px' }}>Sistem otomatis memutar kunci jika terjadi limit/blokir saat mengirim notifikasi.</p>
              {keyMsg && <div style={{ color: 'var(--success)', marginBottom: '16px' }}>{keyMsg}</div>}
              
              <form onSubmit={handleAddKey} style={{ marginBottom: '32px' }}>
                <div className="settings-grid">
                  <div className="input-group">
                    <label>Nama Akun (Visual)</label>
                    <input type="text" value={newKey.name} onChange={(e) => setNewKey({ ...newKey, name: e.target.value })} placeholder="Misal: WA Admin 1" required />
                  </div>
                  <div className="input-group">
                    <label>API Key / Token Fonnte</label>
                    <input type="text" value={newKey.api_key} onChange={(e) => setNewKey({ ...newKey, api_key: e.target.value })} placeholder="Paste Token..." required />
                  </div>
                </div>
                <button type="submit" className="btn-outline" style={{ border: '1px solid var(--accent-color)', width: '100%' }}>+ Tambah Kunci Fonnte</button>
              </form>

              <div style={{ backgroundColor: 'var(--bg-primary)', borderRadius: `var(--border-radius)`, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                      <th style={{ padding: '12px' }}>Nama Akun</th>
                      <th style={{ padding: '12px' }}>Status</th>
                      <th style={{ padding: '12px' }}>Total Kirim</th>
                      <th style={{ padding: '12px' }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {apiKeys.length === 0 ? (
                      <tr>
                        <td colSpan="4" style={{ padding: '12px', textAlign: 'center', color: 'var(--text-muted)' }}>Belum ada kunci terdaftar.</td>
                      </tr>
                    ) : (
                      apiKeys.map(k => (
                        <tr key={k.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '12px' }}>{k.name}</td>
                          <td style={{ padding: '12px' }}>
                            <span style={{
                              padding: '4px 8px', borderRadius: `var(--border-radius)`, fontSize: '0.7rem', fontWeight: 'bold',
                              backgroundColor: k.status === 'Alive' ? '#dcfce7' : (k.status === 'Limit' ? '#fef08a' : '#fee2e2'),
                              color: k.status === 'Alive' ? '#166534' : (k.status === 'Limit' ? '#854d0e' : '#991b1b')
                            }}>{k.status}</span>
                          </td>
                          <td style={{ padding: '12px' }}>{k.used_count}x</td>
                          <td style={{ padding: '12px' }}>
                            <button onClick={() => handleDeleteKey(k.id)} style={{ padding: '6px 12px', background: 'var(--danger)', color: 'white', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '0.8rem' }}>Hapus</button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
