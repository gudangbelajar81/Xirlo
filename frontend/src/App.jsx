import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Settings as SettingsIcon, LogOut, Moon, Sun, Lock, Package, ClipboardList, QrCode, Download, X, BarChart2, CreditCard } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';
import Inventory from './pages/Inventory';
import History from './pages/History';
import Reports from './pages/Reports';
import ApiKeys from './pages/ApiKeys';
import VendorPortal from './pages/VendorPortal';
import Pricing from './pages/Pricing';
import Register from './pages/Register';
import Paywall from './components/Paywall';
import './App.css';
import { apiCall } from './api';

function Sidebar({ user, setAuthInfo, toggleTheme, theme, license }) {
  const navigate = useNavigate();
  const location = useLocation();

  
  const [tapCount, setTapCount] = useState(0);
  let tapTimeout = null;

  const handleSecretTap = () => {
    setTapCount(prev => {
      const newCount = prev + 1;
      if (newCount === 5) {
        const pin = prompt("🔐 PORTAL RAHASIA\nMasukkan PIN Master:");
        if (pin === "889900") {
          navigate('/ht-vendor-portal');
        } else if (pin) {
          alert("PIN Salah!");
        }
        return 0;
      }
      return newCount;
    });

    clearTimeout(tapTimeout);
    tapTimeout = setTimeout(() => setTapCount(0), 3000);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setAuthInfo(null);
    navigate('/');
  };

  const appCode = license?.app_code || 'APP_KASIR';
  const features = license?.features || [];

  const handleFeatureClick = (path, requiredFeature) => {
    if (requiredFeature && !features.includes(requiredFeature)) {
      alert(`🔒 FITUR TERKUNCI\n\nUps! Fitur ini membutuhkan hak akses tambahan.\n\nSilakan hubungi Admin untuk Upgrade Paket Lisensi Anda!`);
    } else if (path.startsWith('/dummy')) {
      alert(`🚀 Segera Hadir!\n\nFitur eksklusif untuk ${appCode} ini sedang dikembangkan oleh Tim Xirlo.`);
    } else {
      navigate(path);
    }
  };

  const renderMenus = () => {
    const isBasic = !features.includes('feat_dummy_pro');

    if (appCode === 'APP_RESTO') {
      return (
        <>
          <button className="nav-item active" onClick={() => handleFeatureClick('/dashboard')} title="Dashboard Resto"><LayoutDashboard size={24} /></button>
          <button className="nav-item" onClick={() => handleFeatureClick('/dummy-meja')} title="Manajemen Meja"><QrCode size={24} /></button>
          <button className="nav-item" onClick={() => handleFeatureClick('/dummy-dapur', 'feat_dummy_pro')} title="Pesanan Dapur (PRO)" style={isBasic ? { opacity: 0.5, position: 'relative' } : {}}>
            <ClipboardList size={24} />{isBasic && <Lock size={12} style={{ position: 'absolute', top: 8, right: 8, color: 'var(--warning)' }} />}
          </button>
          <button className="nav-item" onClick={() => handleFeatureClick('/inventory')} title="Stok Bahan Baku"><Package size={24} /></button>
        </>
      );
    } else if (appCode === 'APP_KLINIK') {
      return (
        <>
          <button className="nav-item active" onClick={() => handleFeatureClick('/dashboard')} title="Dashboard Klinik"><LayoutDashboard size={24} /></button>
          <button className="nav-item" onClick={() => handleFeatureClick('/dummy-pasien')} title="Antrean Pasien"><ClipboardList size={24} /></button>
          <button className="nav-item" onClick={() => handleFeatureClick('/dummy-rekam-medis', 'feat_dummy_pro')} title="Rekam Medis (PRO)" style={isBasic ? { opacity: 0.5, position: 'relative' } : {}}>
            <BarChart2 size={24} />{isBasic && <Lock size={12} style={{ position: 'absolute', top: 8, right: 8, color: 'var(--warning)' }} />}
          </button>
        </>
      );
    } else {
      // Default: APP_KASIR
      const hasReports = features.includes('feat_reports');
      return (
        <>
          <button className={`nav-item ${location.pathname === '/' || location.pathname === '/dashboard' ? 'active' : ''}`} onClick={() => navigate('/dashboard')} title="Dashboard"><LayoutDashboard size={24} /></button>
          <button className={`nav-item ${location.pathname === '/history' ? 'active' : ''}`} onClick={() => handleFeatureClick('/history', 'feat_reports')} title="Riwayat Penjualan" style={!hasReports ? { opacity: 0.5, position: 'relative' } : {}}>
            <ClipboardList size={24} />{!hasReports && <Lock size={12} style={{ position: 'absolute', top: 8, right: 8, color: 'var(--warning)' }} />}
          </button>
          <button className={`nav-item ${location.pathname === '/reports' ? 'active' : ''}`} onClick={() => handleFeatureClick('/reports', 'feat_reports')} title="Laporan Cerdas" style={!hasReports ? { opacity: 0.5, position: 'relative' } : {}}>
            <BarChart2 size={24} />{!hasReports && <Lock size={12} style={{ position: 'absolute', top: 8, right: 8, color: 'var(--warning)' }} />}
          </button>
          
          {/* Modul Gudang Dasar / Retail */}
          <button className={`nav-item ${location.pathname === '/inventory' ? 'active' : ''}`} onClick={() => navigate('/inventory')} title={features.includes('feat_retail') ? "Gudang Retail (Premium)" : "Gudang & Produk"}>
            <Package size={24} />
          </button>

          {/* Dummy Modul F&B */}
          {features.includes('feat_fnb') && (
            <button className={`nav-item ${location.pathname === '/fnb' ? 'active' : ''}`} onClick={() => alert('Fitur F&B akan datang!')} title="Dapur F&B">
              <Package size={24} style={{ color: 'var(--accent-color)' }} />
            </button>
          )}

          {/* Pricing / Upgrade */}
          <button className={`nav-item ${location.pathname === '/pricing' ? 'active' : ''}`} onClick={() => navigate('/pricing')} title="Langganan & Upgrade">
            <CreditCard size={24} style={{ color: 'var(--success)' }} />
          </button>
        </>
      );
    }
  };

  return (
    <div className="sidebar glass-dark">
      <div className="user-avatar" title={`Mode: ${appCode}`} onClick={handleSecretTap} style={{ cursor: "pointer" }}>
        {user ? user.username.charAt(0).toUpperCase() : 'G'}
      </div>
      
      {/* OWNER (super_admin) — Full menu access */}
      {user?.role === 'super_admin' && renderMenus()}
      {user?.role === 'super_admin' && (
        <button className={`nav-item ${location.pathname === '/settings' ? 'active' : ''}`} onClick={() => navigate('/settings')} title="Pengaturan">
          <SettingsIcon size={24} />
        </button>
      )}

      {/* KARYAWAN / KASIR — hanya akses kasir & logout */}
      {user?.role === 'kasir' && (
        <>
          <button className={`nav-item ${location.pathname === '/dashboard' ? 'active' : ''}`} onClick={() => navigate('/dashboard')} title="Kasir">
            <LayoutDashboard size={24} />
          </button>
          <div style={{ margin: '8px auto', width: '80%', height: '1px', background: 'var(--border-color)', opacity: 0.4 }} />
          <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)', textAlign: 'center', padding: '0 4px', lineHeight: 1.2 }}>KASIR</div>
        </>
      )}

      <button className="nav-item" onClick={toggleTheme} title="Ganti Tema">
        {theme === 'dark' ? <Sun size={24} /> : <Moon size={24} />}
      </button>

    </div>
  );
}

function MainLayout({ children, user, setAuthInfo, appSettings, license }) {
  const [theme, setTheme] = useState('dark');
  const [showQr, setShowQr] = useState(false);
  
  // --- PHASE 3: SHIFT AUDIT ---
  const [shift, setShift] = useState(null);
  const [showOpenShift, setShowOpenShift] = useState(false);
  const [showCloseShift, setShowCloseShift] = useState(false);
  const [startCash, setStartCash] = useState('');
  const [endCash, setEndCash] = useState('');
  const [shiftResult, setShiftResult] = useState(null);

  useEffect(() => {
    if (user && license?.features?.includes('feat_shift_audit')) {
      checkShift();
    }
  }, [user, license]);

  const checkShift = async () => {
    try {
      const data = await apiCall('/shifts/current');
      if (data.status === 'none') {
        setShowOpenShift(true);
      } else {
        setShift(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenShift = async (e) => {
    e.preventDefault();
    try {
      await apiCall('/shifts/open', { method: 'POST', body: JSON.stringify({ start_cash: Number(startCash) }) });
      setShowOpenShift(false);
      checkShift();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleCloseShift = async (e) => {
    e.preventDefault();
    try {
      const res = await apiCall('/shifts/close', { method: 'POST', body: JSON.stringify({ end_cash: Number(endCash) }) });
      setShiftResult(res); // shows result modal
      setShift(null);
    } catch (err) {
      alert(err.message);
    }
  };
  // ----------------------------

  const location = window.location;
  const localIp = location.hostname;
  const qrUrl = `http://${localIp}:5173`;

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  return (
    <div className="app-container" data-theme={theme}>
      <Sidebar user={user} setAuthInfo={setAuthInfo} toggleTheme={toggleTheme} theme={theme} license={license} />
      <div className="main-content">
        <header className="top-header glass">
          <div className="header-logo" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {appSettings?.logo_url && (
              <img src={appSettings.logo_url} alt="Logo" style={{ height: '32px', width: '32px', objectFit: 'contain', borderRadius: '4px' }} />
            )}
            <strong style={{ fontSize: '1.2rem', color: 'var(--accent-color)' }}>{appSettings?.app_name || 'Xirlo'}</strong>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            {license && (
              <div style={{ padding: '4px 8px', background: 'var(--bg-primary)', color: 'var(--accent-color)', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold', border: '1px solid var(--accent-color)' }}>
                Tier: {license.tier || 'BASIC'}
              </div>
            )}
            
            {shift && license?.features?.includes('feat_shift_audit') && (
              <button 
                onClick={() => setShowCloseShift(true)}
                style={{ padding: '4px 8px', background: 'var(--danger)', color: '#fff', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}
              >
                Tutup Shift
              </button>
            )}

            <div className="user-profile">
              <span>Halo, <strong>{user ? user.username : 'Kasir Umum'}</strong></span>
            </div>
            {user?.role === 'super_admin' && (
              <button 
                className="auth-btn" 
                onClick={() => {
                  if (!license?.features?.includes('feat_multi_user')) {
                    alert('🔒 FITUR TERKUNCI\n\nFitur Multi-Akun (Karyawan) tidak tersedia di paket lisensi Anda. Silakan hubungi Admin untuk upgrade!');
                  } else {
                    setShowQr(true);
                  }
                }} 
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: `var(--border-radius)` }}>
                <QrCode size={16} /> Karyawan
                {!license?.features?.includes('feat_multi_user') && <Lock size={12} style={{ color: 'var(--warning)', marginLeft: '4px' }} />}
              </button>
            )}
            <button className="auth-btn logout-btn" onClick={() => {
              localStorage.removeItem('token');
              localStorage.removeItem('user');
              setAuthInfo(null);
              window.location.href = '/login';
            }} title="Keluar"><LogOut size={16} /></button>
          </div>
        </header>

        {appSettings?.logo_url && (
          <div 
            className="app-watermark" 
            style={{ backgroundImage: `url(${appSettings.logo_url})` }}
          />
        )}

        {showQr && (
          <div className="modal-overlay">
            <div className="modal-content glass-dark" style={{ textAlign: 'center', maxWidth: '400px' }}>
              <button className="close-btn" onClick={() => setShowQr(false)}><X size={24} /></button>
              <h2 style={{ marginBottom: '20px', color: 'var(--accent-color)' }}>Scan untuk Login HP Karyawan</h2>
              <div style={{ background: 'white', padding: '20px', borderRadius: `var(--border-radius)`, display: 'inline-block' }}>
                <QRCodeSVG value={qrUrl} size={256} />
              </div>
              <p style={{ marginTop: '20px', color: 'var(--text-secondary)' }}>Akses dari HP satu WiFi:</p>
              <a href={qrUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--accent-color)', fontWeight: 'bold', fontSize: '1.2rem', textDecoration: 'none' }}>
                {qrUrl}
              </a>
            </div>
          </div>
        )}

        {/* MODAL SHIFT AUDIT */}
        {showOpenShift && (
          <div className="modal-overlay" style={{ zIndex: 9999 }}>
            <div className="modal-content">
              <h3>Buka Shift Kasir</h3>
              <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>Masukkan jumlah uang modal awal di laci kasir saat ini.</p>
              <form onSubmit={handleOpenShift}>
                <input 
                  type="number" 
                  value={startCash} 
                  onChange={e => setStartCash(e.target.value)} 
                  placeholder="Rp Modal Awal..." 
                  style={{ width: '100%', padding: '12px', borderRadius: `var(--border-radius)`, marginBottom: '16px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                  required
                />
                <button type="submit" className="btn-primary" style={{ width: '100%' }}>Buka Shift</button>
              </form>
            </div>
          </div>
        )}

        {showCloseShift && (
          <div className="modal-overlay" style={{ zIndex: 9999 }}>
            <div className="modal-content">
              <button className="close-btn" onClick={() => setShowCloseShift(false)}><X size={24} /></button>
              <h3>Tutup Shift</h3>
              <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>Hitung uang fisik di laci dan masukkan totalnya.</p>
              <form onSubmit={handleCloseShift}>
                <input 
                  type="number" 
                  value={endCash} 
                  onChange={e => setEndCash(e.target.value)} 
                  placeholder="Rp Uang Fisik Laci..." 
                  style={{ width: '100%', padding: '12px', borderRadius: `var(--border-radius)`, marginBottom: '16px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                  required
                />
                <button type="submit" className="btn-primary" style={{ width: '100%', backgroundColor: 'var(--danger)', borderColor: 'var(--danger)' }}>Tutup Shift</button>
              </form>
            </div>
          </div>
        )}

        {shiftResult && (
          <div className="modal-overlay" style={{ zIndex: 9999 }}>
            <div className="modal-content text-center">
              <h3>Hasil Audit Shift</h3>
              <div style={{ margin: '20px 0', padding: '16px', background: 'var(--bg-secondary)', borderRadius: `var(--border-radius)`, textAlign: 'left' }}>
                <p>Uang Fisik: <strong>Rp {Number(endCash).toLocaleString('id-ID')}</strong></p>
                <p>Sistem (Modal + Jual): <strong>Rp {Number(shiftResult.system_cash).toLocaleString('id-ID')}</strong></p>
                <hr style={{ margin: '10px 0', borderColor: 'var(--border-color)' }} />
                <p style={{ color: shiftResult.difference >= 0 ? 'var(--success)' : 'var(--danger)', fontSize: '1.2rem', fontWeight: 'bold' }}>
                  Selisih: Rp {Number(shiftResult.difference).toLocaleString('id-ID')}
                </p>
              </div>
              <button className="btn-primary" onClick={() => { setShiftResult(null); setShowOpenShift(true); setStartCash(''); setEndCash(''); }} style={{ width: '100%' }}>Selesai</button>
            </div>
          </div>
        )}

        {children}
      </div>
    </div>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [appSettings, setAppSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [license, setLicense] = useState(null);

  const fetchInitialData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const licRes = await apiCall('/license/status');
        setLicense(licRes);
      }
      
      const setRes = await apiCall('/settings');
      setAppSettings(setRes);
      if (setRes.theme_mode) {
        document.documentElement.setAttribute('data-theme', setRes.theme_mode);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (appSettings) {
      if (appSettings.theme_color) {
        document.documentElement.style.setProperty('--accent-color', appSettings.theme_color);
      }
      if (appSettings.border_radius) {
        document.documentElement.style.setProperty('--border-radius', appSettings.border_radius);
      }
      if (appSettings.font_family) {
        document.documentElement.style.setProperty('--font-family', appSettings.font_family);
      }
    }
  }, [appSettings]);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) setUser(JSON.parse(storedUser));
    fetchInitialData();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <>
      {license && !license.access && (
        <Paywall machineId={license.machine_id} onActivated={() => fetchInitialData()} />
      )}
      
      {license && license.mode === 'trial' && (
        <div style={{
          position: 'fixed', bottom: '20px', right: '20px', zIndex: 9998,
          background: 'linear-gradient(135deg, #d4af37 0%, #aa771c 100%)',
          color: '#000', padding: '10px 20px', borderRadius: '30px',
          fontWeight: 'bold', boxShadow: '0 10px 20px rgba(0,0,0,0.3)'
        }}>
          Masa Percobaan: Sisa {license.days_left} Hari
        </div>
      )}

      <Router>
        <Routes>
          <Route path="/login" element={!user ? <Login setAuthInfo={setUser} appSettings={appSettings} /> : <Navigate to="/dashboard" />} />
          <Route path="/" element={
            user ? <Navigate to="/dashboard" /> : <Login setAuthInfo={setUser} appSettings={appSettings} />
          } />
          <Route path="/register" element={
            user ? <Navigate to="/dashboard" /> : <Register setAuthInfo={setUser} />
          } />
          <Route path="/dashboard" element={
            user ? 
              <MainLayout user={user} setAuthInfo={setUser} appSettings={appSettings} license={license}>
                <Dashboard user={user} license={license} />
              </MainLayout> 
            : <Navigate to="/login" />
          } />

          <Route path="/inventory" element={
            user?.role === 'super_admin' ? 
              <MainLayout user={user} setAuthInfo={setUser} appSettings={appSettings} license={license}>
                <Inventory license={license} />
              </MainLayout> 
            : <Navigate to="/dashboard" />
          } />

          <Route path="/history" element={
            user?.role === 'super_admin' && license?.features?.includes('feat_reports') ? 
              <MainLayout user={user} setAuthInfo={setUser} appSettings={appSettings} license={license}>
                <History />
              </MainLayout> 
            : <Navigate to="/dashboard" />
          } />

          <Route path="/reports" element={
            user?.role === 'super_admin' && license?.features?.includes('feat_reports') ? 
              <MainLayout user={user} setAuthInfo={setUser} appSettings={appSettings} license={license}>
                <Reports />
              </MainLayout> 
            : <Navigate to="/dashboard" />
          } />

          <Route path="/settings" element={
            user?.role === 'super_admin' ? 
              <MainLayout user={user} setAuthInfo={setUser} appSettings={appSettings} license={license}>
                <Settings appSettings={appSettings} onSettingsChange={setAppSettings} machineId={license?.machine_id} license={license} />
              </MainLayout> 
            : <Navigate to="/dashboard" />
          } />
        
          <Route path="/settings/api-keys" element={
            user?.role === 'super_admin' ? 
              <MainLayout user={user} setAuthInfo={setUser} appSettings={appSettings} license={license}>
                <ApiKeys />
              </MainLayout> 
            : <Navigate to="/dashboard" />
          } />

          <Route path="/ht-vendor-portal" element={
            user?.role === 'super_admin' ? 
              <MainLayout user={user} setAuthInfo={setUser} appSettings={appSettings} license={license}>
                <VendorPortal />
              </MainLayout> 
            : <Navigate to="/dashboard" />
          } />

          <Route path="/pricing" element={
            user?.role === 'super_admin' ? 
              <MainLayout user={user} setAuthInfo={setUser} appSettings={appSettings} license={license}>
                <Pricing />
              </MainLayout> 
            : <Navigate to="/dashboard" />
          } />

        </Routes>
      </Router>
    </>
  );
}

export default App;
