import React, { useState, useEffect } from 'react';
import { ShoppingCart, CheckCircle, Printer, FileText, AlertCircle, Plus, Minus, Trash2, TrendingUp, Package } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { apiCall } from '../api';
import jsPDF from 'jspdf';

export default function Dashboard({ user, appSettings, license }) {
  const appName = appSettings?.app_name || 'HASIL TEKUN';
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showMobileCart, setShowMobileCart] = useState(false);
  const [transactionId, setTransactionId] = useState(null);
  const [outOfStockMsg, setOutOfStockMsg] = useState('');
  const [promoNominal, setPromoNominal] = useState('2000');
  const [promoMinQty, setPromoMinQty] = useState(2);
  const [promoType, setPromoType] = useState('rp'); // 'rp' or '%'
  const [customPromoOptions, setCustomPromoOptions] = useState(() => JSON.parse(localStorage.getItem('customPromos') || '["1000", "2000", "3000", "5000"]'));
  const [customerWa, setCustomerWa] = useState('');
  const [marginAlerts, setMarginAlerts] = useState({ threshold: 10, items: [] });
  const [lowStockAlerts, setLowStockAlerts] = useState([]);
  const [salesData, setSalesData] = useState([]);

  const fetchProducts = async () => {
    try {
      const data = await apiCall('/products');
      setProducts(data);
    } catch (err) {
      console.error(err);
    }
  };

  
  const fetchLowStockAlerts = async () => {
    try {
      if (license?.features?.includes('feat_retail')) {
        const data = await apiCall('/inventory/alerts/low-stock');
        setLowStockAlerts(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchMarginAlerts = async () => {
    try {
      const data = await apiCall('/alerts/margin');
      setMarginAlerts(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSalesData = async () => {
    try {
      const data = await apiCall('/reports/sales');
      // format for last 7 days
      const formattedSales = data.slice(0, 7).reverse().map(item => {
        const d = new Date(item.date);
        return {
          day: `${d.getDate()}/${d.getMonth()+1}`,
          total: Number(item.total_sales)
        };
      });
      setSalesData(formattedSales);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchMarginAlerts();
    fetchLowStockAlerts();
    fetchSalesData();
  }, [license]);

  useEffect(() => {
    let barcodeBuffer = '';
    let barcodeTimeout = null;

    const handleKeyDown = (e) => {
      // Ignore if typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;

      if (barcodeTimeout) clearTimeout(barcodeTimeout);

      if (e.key === 'Enter') {
        if (barcodeBuffer.length > 3) {
          const scannedProduct = products.find(p => p.barcode === barcodeBuffer);
          if (scannedProduct) {
            addToCart(scannedProduct);
          } else {
            setOutOfStockMsg(`Barcode tidak ditemukan: ${barcodeBuffer}`);
            setTimeout(() => setOutOfStockMsg(''), 3000);
          }
        }
        barcodeBuffer = '';
      } else if (e.key.length === 1) {
        barcodeBuffer += e.key;
        barcodeTimeout = setTimeout(() => {
          barcodeBuffer = '';
        }, 100); // 100ms timeout for scanner speed
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [products, cart]); // depends on products to find them, and cart to addToCart properly


  const addToCart = (product) => {
    if (product.stock <= 0) {
      setOutOfStockMsg(`Maaf, stok ${product.name} habis!`);
      setTimeout(() => setOutOfStockMsg(''), 3000);
      return;
    }
    const existingItem = cart.find(item => item.id === product.id);
    if (existingItem) {
      if (existingItem.qty >= product.stock) {
        setOutOfStockMsg(`Maksimal stok ${product.name} tercapai!`);
        setTimeout(() => setOutOfStockMsg(''), 3000);
        return;
      }
      setCart(cart.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item));
    } else {
      setCart([...cart, { ...product, price: Number(product.price), qty: 1 }]);
    }
  };

  const updateQty = (id, delta) => {
    setCart(cart.map(item => {
      if (item.id === id) {
        const newQty = item.qty + delta;
        if (newQty <= 0) return null;
        const prodStock = products.find(p => p.id === id)?.stock ?? 9999;
        if (newQty > prodStock) {
          setOutOfStockMsg(`Maksimal stok tercapai!`);
          setTimeout(() => setOutOfStockMsg(''), 3000);
          return item;
        }
        return { ...item, qty: newQty };
      }
      return item;
    }).filter(Boolean));
  };

  const removeFromCart = (id) => setCart(cart.filter(item => item.id !== id));

  // ─── KALKULASI PROMO ───────────────────────────────────────────────────────
  // promo adalah angka murni (bukan string), selalu segar dari state
  const promo = Number(promoNominal) || 0;

  
  const handlePromoChange = (val) => {
    setPromoNominal(val);
    if (val && !customPromoOptions.includes(val)) {
      const newOptions = [...customPromoOptions, val].sort((a,b) => Number(a) - Number(b));
      setCustomPromoOptions(newOptions);
      localStorage.setItem('customPromos', JSON.stringify(newOptions));
    }
  };

  // Hitung harga efektif per-item: potong jika qty >= 2 dan promo > 0
  const calcEffPrice = (price, qty) => {
    const p = Number(price) || 0;
    const q = Number(qty) || 0;
    if (q >= promoMinQty && promo > 0) {
      if (promoType === '%') {
        const discountVal = Math.min(promo, 100);
        return Math.max(0, p - (p * discountVal / 100));
      } else {
        return Math.max(0, p - promo);
      }
    }
    return p;
  };

  // Hitung subtotal tiap item (harga efektif × qty)
  const calcItemSubtotal = (price, qty) => {
    const q = Number(qty) || 0;
    return calcEffPrice(price, qty) * q;
  };

  // Total keseluruhan keranjang
  const totalAmount = cart.reduce((sum, item) => sum + calcItemSubtotal(item.price, item.qty), 0);

  // Total tanpa promo (untuk menghitung selisih hemat)
  const totalTanpaPromo = cart.reduce((sum, item) => sum + (Number(item.price) * Number(item.qty)), 0);
  const totalHemat = totalTanpaPromo - totalAmount;
  // ──────────────────────────────────────────────────────────────────────────

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    try {
      const payload = {
        items: cart.map(item => ({
          product_id: item.id,
          qty: Number(item.qty),
          price_unit: calcEffPrice(item.price, item.qty)
        })),
        payment_method: 'CASH',
        discount_amount: 0,
        customer_wa: customerWa
      };
      const res = await apiCall('/transactions', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      setTransactionId(res.transaction_id);
      setShowConfirm(false);
      setShowModal(true);
      fetchProducts();
    } catch (err) {
      alert(err.message);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setCart([]);
    setPromoNominal('2000'); // reset ke default
    setTransactionId(null);
    setCustomerWa('');
  };

  const fmt = (num) => Number(num).toLocaleString('id-ID');

  const printPDF = () => {
    const fmtRp = (num) => Number(num).toLocaleString('id-ID');

    const generateDoc = (logoImg) => {
      const doc = new jsPDF({ unit: 'mm', format: [80, 200] });
      let startY = 10;

      // TAMPILAN LOGO VEKTOR TRANSPARAN UNTUK NOTA
      // Menggambar frame kotak
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.5);
      doc.roundedRect(25, 4, 30, 14, 2, 2, 'S');
      
      // Teks "HT" tebal
      doc.setFontSize(22);
      doc.setFont(undefined, 'bold');
      doc.text("HT", 40, 13, { align: 'center' });
      
      // Teks "PRODUCTION"
      doc.setFontSize(7);
      doc.setFont(undefined, 'normal');
      doc.text("P R O D U C T I O N", 40, 16.5, { align: 'center' });
      
      startY = 24;

      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');
      doc.text(`No. Nota: #${transactionId}`, 40, startY, { align: 'center' });
      doc.text(`Tanggal: ${new Date().toLocaleDateString('id-ID')}`, 40, startY + 5, { align: 'center' });
      doc.text(`WA: ${appSettings?.phone_number || '081390111362'}`, 40, startY + 10, { align: 'center' });
      doc.line(5, startY + 13, 75, startY + 13);
      
      // Items
      let y = startY + 19;
      cart.forEach(item => {
        const q    = Number(item.qty);
        const effP = calcEffPrice(item.price, item.qty);
        const sub  = effP * q;

        // Nama barang
        doc.setFontSize(9);
        doc.text(item.name.substring(0, 28), 5, y);
        y += 5;

        // Detail
        doc.setFontSize(8);
        const detail = `  ${q} x Rp${fmtRp(effP)}`;
        doc.text(detail, 5, y);
        doc.text(`Rp${fmtRp(sub)}`, 75, y, { align: 'right' });
        y += 6;
      });

      doc.line(5, y, 75, y);
      y += 5;

      // Hemat promo
      if (totalHemat > 0) {
        doc.setFontSize(9);
        doc.text("Hemat Promo:", 5, y);
        doc.text(`-Rp${fmtRp(totalHemat)}`, 75, y, { align: 'right' });
        y += 6;
      }

      // Total
      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      doc.text("TOTAL BAYAR", 5, y);
      doc.text(`Rp${fmtRp(totalAmount)}`, 75, y, { align: 'right' });
      y += 8;

      doc.setFont(undefined, 'normal');
      doc.setFontSize(8);
      doc.text("Terima kasih atas kunjungan Anda!", 40, y, { align: 'center' });

      doc.save(`Nota_${transactionId}.pdf`);
    };

    // Load logo
    const logoUrl = appSettings?.logo_url || '/logo.png';
    if (logoUrl) {
      const img = new Image();
      img.src = logoUrl;
      img.crossOrigin = 'Anonymous';
      img.onload = () => generateDoc(img);
      img.onerror = () => generateDoc(null);
    } else {
      generateDoc(null);
    }
  };

  const printThermal = () => {
    window.print();
  };

  return (
    <div className="dashboard-layout">
      {outOfStockMsg && (
        <div style={{ position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)', backgroundColor: 'var(--danger)', color: 'white', padding: '12px 24px', borderRadius: `var(--border-radius)`, zIndex: 9999, display: 'flex', alignItems: 'center', gap: '8px', boxShadow: 'var(--shadow-md)' }}>
          <AlertCircle size={20} /> {outOfStockMsg}
        </div>
      )}

      {/* ── AREA PRODUK ── */}
      <div className="products-area">

        
        {/* Peringatan Stok Kritis (Retail Module) */}
        {license?.features?.includes('feat_retail') && lowStockAlerts?.length > 0 && (
          <div className="promo-area glass" style={{ marginBottom: '24px', padding: '16px', background: 'var(--warning)', color: '#000', borderColor: 'var(--warning)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Package size={20} />
              <strong style={{ fontSize: '1.1rem' }}>📦 PERINGATAN STOK MENIPIS</strong>
            </div>
            <p style={{ margin: 0, fontSize: '0.9rem', marginBottom: '12px' }}>Ada {lowStockAlerts.length} produk yang sudah mencapai batas minimum stok. Waktunya kulakan!</p>
            <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.85rem', maxHeight: '100px', overflowY: 'auto' }}>
              {lowStockAlerts.map(m => (
                <li key={m.id}>
                  <strong>{m.name}</strong> - Sisa Stok: <span style={{ color: 'red', fontWeight: 'bold' }}>{m.stock}</span> (Batas: {m.min_stock})
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Detektif HPP (AI Margin Monitor) */}
        {marginAlerts?.items?.length > 0 && (
          <div className="promo-area glass" style={{ marginBottom: '24px', padding: '16px', background: 'var(--danger)', color: 'white', borderColor: 'var(--danger)', animation: 'pulse 2s infinite' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <AlertCircle size={20} />
              <strong style={{ fontSize: '1.1rem' }}>⚠️ MATA DETEKTIF HPP</strong>
            </div>
            <p style={{ margin: 0, fontSize: '0.9rem', marginBottom: '12px' }}>Ditemukan {marginAlerts.items.length} produk dengan profit sangat tipis (di bawah {marginAlerts.threshold}% HPP):</p>
            <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.85rem' }}>
              {marginAlerts.items.map(m => (
                <li key={m.id}>
                  {m.name} - Harga: Rp{fmt(m.price)} | HPP: Rp{fmt(m.cost_price)} 
                  <strong style={{ marginLeft: '8px' }}>(Margin: {m.margin_pct}%)</strong>
                </li>
              ))}
            </ul>
            <p style={{ margin: 0, fontSize: '0.8rem', marginTop: '12px', opacity: 0.8 }}>*Segera evaluasi harga jual agar tidak rugi!</p>
          </div>
        )}

                  {/* Form Potongan Grosir */}
          <div className="promo-area glass" style={{ marginBottom: '24px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
                Besar Potongan Grosir Per Item
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <select 
                  value={promoType}
                  onChange={(e) => setPromoType(e.target.value)}
                  style={{ width: '80px', padding: '10px', borderRadius: `var(--border-radius)`, border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', fontWeight: 'bold' }}
                >
                  <option value="rp">Rp</option>
                  <option value="%">%</option>
                </select>
                <input
                type="number"
                list="promo-options"
                value={promoNominal}
                onChange={(e) => setPromoNominal(e.target.value)}
                onBlur={(e) => handlePromoChange(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: `var(--border-radius)`, border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '1.1rem', fontWeight: 'bold' }}
                placeholder="Ketik nominal atau pilih..."
              />
              </div>
              <datalist id="promo-options">
                {customPromoOptions.map(opt => (
                  <option key={opt} value={opt}>Rp {Number(opt).toLocaleString('id-ID')}</option>
                ))}
              </datalist>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                Syarat Min. Beli:
              </label>
              <input
                type="number"
                value={promoMinQty}
                onChange={(e) => setPromoMinQty(Number(e.target.value))}
                min="1"
                style={{ width: '60px', padding: '6px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', textAlign: 'center', fontWeight: 'bold' }}
              />
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>buah</span>
            </div>
          </div>

        {/* Grid Produk */}
        <div className="products-grid">
          {products.map(p => (
            <div
              key={p.id}
              className={`product-card ${p.stock <= 0 ? 'out-of-stock' : ''}`}
              onClick={() => addToCart(p)}
            >
              {p.stock <= 0 && <span className="out-of-stock-badge">HABIS</span>}
              {p.image_url ? (
                <img src={p.image_url} alt={p.name} className="product-image" />
              ) : (
                <div className="product-image-placeholder">No Image</div>
              )}
              <div className="product-info">
                <span className="product-name">{p.name}</span>
                <span className="product-price">Rp {fmt(p.price)}</span>
                <span className="product-stock">Sisa Stok: {p.stock}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── AREA KERANJANG (Desktop/Tablet) ── */}
      <div className="cart-area glass-dark">
        <div className="cart-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2><ShoppingCart size={20} style={{ display: 'inline', marginRight: '8px' }} /> Keranjang</h2>
          {cart.length > 0 && (
            <button
              onClick={() => setCart([])}
              style={{ background: 'none', border: 'none', color: 'var(--danger)', fontSize: '0.85rem', cursor: 'pointer', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <Trash2 size={14} /> Kosongkan
            </button>
          )}
        </div>

        <div className="cart-items">
          {cart.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--text-secondary)', marginTop: '40px' }}>
              Keranjang kosong
            </div>
          )}

          {cart.map(item => {
            const p        = Number(item.price);
            const q        = Number(item.qty);
            const effPrice = calcEffPrice(p, q);
            const subtotal = effPrice * q;
            const diskon   = q >= 2 && promo > 0;

            return (
              <div key={item.id} className="cart-item" style={{ position: 'relative', paddingRight: '36px' }}>
                <div className="cart-item-info">
                  <div className="cart-item-name">{item.name}</div>
                  <div className="cart-item-price" style={{ marginTop: '4px' }}>
                    {/* Baris harga satuan */}
                    {diskon ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ textDecoration: 'line-through', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                          Rp{fmt(p)}
                        </span>
                        <span style={{ color: 'var(--success)', fontWeight: '600' }}>
                          Rp{fmt(effPrice)}
                        </span>
                      </div>
                    ) : (
                      <span>Rp{fmt(p)}</span>
                    )}
                    {/* Baris subtotal */}
                    <div style={{ marginTop: '2px', color: 'var(--accent-color)', fontWeight: 'bold' }}>
                      = Rp{fmt(subtotal)}
                    </div>
                  </div>
                </div>

                <div className="cart-item-controls">
                  <button className="qty-btn" onClick={() => updateQty(item.id, -1)}><Minus size={14} /></button>
                  <span style={{ width: '24px', textAlign: 'center', fontWeight: '600' }}>{q}</span>
                  <button className="qty-btn" onClick={() => updateQty(item.id, 1)}><Plus size={14} /></button>
                </div>

                <button
                  onClick={() => removeFromCart(item.id)}
                  style={{ position: 'absolute', right: '0', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '8px' }}
                  title="Hapus Barang"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            );
          })}
        </div>

        {/* Footer Total */}
        <div className="cart-footer">
          {totalHemat > 0 && (
            <div className="cart-total-row" style={{ color: 'var(--success)', marginBottom: '4px' }}>
              <span className="cart-total-label">Hemat Promo</span>
              <span className="cart-total-amount" style={{ fontSize: '1rem' }}>- Rp{fmt(totalHemat)}</span>
            </div>
          )}
          <div className="cart-total-row" style={{ borderTop: '2px dashed var(--border-color)', paddingTop: '8px' }}>
            <span className="cart-total-label">Total Bayar</span>
            <span className="cart-total-amount">Rp {fmt(totalAmount)}</span>
          </div>
          <button 
            className="btn-primary" 
            style={{ width: '100%', padding: '16px', fontSize: '1.1rem' }} 
            onClick={() => setShowConfirm(true)}
          >
            Bayar Sekarang
          </button>
        </div>
      </div>

      {/* 🔴 MODAL KONFIRMASI (Bisa Batal) 🔴 */}
      {showConfirm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-icon">
              <AlertCircle size={64} color="var(--accent-color)" />
            </div>

      {/* ── FLOATING CART BUTTON (Mobile only) ── */}
      {cart.length >= 0 && (
        <button
          onClick={() => setShowMobileCart(true)}
          style={{
            position: 'fixed',
            bottom: '80px',
            right: '20px',
            zIndex: 999,
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: 'var(--accent-color)',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: '2px',
            fontSize: '0.6rem',
            fontWeight: 'bold'
          }}
          className="mobile-cart-fab"
        >
          <ShoppingCart size={22} />
          {cart.length > 0 && (
            <span style={{
              position: 'absolute',
              top: '-4px',
              right: '-4px',
              background: '#e53e3e',
              color: 'white',
              borderRadius: '50%',
              width: '20px',
              height: '20px',
              fontSize: '0.7rem',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid var(--bg-primary)'
            }}>{cart.length}</span>
          )}
        </button>
      )}

      {/* ── MOBILE CART FULLSCREEN SHEET ── */}
      {showMobileCart && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--bg-dark-panel)',
          color: 'var(--text-on-dark)'
        }}>
          {/* Sheet Header */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-color)',
            background: 'var(--bg-dark-panel)'
          }}>
            <h2 style={{ margin: 0, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShoppingCart size={20} /> Keranjang ({cart.length} item)
            </h2>
            <button onClick={() => setShowMobileCart(false)} style={{
              background: 'var(--bg-primary)', border: 'none', color: 'var(--text-primary)',
              borderRadius: '50%', width: '32px', height: '32px', fontSize: '1.2rem',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>✕</button>
          </div>

          {/* Cart Items */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
            {cart.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-secondary)', marginTop: '60px', fontSize: '1rem' }}>Belum ada produk dipilih</div>
            ) : (
              cart.map(item => {
                const p = Number(item.price);
                const q = Number(item.qty);
                const effPrice = calcEffPrice(p, q);
                const subtotal = effPrice * q;
                const diskon = q >= 2 && promo > 0;
                return (
                  <div key={item.id} style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '12px 0', borderBottom: '1px dashed var(--border-color)'
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '600', fontSize: '0.95rem' }}>{item.name}</div>
                      {diskon ? (
                        <div style={{ fontSize: '0.8rem' }}>
                          <span style={{ textDecoration: 'line-through', color: 'var(--text-secondary)' }}>Rp{fmt(p)}</span>
                          {' '}<span style={{ color: 'var(--success)', fontWeight: 'bold' }}>Rp{fmt(effPrice)}</span>
                        </div>
                      ) : (
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Rp{fmt(p)}</div>
                      )}
                      <div style={{ color: 'var(--accent-color)', fontWeight: 'bold', fontSize: '0.9rem' }}>= Rp{fmt(subtotal)}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'white', borderRadius: '8px', padding: '4px 8px' }}>
                      <button className="qty-btn" onClick={() => updateQty(item.id, -1)} style={{ color: '#333' }}><Minus size={14} /></button>
                      <span style={{ color: '#333', fontWeight: '700', minWidth: '20px', textAlign: 'center' }}>{q}</span>
                      <button className="qty-btn" onClick={() => updateQty(item.id, 1)} style={{ color: '#333' }}><Plus size={14} /></button>
                    </div>
                    <button onClick={() => removeFromCart(item.id)} style={{
                      background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '4px'
                    }}><Trash2 size={18} /></button>
                  </div>
                );
              })
            )}
          </div>

          {/* Sheet Footer */}
          <div style={{
            padding: '16px 20px',
            borderTop: '1px dashed var(--border-color)',
            background: 'var(--bg-dark-panel)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px', fontSize: '1.1rem', fontWeight: 'bold' }}>
              <span>Total Bayar</span>
              <span style={{ color: 'var(--accent-color)' }}>Rp {fmt(total)}</span>
            </div>
            <button
              className="btn-primary"
              style={{ width: '100%', padding: '14px', fontSize: '1rem', borderRadius: '12px' }}
              disabled={cart.length === 0}
              onClick={() => { setShowMobileCart(false); setShowConfirm(true); }}
            >
              Bayar Sekarang
            </button>
          </div>
        </div>
      )}
            <h3>Konfirmasi Pembayaran</h3>
            <p style={{ fontSize: '1.1rem', marginBottom: '16px' }}>
              Total Tagihan: <strong style={{ color: 'var(--accent-color)', fontSize: '1.3rem' }}>Rp{Number(totalAmount).toLocaleString('id-ID')}</strong><br/>
              Apakah pesanan sudah benar dan uang pas/sesuai?
            </p>

            <div style={{ marginBottom: '24px', textAlign: 'left' }}>
              <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '8px', display: 'block' }}>Kirim Struk via WA (Opsional)</label>
              <input 
                type="text" 
                placeholder="Misal: 08123456789" 
                value={customerWa} 
                onChange={(e) => setCustomerWa(e.target.value)}
                style={{ width: '100%', padding: '12px', borderRadius: `var(--border-radius)`, border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
              />
              <small style={{ color: 'var(--text-muted)' }}>*Butuh fitur Struk Digital WA aktif</small>
            </div>
            
            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="btn-outline" onClick={() => setShowConfirm(false)} style={{ flex: 1 }}>
                Kembali (Edit)
              </button>
              <button className="btn-primary" onClick={handleCheckout} style={{ flex: 1, backgroundColor: 'var(--success)', borderColor: 'var(--success)' }}>
                Ya, Proses!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🟢 MODAL SUKSES 🟢 */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-icon">
              <CheckCircle size={64} color="var(--success)" />
            </div>
            <h3>Pembayaran Berhasil</h3>
            <p>Transaksi #{transactionId} telah tersimpan. Stok barang otomatis dikurangi.</p>
            <div className="receipt-actions">
              <button className="btn-outline" onClick={printPDF}>
                <FileText size={18} /> Nota PDF
              </button>
              <button className="btn-primary" onClick={printThermal}>
                <Printer size={18} /> Print Thermal
              </button>
            </div>
            <button className="modal-close-btn" onClick={closeModal} style={{ marginTop: '24px', width: '100%' }}>
              Selesai & Transaksi Baru
            </button>
          </div>
        </div>
      )}

      {/* Hidden Thermal Print Area */}
      <div id="print-area">
        <div className="print-header">
          <h2>{appName}</h2>
          <p>Tanggal: {new Date().toLocaleDateString('id-ID')} {new Date().toLocaleTimeString('id-ID')}</p>
          {transactionId && <p>ID: #{transactionId}</p>}
        </div>
        <div className="print-divider">--------------------------------</div>
        {cart.map((item, idx) => {
          const p = Number(item.price);
          const qty = Number(item.qty);
          const promo = Number(promoNominal) || 0;
          const effPrice = (qty >= promoMinQty && promo > 0) ? (promoType === '%' ? Math.max(0, p - (p * Math.min(promo, 100) / 100)) : Math.max(0, p - promo)) : p;
          const sub = effPrice * qty;
          return (
            <div key={idx} className="print-item">
              <div>{item.name}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{qty} x {fmt(effPrice)}</span>
                <span>{fmt(sub)}</span>
              </div>
            </div>
          );
        })}
        <div className="print-divider">--------------------------------</div>
        <div className="print-total">
          <span>Total:</span>
          <span>Rp {fmt(totalAmount)}</span>
        </div>
        <div className="print-footer">
          <p>Terima Kasih</p>
          <p>Barang yang dibeli tidak dapat ditukar/dikembalikan</p>
        </div>
      </div>
    </div>
  );
}
