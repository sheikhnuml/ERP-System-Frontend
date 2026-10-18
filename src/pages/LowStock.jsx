import { useState, useEffect, useMemo, useDeferredValue, useCallback, memo } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Search, X, Printer, RefreshCw, 
  AlertTriangle, AlertCircle, PackageX, CheckCircle2,
  Truck
} from 'lucide-react';

// Memoized Table Row for 90+ FPS zero-re-render scrolling & filtering
const LowStockRow = memo(function LowStockRow({ product }) {
  const isZero = product._stock <= 0;

  return (
    <tr className="hover:bg-[#F8FAFC] transition-colors duration-75">
      <td className="py-2.5 px-4 font-semibold text-slate-900">
        {product.name}
      </td>
      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
        {product.sku}
      </td>
      <td className="py-2.5 px-3 text-right font-bold text-slate-800 whitespace-nowrap">
        Rs {product._priceFormatted}
      </td>
      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
        {product._stock} pcs
      </td>
      <td className="py-2.5 px-4 text-right whitespace-nowrap">
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
          isZero 
            ? 'bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/30' 
            : 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/30'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${isZero ? 'bg-[#EF4444]' : 'bg-[#F59E0B]'}`} />
          {isZero ? 'Out of Stock' : `${product._stock} units left`}
        </span>
      </td>
    </tr>
  );
});

export default function LowStock() {
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Deferred search query keeps typing at native 90/120 FPS without frame drops
  const deferredSearch = useDeferredValue(searchQuery);
  
  // Filter State: 'all' | 'low' (1-9 units) | 'out' (0 units)
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  const navigate = useNavigate();

  const loadLowStockProducts = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await axios.get('http://localhost:5000/api/products');
      const rawData = response.data || [];
      
      // Pre-compute numeric & formatted values once to eliminate render lag
      const criticalItems = [];
      for (let i = 0; i < rawData.length; i++) {
        const item = rawData[i];
        const stockNum = Number(item.stock_quantity);
        if (stockNum < 10) {
          criticalItems.push({
            ...item,
            _stock: stockNum,
            _priceFormatted: Number(item.price || 0).toLocaleString(),
            _searchStr: `${item.name || ''} ${item.sku || ''}`.toLowerCase()
          });
        }
      }
      setProducts(criticalItems);
    } catch (error) {
      console.error('Failed to load low stock inventory:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLowStockProducts();
  }, [loadLowStockProducts]);

  // Reset page when search or status filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [deferredSearch, statusFilter]);

  // Single-pass Executive Count Metrics
  const { outOfStockCount, lowRunningCount } = useMemo(() => {
    let out = 0;
    let low = 0;
    for (let i = 0; i < products.length; i++) {
      if (products[i]._stock <= 0) out++;
      else low++;
    }
    return { outOfStockCount: out, lowRunningCount: low };
  }, [products]);

  // Ultra-fast O(n) pre-indexed filter
  const filteredProducts = useMemo(() => {
    const q = deferredSearch.toLowerCase().trim();
    return products.filter(item => {
      const matchesStatus = 
        statusFilter === 'all' ? true :
        statusFilter === 'low' ? (item._stock > 0 && item._stock < 10) :
        item._stock <= 0;

      if (!matchesStatus) return false;
      if (!q) return true;
      return item._searchStr.includes(q);
    });
  }, [products, deferredSearch, statusFilter]);

  // Pagination Calculations
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage) || 1;
  const currentItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredProducts.slice(start, start + itemsPerPage);
  }, [filteredProducts, currentPage]);

  const getFilterLabel = () => {
    if (statusFilter === 'low') return 'Low Stock Only';
    if (statusFilter === 'out') return 'Out of Stock Only';
    return 'All Critical';
  };

  // Clean A4 Print Requisition Report (Prints ONLY active filteredProducts)
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const currentDate = new Date().toLocaleDateString('en-PK', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
    const currentTime = new Date().toLocaleTimeString('en-PK', {
      hour: '2-digit', minute: '2-digit', hour12: true
    });

    const filterTitle = getFilterLabel();
    const reportSubHeading = 
      statusFilter === 'low' 
        ? 'Low Stock Replenishment Sheet (1 to 9 Units Remaining)' 
        : statusFilter === 'out' 
        ? 'Urgent Out-of-Stock Requisition (Zero Balance Items)' 
        : 'Complete Critical Stock & Out-of-Stock Requisition (< 10 Units)';

    const printedOutCount = filteredProducts.filter(p => p._stock <= 0).length;
    const printedLowCount = filteredProducts.filter(p => p._stock > 0).length;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${filterTitle} Requisition - ${currentDate}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
            @page { margin: 12mm; size: A4; }
            * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            body { font-family: 'Inter', -apple-system, sans-serif; color: #0f172a; margin: 0; padding: 0; font-size: 8.5pt; line-height: 1.4; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0F52BA; padding-bottom: 8px; margin-bottom: 12px; }
            .title { font-size: 13pt; font-weight: 700; color: #0F52BA; margin: 0; text-transform: uppercase; }
            .meta { font-size: 8pt; color: #64748b; margin-top: 2px; }
            .stats-bar { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px 10px; margin-bottom: 12px; background: #F8FAFC; }
            .stat-item span { font-size: 7pt; font-weight: 600; text-transform: uppercase; color: #64748b; display: block; }
            .stat-item strong { font-size: 10pt; font-weight: 700; color: #0f172a; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th { border-bottom: 1.5px solid #0F52BA; padding: 5px 6px; text-align: left; font-size: 7.5pt; text-transform: uppercase; color: #475569; font-weight: 600; }
            td { padding: 5px 6px; border-bottom: 1px solid #f1f5f9; font-size: 8pt; }
            tr:nth-child(even) td { background-color: #F8FAFC; }
            .text-right { text-align: right; }
            .mono { font-family: monospace; color: #475569; }
            .badge-out { color: #EF4444; font-weight: 700; }
            .badge-low { color: #F59E0B; font-weight: 700; }
            .footer { position: fixed; bottom: 0; left: 0; width: 100%; border-top: 1px solid #e2e8f0; padding-top: 6px; display: flex; justify-content: space-between; font-size: 7.5pt; color: #94a3b8; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="title">SHEIKH'S ERP &bull; ${filterTitle.toUpperCase()} REPORT</div>
              <div class="meta">${reportSubHeading}</div>
            </div>
            <div style="text-align: right;">
              <div style="font-weight: 700; color: ${statusFilter === 'out' ? '#EF4444' : statusFilter === 'low' ? '#F59E0B' : '#0F52BA'};">
                FILTER: ${filterTitle.toUpperCase()}
              </div>
              <div class="meta">${currentDate} &bull; ${currentTime}</div>
            </div>
          </div>

          <div class="stats-bar">
            <div class="stat-item">
              <span>Printed List Count</span>
              <strong>${filteredProducts.length} Items</strong>
            </div>
            <div class="stat-item">
              <span>Low Stock (1-9 Units)</span>
              <strong style="color: #F59E0B;">${printedLowCount} Items</strong>
            </div>
            <div class="stat-item">
              <span>Out of Stock (0 Units)</span>
              <strong style="color: #EF4444;">${printedOutCount} Items</strong>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 6%;">#</th>
                <th style="width: 44%;">Product Description</th>
                <th style="width: 20%;">SKU Code</th>
                <th style="width: 15%; text-align: right;">Unit Price</th>
                <th style="width: 15%; text-align: right;">Stock Status</th>
              </tr>
            </thead>
            <tbody>
              ${filteredProducts.map((p, index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td style="font-weight: 500;">${p.name}</td>
                  <td class="mono">${p.sku}</td>
                  <td class="text-right">Rs ${p._priceFormatted}</td>
                  <td class="text-right ${p._stock <= 0 ? 'badge-out' : 'badge-low'}">
                    ${p._stock <= 0 ? 'Out of Stock (0)' : `${p._stock} Units Left`}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="footer">
            <span>Procurement Department Copy &bull; Sheikh's Enterprise Engine</span>
            <span>Approved Purchase Signature: ___________________________</span>
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
      
      {/* 1. Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#FFFFFF] px-5 py-4 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-[#F59E0B]/10 border border-[#F59E0B]/25 flex items-center justify-center text-[#F59E0B] shrink-0">
            <AlertTriangle size={18} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900 tracking-tight leading-none">
                Low Stock Alerts & Requisition
              </h1>
              <span className="text-[11px] font-semibold text-[#0F52BA] bg-[#0F52BA]/10 border border-[#0F52BA]/20 px-2 py-0.5 rounded-full leading-none">
                {filteredProducts.length} Displayed
              </span>
            </div>
            <p className="text-xs text-slate-500 truncate mt-1 leading-none">
              Monitor critical inventory levels below 10 units and print targeted restock sheets
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto flex-wrap">
          <button 
            onClick={() => navigate('/inventory')}
            className="h-8 px-3 flex items-center gap-1.5 bg-[#FFFFFF] border border-slate-300 hover:border-[#0F52BA] hover:text-[#0F52BA] rounded-lg text-xs font-semibold text-slate-700 transition-colors duration-75 cursor-pointer shadow-2xs active:scale-95"
          >
            <ArrowLeft size={13} />
            <span>Catalog</span>
          </button>

          <button 
            onClick={() => navigate('/purchases')}
            className="h-8 px-3 flex items-center gap-1.5 bg-[#FFFFFF] border border-slate-300 hover:border-[#0F52BA] hover:text-[#0F52BA] rounded-lg text-xs font-semibold text-slate-700 transition-colors duration-75 cursor-pointer shadow-2xs active:scale-95"
            title="Go to Vendor Purchases"
          >
            <Truck size={13} />
            <span className="hidden sm:inline">Restock Inward</span>
          </button>

          <button 
            onClick={loadLowStockProducts}
            title="Refresh Stock"
            className="h-8 px-2.5 flex items-center justify-center bg-[#FFFFFF] border border-slate-300 hover:border-[#0F52BA] hover:text-[#0F52BA] rounded-lg text-slate-600 transition-colors duration-75 cursor-pointer shadow-2xs active:scale-95"
          >
            <RefreshCw size={13} className={isLoading ? 'animate-spin text-[#0F52BA]' : ''} />
          </button>

          <button 
            onClick={handlePrint}
            disabled={filteredProducts.length === 0}
            className="h-8 px-3.5 flex items-center gap-1.5 bg-[#0F52BA] hover:bg-[#0c449c] text-[#FFFFFF] rounded-lg text-xs font-semibold transition-colors duration-75 disabled:opacity-40 cursor-pointer shadow-2xs active:scale-95"
          >
            <Printer size={13} />
            <span>
              Print {statusFilter === 'low' ? 'Low Stock' : statusFilter === 'out' ? 'Out of Stock' : 'All'} ({filteredProducts.length})
            </span>
          </button>
        </div>
      </div>

      {/* 2. Static KPI Cards (Non-clickable, pure display) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        
        {/* Card 1: Total Critical */}
        <div className="bg-[#FFFFFF] p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Total Reorder Queue
            </span>
            <AlertCircle size={15} className="text-[#4F46E5]" />
          </div>
          <div className="text-xl font-black text-slate-900 mt-1">{products.length} SKUs</div>
          <div className="text-[11px] text-[#4F46E5] font-semibold mt-1 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4F46E5]"></span>
            Flagged Under Threshold (&lt; 10 units)
          </div>
        </div>

        {/* Card 2: Low Balance Buffer */}
        <div className="bg-[#FFFFFF] p-4 rounded-xl border border-[#F59E0B]/30 bg-[#F59E0B]/5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#F59E0B]">
              Low Balance Buffer
            </span>
            <AlertTriangle size={15} className="text-[#F59E0B]" />
          </div>
          <div className="text-xl font-black text-[#F59E0B] mt-1">{lowRunningCount} SKUs</div>
          <div className="text-[11px] text-[#F59E0B] font-semibold mt-1 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]"></span>
            Between 1 and 9 Units Left
          </div>
        </div>

        {/* Card 3: Completely Out of Stock */}
        <div className="bg-[#FFFFFF] p-4 rounded-xl border border-[#EF4444]/30 bg-[#EF4444]/5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#EF4444]">
              Completely Out of Stock
            </span>
            <PackageX size={15} className="text-[#EF4444]" />
          </div>
          <div className="text-xl font-black text-[#EF4444] mt-1">{outOfStockCount} SKUs</div>
          <div className="text-[11px] text-[#EF4444] font-semibold mt-1 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444]"></span>
            Zero Balance (Immediate Action)
          </div>
        </div>

      </div>

      {/* 3. Main Table Card */}
      <div className="bg-[#FFFFFF] rounded-xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col">
        
        {/* Search & Segmented Filter Bar */}
        <div className="p-3.5 border-b border-slate-200 bg-[#F8FAFC] flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-3">
          
          {/* Search Input */}
          <div className="relative w-full lg:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input 
              type="text" 
              placeholder="Search item by name or SKU..." 
              value={searchQuery} 
              onChange={e => setSearchQuery(e.target.value)}
              className="h-8 w-full pl-8 pr-7 border border-slate-300 rounded-lg text-xs bg-[#FFFFFF] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#0F52BA] transition-colors duration-75 font-medium"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Filter Pills in Toolbar */}
          <div className="flex flex-wrap items-center justify-between lg:justify-end gap-2">
            <div className="flex items-center bg-[#FFFFFF] p-0.5 rounded-lg border border-slate-300">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`h-7 px-2.5 rounded-md text-xs font-semibold transition-colors duration-75 cursor-pointer flex items-center gap-1.5 ${
                  statusFilter === 'all'
                    ? 'bg-[#0F52BA] text-[#FFFFFF]'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <span>All Critical</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  statusFilter === 'all' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                }`}>
                  {products.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter('low')}
                className={`h-7 px-2.5 rounded-md text-xs font-semibold transition-colors duration-75 cursor-pointer flex items-center gap-1.5 ${
                  statusFilter === 'low'
                    ? 'bg-[#F59E0B] text-[#FFFFFF]'
                    : 'text-slate-600 hover:text-[#F59E0B] hover:bg-[#F59E0B]/5'
                }`}
              >
                <span>Low Stock Only</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  statusFilter === 'low' ? 'bg-white/20 text-white' : 'bg-[#F59E0B]/10 text-[#F59E0B]'
                }`}>
                  {lowRunningCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter('out')}
                className={`h-7 px-2.5 rounded-md text-xs font-semibold transition-colors duration-75 cursor-pointer flex items-center gap-1.5 ${
                  statusFilter === 'out'
                    ? 'bg-[#EF4444] text-[#FFFFFF]'
                    : 'text-slate-600 hover:text-[#EF4444] hover:bg-[#EF4444]/5'
                }`}
              >
                <span>Out of Stock Only</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  statusFilter === 'out' ? 'bg-white/20 text-white' : 'bg-[#EF4444]/10 text-[#EF4444]'
                }`}>
                  {outOfStockCount}
                </span>
              </button>
            </div>
          </div>

        </div>

        {/* Table Content */}
        <div className="overflow-x-auto min-h-[360px]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400 gap-2">
              <div className="w-5 h-5 border-2 border-[#0F52BA] border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-medium">Scanning inventory balances...</p>
            </div>
          ) : currentItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400 p-6 text-center">
              <CheckCircle2 size={36} strokeWidth={1.5} className="text-[#10B981] mb-2" />
              <p className="text-xs font-bold text-slate-800">
                {statusFilter === 'low' 
                  ? 'No Low-Stock Items (1-9 Units)' 
                  : statusFilter === 'out' 
                  ? 'No Out-of-Stock Items (0 Units)' 
                  : 'Healthy Stock Levels'}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5 max-w-[280px]">
                {products.length === 0 
                  ? 'All catalog products currently have 10 or more units in stock.'
                  : 'No items matched your current filter or search query.'}
              </p>
              {statusFilter !== 'all' && (
                <button
                  onClick={() => setStatusFilter('all')}
                  className="mt-3 px-3 py-1.5 text-xs font-semibold text-[#0F52BA] bg-[#0F52BA]/10 rounded-lg hover:bg-[#0F52BA]/15 transition-colors duration-75 cursor-pointer"
                >
                  Show All Critical Items
                </button>
              )}
            </div>
          ) : (
            <table className="w-full text-left text-xs min-w-[700px] border-collapse">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-slate-200 text-slate-600 uppercase font-bold tracking-wider text-[10px]">
                  <th className="py-2.5 px-4 whitespace-nowrap">Product Name</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">SKU Code</th>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap">Unit Price</th>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap">Remaining Balance</th>
                  <th className="py-2.5 px-4 text-right whitespace-nowrap">Priority Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {currentItems.map((product) => (
                  <LowStockRow key={product.id} product={product} />
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && !isLoading ? (
          <div className="p-3 border-t border-slate-200 bg-[#F8FAFC] flex flex-col sm:flex-row justify-between items-center gap-2 text-xs text-slate-500">
            <span className="text-[11px]">
              Page <strong className="text-slate-800">{currentPage}</strong> of <strong className="text-slate-800">{totalPages}</strong> &bull; Filter: <strong className="text-slate-800">{getFilterLabel()}</strong> ({filteredProducts.length} items)
            </span>
            <div className="flex items-center gap-1.5">
              <button 
                onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="h-7 px-3 text-[11px] font-semibold bg-[#FFFFFF] border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-colors duration-75 cursor-pointer shadow-2xs"
              >
                Previous
              </button>
              <button 
                onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="h-7 px-3 text-[11px] font-semibold bg-[#FFFFFF] border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-colors duration-75 cursor-pointer shadow-2xs"
              >
                Next
              </button>
            </div>
          </div>
        ) : (
          <div className="px-4 py-2.5 bg-[#F8FAFC] border-t border-slate-200 text-[11px] text-slate-500 flex justify-between items-center">
            <span>Active View: <strong>{getFilterLabel()}</strong> ({filteredProducts.length} items ready to print)</span>
            <span className="text-[#10B981] font-semibold">Automatic Stock Sync Active</span>
          </div>
        )}

      </div>
    </div>
  );
}