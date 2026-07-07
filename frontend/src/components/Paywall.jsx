import React, { useState, useEffect } from 'react';
import { Lock, ShieldCheck, Phone, Wifi, Key } from 'lucide-react';
import { apiCall } from '../api';

export default function Paywall({ machineId, onActivated }) {
  const [tab, setTab] = useState('otp'); // 'otp' or 'manual'
  const [key, setKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [otp, setOtp] = useState(null);
  const [otpStatus, setOtpStatus] = useState('Memuat...');

  // Request OTP on mount
  useEffect(() => {
    if (tab === 'otp') {
      requestOtp();
    }
  }, [tab]);

  const requestOtp = async () => {
    try {
      setOtpStatus('Meminta OTP...');
      const res = await apiCall('/license/otp-request');
      setOtp(res.otp);
      setOtpStatus('Menunggu Persetujuan Pusat...');
    } catch (err) {
      setOtpStatus('Gagal terhubung ke server lokal.');
    }
  };

  useEffect(() => {
    let interval;
    if (otp && tab === 'otp') {
      interval = setInterval(async () => {
        try {
          const res = await apiCall('/license/otp-poll');
          if (res.status === 'approved') {
            clearInterval(interval);
            alert('Aktivasi Jarak Jauh Berhasil!');
            onActivated();
          } else if (res.status === 'rejected' || res.status === 'expired') {
            clearInterval(interval);
            setOtp(null);
            setOtpStatus(res.error || 'OTP Ditolak/Expired. Silakan muat ulang.');
          }
        } catch (err) {
          // just keep polling
        }
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [otp, tab]);

  const handleActivate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await apiCall('/license/activate', {
        method: 'POST',
        body: JSON.stringify({ key })
      });
      alert(res.message);
      onActivated();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: '#0a0a0a', color: '#fff', zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Inter, sans-serif'
    }}>
      <div style={{
        background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(20px)', padding: '40px', borderRadius: '12px',
        maxWidth: '500px', width: '90%', textAlign: 'center',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
      }}>
        <div style={{
          width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg, #d4af37 0%, #aa771c 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px',
          boxShadow: '0 10px 20px rgba(212, 175, 55, 0.3)'
        }}>
          <Lock size={40} color="#000" />
        </div>
        
        <h2 style={{ fontSize: '1.5rem', marginBottom: '10px', fontWeight: '600' }}>Lisensi Kedaluwarsa</h2>
        
        <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '20px' }}>
          <button onClick={() => setTab('otp')} style={{ 
            padding: '10px 20px', borderRadius: '8px', border: 'none', 
            background: tab === 'otp' ? '#d4af37' : '#333', 
            color: tab === 'otp' ? '#000' : '#fff', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold'
          }}>
            <Wifi size={16} /> Aktivasi Online
          </button>
          <button onClick={() => setTab('manual')} style={{ 
            padding: '10px 20px', borderRadius: '8px', border: 'none', 
            background: tab === 'manual' ? '#d4af37' : '#333', 
            color: tab === 'manual' ? '#000' : '#fff', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold'
          }}>
            <Key size={16} /> Manual
          </button>
        </div>

        {tab === 'otp' ? (
          <div style={{ background: 'rgba(0,0,0,0.5)', padding: '30px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <p style={{ color: '#a1a1aa', marginBottom: '15px' }}>Sebutkan 6 Digit Kode ini ke Admin Pusat:</p>
            {otp ? (
              <div style={{ fontSize: '3.5rem', fontWeight: '900', color: '#d4af37', letterSpacing: '8px', textShadow: '0 0 20px rgba(212,175,55,0.5)' }}>
                {otp}
              </div>
            ) : (
              <div style={{ fontSize: '1.5rem', color: '#ef4444' }}>{otpStatus}</div>
            )}
            <p style={{ color: '#22c55e', marginTop: '20px', fontSize: '0.9rem' }}>
              Status: {otpStatus}
            </p>
            {!otp && (
              <button onClick={requestOtp} style={{ marginTop: '15px', padding: '8px 16px', background: '#333', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                Minta OTP Baru
              </button>
            )}
          </div>
        ) : (
          <>
            <div style={{ background: 'rgba(0, 0, 0, 0.5)', border: '1px solid rgba(255,255,255,0.05)', padding: '20px', borderRadius: '12px', marginBottom: '30px' }}>
              <p style={{ fontSize: '0.9rem', color: '#71717a', marginBottom: '8px' }}>ID TOKO ANDA</p>
              <div style={{ fontSize: '2rem', fontWeight: '800', letterSpacing: '2px', color: '#d4af37' }}>{machineId}</div>
              <a href={`https://wa.me/6281234567890?text=Halo%20Admin,%20saya%20mau%20beli%20lisensi.%20ID%20Toko%20saya:%20${machineId}`} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '15px', color: '#22c55e', textDecoration: 'none', fontWeight: '600', fontSize: '0.9rem' }}>
                <Phone size={16} /> Hubungi WhatsApp CS
              </a>
            </div>
            <form onSubmit={handleActivate} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <input type="text" placeholder="Masukkan Kunci Manual di sini..." value={key} onChange={(e) => setKey(e.target.value)} style={{ width: '93%', padding: '16px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '1rem', textAlign: 'center', outline: 'none' }} required />
              {error && <div style={{ color: '#ef4444', fontSize: '0.9rem' }}>{error}</div>}
              <button type="submit" disabled={loading || !key} style={{ width: '100%', padding: '16px', borderRadius: '12px', background: 'linear-gradient(135deg, #d4af37 0%, #aa771c 100%)', color: '#000', fontSize: '1rem', fontWeight: 'bold', border: 'none', cursor: loading || !key ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', opacity: loading || !key ? 0.7 : 1 }}>
                <ShieldCheck size={20} /> {loading ? 'Memverifikasi...' : 'Aktivasi Offline'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
