import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { 
  Search, X, Printer, RefreshCw, Receipt, 
  Eye, FileText, ChevronLeft, ChevronRight, CheckCircle2,
  TrendingUp, Banknote, Calendar, Layers
} from 'lucide-react';

export default function SalesLedger() {
  const [invoices, setInvoices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal for Viewing Single Invoice
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  const loadInvoices = async () => {
    setIsLoading(true);
    try {
      const res = await axios.get('http://localhost:5000/api/invoices');
      setInvoices(res.data || []);
    } catch (err) {
      console.error('Failed to load invoices:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // Filter by Invoice Number or Item Name
  const filteredInvoices = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return invoices;
    return invoices.filter(inv => {
      const matchInvNo = inv.invoice_number?.toLowerCase().includes(q);
      const matchItem = inv.items?.some(item => item.name?.toLowerCase().includes(q));
      return matchInvNo || matchItem;
    });
  }, [invoices, searchQuery]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage) || 1;
  const currentInvoices = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredInvoices.slice(start, start + itemsPerPage);
  }, [filteredInvoices, currentPage]);

  // Total Revenue Computed from Invoices
  const totalLedgerRevenue = useMemo(() => {
    return invoices.reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0);
  }, [invoices]);

  // Re-Print Thermal Receipt Function
  const printExistingInvoice = (inv) => {
    const w = window.open('', '_blank', 'width=460,height=700');
    if (!w) return;

    const dateObj = new Date(inv.created_at);
    const dateStr = dateObj.toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeStr = dateObj.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', hour12: true });

    w.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Invoice - ${inv.invoice_number}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600;700&display=swap');
          @page { margin: 0; size: 80mm auto; }
          * { box-sizing: border-box; margin: 0; padding: 0; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          body { font-family: 'Inter', -apple-system, sans-serif; font-size: 11px; color: #0f172a; width: 78mm; margin: 0 auto; padding: 12px 10px 24px 10px; line-height: 1.35; }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .font-mono { font-family: 'JetBrains Mono', monospace; }
          .brand-logo { display: inline-block; background: #0F52BA; color: #fff; font-weight: 900; font-size: 13px; padding: 4px 10px; border-radius: 4px; margin-bottom: 4px; }
          .line-dashed { border-top: 1px dashed #cbd5e1; margin: 8px 0; }
          .line-solid { border-top: 1.5px solid #0F52BA; margin: 8px 0; }
          table { width: 100%; border-collapse: collapse; margin: 6px 0; }
          thead th { font-size: 9px; text-transform: uppercase; color: #475569; border-bottom: 1.5px solid #0F52BA; padding: 4px 0; }
          tbody td { padding: 5px 0; vertical-align: top; border-bottom: 1px dashed #e2e8f0; }
          .grand-box { background: #F8FAFC; border: 1.5px solid #0F52BA; border-radius: 4px; padding: 6px 8px; margin-top: 6px; display: flex; justify-content: space-between; align-items: baseline; }
        </style>
      </head>
      <body>
        <div class="text-center">
          <div class="brand-logo">SHEIKH'S ERP</div>
          <div style="font-size: 14px; font-weight: 800; text-transform: uppercase;">Retail Sales Invoice</div>
          <div style="font-size: 9.5px; color: #64748b;">Duplicate / Re-Printed Copy</div>
        </div>

        <div class="line-dashed"></div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2px 4px; font-size: 10px;" class="font-mono">
          <div>Receipt #: <strong>${inv.invoice_number}</strong></div>
          <div class="text-right">Date: <strong>${dateStr}</strong></div>
          <div>Counter: <strong>POS-01</strong></div>
          <div class="text-right">Time: <strong>${timeStr}</strong></div>
        </div>

        <div class="line-solid"></div>

        <table>
          <thead>
            <tr>
              <th style="width: 50%; text-align: left;">Item</th>
              <th style="width: 15%; text-align: center;">Qty</th>
              <th style="width: 35%; text-align: right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${inv.items?.map(item => `
              <tr>
                <td>
                  <div style="font-weight: 600;">${item.name}</div>
                  <div style="font-size: 9px; color: #64748b;" class="font-mono">${item.sku}</div>
                </td>
                <td style="text-align: center;" class="font-mono">${item.sellQuantity}</td>
                <td style="text-align: right;" class="font-mono font-bold">Rs ${(item.price * item.sellQuantity).toLocaleString()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div style="font-size: 10.5px; line-height: 1.6; margin-top: 6px;">
          <div style="display: flex; justify-content: space-between;">
            <span>Subtotal:</span>
            <span class="font-mono">Rs ${Number(inv.subtotal).toLocaleString()}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span>Sales Tax (5%):</span>
            <span class="font-mono">Rs ${Number(inv.tax).toLocaleString()}</span>
          </div>
        </div>

        <div class="grand-box">
          <span style="font-weight: 800; text-transform: uppercase; color: #0F52BA;">Total Paid</span>
          <span style="font-size: 16px; font-weight: 800; color: #0F52BA;" class="font-mono">Rs ${Number(inv.total_amount).toLocaleString()}</span>
        </div>

        <div class="line-dashed"></div>
        <div class="text-center" style="font-size: 9px; color: #64748b; margin-top: 8px;">
          System Verified Invoice Ledger Record &bull; Sheikh's ERP
        </div>

        <script>
          window.onload = function() { window.print(); window.close(); }
        </script>
      </body>
      </html>
    `);
    w.document.close();
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-8 font-sans select-none bg-[#F8FAFC]">
      
      {/* 1. Header Bar (60% Primary Sapphire #0F52BA & Neutral #FFFFFF) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#FFFFFF] px-5 py-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-[#0F52BA]/10 border border-[#0F52BA]/20 flex items-center justify-center text-[#0F52BA] shrink-0">
            <Receipt size={18} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900 tracking-tight leading-none">
                Sales Ledger & Invoice Register
              </h1>
              <span className="text-[11px] font-semibold text-[#0F52BA] bg-[#0F52BA]/10 border border-[#0F52BA]/20 px-2 py-0.5 rounded-full leading-none">
                {invoices.length} Settled
              </span>
            </div>
            <p className="text-xs text-slate-500 truncate mt-1 leading-none">
              Audit completed counter billing transactions, review line items, and reprint receipts
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
          <button 
            onClick={loadInvoices}
            title="Reload Invoices"
            className="h-8 px-2.5 flex items-center justify-center bg-[#FFFFFF] border border-slate-300 hover:border-[#0F52BA] hover:text-[#0F52BA] rounded-lg text-slate-600 transition-colors cursor-pointer shadow-2xs active:scale-95"
          >
            <RefreshCw size={13} className={isLoading ? 'animate-spin text-[#0F52BA]' : ''} />
          </button>
        </div>
      </div>

      {/* 2. Micro KPI Strip (Tokens: #4F46E5, #10B981, #06B6D4) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-[#FFFFFF] p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Total Issued Invoices</span>
          <div className="text-xl font-black text-slate-900 mt-1">{invoices.length}</div>
          <div className="text-[11px] text-[#4F46E5] font-semibold mt-1 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4F46E5]"></span>
            Audit Verified
          </div>
        </div>

        <div className="bg-[#FFFFFF] p-4 rounded-xl border border-[#10B981]/30 bg-[#10B981]/5 shadow-xs flex flex-col justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#10B981] block">Cumulative POS Revenue</span>
          <div className="text-xl font-black text-[#10B981] mt-1">Rs {totalLedgerRevenue.toLocaleString()}</div>
          <div className="text-[11px] text-[#10B981] font-semibold mt-1 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]"></span>
            Gross Realized Turnover
          </div>
        </div>

        <div className="bg-[#FFFFFF] p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#06B6D4] block">Average Ticket Size</span>
          <div className="text-xl font-black text-slate-900 mt-1">
            Rs {invoices.length ? Math.round(totalLedgerRevenue / invoices.length).toLocaleString() : 0}
          </div>
          <div className="text-[11px] text-[#06B6D4] font-semibold mt-1 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#06B6D4]"></span>
            Per Transaction Average
          </div>
        </div>
      </div>

      {/* 3. Main Ledger Table Card */}
      <div className="bg-[#FFFFFF] rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
        
        {/* Search Toolbar */}
        <div className="p-3.5 border-b border-slate-200 bg-[#F8FAFC] flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input 
              type="text" 
              placeholder="Search by invoice number (e.g. INV-123456)..." 
              value={searchQuery} 
              onChange={e => setSearchQuery(e.target.value)}
              className="h-8 w-full pl-8 pr-7 border border-slate-300 rounded-lg text-xs bg-[#FFFFFF] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#0F52BA] focus:ring-2 focus:ring-[#0F52BA]/15 transition-all font-medium"
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

          <div className="text-xs text-slate-500 font-medium">
            Showing <strong className="text-slate-800">{filteredInvoices.length}</strong> of {invoices.length} Records
          </div>
        </div>

        {/* Invoices Table Viewport */}
        <div className="overflow-x-auto min-h-[380px]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400 gap-2">
              <div className="w-5 h-5 border-2 border-[#0F52BA] border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-medium">Loading sales ledger records...</p>
            </div>
          ) : currentInvoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400 p-4 text-center">
              <FileText size={34} strokeWidth={1.3} className="text-slate-300 mb-1.5" />
              <p className="text-xs font-semibold text-slate-700">No Invoices Found</p>
              <p className="text-[11px] text-slate-400 mt-0.5">No transactions matched your search criteria.</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs min-w-[760px] border-collapse">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-slate-200 text-slate-600 uppercase font-bold tracking-wider text-[10px]">
                  <th className="py-2.5 px-4 whitespace-nowrap">Invoice #</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Date & Time</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Items Sold</th>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap">Total Paid</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Payment</th>
                  <th className="py-2.5 px-4 text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {currentInvoices.map((inv) => {
                  const dateObj = new Date(inv.created_at);
                  const formattedDate = dateObj.toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' });
                  const formattedTime = dateObj.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', hour12: true });

                  return (
                    <tr key={inv.id} className="hover:bg-[#F8FAFC] transition-colors group">
                      
                      {/* Invoice Number */}
                      <td className="py-2.5 px-4 font-mono font-bold text-[#0F52BA] whitespace-nowrap">
                        {inv.invoice_number}
                      </td>

                      {/* Timestamp */}
                      <td className="py-2.5 px-3 text-xs text-slate-600 whitespace-nowrap">
                        <span className="font-semibold text-slate-900 block leading-tight">{formattedDate}</span>
                        <span className="text-[10px] text-slate-400 font-mono leading-none">{formattedTime}</span>
                      </td>

                      {/* Line Items */}
                      <td className="py-2.5 px-3 text-slate-700">
                        <span className="font-bold text-slate-900">{inv.total_items || inv.items?.length || 0} units</span>
                        <span className="text-slate-400 block text-[11px] truncate max-w-[260px] mt-0.5">
                          {inv.items?.map(i => i.name).join(', ')}
                        </span>
                      </td>

                      {/* Grand Total */}
                      <td className="py-2.5 px-3 text-right font-black text-slate-900 whitespace-nowrap text-xs">
                        Rs {Number(inv.total_amount).toLocaleString()}
                      </td>

                      {/* Status */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/30">
                          <CheckCircle2 size={11} /> Paid Cash
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => setSelectedInvoice(inv)}
                            className="p-1.5 text-slate-400 hover:text-[#0F52BA] hover:bg-[#0F52BA]/10 rounded-md transition-colors cursor-pointer"
                            title="Inspect Details"
                          >
                            <Eye size={14} />
                          </button>
                          <button 
                            onClick={() => printExistingInvoice(inv)}
                            className="p-1.5 text-slate-400 hover:text-[#0F52BA] hover:bg-[#0F52BA]/10 rounded-md transition-colors cursor-pointer"
                            title="Re-Print Thermal Slip"
                          >
                            <Printer size={14} />
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
        {totalPages > 1 && !isLoading && (
          <div className="p-3 border-t border-slate-200 bg-[#F8FAFC] flex flex-col sm:flex-row justify-between items-center gap-2 text-xs text-slate-500">
            <span className="text-[11px]">
              Page <strong className="text-slate-800">{currentPage}</strong> of <strong className="text-slate-800">{totalPages}</strong> &bull; Total {filteredInvoices.length} invoices
            </span>
            <div className="flex items-center gap-1.5">
              <button 
                onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="h-7 px-3 text-[11px] font-semibold bg-[#FFFFFF] border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-colors cursor-pointer shadow-2xs"
              >
                Previous
              </button>
              <button 
                onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="h-7 px-3 text-[11px] font-semibold bg-[#FFFFFF] border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-colors cursor-pointer shadow-2xs"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 4. Invoice Breakdown Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-3 animate-in fade-in duration-150">
          <div className="bg-[#FFFFFF] rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150">
            
            <div className="px-5 py-3.5 border-b border-slate-200 flex justify-between items-center bg-[#F8FAFC]">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-[#0F52BA]/10 text-[#0F52BA] flex items-center justify-center">
                  <Receipt size={14} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-xs tracking-tight">
                    Invoice: <span className="font-mono text-[#0F52BA]">{selectedInvoice.invoice_number}</span>
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    {new Date(selectedInvoice.created_at).toLocaleString('en-PK')}
                  </p>
                </div>
              </div>

              <button 
                onClick={() => setSelectedInvoice(null)}
                className="text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            {/* Line Items List */}
            <div className="p-4 max-h-[320px] overflow-y-auto divide-y divide-slate-100 custom-scrollbar">
              {selectedInvoice.items?.map((item, idx) => (
                <div key={idx} className="py-2.5 flex justify-between items-center text-xs">
                  <div className="min-w-0 pr-3">
                    <p className="font-bold text-slate-900 truncate leading-snug">{item.name}</p>
                    <span className="font-mono text-[10px] text-slate-400">
                      {item.sku} &bull; Rs {Number(item.price).toLocaleString()} &times; {item.sellQuantity}
                    </span>
                  </div>
                  <span className="font-bold text-slate-900 shrink-0">
                    Rs {(item.price * item.sellQuantity).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>

            {/* Total Calculation Strip */}
            <div className="p-4 bg-[#F8FAFC] border-t border-slate-200 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>Items Subtotal</span>
                <span>Rs {Number(selectedInvoice.subtotal).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Sales Tax (5% Included)</span>
                <span>Rs {Number(selectedInvoice.tax).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-slate-900 pt-2 border-t border-slate-200">
                <span>Net Total Paid</span>
                <span className="text-[#0F52BA] font-black">Rs {Number(selectedInvoice.total_amount).toLocaleString()}</span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-3 border-t border-slate-100 flex justify-end gap-2 bg-[#FFFFFF]">
              <button 
                onClick={() => setSelectedInvoice(null)}
                className="h-8 px-3.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                Close
              </button>
              <button 
                onClick={() => {
                  printExistingInvoice(selectedInvoice);
                  setSelectedInvoice(null);
                }}
                className="h-8 px-4 flex items-center gap-1.5 bg-[#0F52BA] hover:bg-[#0c449c] text-white text-xs font-semibold rounded-lg transition-all cursor-pointer shadow-xs active:scale-95"
              >
                <Printer size={13} />
                <span>Print Thermal Slip</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}