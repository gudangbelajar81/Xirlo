import React, { useState } from 'react';
import { Check, MessageCircle, CreditCard, Clock } from 'lucide-react';
import './Pricing.css'; // We'll create this or use inline styles

function Pricing() {
  const [selectedPlan, setSelectedPlan] = useState(null);

  const plans = [
    {
      id: 'basic',
      name: 'Basic',
      price: 'Rp 49.000',
      period: '/ bulan',
      description: 'Cocok untuk toko kecil atau pemula',
      features: [
        'Maksimal 1 Kasir',
        'Maksimal 500 Transaksi / bulan',
        'Laporan Standar',
        'Stok Barang Terbatas'
      ],
      disabled: false
    },
    {
      id: 'pro',
      name: 'Pro',
      price: 'Rp 99.000',
      period: '/ bulan',
      description: 'Pilihan tepat untuk usaha yang mulai berkembang',
      features: [
        'Maksimal 3 Kasir',
        'Transaksi Tanpa Batas',
        'Laporan Lengkap (Excel)',
        'Notifikasi Stok Menipis'
      ],
      disabled: false,
      recommended: true
    },
    {
      id: 'buyout',
      name: 'Beli Putus (Lifetime)',
      price: 'Rp 2.000.000',
      period: ' + Server Rp 50rb/bln',
      description: 'Investasi sekali bayar untuk akses selamanya',
      features: [
        'Kasir Tanpa Batas',
        'Transaksi Tanpa Batas',
        'Semua Fitur Ultimate',
        'Prioritas Bantuan (Support)'
      ],
      disabled: false
    }
  ];

  const handleWhatsApp = (plan) => {
    const text = `Halo Admin Xirlo POS, saya ingin berlangganan paket *${plan.name}*. Mohon info pembayarannya.`;
    const waUrl = `https://wa.me/6281234567890?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank');
  };

  const handleMidtrans = () => {
    alert("🚀 Auto-Pay (QRIS/Virtual Account) via Midtrans sedang dalam pengembangan (Coming Soon).\n\nUntuk saat ini, silakan gunakan metode Manual Transfer via WhatsApp.");
  };

  return (
    <div className="pricing-container slide-in">
      <div className="pricing-header">
        <h1>Pilih Paket Langganan Anda</h1>
        <p>Buka semua fitur dan kembangkan bisnis Anda tanpa batas.</p>
      </div>

      <div className="pricing-cards">
        {plans.map(plan => (
          <div key={plan.id} className={`pricing-card ${plan.recommended ? 'recommended' : ''}`}>
            {plan.recommended && <div className="badge">Paling Laris</div>}
            <h2>{plan.name}</h2>
            <p className="desc">{plan.description}</p>
            <div className="price-tag">
              <span className="amount">{plan.price}</span>
              <span className="period">{plan.period}</span>
            </div>
            
            <ul className="features-list">
              {plan.features.map((feat, i) => (
                <li key={i}><Check size={16} className="text-success" /> {feat}</li>
              ))}
            </ul>

            <div className="action-buttons">
              <button 
                className="btn-primary" 
                style={{ backgroundColor: '#25D366', borderColor: '#25D366', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', marginBottom: '10px' }}
                onClick={() => handleWhatsApp(plan)}
              >
                <MessageCircle size={18} /> Beli via WhatsApp
              </button>
              <button 
                className="btn-secondary" 
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%' }}
                onClick={handleMidtrans}
              >
                <CreditCard size={18} /> Auto-Pay (Coming Soon)
              </button>
            </div>
          </div>
        ))}
      </div>
      
      <style>{`
        .pricing-container {
          padding: 40px 20px;
          text-align: center;
        }
        .pricing-header h1 {
          color: var(--accent-color);
          margin-bottom: 10px;
        }
        .pricing-header p {
          color: var(--text-secondary);
          margin-bottom: 40px;
        }
        .pricing-cards {
          display: flex;
          gap: 30px;
          justify-content: center;
          flex-wrap: wrap;
        }
        .pricing-card {
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
          border-radius: var(--border-radius);
          padding: 30px;
          width: 320px;
          text-align: left;
          position: relative;
          transition: transform 0.3s ease;
        }
        .pricing-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 10px 20px rgba(0,0,0,0.2);
        }
        .pricing-card.recommended {
          border-color: var(--accent-color);
          background: linear-gradient(180deg, var(--bg-secondary) 0%, var(--bg-primary) 100%);
        }
        .badge {
          position: absolute;
          top: -12px;
          right: 20px;
          background: var(--accent-color);
          color: #000;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 0.8rem;
          font-weight: bold;
        }
        .pricing-card h2 {
          font-size: 1.5rem;
          margin-bottom: 10px;
        }
        .pricing-card .desc {
          color: var(--text-secondary);
          font-size: 0.9rem;
          margin-bottom: 20px;
          min-height: 40px;
        }
        .price-tag {
          margin-bottom: 30px;
        }
        .price-tag .amount {
          font-size: 2rem;
          font-weight: bold;
          color: var(--accent-color);
        }
        .price-tag .period {
          color: var(--text-secondary);
          font-size: 0.9rem;
        }
        .features-list {
          list-style: none;
          padding: 0;
          margin: 0 0 30px 0;
        }
        .features-list li {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 15px;
          font-size: 0.95rem;
        }
        .text-success {
          color: var(--success);
        }
      `}</style>
    </div>
  );
}

export default Pricing;
