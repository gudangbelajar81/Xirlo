import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { apiCall } from '../api';

function Register({ setAuthInfo }) {
  const [storeName, setStoreName] = useState('');
  const [phone, setPhone] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const data = await apiCall('/register', {
        method: 'POST',
        body: JSON.stringify({ storeName, ownerName: 'Admin', phone, username, password }),
      });
      
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setAuthInfo(data.user);
      
      alert('Pendaftaran Berhasil! Anda mendapatkan Gratis Akses Sultan selama 7 Hari.');
      window.location.href = '/dashboard';
    } catch (err) {
      setError(err.message || 'Gagal mendaftar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card glass">
        <h2>Daftar Alio BOS</h2>
        <p>Mulai Jualan Lebih Pintar Hari Ini</p>
        
        {error && <div style={{ color: 'var(--danger)', marginBottom: '16px' }}>{error}</div>}
        
        <form onSubmit={handleRegister}>
          <div className="input-group">
            <label>Nama Toko</label>
            <input 
              type="text" 
              value={storeName} 
              onChange={(e) => setStoreName(e.target.value)} 
              placeholder="Contoh: Toko Berkah"
              required 
            />
          </div>
          
          <div className="input-group">
            <label>Nomor WhatsApp</label>
            <input 
              type="text" 
              value={phone} 
              onChange={(e) => setPhone(e.target.value)} 
              placeholder="Contoh: 08123456789"
              required 
            />
          </div>

          <div className="input-group">
            <label>Nama Pengguna (Username)</label>
            <input 
              type="text" 
              value={username} 
              onChange={(e) => setUsername(e.target.value)} 
              placeholder="Contoh: adminberkah"
              required 
            />
          </div>

          <div className="input-group">
            <label>Kata Sandi (Password)</label>
            <div className="input-wrapper">
              <input 
                type={showPassword ? "text" : "password"} 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
              />
              <button 
                type="button" 
                className="password-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: '10px' }}>
            {loading ? 'Mendaftarkan...' : 'Daftar Sekarang (Gratis)'}
          </button>
        </form>

        <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '0.9rem' }}>
          Sudah punya akun? <span onClick={() => navigate('/')} style={{ color: 'var(--accent-color)', cursor: 'pointer', fontWeight: 'bold' }}>Masuk di sini</span>
        </div>
      </div>
    </div>
  );
}

export default Register;
