import React, { useState, useEffect } from 'react';
import { ClipboardList, Printer, Trash2, Edit, TrendingUp, DollarSign, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { apiCall } from '../api';

export default function History() {
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const [data, summaryData] = await Promise.all([
        apiCall('/transactions'),
        apiCall('/transactions/summary')
      ]);
      setTransactions(data);
      setSummary(summaryData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };



  const handleDelete = async (id) => {
    const reason = window.prompt("⚠️ MATA ELANG AKTIF\nSistem mencatat pembatalan ini. Masukkan alasan pembatalan (wajib):");
    if (!reason || reason.trim() === '') {
      alert("Pembatalan dibatalkan. Alasan wajib diisi!");
      return;
    }
    
    try {
      await apiCall(`/transactions/${id}`, { 
        method: 'DELETE', 
        body: JSON.stringify({ reason: reason.trim() }) 
      });
      fetchHistory(); // refresh data
    } catch (err) {
      alert(err.message);
    }
  };

  const handleEdit = async (tx) => {
    const newMethod = window.prompt('Ubah Metode Bayar (CASH / QRIS / TRANSFER):', tx.payment_method);
    if (newMethod && newMethod !== tx.payment_method) {
      try {
        await apiCall(`/transactions/${tx.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            total_amount: tx.total_amount,
            payment_method: newMethod.toUpperCase()
          })
        });
        fetchHistory(); // refresh data
      } catch (err) {
        alert(err.message);
      }
    }
  };

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(transactions.map(t => ({
      'ID Transaksi': t.id,
      'Tanggal': new Date(t.created_at).toLocaleString('id-ID'),
      'Total (Rp)': t.total_amount,
      'Kasir': t.user_id, // in real app, might join with user table
    })));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Riwayat Transaksi");
    XLSX.writeFile(wb, `Riwayat_Transaksi_${new Date().toLocaleDateString('id-ID').replace(/\//g, '-')}.xlsx`);
  };

  if (loading) return <div style={{ padding: '24px' }}>Memuat riwayat...</div>;

  return (
    <div className="settings-layout" style={{ maxWidth: '1000px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <ClipboardList size={32} color="var(--accent-color)" />
          <h2>Riwayat Penjualan</h2>
        </div>
        <button onClick={exportToExcel} className="auth-btn" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Download size={18} /> Download Excel
        </button>
      </div>

      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '24px' }}>
          <div className="glass" style={{ padding: '20px', borderRadius: `var(--border-radius)`, display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ padding: '12px', backgroundColor: 'rgba(212, 163, 115, 0.2)', borderRadius: `var(--border-radius)`, color: 'var(--accent-color)' }}>
              <DollarSign size={24} />
            </div>
            <div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Pemasukan Hari Ini</p>
              <h3 style={{ fontSize: '1.2rem', color: 'var(--text-primary)' }}>Rp {summary.today_income.toLocaleString('id-ID')}</h3>
            </div>
          </div>
          
          <div className="glass" style={{ padding: '20px', borderRadius: `var(--border-radius)`, display: 'flex', alignItems: 'center', gap: '16px', border: '1px solid rgba(46, 204, 113, 0.2)' }}>
            <div style={{ padding: '12px', backgroundColor: 'rgba(46, 204, 113, 0.1)', borderRadius: `var(--border-radius)`, color: '#2ecc71' }}>
              <TrendingUp size={24} />
            </div>
            <div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Untung Hari Ini</p>
              <h3 style={{ fontSize: '1.2rem', color: '#2ecc71' }}>Rp {summary.today_profit.toLocaleString('id-ID')}</h3>
            </div>
          </div>

          <div className="glass" style={{ padding: '20px', borderRadius: `var(--border-radius)`, display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ padding: '12px', backgroundColor: 'rgba(212, 163, 115, 0.2)', borderRadius: `var(--border-radius)`, color: 'var(--accent-color)' }}>
              <DollarSign size={24} />
            </div>
            <div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Pemasukan Bln Ini</p>
              <h3 style={{ fontSize: '1.2rem', color: 'var(--text-primary)' }}>Rp {summary.month_income.toLocaleString('id-ID')}</h3>
            </div>
          </div>

          <div className="glass" style={{ padding: '20px', borderRadius: `var(--border-radius)`, display: 'flex', alignItems: 'center', gap: '16px', border: '1px solid rgba(46, 204, 113, 0.2)' }}>
            <div style={{ padding: '12px', backgroundColor: 'rgba(46, 204, 113, 0.1)', borderRadius: `var(--border-radius)`, color: '#2ecc71' }}>
              <TrendingUp size={24} />
            </div>
            <div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Untung Bln Ini</p>
              <h3 style={{ fontSize: '1.2rem', color: '#2ecc71' }}>Rp {summary.month_profit.toLocaleString('id-ID')}</h3>
            </div>
          </div>
        </div>
      )}

      <div className="settings-card glass">
        <h3>Daftar Transaksi</h3>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>Memuat data...</div>
        ) : (
          <div style={{ overflowX: 'auto', marginTop: '16px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '12px 8px' }}>ID Transaksi</th>
                  <th style={{ padding: '12px 8px' }}>Tanggal & Waktu</th>
                  <th style={{ padding: '12px 8px' }}>Kasir</th>
                  <th style={{ padding: '12px 8px' }}>Metode Bayar</th>
                  <th style={{ padding: '12px 8px', textAlign: 'right' }}>Total Belanja</th>
                  <th style={{ padding: '12px 8px', textAlign: 'center' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map(tx => (
                  <tr key={tx.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '12px 8px', fontWeight: '500' }}>#TRX-{tx.id.toString().padStart(4, '0')}</td>
                    <td style={{ padding: '12px 8px' }}>
                      {new Date(tx.created_at).toLocaleString('id-ID', {
                        day: 'numeric', month: 'long', year: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                      })}
                    </td>
                    <td style={{ padding: '12px 8px' }}>{tx.cashier_name}</td>
                    <td style={{ padding: '12px 8px' }}>
                      <span style={{ 
                        padding: '4px 8px', 
                        borderRadius: '6px', 
                        fontSize: '0.8rem',
                        backgroundColor: tx.payment_method === 'CASH' ? '#e6f4ea' : '#e8f0fe',
                        color: tx.payment_method === 'CASH' ? '#137333' : '#1967d2',
                        fontWeight: '600'
                      }}>
                        {tx.payment_method}
                      </span>
                    </td>
                    <td style={{ padding: '12px 8px', color: 'var(--accent-color)', fontWeight: '600', textAlign: 'right' }}>
                      Rp {Number(tx.total_amount).toLocaleString()}
                    </td>
                    <td style={{ padding: '12px 8px', display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      <button onClick={() => handleEdit(tx)} style={{ color: 'var(--accent-color)', padding: '6px', borderRadius: '6px', backgroundColor: 'var(--bg-primary)', border: 'none', cursor: 'pointer' }} title="Edit Metode Bayar">
                        <Edit size={16} />
                      </button>
                      <button onClick={() => handleDelete(tx.id)} style={{ color: 'var(--danger)', padding: '6px', borderRadius: '6px', backgroundColor: 'var(--bg-primary)', border: 'none', cursor: 'pointer' }} title="Hapus Transaksi">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
                {transactions.length === 0 && (
                  <tr><td colSpan="6" style={{ textAlign: 'center', padding: '24px' }}>Belum ada data penjualan.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
