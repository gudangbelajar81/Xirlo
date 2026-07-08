import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { apiCall } from '../api';

export default function Login({ setAuthInfo, appSettings }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await apiCall('/login', {
        method: 'POST',
        body: JSON.stringify({ username, password })
      });
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setAuthInfo(data.user);
      window.location.href = '/dashboard';
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card glass">
        <h2>{appSettings?.app_name || 'Alio BOS'}</h2>
        <p>Premium Cashier System</p>
        
        {error && <div style={{ color: 'var(--danger)', marginBottom: '16px' }}>{error}</div>}
        
        <form onSubmit={handleLogin}>
          <div className="input-group">
            <label>Nama Pengguna (Username)</label>
            <input 
              type="text" 
              value={username} 
              onChange={(e) => setUsername(e.target.value)} 
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
            <div style={{ textAlign: 'right', marginTop: '8px' }}>
              <a href="https://wa.me/6281234567890?text=Halo%20Admin%20Alio%20BOS,%20saya%20lupa%20password%20akun%20saya.%20Mohon%20bantuannya." target="_blank" rel="noreferrer" style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textDecoration: 'none' }}>Lupa Password?</a>
            </div>
          </div>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Memproses...' : 'Masuk'}
          </button>
        </form>

        <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '0.9rem' }}>
          Belum punya akun? <span onClick={() => navigate('/register')} style={{ color: 'var(--accent-color)', cursor: 'pointer', fontWeight: 'bold' }}>Daftar Gratis</span>
        </div>
      </div>
    </div>
  );
}
