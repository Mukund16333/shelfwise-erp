import React, { useState, useEffect, useCallback } from 'react';
import { apiRequest, formatINR, formatNumber } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import RiskPill from '../components/RiskPill';
import ExpiryBar from '../components/ExpiryBar';
import Modal from '../components/Modal';
import { TableSkeleton } from '../components/Skeleton';
import {
  Plus,
  Download,
  Upload,
  Search,
  Filter,
  ArrowUpDown,
  Sparkles,
  Edit2,
  FileText,
  AlertCircle
} from 'lucide-react';

export default function Inventory({ onNavigate, initialSearch = '' }) {
  const { store, refreshBadges } = useAuth();
  const { showToast } = useToast();

  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(initialSearch);
  const [category, setCategory] = useState('All');
  const [sortBy, setSortBy] = useState('days_left');
  const [sortDir, setSortDir] = useState('asc');

  // Modals state
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState(null);

  // Add Batch form
  const [newBatch, setNewBatch] = useState({
    product_name: '',
    category: 'Dairy',
    batch_code: '',
    quantity: 50,
    cost_price: 45.0,
    current_price: 65.0,
    entry_date: new Date().toISOString().split('T')[0],
    expiry_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
  });

  // Edit Batch form
  const [editForm, setEditForm] = useState({
    current_qty: 0,
    current_price: 0,
    cost_price: 0,
  });

  // Import CSV state
  const [importType, setImportType] = useState('batches');
  const [importFile, setImportFile] = useState(null);
  const [importReport, setImportReport] = useState(null);
  const [importing, setImporting] = useState(false);

  const fetchBatches = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        sort_by: sortBy,
        sort_dir: sortDir,
      });
      if (search) params.append('search', search);
      if (category && category !== 'All') params.append('category', category);

      const data = await apiRequest(`/batches?${params.toString()}`);
      setBatches(data);
      await refreshBadges();
    } catch (err) {
      showToast(err.message || 'Failed to load batches', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, category, sortBy, sortDir, refreshBadges, showToast]);

  useEffect(() => {
    const handler = setTimeout(() => {
      fetchBatches();
    }, 250);
    return () => clearTimeout(handler);
  }, [fetchBatches]);

  const handleSort = (col) => {
    if (sortBy === col) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(col);
      setSortDir('asc');
    }
  };

  const handleAddBatch = async (e) => {
    e.preventDefault();
    try {
      await apiRequest('/batches', {
        method: 'POST',
        body: JSON.stringify(newBatch),
      });
      showToast(`Batch ${newBatch.batch_code} added successfully`, 'success');
      setAddModalOpen(false);
      fetchBatches();
    } catch (err) {
      showToast(err.message || 'Failed to add batch', 'error');
    }
  };

  const handleEditSave = async (e) => {
    e.preventDefault();
    if (!selectedBatch) return;
    try {
      await apiRequest(`/batches/${selectedBatch.id}`, {
        method: 'PATCH',
        body: JSON.stringify(editForm),
      });
      showToast('Batch updated successfully', 'success');
      setEditModalOpen(false);
      fetchBatches();
    } catch (err) {
      showToast(err.message || 'Failed to update batch', 'error');
    }
  };

  const handleExportCSV = async () => {
    try {
      showToast('Preparing CSV export...', 'info');
      const blob = await apiRequest('/exports/batches.csv');
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `shelfwise_batches_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      showToast('Batches exported to CSV', 'success');
    } catch (err) {
      showToast(err.message || 'Export failed', 'error');
    }
  };

  const handleImportSubmit = async (e) => {
    e.preventDefault();
    if (!importFile) {
      showToast('Please select a CSV file to upload', 'error');
      return;
    }
    setImporting(true);
    setImportReport(null);
    try {
      const formData = new FormData();
      formData.append('file', importFile);
      const res = await apiRequest(`/imports/${importType}`, {
        method: 'POST',
        body: formData,
      });

      if (res.success) {
        showToast(res.message, 'success');
        setImportModalOpen(false);
        fetchBatches();
      } else {
        setImportReport(res);
      }
    } catch (err) {
      showToast(err.message || 'Import failed', 'error');
    } finally {
      setImporting(false);
    }
  };

  const sym = store?.currency_symbol || '₹';

  const categories = [
    'All',
    'Dairy',
    'Bakery',
    'Fresh Produce',
    'Beverages',
    'Canned Goods',
    'Snacks',
    'Frozen',
  ];

  return (
    <div>
      {/* Header Actions & Controls */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 280 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search
              size={15}
              style={{ position: 'absolute', left: 10, top: 10, color: 'var(--txm)' }}
            />
            <input
              type="text"
              placeholder="Search product or batch code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: 32 }}
            />
          </div>

          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            style={{ width: 160 }}
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c === 'All' ? 'All Categories' : c}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-outline btn-sm" onClick={handleExportCSV}>
            <Download size={14} />
            <span>Export CSV</span>
          </button>
          <button className="btn-outline btn-sm" onClick={() => setImportModalOpen(true)}>
            <Upload size={14} />
            <span>Import CSV</span>
          </button>
          <button className="btn-primary btn-sm" onClick={() => setAddModalOpen(true)}>
            <Plus size={15} />
            <span>Add Batch</span>
          </button>
        </div>
      </div>

      {/* Batches Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <TableSkeleton rows={7} cols={8} />
        ) : batches.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--txm)' }}>
            <p style={{ fontSize: 14, marginBottom: 8 }}>No batches match your filter.</p>
            <button className="btn-primary btn-sm" onClick={() => setAddModalOpen(true)}>
              Add a new batch
            </button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th style={{ cursor: 'pointer' }} onClick={() => handleSort('product_name')}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      Product <ArrowUpDown size={11} />
                    </span>
                  </th>
                  <th>Category</th>
                  <th>Batch Code</th>
                  <th style={{ textAlign: 'right', cursor: 'pointer' }} onClick={() => handleSort('current_qty')}>
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                      Stock <ArrowUpDown size={11} />
                    </span>
                  </th>
                  <th style={{ cursor: 'pointer' }} onClick={() => handleSort('days_left')}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      Expiry (Days Left) <ArrowUpDown size={11} />
                    </span>
                  </th>
                  <th style={{ textAlign: 'right' }}>Current Price</th>
                  <th style={{ textAlign: 'right' }}>Cost</th>
                  <th style={{ textAlign: 'center', cursor: 'pointer' }} onClick={() => handleSort('ai_risk')}>
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                      AI Risk <ArrowUpDown size={11} />
                    </span>
                  </th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {batches.map((b) => (
                  <tr key={b.id}>
                    <td style={{ fontWeight: 600, color: 'var(--tx)' }}>{b.product_name}</td>
                    <td>
                      <span className="pill pill-info">{b.category}</span>
                    </td>
                    <td style={{ color: 'var(--txm)', fontFamily: 'monospace', fontSize: 12 }}>
                      {b.batch_code}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>
                      {formatNumber(b.current_qty)} units
                    </td>
                    <td>
                      <ExpiryBar daysLeft={b.days_left} />
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>
                      {formatINR(b.current_price, sym)}
                      {b.is_discounted && (
                        <span
                          style={{
                            display: 'block',
                            fontSize: 10,
                            color: '#16a34a',
                            fontWeight: 500,
                          }}
                        >
                          -{b.applied_discount_pct}% applied
                        </span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right', color: 'var(--txm)' }}>
                      {formatINR(b.cost_price, sym)}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <RiskPill label={b.risk_label} score={b.ai_risk} />
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                        <button
                          className="btn-outline btn-xs"
                          onClick={() => {
                            setSelectedBatch(b);
                            setEditForm({
                              current_qty: b.current_qty,
                              current_price: b.current_price,
                              cost_price: b.cost_price,
                            });
                            setEditModalOpen(true);
                          }}
                          title="Edit Batch"
                        >
                          <Edit2 size={12} />
                        </button>
                        <button
                          className="btn-dark btn-xs"
                          onClick={() => {
                            // PRD Journey: Pre-fill AI Advisor with batch values
                            onNavigate(
                              `/advisor?days_left=${b.days_left}&stock=${b.current_qty}&price=${b.current_price}&cost=${b.cost_price}&category=${encodeURIComponent(b.category)}`
                            );
                          }}
                        >
                          <Sparkles size={11} color="var(--acc)" />
                          <span>AI Advice</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Batch Modal */}
      <Modal isOpen={addModalOpen} onClose={() => setAddModalOpen(false)} title="Add Stock Batch">
        <form onSubmit={handleAddBatch}>
          <div style={{ marginBottom: 14 }}>
            <label>Product Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Full Cream Milk 1L"
              value={newBatch.product_name}
              onChange={(e) => setNewBatch({ ...newBatch, product_name: e.target.value })}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <label>Category</label>
              <select
                value={newBatch.category}
                onChange={(e) => setNewBatch({ ...newBatch, category: e.target.value })}
              >
                {categories.filter((c) => c !== 'All').map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label>Batch Code *</label>
              <input
                type="text"
                required
                placeholder="BATCH-2026-X"
                value={newBatch.batch_code}
                onChange={(e) => setNewBatch({ ...newBatch, batch_code: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 14 }}>
            <div>
              <label>Units Received</label>
              <input
                type="number"
                min="1"
                required
                value={newBatch.quantity}
                onChange={(e) => setNewBatch({ ...newBatch, quantity: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div>
              <label>Cost Price ({sym})</label>
              <input
                type="number"
                step="0.01"
                min="0.1"
                required
                value={newBatch.cost_price}
                onChange={(e) => setNewBatch({ ...newBatch, cost_price: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div>
              <label>Selling Price ({sym})</label>
              <input
                type="number"
                step="0.01"
                min="0.1"
                required
                value={newBatch.current_price}
                onChange={(e) => setNewBatch({ ...newBatch, current_price: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
            <div>
              <label>Entry Date</label>
              <input
                type="date"
                required
                value={newBatch.entry_date}
                onChange={(e) => setNewBatch({ ...newBatch, entry_date: e.target.value })}
              />
            </div>
            <div>
              <label>Expiry Date</label>
              <input
                type="date"
                required
                value={newBatch.expiry_date}
                onChange={(e) => setNewBatch({ ...newBatch, expiry_date: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button type="button" className="btn-outline" onClick={() => setAddModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Save Batch
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Batch Modal */}
      <Modal isOpen={editModalOpen} onClose={() => setEditModalOpen(false)} title="Edit Batch Details">
        <form onSubmit={handleEditSave}>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--tx)' }}>
              {selectedBatch?.product_name}
            </div>
            <div style={{ fontSize: 11, color: 'var(--txm)' }}>
              Batch: {selectedBatch?.batch_code}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
            <div>
              <label>Current Stock</label>
              <input
                type="number"
                min="0"
                value={editForm.current_qty}
                onChange={(e) => setEditForm({ ...editForm, current_qty: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div>
              <label>Selling Price ({sym})</label>
              <input
                type="number"
                step="0.01"
                value={editForm.current_price}
                onChange={(e) => setEditForm({ ...editForm, current_price: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div>
              <label>Cost Price ({sym})</label>
              <input
                type="number"
                step="0.01"
                value={editForm.cost_price}
                onChange={(e) => setEditForm({ ...editForm, cost_price: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button type="button" className="btn-outline" onClick={() => setEditModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Save Changes
            </button>
          </div>
        </form>
      </Modal>

      {/* CSV Import Modal with Row-by-Row Validation Report */}
      <Modal
        isOpen={importModalOpen}
        onClose={() => {
          setImportModalOpen(false);
          setImportReport(null);
        }}
        title="Import Data via CSV"
        maxWidth={580}
      >
        <form onSubmit={handleImportSubmit}>
          <div style={{ marginBottom: 14 }}>
            <label>Select Import Type</label>
            <select
              value={importType}
              onChange={(e) => {
                setImportType(e.target.value);
                setImportReport(null);
              }}
            >
              <option value="batches">Stock Batches (product_id, batch_code, entry_date, expiry_date, quantity, cost_price)</option>
              <option value="products">Catalog Products (name, category, base_price, cost, shelf_life_days)</option>
            </select>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label>Upload CSV File</label>
            <input
              type="file"
              accept=".csv"
              required
              onChange={(e) => {
                setImportFile(e.target.files[0]);
                setImportReport(null);
              }}
            />
          </div>

          {/* Validation Report Alert */}
          {importReport && (
            <div
              style={{
                backgroundColor: 'var(--risk-high-bg)',
                border: '1px solid var(--risk-high-brd)',
                borderRadius: 8,
                padding: 14,
                marginBottom: 16,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--risk-high-tx)', fontWeight: 600, fontSize: 13, marginBottom: 8 }}>
                <AlertCircle size={16} />
                <span>Validation Failed ({importReport.error_count} row errors found)</span>
              </div>
              <p style={{ fontSize: 12, color: 'var(--txm)', marginBottom: 10 }}>
                Per ERP data integrity policy, invalid files cannot be imported. Please resolve the errors below:
              </p>
              <div style={{ maxHeight: 150, overflowY: 'auto', fontSize: 12 }}>
                {importReport.errors.map((err, i) => (
                  <div key={i} style={{ color: 'var(--risk-high-tx)', marginBottom: 4 }}>
                    • <strong>Row {err.row}:</strong> {err.errors.join('; ')}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button
              type="button"
              className="btn-outline"
              onClick={() => {
                setImportModalOpen(false);
                setImportReport(null);
              }}
            >
              Close
            </button>
            <button type="submit" className="btn-primary" disabled={importing}>
              {importing ? 'Validating & Importing...' : 'Validate & Confirm Import'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
