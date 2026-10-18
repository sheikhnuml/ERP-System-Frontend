import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { 
  Package, Plus, Printer, Search, X, Edit2, Trash2, 
  ChevronLeft, ChevronRight, PackageOpen, AlertTriangle, 
  CheckCircle2, RefreshCw, Layers, TrendingUp, Sparkles
} from 'lucide-react';

export default function Inventory() {
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  // Modal State for Add & Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    price: '',
    stock_quantity: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get('http://localhost:5000/api/products');
      setProducts(response.data || []);
    } catch (error) {
      console.error('Failed to fetch inventory catalog:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, pageSize]);

  // Filter Products
  const filteredProducts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return products;
    return products.filter(item => 
      item.name.toLowerCase().includes(q) || 
      item.sku.toLowerCase().includes(q)
    );
  }, [products, searchQuery]);

  // Systematic Business KPIs
  const stats = useMemo(() => {
    const totalItems = products.length;
    const lowStockCount = products.filter(p => Number(p.stock_quantity) < 10 && Number(p.stock_quantity) > 0).length;
    const outOfStockCount = products.filter(p => Number(p.stock_quantity) <= 0).length;
    const inStockCount = products.filter(p => Number(p.stock_quantity) >= 10).length;
    const totalValuation = products.reduce(
      (sum, p) => sum + (Number(p.price || 0) * Number(p.stock_quantity || 0)), 
      0
    );
    return { totalItems, lowStockCount, outOfStockCount, inStockCount, totalValuation };
  }, [products]);

  // Pagination Calculations
  const totalPages = Math.ceil(filteredProducts.length / pageSize) || 1;
  const currentItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredProducts.slice(start, start + pageSize);
  }, [filteredProducts, currentPage, pageSize]);

  const handleOpenAddModal = () => {
    setEditingProduct(null);
    setFormData({ name: '', sku: '', price: '', stock_quantity: '' });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      sku: product.sku,
      price: product.price,
      stock_quantity: product.stock_quantity
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
  };

  const handleFormChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (editingProduct) {
        await axios.put(`http://localhost:5000/api/products/${editingProduct.id}`, formData);
      } else {
        await axios.post('http://localhost:5000/api/products', formData);
      }
      handleCloseModal();
      fetchProducts();
    } catch (error) {
      const msg = error.response?.data?.error || 'Operation failed. Please try again.';
      alert(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (window.confirm(`Permanently remove SKU "${name}" from inventory?`)) {
      try {
        await axios.delete(`http://localhost:5000/api/products/${id}`);
        fetchProducts();
      } catch (error) {
        console.error('Delete failed:', error);
        alert('Failed to delete product.');
      }
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const currentDate = new Date().toLocaleDateString('en-PK', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
    const currentTime = new Date().toLocaleTimeString('en-PK', {
      hour: '2-digit', minute: '2-digit', hour12: true
    });

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Inventory Audit Report - ${currentDate}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
            @page { margin: 12mm; size: A4; }
            * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            body { font-family: 'Inter', -apple-system, sans-serif; color: #0f172a; margin: 0; padding: 0; font-size: 8.5pt; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0F52BA; padding-bottom: 8px; margin-bottom: 12px; }
            .title { font-size: 13pt; font-weight: 700; color: #0F52BA; margin: 0; text-transform: uppercase; }
            .meta { font-size: 8pt; color: #64748b; margin-top: 2px; }
            .stats-bar { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px 10px; margin-bottom: 12px; background: #F8FAFC; }
            .stat-item span { font-size: 7pt; font-weight: 600; text-transform: uppercase; color: #64748b; display: block; }
            .stat-item strong { font-size: 9.5pt; font-weight: 700; color: #0f172a; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th { border-bottom: 1.5px solid #0F52BA; padding: 5px 6px; text-align: left; font-size: 7.5pt; text-transform: uppercase; color: #475569; font-weight: 600; }
            td { padding: 4.5px 6px; border-bottom: 1px solid #f1f5f9; font-size: 8pt; }
            tr:nth-child(even) td { background-color: #F8FAFC; }
            .text-right { text-align: right; }
            .badge-low { color: #F59E0B; font-weight: 600; }
            .badge-out { color: #EF4444; font-weight: 600; }
            .badge-ok { color: #10B981; font-weight: 600; }
            .footer { position: fixed; bottom: 0; left: 0; width: 100%; border-top: 1px solid #e2e8f0; padding-top: 6px; display: flex; justify-content: space-between; font-size: 7.5pt; color: #94a3b8; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="title">SHEIKH'S ERP &bull; INVENTORY REPERTORY</div>
              <div class="meta">Automated Central Warehouse Ledger</div>
            </div>
            <div style="text-align: right;">
              <div style="font-weight: 600; color: #0F52BA;">ENTERPRISE AUDIT</div>
              <div class="meta">${currentDate} &bull; ${currentTime}</div>
            </div>
          </div>

          <div class="stats-bar">
            <div class="stat-item">
              <span>Catalog SKUs</span>
              <strong>${products.length} Items</strong>
            </div>
            <div class="stat-item">
              <span>Adequate Stock</span>
              <strong style="color: #10B981;">${stats.inStockCount} Items</strong>
            </div>
            <div class="stat-item">
              <span>Alert Thresholds</span>
              <strong style="color: #F59E0B;">${stats.lowStockCount + stats.outOfStockCount} Items</strong>
            </div>
            <div class="stat-item">
              <span>Asset Valuation</span>
              <strong style="color: #0F52BA;">Rs ${stats.totalValuation.toLocaleString()}</strong>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 5%;">#</th>
                <th style="width: 45%;">Item Description</th>
                <th style="width: 20%;">SKU Code</th>
                <th style="width: 15%; text-align: right;">Unit Rate</th>
                <th style="width: 15%; text-align: right;">On Hand</th>
              </tr>
            </thead>
            <tbody>
              ${filteredProducts.map((p, idx) => `
                <tr>
                  <td>${idx + 1}</td>
                  <td style="font-weight: 500;">${p.name}</td>
                  <td>${p.sku}</td>
                  <td class="text-right">Rs ${Number(p.price).toLocaleString()}</td>
                  <td class="text-right ${Number(p.stock_quantity) <= 0 ? 'badge-out' : Number(p.stock_quantity) < 10 ? 'badge-low' : 'badge-ok'}">
                    ${p.stock_quantity} Units
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="footer">
            <span>Verified System Registry &bull; Sheikh's Enterprise Engine</span>
            <span>Audited By: ___________________________</span>
          </div>

          <script>
            window.onload = function() { window.print(); window.close(); };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-8 font-sans select-none bg-[#F8FAFC]">
      
      {/* 1. Header Card (60% Primary Sapphire/Indigo Tone) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#FFFFFF] px-5 py-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-[#0F52BA]/10 border border-[#0F52BA]/20 flex items-center justify-center text-[#0F52BA] shrink-0">
            <Package size={18} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900 tracking-tight leading-none">
                Inventory & Stock Management
              </h1>
              <span className="text-[11px] font-semibold text-[#0F52BA] bg-[#0F52BA]/10 border border-[#0F52BA]/20 px-2 py-0.5 rounded-full leading-none">
                {products.length} Catalog Items
              </span>
            </div>
            <p className="text-xs text-slate-500 truncate mt-1 leading-none">
              Enterprise stock control, SKU pricing, and automated replenishment alerts
            </p>
          </div>
        </div>
        
        {/* Actions Cluster */}
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
          <button 
            onClick={fetchProducts} 
            title="Reload Inventory" 
            className="h-8 px-2.5 flex items-center justify-center bg-[#FFFFFF] border border-slate-300 hover:border-[#0F52BA] hover:text-[#0F52BA] rounded-lg text-slate-600 transition-colors cursor-pointer shadow-2xs active:scale-95"
          >
            <RefreshCw size={13} className={isLoading ? 'animate-spin text-[#0F52BA]' : ''} />
          </button>

          <button 
            onClick={handlePrint}
            disabled={filteredProducts.length === 0}
            className="h-8 px-3.5 flex items-center gap-1.5 bg-[#FFFFFF] border border-slate-300 hover:border-[#0F52BA] hover:text-[#0F52BA] rounded-lg text-xs font-semibold text-slate-700 transition-colors disabled:opacity-40 cursor-pointer shadow-2xs active:scale-95"
          >
            <Printer size={13} />
            <span>Valuation Report</span>
          </button>

          <button 
            onClick={handleOpenAddModal}
            className="h-8 px-4 flex items-center gap-1.5 bg-[#0F52BA] hover:bg-[#0c449c] text-[#FFFFFF] rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-xs active:scale-95"
          >
            <Plus size={14} />
            <span>Add New Item</span>
          </button>
        </div>
      </div>

      {/* 2. KPI Metrics Ribbon (10% Energy Cyan/Emerald & Alert Tokens) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Catalog */}
        <div className="bg-[#FFFFFF] p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Catalog SKUs</span>
          <div className="text-xl font-black text-slate-900 mt-1">{stats.totalItems}</div>
          <div className="text-[11px] text-[#4F46E5] font-semibold mt-1 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4F46E5]"></span>
            Active Registry
          </div>
        </div>

        {/* Healthy Stock (10% Emerald) */}
        <div className="bg-[#FFFFFF] p-4 rounded-xl border border-[#10B981]/30 bg-[#10B981]/5 shadow-xs flex flex-col justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#10B981] block">Healthy Stock</span>
          <div className="text-xl font-black text-[#10B981] mt-1">{stats.inStockCount}</div>
          <div className="text-[11px] text-[#10B981] font-semibold mt-1 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]"></span>
            Adequate Buffer (&ge;10)
          </div>
        </div>

        {/* Low Stock (Micro-Accent Amber) */}
        <div className="bg-[#FFFFFF] p-4 rounded-xl border border-[#F59E0B]/30 bg-[#F59E0B]/5 shadow-xs flex flex-col justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#F59E0B] block">Low Stock Alert</span>
          <div className="text-xl font-black text-[#F59E0B] mt-1">{stats.lowStockCount}</div>
          <div className="text-[11px] text-[#F59E0B] font-semibold mt-1 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]"></span>
            Reorder Needed (&lt;10)
          </div>
        </div>

        {/* Valuation (10% Cyan/Sapphire) */}
        <div className="bg-[#FFFFFF] p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#06B6D4] block">Inventory Capital</span>
          <div className="text-xl font-black text-slate-900 mt-1">Rs {stats.totalValuation.toLocaleString()}</div>
          <div className="text-[11px] text-[#06B6D4] font-semibold mt-1 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#06B6D4]"></span>
            Total Asset Reserve
          </div>
        </div>
      </div>

      {/* 3. Table Container (Neutral Surface #FFFFFF) */}
      <div className="bg-[#FFFFFF] rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
        
        {/* Search Toolbar */}
        <div className="p-3.5 border-b border-slate-200 bg-[#F8FAFC] flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="relative w-full sm:w-80 z-30">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input 
              type="text" 
              placeholder="Search by title, SKU, or barcode..."
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => {
                if (searchQuery.trim()) setShowSuggestions(true);
              }}
              onBlur={() => {
                setTimeout(() => setShowSuggestions(false), 200);
              }}
              className="h-8 w-full pl-8 pr-7 border border-slate-300 rounded-lg text-xs bg-[#FFFFFF] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#0F52BA] focus:ring-2 focus:ring-[#0F52BA]/15 transition-all"
            />
            {searchQuery && (
              <button 
                onClick={() => {
                  setSearchQuery('');
                  setShowSuggestions(false);
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
              >
                <X size={12} />
              </button>
            )}

            {/* Auto-Suggestions */}
            {searchQuery.trim() && showSuggestions && (
              <div className="absolute top-full left-0 w-full mt-1 bg-[#FFFFFF] border border-slate-200 rounded-xl shadow-xl overflow-hidden divide-y divide-slate-100 max-h-56 overflow-y-auto">
                {filteredProducts.slice(0, 5).map((item) => (
                  <div
                    key={item.id}
                    onMouseDown={() => {
                      setSearchQuery(item.name);
                      setShowSuggestions(false);
                    }}
                    className="px-3 py-2 text-xs hover:bg-[#F8FAFC] cursor-pointer flex justify-between items-center transition-colors"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="font-semibold text-slate-900 truncate leading-tight">{item.name}</p>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {item.sku} &bull; {item.stock_quantity} left
                      </span>
                    </div>
                    <span className="text-[11px] font-bold text-slate-800 shrink-0">
                      Rs {Number(item.price).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="text-xs text-slate-500 font-medium">
            Showing <strong className="text-slate-800">{filteredProducts.length}</strong> items
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto min-h-[360px]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400 gap-2">
              <div className="w-5 h-5 border-2 border-[#0F52BA] border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-medium">Loading inventory records...</p>
            </div>
          ) : currentItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400 p-4 text-center">
              <PackageOpen size={34} strokeWidth={1.3} className="text-slate-300 mb-1.5" />
              <p className="text-xs font-semibold text-slate-700">No matching items</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Adjust your search or add a new catalog product.</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs min-w-[720px] border-collapse">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-slate-200 text-slate-600 uppercase font-bold tracking-wider text-[10px]">
                  <th className="py-2.5 px-4 whitespace-nowrap">Product Name</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">SKU Code</th>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap">Unit Price</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Stock Status</th>
                  <th className="py-2.5 px-4 text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {currentItems.map((product) => {
                  const stock = Number(product.stock_quantity);
                  const isOutOfStock = stock <= 0;
                  const isLow = stock > 0 && stock < 10;

                  return (
                    <tr key={product.id} className="hover:bg-[#F8FAFC] transition-colors group">
                      
                      {/* Name */}
                      <td className="py-2.5 px-4 font-semibold text-slate-900 whitespace-nowrap">
                        {product.name}
                      </td>

                      {/* SKU */}
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        {product.sku}
                      </td>

                      {/* Price */}
                      <td className="py-2.5 px-3 text-right font-bold text-slate-800 whitespace-nowrap">
                        Rs {Number(product.price).toLocaleString()}
                      </td>

                      {/* Status Badges with Micro-Accent Colors */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {isOutOfStock ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#EF4444]/10 border border-[#EF4444]/30 text-[#EF4444]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444]" />
                            Out of Stock
                          </span>
                        ) : isLow ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#F59E0B]/10 border border-[#F59E0B]/30 text-[#F59E0B]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" />
                            Low Stock ({stock})
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#10B981]/10 border border-[#10B981]/30 text-[#10B981]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
                            In Stock ({stock})
                          </span>
                        )}
                      </td>

                      {/* Action Buttons */}
                      <td className="py-2.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleOpenEditModal(product)}
                            className="p-1 text-slate-400 hover:text-[#0F52BA] hover:bg-[#0F52BA]/10 rounded-md transition-colors cursor-pointer"
                            title="Edit Product"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            onClick={() => handleDelete(product.id, product.name)}
                            className="p-1 text-slate-400 hover:text-[#EF4444] hover:bg-[#EF4444]/10 rounded-md transition-colors cursor-pointer"
                            title="Delete Product"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Footer */}
        <div className="p-3 border-t border-slate-200 bg-[#F8FAFC] flex flex-col sm:flex-row justify-between items-center gap-2 text-xs text-slate-500">
          <span className="text-[11px]">
            Page <strong className="text-slate-800">{currentPage}</strong> of <strong className="text-slate-800">{totalPages}</strong> &bull; Total {filteredProducts.length} entries
          </span>

          <div className="flex items-center gap-1.5">
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="h-7 px-2 border border-slate-300 rounded-lg text-[11px] bg-[#FFFFFF] text-slate-700 outline-none hover:border-[#0F52BA] cursor-pointer"
            >
              <option value={10}>10 per page</option>
              <option value={20}>20 per page</option>
              <option value={50}>50 per page</option>
            </select>

            <button 
              onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="h-7 w-7 flex items-center justify-center border border-slate-300 rounded-lg text-slate-600 hover:border-[#0F52BA] hover:text-[#0F52BA] disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer bg-[#FFFFFF]"
            >
              <ChevronLeft size={13} />
            </button>

            <span className="px-2 font-mono text-[11px] text-slate-800 font-semibold">
              {currentPage} / {totalPages}
            </span>

            <button 
              onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="h-7 w-7 flex items-center justify-center border border-slate-300 rounded-lg text-slate-600 hover:border-[#0F52BA] hover:text-[#0F52BA] disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer bg-[#FFFFFF]"
            >
              <ChevronRight size={13} />
            </button>
          </div>
        </div>

      </div>

      {/* 4. Modal (Form Actions with Primary #0F52BA) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-3 animate-in fade-in duration-150">
          <div className="bg-[#FFFFFF] rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150">
            
            {/* Modal Title */}
            <div className="px-5 py-3.5 border-b border-slate-200 flex justify-between items-center bg-[#F8FAFC]">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-[#0F52BA]/10 text-[#0F52BA] flex items-center justify-center">
                  <Package size={14} />
                </div>
                <h2 className="text-xs font-bold text-slate-900 tracking-tight">
                  {editingProduct ? 'Edit Catalog Product' : 'Add New Inventory Item'}
                </h2>
              </div>
              <button 
                onClick={handleCloseModal}
                className="text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleFormSubmit} className="p-5 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Product Name <span className="text-[#EF4444]">*</span>
                </label>
                <input 
                  type="text" 
                  name="name" 
                  required 
                  value={formData.name} 
                  onChange={handleFormChange}
                  placeholder="e.g. Wireless Ergonomic Mouse" 
                  className="h-8 w-full border border-slate-300 rounded-lg px-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#0F52BA] focus:ring-2 focus:ring-[#0F52BA]/15 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  SKU / Barcode Code <span className="text-[#EF4444]">*</span>
                </label>
                <input 
                  type="text" 
                  name="sku" 
                  required 
                  value={formData.sku} 
                  onChange={handleFormChange}
                  placeholder="e.g. WM-1002" 
                  className="h-8 w-full border border-slate-300 rounded-lg px-2.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-[#0F52BA] focus:ring-2 focus:ring-[#0F52BA]/15 transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Price (Rs) <span className="text-[#EF4444]">*</span>
                  </label>
                  <input 
                    type="number" 
                    name="price" 
                    required 
                    min="0"
                    value={formData.price} 
                    onChange={handleFormChange}
                    placeholder="0" 
                    className="h-8 w-full border border-slate-300 rounded-lg px-2.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-[#0F52BA] focus:ring-2 focus:ring-[#0F52BA]/15 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Stock Balance <span className="text-[#EF4444]">*</span>
                  </label>
                  <input 
                    type="number" 
                    name="stock_quantity" 
                    required 
                    min="0"
                    value={formData.stock_quantity} 
                    onChange={handleFormChange}
                    placeholder="0" 
                    className="h-8 w-full border border-slate-300 rounded-lg px-2.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-[#0F52BA] focus:ring-2 focus:ring-[#0F52BA]/15 transition-all"
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100 mt-4">
                <button 
                  type="button" 
                  onClick={handleCloseModal}
                  className="h-8 px-3.5 bg-[#FFFFFF] border border-slate-300 hover:bg-slate-50 text-xs font-semibold text-slate-600 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="h-8 px-4 bg-[#0F52BA] hover:bg-[#0c449c] text-[#FFFFFF] text-xs font-semibold rounded-lg transition-colors disabled:opacity-40 cursor-pointer shadow-xs active:scale-95"
                >
                  {isSubmitting ? 'Saving...' : editingProduct ? 'Update Product' : 'Save Item'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}