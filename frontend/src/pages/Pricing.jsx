import React, { useState } from 'react';
import { Check, MessageCircle, CreditCard, ShieldCheck } from 'lucide-react';

function Pricing() {
  const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' or 'yearly'

  const plans = [
    {
      id: 'free',
      name: 'Gratis Selamanya',
      priceMonthly: 'Rp 0',
      priceYearly: 'Rp 0',
      period: '',
      description: 'Mulai jualan tanpa modal, cocok untuk UMKM baru.',
      features: [
        'Maksimal 1 Kasir',
        'Batas 50 Transaksi / Bulan',
        'Kelola Stok Dasar',
        'Laporan Harian'
      ],
      recommended: false
    },
    {
      id: 'pro',
      name: 'Juragan (Pro)',
      priceMonthly: 'Rp 49.000',
      priceYearly: 'Rp 490.000',
      period: billingCycle === 'monthly' ? '/ bulan' : '/ tahun',
      description: 'Bebas hambatan untuk toko yang mulai ramai.',
      features: [
        'Maksimal 3 Kasir',
        'Transaksi Tanpa Batas',
        'Notifikasi Stok Menipis',
        'Laporan Lengkap (Excel)'
      ],
      recommended: true
    },
    {
      id: 'ultimate',
      name: 'Sultan (Ultimate)',
      priceMonthly: 'Rp 99.000',
      priceYearly: 'Rp 990.000',
      period: billingCycle === 'monthly' ? '/ bulan' : '/ tahun',
      description: 'Kontrol penuh untuk bisnis skala besar.',
      features: [
        'Kasir Tanpa Batas',
        'Sistem Multi-Cabang',
        'Audit Shift Kasir',
        'Dukungan Prioritas 24/7'
      ],
      recommended: false
    },
    {
      id: 'buyout',
      name: 'Beli Putus (Lifetime)',
      priceMonthly: 'Rp 2.000.000',
      priceYearly: 'Rp 2.000.000',
      period: ' + Server 50rb/bln',
      description: 'Bayar sekali di depan, hemat selamanya.',
      features: [
        'Semua Fitur SULTAN',
        'Akses Permanen',
        'Database Eksklusif',
        'Bebas Biaya Langganan'
      ],
      recommended: false,
      isSpecial: true
    }
  ];

  const handleWhatsApp = (plan) => {
    let planPrice = billingCycle === 'monthly' ? plan.priceMonthly : plan.priceYearly;
    if (plan.id === 'buyout') planPrice = 'Rp 2.000.000';
    
    const text = `Halo Admin Xirlo, saya ingin berlangganan Xirlo POS paket *${plan.name}* (${billingCycle === 'yearly' ? 'Tahunan' : 'Bulanan'}) dengan harga ${planPrice}. Mohon info pembayarannya.`;
    const waUrl = `https://wa.me/6281234567890?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank');
  };

  const handleMidtrans = () => {
    alert("🚀 Auto-Pay (QRIS/Virtual Account) via Midtrans sedang dalam persiapan (Coming Soon).\n\nUntuk saat ini, silakan gunakan metode Beli via WhatsApp agar langsung dibantu aktivasi oleh tim kami.");
  };

  return (
    <div className="pricing-container slide-in" style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-primary)' }}>
      <div className="pricing-header" style={{ marginBottom: '40px' }}>
        <h1 style={{ color: 'var(--accent-color)', fontSize: '2.5rem', marginBottom: '10px' }}>Pilih Paket Cuan Anda</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>Tingkatkan sistem kasir Anda. Mulai dari gratis, bayar saat bisnis Anda makin laris.</p>
        
        {/* Toggle Billing Cycle */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: '30px', gap: '15px' }}>
          <span style={{ fontWeight: billingCycle === 'monthly' ? 'bold' : 'normal', color: billingCycle === 'monthly' ? 'var(--text-primary)' : 'var(--text-secondary)' }}>Bulanan</span>
          <label style={{ position: 'relative', display: 'inline-block', width: '60px', height: '34px' }}>
            <input 
              type="checkbox" 
              checked={billingCycle === 'yearly'} 
              onChange={() => setBillingCycle(prev => prev === 'monthly' ? 'yearly' : 'monthly')}
              style={{ opacity: 0, width: 0, height: 0 }} 
            />
            <span style={{
              position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: billingCycle === 'yearly' ? 'var(--accent-color)' : '#333',
              transition: '.4s', borderRadius: '34px'
            }}>
              <span style={{
                position: 'absolute', height: '26px', width: '26px', left: billingCycle === 'yearly' ? '30px' : '4px',
                bottom: '4px', backgroundColor: 'white', transition: '.4s', borderRadius: '50%'
              }} />
            </span>
          </label>
          <span style={{ fontWeight: billingCycle === 'yearly' ? 'bold' : 'normal', color: billingCycle === 'yearly' ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
            Tahunan <span style={{ background: 'var(--success)', color: '#000', padding: '2px 8px', borderRadius: '12px', fontSize: '0.7rem', marginLeft: '5px', fontWeight: 'bold' }}>Diskon 2 Bulan!</span>
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '30px', justifyContent: 'center', flexWrap: 'wrap' }}>
        {plans.map(plan => (
          <div key={plan.id} style={{
            background: plan.recommended ? 'linear-gradient(180deg, rgba(212,175,55,0.1) 0%, var(--bg-primary) 100%)' : 'var(--bg-primary)',
            border: `2px solid ${plan.recommended ? 'var(--accent-color)' : 'var(--border-color)'}`,
            borderRadius: '16px', padding: '30px', width: '320px', textAlign: 'left',
            position: 'relative', transition: 'transform 0.3s ease',
            boxShadow: plan.recommended ? '0 10px 30px rgba(212,175,55,0.1)' : '0 4px 10px rgba(0,0,0,0.2)'
          }}>
            {plan.recommended && (
              <div style={{ position: 'absolute', top: '-14px', right: '20px', background: 'var(--accent-color)', color: '#000', padding: '4px 15px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold' }}>
                Paling Laris 🔥
              </div>
            )}
            
            <h2 style={{ fontSize: '1.5rem', marginBottom: '10px' }}>{plan.name}</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '20px', minHeight: '40px' }}>{plan.description}</p>
            
            <div style={{ marginBottom: '30px' }}>
              {billingCycle === 'yearly' && !plan.isSpecial && plan.id !== 'free' && (
                <div style={{ textDecoration: 'line-through', color: 'var(--danger)', fontSize: '0.9rem' }}>
                  Rp {(parseInt(plan.priceMonthly.replace(/[^\d]/g, '')) * 12).toLocaleString('id-ID')}
                </div>
              )}
              <span style={{ fontSize: '2.2rem', fontWeight: '900', color: 'var(--accent-color)' }}>
                {billingCycle === 'monthly' ? plan.priceMonthly : plan.priceYearly}
              </span>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{plan.period}</span>
            </div>
            
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 30px 0', minHeight: '140px' }}>
              {plan.features.map((feat, i) => (
                <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '12px', fontSize: '0.95rem' }}>
                  <Check size={18} style={{ color: 'var(--success)', marginTop: '2px', flexShrink: 0 }} /> {feat}
                </li>
              ))}
            </ul>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {plan.id === 'free' ? (
                <button className="btn-primary" style={{ background: '#333', borderColor: '#333', color: '#fff' }} disabled>
                  Paket Saat Ini
                </button>
              ) : (
                <>
                  <button 
                    className="btn-primary" 
                    style={{ backgroundColor: '#25D366', borderColor: '#25D366', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: 'bold' }}
                    onClick={() => handleWhatsApp(plan)}
                  >
                    <MessageCircle size={18} /> Upgrade via WhatsApp
                  </button>
                  {!plan.isSpecial && (
                    <button 
                      className="btn-secondary" 
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'var(--text-secondary)', border: '1px solid var(--border-color)', background: 'transparent' }}
                      onClick={handleMidtrans}
                    >
                      <CreditCard size={18} /> Auto-Pay (Coming Soon)
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        ))}
      </div>
      
      <div style={{ marginTop: '50px', display: 'inline-flex', alignItems: 'center', gap: '10px', background: 'rgba(34, 197, 94, 0.1)', padding: '15px 30px', borderRadius: '50px', color: 'var(--success)', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
        <ShieldCheck size={24} />
        <span style={{ fontWeight: 'bold' }}>Jaminan Keamanan: Data Anda 100% aman dan terisolasi dengan Enkripsi Tingkat Bank (Row-Level Security).</span>
      </div>
    </div>
  );
}

export default Pricing;
