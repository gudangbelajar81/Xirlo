import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, BarChart, Bar, Rectangle } from 'recharts';
import { apiCall } from '../api';
import { TrendingUp, Package, Activity, DollarSign, Download, Printer } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';

export default function Reports() {
  const [salesData, setSalesData] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const [salesRes, topRes] = await Promise.all([
        apiCall('/reports/sales'),
        apiCall('/reports/top-products')
      ]);
      
      // Format sales data
      const formattedSales = salesRes.map(item => {
        const d = new Date(item.date);
        return {
          ...item,
          day: `${d.getDate()}/${d.getMonth()+1}`,
          total_sales: Number(item.total_sales),
          total_transactions: Number(item.total_transactions)
        };
      });
      setSalesData(formattedSales);

      // Format top products
      const formattedTop = topRes.map(item => ({
        ...item,
        total_qty: Number(item.total_qty),
        total_revenue: Number(item.total_revenue)
      }));
      setTopProducts(formattedTop);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fmtRp = (num) => Number(num).toLocaleString('id-ID');

  const totalRevenue30Days = salesData.reduce((sum, item) => sum + item.total_sales, 0);
  const totalTrx30Days = salesData.reduce((sum, item) => sum + item.total_transactions, 0);

  if (loading) return <div style={{ padding: '24px' }}>Memuat laporan...</div>;

  const exportToExcel = () => {
    // 1. Data Penjualan (Harian)
    const salesWs = XLSX.utils.json_to_sheet(salesData.map(d => ({
      Tanggal: d.date || d.day,
      'Total Penjualan (Rp)': d.total_sales || 0,
      'Total Transaksi': d.total_transactions || 0
    })));

    // 2. Data Produk Terlaris
    const productsWs = XLSX.utils.json_to_sheet(topProducts.map(p => ({
      'ID Produk': p.product_id,
      'Nama Produk': p.name,
      'Total Terjual (Qty)': p.total_sold,
      'Kategori': p.category || '-'
    })));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, salesWs, "Penjualan 30 Hari");
    XLSX.utils.book_append_sheet(wb, productsWs, "Produk Terlaris");

    XLSX.writeFile(wb, `Laporan_Penjualan_${new Date().toLocaleDateString('id-ID').replace(/\//g, '-')}.xlsx`);
  };


  const generatePDF = () => {
    const doc = new jsPDF();
    const appSettings = JSON.parse(localStorage.getItem('appSettings') || '{}');
    const storeName = appSettings.app_name || 'HASIL TEKUN';
    const logoUrl = appSettings.logo_url || null;

    // Helper for formatting
    const fmtRpPdf = (num) => 'Rp ' + Number(num).toLocaleString('id-ID');

    // Headers
    doc.setFontSize(22);
    doc.setTextColor(45, 24, 16); // dark brown
    doc.text(storeName, 14, 22);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text('Laporan Penjualan & Performa Bisnis', 14, 30);
    doc.text('Dicetak pada: ' + new Date().toLocaleString('id-ID'), 14, 36);

    doc.setDrawColor(200, 200, 200);
    doc.line(14, 42, 196, 42);

    // Summary Box 1
    doc.setFillColor(245, 240, 236);
    doc.roundedRect(14, 48, 85, 30, 3, 3, 'F');
    doc.setFontSize(10);
    doc.setTextColor(120, 85, 72);
    doc.text('Total Pendapatan (30 Hari)', 20, 58);
    doc.setFontSize(16);
    doc.setTextColor(45, 24, 16);
    doc.text(fmtRpPdf(totalRevenue30Days), 20, 70);

    // Summary Box 2
    doc.roundedRect(105, 48, 85, 30, 3, 3, 'F');
    doc.setFontSize(10);
    doc.setTextColor(120, 85, 72);
    doc.text('Total Transaksi (30 Hari)', 111, 58);
    doc.setFontSize(16);
    doc.setTextColor(45, 24, 16);
    doc.text(totalTrx30Days + ' Transaksi', 111, 70);

    // Table Header
    doc.setFontSize(14);
    doc.setTextColor(45, 24, 16);
    doc.text('Produk Terlaris', 14, 95);

    let y = 105;
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.setFillColor(160, 82, 45); // accent color
    doc.rect(14, y, 182, 10, 'F');
    doc.text('Nama Produk', 18, y + 7);
    doc.text('Kategori', 90, y + 7);
    doc.text('Qty Terjual', 140, y + 7);
    doc.text('Total (Rp)', 165, y + 7);

    y += 10;
    doc.setTextColor(50, 50, 50);
    
    topProducts.slice(0, 15).forEach((p, idx) => {
      if (idx % 2 === 1) {
        doc.setFillColor(250, 250, 250);
        doc.rect(14, y, 182, 10, 'F');
      }
      doc.text(p.name.substring(0, 35), 18, y + 7);
      doc.text(p.category ? p.category.substring(0, 15) : '-', 90, y + 7);
      doc.text(p.total_sold.toString(), 140, y + 7);
      doc.text(fmtRp(p.total_revenue), 165, y + 7);
      y += 10;
    });

    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.text('Dokumen ini di-generate secara otomatis oleh sistem.', 105, 280, null, null, 'center');

    doc.save(`Laporan_${storeName.replace(/\s+/g, '_')}_${new Date().toLocaleDateString('id-ID').replace(/\//g, '-')}.pdf`);
  };

  return (

    <div className="reports-layout" style={{ padding: '24px', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <h2>Laporan & Analitik</h2>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={exportToExcel} className="btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px' }}>
            <Download size={18} /> Excel
          </button>
          <button onClick={generatePDF} className="auth-btn" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', backgroundColor: 'var(--danger)', width: 'auto' }}>
            <Printer size={18} /> Cetak Laporan (PDF)
          </button>
        </div>
      </div>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>Ringkasan penjualan dan produk terlaris dalam 30 hari terakhir.</p>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        <div className="glass" style={{ padding: '24px', borderRadius: `var(--border-radius)`, display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '16px', backgroundColor: 'rgba(212, 163, 115, 0.2)', borderRadius: `var(--border-radius)`, color: 'var(--accent-color)' }}>
            <DollarSign size={28} />
          </div>
          <div>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Pendapatan (30 Hari)</p>
            <h3 style={{ fontSize: '1.5rem', color: 'var(--text-primary)' }}>Rp {fmtRp(totalRevenue30Days)}</h3>
          </div>
        </div>
        <div className="glass" style={{ padding: '24px', borderRadius: `var(--border-radius)`, display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ padding: '16px', backgroundColor: 'rgba(212, 163, 115, 0.2)', borderRadius: `var(--border-radius)`, color: 'var(--accent-color)' }}>
            <Activity size={28} />
          </div>
          <div>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Total Transaksi (30 Hari)</p>
            <h3 style={{ fontSize: '1.5rem', color: 'var(--text-primary)' }}>{totalTrx30Days} Nota</h3>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '32px' }}>
        {/* Sales Chart */}
        <div className="glass" style={{ padding: '24px', borderRadius: `var(--border-radius)` }}>
          <h3 style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp size={20} color="var(--accent-color)"/> Tren Pendapatan Harian
          </h3>
          <div style={{ width: '100%', height: 350 }}>
            {salesData.length > 0 ? (
              <ResponsiveContainer>
                <LineChart data={salesData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="day" stroke="var(--text-secondary)" tick={{ fill: 'var(--text-secondary)' }} />
                  <YAxis 
                    stroke="var(--text-secondary)" 
                    tick={{ fill: 'var(--text-secondary)' }}
                    tickFormatter={(value) => `Rp${(value/1000)}k`}
                  />
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: 'var(--bg-dark-panel)', borderColor: 'var(--border-color)', borderRadius: `var(--border-radius)`, color: 'var(--text-on-dark)' }}
                    itemStyle={{ color: 'var(--accent-color)' }}
                    formatter={(value) => [`Rp ${fmtRp(value)}`, 'Pendapatan']}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="total_sales" name="Total Pendapatan" stroke="var(--accent-color)" strokeWidth={3} dot={{ r: 4, fill: 'var(--accent-color)' }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                Belum ada data penjualan 30 hari terakhir.
              </div>
            )}
          </div>
        </div>

        {/* Top Products */}
        <div className="glass" style={{ padding: '24px', borderRadius: `var(--border-radius)` }}>
          <h3 style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Package size={20} color="var(--accent-color)"/> 5 Produk Paling Laris
          </h3>
          <div style={{ width: '100%', height: 300 }}>
            {topProducts.length > 0 ? (
              <ResponsiveContainer>
                <BarChart data={topProducts} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" horizontal={false} />
                  <XAxis type="number" stroke="var(--text-secondary)" tick={{ fill: 'var(--text-secondary)' }} />
                  <YAxis dataKey="name" type="category" stroke="var(--text-secondary)" tick={{ fill: 'var(--text-secondary)' }} width={120} />
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: 'var(--bg-dark-panel)', borderColor: 'var(--border-color)', borderRadius: `var(--border-radius)`, color: 'var(--text-on-dark)' }}
                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    formatter={(value) => [`${value} Pcs`, 'Terjual']}
                  />
                  <Legend />
                  <Bar dataKey="total_qty" name="Total Terjual" fill="var(--accent-color)" radius={[0, 4, 4, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                Belum ada data produk terjual.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
