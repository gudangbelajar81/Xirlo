import React, { useState, useEffect, useRef } from 'react';
import { Package, Plus, Trash2, Edit, Save, X, Image as ImageIcon, Lock } from 'lucide-react';
import imageCompression from 'browser-image-compression';
import { apiCall } from '../api';

export default function Inventory({ license }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [editId, setEditId] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [historyData, setHistoryData] = useState([]);
  const fileInputRef = useRef(null);
  
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    cost_price: '',
    current_stock: 0,
    new_stock: '',
    image_url: '',
    color_desc: '',
    category: '',
    barcode: '',
    min_stock: 0
  });

  const totalStock = formData.current_stock + (Number(formData.new_stock) || 0);

  
  const fetchHistory = async () => {
    try {
      const data = await apiCall('/inventory/history');
      setHistoryData(data);
    } catch (err) {
      console.error(err);
    }
  };
  
  useEffect(() => {
    if (showHistory) fetchHistory();
  }, [showHistory]);

  const fetchProducts = async () => {
    try {
      const data = await apiCall('/products');
      setProducts(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleImageSelect = async (e) => {
    let file = e.target.files[0];
    if (!file) return;
    
    setUploading(true);
    
    try {
      // Compress image client-side to save bandwidth and server storage
      const options = {
        maxSizeMB: 0.2, // Max 200KB
        maxWidthOrHeight: 800, // Max dimension 800px
        useWebWorker: true,
      };
      
      const compressedFile = await imageCompression(file, options);
      
      const body = new FormData();
      body.append('image', compressedFile);
      
      const res = await apiCall('/upload', {
        method: 'POST',
        body
      });
      setFormData({ ...formData, image_url: res.url });
    } catch (err) {
      alert('Upload gagal: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        name: formData.name,
        price: Number(formData.price) || 0,
        cost_price: Number(formData.cost_price) || 0,
        stock: totalStock,
        image_url: formData.image_url || '',
        color_desc: formData.color_desc || '',
        category: formData.category || '',
        barcode: formData.barcode || '',
        min_stock: Number(formData.min_stock) || 0
      };

      if (editId) {
        await apiCall(`/products/${editId}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
        setMsg('Barang berhasil diupdate!');
      } else {
        await apiCall('/products', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        setMsg('Barang berhasil ditambahkan!');
      }
      resetForm();
      fetchProducts();
      setTimeout(() => setMsg(''), 3000);
    } catch (err) {
      setMsg('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (p) => {
    setEditId(p.id);
    setFormData({
      name: p.name,
      price: p.price,
      cost_price: p.cost_price || '',
      current_stock: p.stock,
      new_stock: '',
      image_url: p.image_url || '',
      color_desc: p.color_desc || '',
      category: p.category || '',
      barcode: p.barcode || '',
      min_stock: p.min_stock || 0
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setEditId(null);
    setFormData({ name: '', price: '', cost_price: '', current_stock: 0, new_stock: '', image_url: '', color_desc: '', category: '', min_stock: 0 });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Yakin ingin menghapus barang ini?')) return;
    try {
      await apiCall(`/products/${id}`, { method: 'DELETE' });
      fetchProducts();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="settings-layout" style={{ maxWidth: '1000px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
        <Package size={32} color="var(--accent-color)" />
        <h2>Manajemen Gudang & Produk</h2>
      </div>

      <div className="settings-card glass">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3>{editId ? 'Edit Barang' : 'Tambah Barang Baru'}</h3>
          {editId && <button onClick={resetForm} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={24} /></button>}
        </div>
        {msg && <div style={{ color: 'var(--success)', marginBottom: '16px', fontWeight: '600' }}>{msg}</div>}
        
        <form onSubmit={handleSave} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '16px' }}>
          
          <div className="input-group">
            <label>Gambar Produk</label>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              {formData.image_url ? (
                <img src={formData.image_url} alt="preview" style={{ width: '60px', height: '60px', borderRadius: `var(--border-radius)`, objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '60px', height: '60px', borderRadius: `var(--border-radius)`, backgroundColor: 'var(--bg-primary)', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--text-secondary)' }}>
                  <ImageIcon size={24} />
                </div>
              )}
              <div style={{ flex: 1 }}>
                <input 
                  type="file" 
                  accept="image/*" 
                  capture="environment" 
                  onChange={handleImageSelect}
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                />
                <button 
                  type="button" 
                  onClick={() => fileInputRef.current?.click()}
                  style={{ width: '100%', padding: '12px', borderRadius: `var(--border-radius)`, border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', cursor: 'pointer', textAlign: 'center' }}
                >
                  {uploading ? 'Mengunggah...' : 'Buka Kamera / Galeri'}
                </button>
              </div>
            </div>
          </div>

          <div className="input-group">
            <label>Nama Barang *</label>
            <input type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required placeholder="Cth: Gula Jawa Asli 1Kg" />
          </div>

          <div className="input-group">
            <label>Pengaturan Stok *</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Sisa</span>
                <input type="number" value={formData.current_stock} disabled style={{ backgroundColor: 'var(--bg-primary)', opacity: 0.7, padding: '10px' }} />
              </div>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Baru</span>
                <input type="number" value={formData.new_stock} onChange={(e) => setFormData({...formData, new_stock: e.target.value})} placeholder="+ 0" style={{ padding: '10px' }} />
              </div>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total</span>
                <input type="number" value={totalStock} disabled style={{ backgroundColor: 'var(--accent-color)', color: 'white', fontWeight: 'bold', padding: '10px' }} />
              </div>
            </div>
          </div>

          <div className="input-group">
            <label>Harga Jual (Rp) *</label>
            <input type="number" value={formData.price} onChange={(e) => setFormData({...formData, price: e.target.value})} required placeholder="25000" />
          </div>

          <div className="input-group">
            <label>Harga Modal (Rp) *</label>
            <input type="number" value={formData.cost_price} onChange={(e) => setFormData({...formData, cost_price: e.target.value})} placeholder="20000" />
          </div>

          <div className="input-group">
            <label>Deskripsi Warna (Opsional)</label>
            <input type="text" value={formData.color_desc} onChange={(e) => setFormData({...formData, color_desc: e.target.value})} placeholder="Cokelat keemasan" />
          </div>

          <div className="input-group">
            <label>Kategori (Opsional)</label>
            <input type="text" value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} placeholder="Grosir" />
          </div>

          
          {license?.features?.includes('feat_retail') && (
            <div className="input-group">
              <label>Batas Minimum Stok 🚨</label>
              <input type="number" value={formData.min_stock} onChange={(e) => setFormData({...formData, min_stock: e.target.value})} placeholder="Misal: 5" />
              <small style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', display: 'block', marginTop: '4px' }}>
                Akan muncul peringatan di Kasir jika stok mencapai batas ini.
              </small>
            </div>
          )}

          <div className="input-group">
            <label>Barcode Scanner</label>
            <input type="text" value={formData.barcode} onChange={(e) => setFormData({...formData, barcode: e.target.value})} placeholder="Scan barcode disini..." />
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <button type="submit" className="auth-btn" disabled={loading || uploading} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              {editId ? <><Save size={20} /> Simpan Perubahan</> : <><Plus size={20} /> Tambahkan ke Etalase</>}
            </button>
          </div>
        </form>
      </div>

      <div className="settings-card glass">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3>{showHistory ? 'Kartu Riwayat Stok 📋' : `Daftar Barang (${products.length})`}</h3>
          <button 
            onClick={() => {
              if (!license?.features?.includes('feat_retail')) {
                alert('🚨 FITUR TERKUNCI\n\nFitur Kartu Riwayat Stok hanya tersedia untuk Modul Retail. Silakan Upgrade Lisensi Anda!');
                return;
              }
              setShowHistory(!showHistory);
            }} 
            style={{ padding: '8px 16px', borderRadius: `var(--border-radius)`, border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            {!license?.features?.includes('feat_retail') && <Lock size={14} color="var(--warning)" />}
            {showHistory ? 'Kembali ke Daftar Barang' : 'Lihat Riwayat Stok'}
          </button>
        </div>

        {showHistory ? (
          <div style={{ overflowX: 'auto', marginTop: '16px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '12px 8px' }}>Waktu</th>
                  <th style={{ padding: '12px 8px' }}>Nama Barang</th>
                  <th style={{ padding: '12px 8px' }}>Perubahan Stok</th>
                  <th style={{ padding: '12px 8px' }}>Keterangan</th>
                  <th style={{ padding: '12px 8px' }}>User</th>
                </tr>
              </thead>
              <tbody>
                {historyData.map(h => (
                  <tr key={h.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '12px 8px' }}>{new Date(h.created_at).toLocaleString('id-ID')}</td>
                    <td style={{ padding: '12px 8px' }}>{h.product_name}</td>
                    <td style={{ padding: '12px 8px', color: h.qty_change > 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 'bold' }}>
                      {h.qty_change > 0 ? `+${h.qty_change}` : h.qty_change}
                    </td>
                    <td style={{ padding: '12px 8px' }}>{h.reason}</td>
                    <td style={{ padding: '12px 8px' }}>{h.user_name || 'System'}</td>
                  </tr>
                ))}
                {historyData.length === 0 && (
                  <tr><td colSpan="5" style={{ textAlign: 'center', padding: '20px' }}>Belum ada riwayat stok</td></tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ overflowX: 'auto', marginTop: '16px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
              <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '12px 8px' }}>Gambar</th>
                <th style={{ padding: '12px 8px' }}>Nama</th>
                <th style={{ padding: '12px 8px' }}>Barcode</th>
                <th style={{ padding: '12px 8px' }}>Kategori</th>
                <th style={{ padding: '12px 8px' }}>Warna/Ket</th>
                <th style={{ padding: '12px 8px' }}>Modal</th>
                <th style={{ padding: '12px 8px' }}>Jual</th>
                <th style={{ padding: '12px 8px' }}>Stok</th>
                <th style={{ padding: '12px 8px' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {products.map(p => (
                <tr key={p.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '12px 8px' }}>
                    {p.image_url ? <img src={p.image_url} alt="img" style={{ width: '40px', height: '40px', borderRadius: `var(--border-radius)`, objectFit: 'cover' }} /> : '-'}
                  </td>
                  <td style={{ padding: '12px 8px', fontWeight: 'bold' }}>{p.name}</td>
                  <td style={{ padding: '12px 8px', color: 'var(--text-secondary)' }}>{p.barcode || '-'}</td>
                  <td style={{ padding: '12px 8px', color: 'var(--text-secondary)' }}>{p.category || '-'}</td>
                  <td style={{ padding: '12px 8px' }}>{p.color_desc || '-'}</td>
                  <td style={{ padding: '12px 8px' }}>Rp {Number(p.cost_price || 0).toLocaleString()}</td>
                  <td style={{ padding: '12px 8px', color: 'var(--accent-color)', fontWeight: '600' }}>Rp {Number(p.price).toLocaleString()}</td>
                  <td style={{ padding: '12px 8px' }}>
                    <span style={{ padding: '4px 8px', borderRadius: '4px', backgroundColor: p.stock <= 5 ? 'var(--danger)' : 'var(--bg-primary)', color: p.stock <= 5 ? 'white' : 'inherit' }}>
                      {p.stock}
                    </span>
                  </td>
                  <td style={{ padding: '12px 8px', display: 'flex', gap: '8px' }}>
                    <button onClick={() => handleEdit(p)} style={{ color: 'var(--accent-color)', padding: '6px', borderRadius: '6px', backgroundColor: 'var(--bg-primary)', border: 'none', cursor: 'pointer' }} title="Edit">
                      <Edit size={18} />
                    </button>
                    <button onClick={() => handleDelete(p.id)} style={{ color: 'var(--danger)', padding: '6px', borderRadius: '6px', backgroundColor: 'var(--bg-primary)', border: 'none', cursor: 'pointer' }} title="Hapus">
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
              {products.length === 0 && (
                <tr><td colSpan="5" style={{ textAlign: 'center', padding: '24px' }}>Belum ada barang di gudang.</td></tr>
              )}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </div>
  );
}
