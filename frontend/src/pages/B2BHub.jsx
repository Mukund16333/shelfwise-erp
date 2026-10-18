import React, { useState, useEffect } from 'react';
import { apiRequest, formatINR, formatNumber } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Modal from '../components/Modal';
import { CardSkeleton } from '../components/Skeleton';
import {
  Briefcase,
  Plus,
  Trash2,
  Printer,
  Copy,
  Sparkles,
  FileText,
  Building,
  CheckCircle2,
  Clock
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

export default function B2BHub() {
  const { store } = useAuth();
  const { showToast } = useToast();

  const [customers, setCustomers] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [savedQuotes, setSavedQuotes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Quote Generator Modal State
  const [quoteModalOpen, setQuoteModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [quoteItems, setQuoteItems] = useState([]);
  const [savingQuote, setSavingQuote] = useState(false);

  const sym = store?.currency_symbol || '₹';

  const loadData = async () => {
    try {
      setLoading(true);
      const [cRes, pRes, qRes] = await Promise.all([
        apiRequest('/b2b/customers'),
        apiRequest('/products'),
        apiRequest('/b2b/quotes'),
      ]);
      setCustomers(cRes);
      setCatalog(pRes);
      setSavedQuotes(qRes);
    } catch (err) {
      showToast(err.message || 'Failed to load B2B data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openQuoteGenerator = (customer) => {
    setSelectedCustomer(customer);
    // Preload with customer's NMF recommendations
    const preloaded = (customer.recommended_products || []).map((p) => ({
      product_id: p.id,
      product_name: p.name,
      category: p.category,
      unit_price: p.base_price,
      quantity: 10,
    }));
    setQuoteItems(preloaded);
    setQuoteModalOpen(true);
  };

  const updateQuantity = (idx, qty) => {
    const updated = [...quoteItems];
    updated[idx].quantity = Math.max(1, parseInt(qty) || 1);
    setQuoteItems(updated);
  };

  const updatePrice = (idx, px) => {
    const updated = [...quoteItems];
    updated[idx].unit_price = Math.max(0, parseFloat(px) || 0);
    setQuoteItems(updated);
  };

  const removeQuoteItem = (idx) => {
    setQuoteItems(quoteItems.filter((_, i) => i !== idx));
  };

  const addCatalogProduct = (productId) => {
    const prod = catalog.find((p) => p.id === parseInt(productId));
    if (!prod) return;
    setQuoteItems([
      ...quoteItems,
      {
        product_id: prod.id,
        product_name: prod.name,
        category: prod.category,
        unit_price: prod.base_price,
        quantity: 10,
      },
    ]);
  };

  const grandTotal = quoteItems.reduce((sum, it) => sum + (it.quantity * it.unit_price), 0);

  const handleCopyText = () => {
    if (!selectedCustomer) return;
    let text = `=====================================\n`;
    text += `SHELWISE ERP — B2B WHOLESALE QUOTE\n`;
    text += `Customer: ${selectedCustomer.name} (${selectedCustomer.city})\n`;
    text += `Date: ${new Date().toLocaleDateString('en-IN')}\n`;
    text += `=====================================\n`;
    quoteItems.forEach((it) => {
      text += `${it.product_name} x ${it.quantity} @ ${sym}${it.unit_price} = ${sym}${(it.quantity * it.unit_price).toFixed(2)}\n`;
    });
    text += `-------------------------------------\n`;
    text += `GRAND TOTAL: ${formatINR(grandTotal, sym)}\n`;
    text += `=====================================\n`;

    navigator.clipboard.writeText(text);
    showToast('Quote copied to clipboard as text', 'success');
  };

  const handleSaveAndPrint = async () => {
    if (quoteItems.length === 0) {
      showToast('Please add at least one line item', 'error');
      return;
    }
    setSavingQuote(true);
    try {
      const payload = {
        customer_id: selectedCustomer.id,
        items: quoteItems.map((it) => ({
          product_id: it.product_id,
          quantity: it.quantity,
          unit_price: it.unit_price,
        })),
      };
      const saved = await apiRequest('/b2b/quotes', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      showToast(`Quote ${saved.quote_number} generated & saved`, 'success');
      setQuoteModalOpen(false);
      loadData();
      // Trigger print
      setTimeout(() => {
        window.print();
      }, 300);
    } catch (err) {
      showToast(err.message || 'Failed to save quote', 'error');
    } finally {
      setSavingQuote(false);
    }
  };

  // Spend Comparison Chart
  const spendChartData = {
    labels: customers.map((c) => c.name.split(' ')[0]),
    datasets: [
      {
        label: 'Total Spend',
        data: customers.map((c) => c.total_spend),
        backgroundColor: '#0f172a',
        borderRadius: 4,
      },
    ],
  };

  return (
    <div>
      {/* Top Spend Overview Chart */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div>
            <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--tx)' }}>
              B2B Wholesale Accounts Spend Comparison
            </h3>
            <span style={{ fontSize: 11, color: 'var(--txm)' }}>Cumulative buyer spending ({sym})</span>
          </div>
          <span className="pill pill-info">{customers.length} Wholesale Buyers</span>
        </div>
        <div style={{ height: 160 }}>
          <Bar
            data={spendChartData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              scales: {
                x: { grid: { display: false }, ticks: { font: { size: 10 } } },
                y: { grid: { color: '#e2e8f0' }, ticks: { font: { size: 10 } } },
              },
            }}
          />
        </div>
      </div>

      {/* Customer Directory Cards Grid */}
      <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--tx)', marginBottom: 12 }}>
        Wholesale Customers & NMF Recommender
      </h3>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 16,
          marginBottom: 24,
        }}
      >
        {customers.map((c) => {
          let tierClass = 'pill-bronze';
          if (c.tier === 'gold') tierClass = 'pill-gold';
          else if (c.tier === 'silver') tierClass = 'pill-silver';

          return (
            <div key={c.id} className="card" style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                <div>
                  <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx)' }}>{c.name}</h4>
                  <div style={{ fontSize: 11, color: 'var(--txm)', marginTop: 2 }}>
                    {c.city} • Contact: {c.contact_person}
                  </div>
                </div>
                <span className={`pill ${tierClass}`} style={{ textTransform: 'capitalize' }}>
                  {c.tier} Tier
                </span>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 10,
                  padding: '8px 0',
                  borderTop: '1px solid var(--brd2)',
                  borderBottom: '1px solid var(--brd2)',
                  marginBottom: 12,
                }}
              >
                <div>
                  <div style={{ fontSize: 10, color: 'var(--txm)', textTransform: 'uppercase' }}>Total Spend</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--tx)', marginTop: 2 }}>
                    {formatINR(c.total_spend, sym)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--txm)', textTransform: 'uppercase' }}>Orders Fulfilled</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--tx)', marginTop: 2 }}>
                    {c.order_count} orders
                  </div>
                </div>
              </div>

              {/* 4 NMF Recommended Products */}
              <div style={{ flex: 1, marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, color: 'var(--txm)', marginBottom: 6 }}>
                  <Sparkles size={12} color="var(--acc)" />
                  <span>NMF Recommended Products</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {c.recommended_products?.map((p) => (
                    <span
                      key={p.id}
                      className="pill pill-info"
                      style={{ fontSize: 11, padding: '3px 8px' }}
                      title={`${p.category} — ${formatINR(p.base_price, sym)} (${p.source})`}
                    >
                      {p.name}
                    </span>
                  ))}
                </div>
              </div>

              <button
                className="btn-dark btn-sm"
                style={{ width: '100%', gap: 6 }}
                onClick={() => openQuoteGenerator(c)}
              >
                <FileText size={13} color="var(--acc)" />
                <span>Generate Quote</span>
              </button>
            </div>
          );
        })}
      </div>

      {/* Quote Generator Modal adhering to Design Brief Document Specs */}
      <Modal
        isOpen={quoteModalOpen}
        onClose={() => setQuoteModalOpen(false)}
        title={`B2B Wholesale Quote — ${selectedCustomer?.name || ''}`}
        maxWidth={680}
      >
        <div className="quote-document">
          {/* Quote Header slate banner */}
          <div
            style={{
              backgroundColor: 'var(--sb)',
              color: 'white',
              padding: '14px 18px',
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 16,
            }}
          >
            <div>
              <div style={{ fontSize: 15, fontWeight: 700 }}>ShelfWise ERP Wholesale Quote</div>
              <div style={{ fontSize: 11, color: 'var(--sbt)' }}>Buyer: {selectedCustomer?.name}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: 'var(--acc)', fontWeight: 600 }}>DRAFT QUOTE</div>
              <div style={{ fontSize: 10, color: 'var(--sbt)' }}>{new Date().toLocaleDateString('en-IN')}</div>
            </div>
          </div>

          {/* Add Item Dropdown */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
            <select
              style={{ flex: 1, fontSize: 12 }}
              onChange={(e) => {
                if (e.target.value) {
                  addCatalogProduct(e.target.value);
                  e.target.value = '';
                }
              }}
              defaultValue=""
            >
              <option value="" disabled>+ Add product from catalog...</option>
              {catalog.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.category}) — {formatINR(p.base_price, sym)}
                </option>
              ))}
            </select>
          </div>

          {/* Line Items Table */}
          <div style={{ maxHeight: 280, overflowY: 'auto', marginBottom: 16 }}>
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th style={{ width: 90, textAlign: 'right' }}>Price ({sym})</th>
                  <th style={{ width: 80, textAlign: 'right' }}>Qty</th>
                  <th style={{ width: 100, textAlign: 'right' }}>Total</th>
                  <th style={{ width: 40 }}></th>
                </tr>
              </thead>
              <tbody>
                {quoteItems.map((item, idx) => {
                  const lineTotal = item.quantity * item.unit_price;

                  return (
                    <tr key={idx}>
                      <td style={{ fontWeight: 600 }}>{item.product_name}</td>
                      <td>
                        <span className="pill pill-info">{item.category}</span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <input
                          type="number"
                          step="0.1"
                          value={item.unit_price}
                          onChange={(e) => updatePrice(idx, e.target.value)}
                          style={{ width: 75, padding: '3px 6px', textAlign: 'right', fontSize: 12 }}
                        />
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateQuantity(idx, e.target.value)}
                          style={{ width: 65, padding: '3px 6px', textAlign: 'right', fontSize: 12 }}
                        />
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700 }}>
                        {formatINR(lineTotal, sym)}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          className="btn-outline btn-xs"
                          onClick={() => removeQuoteItem(idx)}
                          style={{ border: 'none', color: '#dc2626' }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Slate Grand Total Bar per Design Brief */}
          <div
            style={{
              backgroundColor: '#f8fafc',
              border: '1px solid var(--brd)',
              borderRadius: 6,
              padding: '12px 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 18,
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--txm)' }}>
              Grand Total ({quoteItems.length} items):
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--tx)' }}>
              {formatINR(grandTotal, sym)}
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button type="button" className="btn-outline btn-sm" onClick={handleCopyText}>
              <Copy size={13} />
              <span>Copy as text</span>
            </button>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                className="btn-outline btn-sm"
                onClick={() => setQuoteModalOpen(false)}
              >
                Close
              </button>
              <button
                type="button"
                className="btn-dark btn-sm"
                onClick={handleSaveAndPrint}
                disabled={savingQuote}
              >
                <Printer size={13} color="var(--acc)" />
                <span>{savingQuote ? 'Saving...' : 'Save & Print Quote'}</span>
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
