import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiCall } from '../api';

function Register({ setAuthInfo }) {
  const [storeName, setStoreName] = useState('');
  const [phone, setPhone] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
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
      
      setAuthInfo(data.user, data.token);
      alert('Pendaftaran Berhasil! Anda mendapatkan Gratis Akses Sultan selama 7 Hari.');
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Gagal mendaftar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box slide-in">
        <h1 className="login-title">Daftar Alio BOS</h1>
        <p className="login-subtitle" style={{ marginTop: '-10px', marginBottom: '20px', color: 'var(--text-secondary)' }}>Mulai Jualan Lebih Pintar Hari Ini</p>
        
        <form onSubmit={handleRegister} className="login-form">
          {error && <div className="error-message">{error}</div>}
          
          <div className="form-group">
            <label>Nama Toko</label>
            <input 
              type="text" 
              value={storeName} 
              onChange={(e) => setStoreName(e.target.value)} 
              placeholder="Contoh: Toko Berkah"
              required 
            />
          </div>
          
          <div className="form-group">
            <label>Nomor WhatsApp</label>
            <input 
              type="text" 
              value={phone} 
              onChange={(e) => setPhone(e.target.value)} 
              placeholder="Contoh: 08123456789"
              required 
            />
          </div>

          <div className="form-group">
            <label>Nama Pengguna (Username Login)</label>
            <input 
              type="text" 
              value={username} 
              onChange={(e) => setUsername(e.target.value)} 
              placeholder="Contoh: adminberkah"
              required 
            />
          </div>

          <div className="form-group">
            <label>Kata Sandi (Password)</label>
            <div className="password-input">
              <input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
              />
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
