import { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingCart, Plus, Minus, Trash2, Printer,
  ArrowLeft, Banknote, Search, Package, CheckCircle2, X
} from 'lucide-react';

export default function CartCheckout() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('erp_pos_cart') || '[]');
      return Array.isArray(saved) ? saved : [];
    } catch {
      return [];
    }
  });

  const [quickAddSearch, setQuickAddSearch] = useState('');
  const [cashReceived, setCashReceived] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const navigate = useNavigate();

  // Dynamic Operator Name from Session
  const cashierName = useMemo(() => {
    try {
      const raw = localStorage.getItem('erp_user');
      if (!raw) return 'Tahir (Admin)';
      const u = JSON.parse(raw);
      return u.full_name || u.username || 'Tahir (Admin)';
    } catch {
      return 'Tahir (Admin)';
    }
  }, []);

  // Load products for stock validation & quick-add bar
  useEffect(() => {
    axios.get('http://localhost:5000/api/products')
      .then(res => setProducts(res.data || []))
      .catch(err => console.error('Failed to load products for cart validation:', err));
  }, []);

  const updateGlobalCart = useCallback((updater) => {
    setCart(prev => {
      const nextCart = typeof updater === 'function' ? updater(prev) : updater;
      localStorage.setItem('erp_pos_cart', JSON.stringify(nextCart));
      window.dispatchEvent(new Event('erp_cart_updated'));
      return nextCart;
    });
  }, []);

  const changeQuantity = useCallback((id, delta) => {
    updateGlobalCart(prev => {
      return prev.flatMap(item => {
        if (item.id !== id) return [item];
        const nextQty = item.sellQuantity + delta;
        if (nextQty <= 0) return [];
        if (nextQty > Number(item.stock_quantity)) return [item];
        return [{ ...item, sellQuantity: nextQty }];
      });
    });
  }, [updateGlobalCart]);

  const setDirectQuantity = useCallback((id, rawValue) => {
    const val = parseInt(rawValue, 10);
    updateGlobalCart(prev => prev.map(item => {
      if (item.id !== id) return item;
      if (isNaN(val) || val < 1) return { ...item, sellQuantity: 1 };
      const maxStock = Number(item.stock_quantity);
      return { ...item, sellQuantity: Math.min(val, maxStock) };
    }));
  }, [updateGlobalCart]);

  const removeFromCart = useCallback((id) => {
    updateGlobalCart(prev => prev.filter(i => i.id !== id));
  }, [updateGlobalCart]);

  const resetCart = () => {
    if (cart.length === 0) return;
    if (window.confirm('Are you sure you want to clear all items from the cart?')) {
      updateGlobalCart([]);
      setCashReceived('');
    }
  };

  // Quick Add Search Results (in case cashier wants to add an extra item directly from Cart page)
  const quickMatches = useMemo(() => {
    const q = quickAddSearch.toLowerCase().trim();
    if (!q) return [];
    return products
      .filter(p => Number(p.stock_quantity) > 0 && (p.name?.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q)))
      .slice(0, 6);
  }, [products, quickAddSearch]);

  const handleQuickAddProduct = (product) => {
    const available = Number(product.stock_quantity);
    if (available <= 0) return;

    updateGlobalCart(prev => {
      const idx = prev.findIndex(i => i.id === product.id);
      if (idx > -1) {
        const curQty = prev[idx].sellQuantity;
        if (curQty >= available) return prev;
        const copy = [...prev];
        copy[idx] = { ...copy[idx], sellQuantity: curQty + 1 };
        return copy;
      }
      return [...prev, { ...product, sellQuantity: 1 }];
    });
    setQuickAddSearch('');
  };

  const subTotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + (Number(item.price) * item.sellQuantity), 0);
  }, [cart]);

  const totalQtyCount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.sellQuantity, 0);
  }, [cart]);

  const tax = Math.round(subTotal * 0.05);
  const netTotal = subTotal + tax;

  const numericCashReceived = Number(cashReceived) || 0;
  const changeDue = numericCashReceived > netTotal ? numericCashReceived - netTotal : 0;

  const triggerThermalReceipt = (soldItems, invoiceId, sub, taxVal, total, qtyTotal, tendered, change) => {
    const w = window.open('', '_blank', 'width=460,height=720');
    if (!w) return;

    const dateStr = new Date().toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeStr = new Date().toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', hour12: true });

    w.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Receipt - ${invoiceId}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600;700&display=swap');
          @page { margin: 0; size: 80mm auto; }
          * { box-sizing: border-box; margin: 0; padding: 0; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          body { font-family: 'Inter', -apple-system, sans-serif; font-size: 11px; color: #0f172a; background: #ffffff; line-height: 1.35; width: 78mm; margin: 0 auto; padding: 12px 10px 24px 10px; }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .font-mono { font-family: 'JetBrains Mono', monospace; }
          .brand-logo { display: inline-block; background: #0F52BA; color: #ffffff; font-weight: 900; font-size: 13px; letter-spacing: 1px; padding: 4px 10px; border-radius: 4px; margin-bottom: 6px; }
          .store-name { font-size: 15px; font-weight: 800; letter-spacing: -0.3px; color: #0f172a; text-transform: uppercase; }
          .store-meta { font-size: 9.5px; color: #64748b; margin-top: 2px; line-height: 1.3; }
          .line-dashed { border-top: 1px dashed #cbd5e1; margin: 8px 0; }
          .line-solid { border-top: 1.5px solid #0F52BA; margin: 8px 0; }
          .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 3px 6px; font-size: 10px; color: #475569; margin: 6px 0; }
          .meta-grid strong { color: #0f172a; }
          table { width: 100%; border-collapse: collapse; margin: 6px 0; }
          thead th { font-size: 9px; font-weight: 700; text-transform: uppercase; color: #475569; border-bottom: 1.5px solid #0F52BA; padding: 4px 0; letter-spacing: 0.3px; }
          tbody td { padding: 5px 0; vertical-align: top; border-bottom: 1px dashed #e2e8f0; }
          .item-name { font-weight: 600; font-size: 10.5px; color: #0f172a; display: block; }
          .item-sku { font-size: 9px; color: #64748b; }
          .summary-row { display: flex; justify-content: space-between; font-size: 10.5px; color: #475569; margin-bottom: 3px; }
          .grand-total-box { background: #F8FAFC; border: 1.5px solid #0F52BA; border-radius: 4px; padding: 6px 8px; margin-top: 6px; display: flex; justify-content: space-between; align-items: baseline; }
          .grand-total-box .title { font-size: 12px; font-weight: 800; letter-spacing: 0.5px; text-transform: uppercase; color: #0F52BA; }
          .grand-total-box .amount { font-size: 16px; font-weight: 800; color: #0F52BA; font-family: 'JetBrains Mono', monospace; }
          .receipt-footer { margin-top: 12px; font-size: 8.5px; color: #64748b; text-align: center; line-height: 1.4; }
        </style>
      </head>
      <body>
        <div class="text-center">
          <div class="brand-logo">SHEIKH'S ERP</div>
          <div class="store-name">Retail & POS Counter</div>
          <div class="store-meta">
            Commercial Plaza, Main Branch, Rawalpindi<br/>
            Phone: +92 (300) 1234567 | NTN: 8294104-1
          </div>
        </div>

        <div class="line-dashed"></div>

        <div class="meta-grid font-mono">
          <div>Receipt #: <strong>${invoiceId}</strong></div>
          <div class="text-right">Date: <strong>${dateStr}</strong></div>
          <div>Counter: <strong>POS-01</strong></div>
          <div class="text-right">Time: <strong>${timeStr}</strong></div>
          <div>Cashier: <strong>${cashierName}</strong></div>
          <div class="text-right">Pay Mode: <strong>CASH</strong></div>
        </div>

        <div class="line-solid"></div>

        <table>
          <thead>
            <tr>
              <th style="width: 48%; text-align: left;">Item Description</th>
              <th style="width: 14%; text-align: center;">Qty</th>
              <th style="width: 18%; text-align: right;">Rate</th>
              <th style="width: 20%; text-align: right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${soldItems.map(item => `
              <tr>
                <td>
                  <span class="item-name">${item.name}</span>
                  <span class="item-sku font-mono">${item.sku}</span>
                </td>
                <td class="text-center font-mono font-bold">${item.sellQuantity}</td>
                <td class="text-right font-mono">${Number(item.price).toLocaleString()}</td>
                <td class="text-right font-mono font-bold">Rs ${(item.price * item.sellQuantity).toLocaleString()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div style="margin-top: 6px;">
          <div class="summary-row">
            <span>Total Units / Items:</span>
            <span class="font-mono font-bold">${qtyTotal} pcs (${soldItems.length} lines)</span>
          </div>
          <div class="summary-row">
            <span>Subtotal (Net):</span>
            <span class="font-mono">Rs ${sub.toLocaleString()}</span>
          </div>
          <div class="summary-row">
            <span>Sales Tax (5% Included):</span>
            <span class="font-mono">Rs ${taxVal.toLocaleString()}</span>
          </div>
        </div>

        <div class="grand-total-box">
          <span class="title">Net Payable</span>
          <span class="amount">Rs ${total.toLocaleString()}</span>
        </div>

        ${tendered > 0 ? `
          <div style="margin-top: 6px; padding-top: 4px; border-top: 1px dashed #cbd5e1;">
            <div class="summary-row">
              <span>Cash Received:</span>
              <span class="font-mono font-bold">Rs ${tendered.toLocaleString()}</span>
            </div>
            <div class="summary-row">
              <span>Change Returned:</span>
              <span class="font-mono font-bold" style="color: #10B981;">Rs ${change.toLocaleString()}</span>
            </div>
          </div>
        ` : ''}

        <div class="line-dashed"></div>

        <div class="receipt-footer">
          <p><strong>Exchange Policy:</strong> Products can be exchanged within 7 days with original invoice. No cash refunds.</p>
          <p style="margin-top: 4px;">Thank you for shopping at <strong>Sheikh's Store</strong>!</p>
          <p style="margin-top: 2px;">*** System Generated Sales Invoice ***</p>
        </div>

        <script>
          window.onload = function() { window.print(); window.close(); };
        </script>
      </body>
      </html>
    `);
    w.document.close();
  };

  const handleCheckout = async () => {
    if (cart.length === 0 || submitting) return;
    setSubmitting(true);

    const snapshotCart = [...cart];
    const invId = `INV-${Date.now().toString().slice(-6)}`;
    const tenderedVal = numericCashReceived >= netTotal ? numericCashReceived : netTotal;
    const changeVal = numericCashReceived > netTotal ? numericCashReceived - netTotal : 0;

    try {
      const payload = {
        invoiceNumber: invId,
        subtotal: subTotal,
        tax: tax,
        totalAmount: netTotal,
        totalItems: totalQtyCount,
        cartItems: snapshotCart.map(item => ({
          id: item.id,
          name: item.name,
          sku: item.sku,
          price: Number(item.price),
          sellQuantity: item.sellQuantity,
          currentStock: item.stock_quantity
        }))
      };

      await axios.post('http://localhost:5000/api/sales', payload);

      updateGlobalCart([]);
      setCashReceived('');
      triggerThermalReceipt(snapshotCart, invId, subTotal, tax, netTotal, totalQtyCount, tenderedVal, changeVal);
      navigate('/sales');
    } catch (err) {
      console.error('Checkout failed', err);
      alert('Checkout process failed. Please check server connectivity.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-8 font-sans select-none bg-[#F8FAFC]">
      
      {/* 1. Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#FFFFFF] px-5 py-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-[#0F52BA]/10 border border-[#0F52BA]/20 flex items-center justify-center text-[#0F52BA] shrink-0">
            <ShoppingCart size={18} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900 tracking-tight leading-none">
                POS Order Cart &amp; Billing Counter
              </h1>
              <span className="text-[11px] font-semibold text-[#0F52BA] bg-[#0F52BA]/10 border border-[#0F52BA]/20 px-2 py-0.5 rounded-full leading-none">
                {cart.length} Line Items ({totalQtyCount} Units)
              </span>
            </div>
            <p className="text-xs text-slate-500 truncate mt-1 leading-none">
              Review selected products, adjust quantities, calculate cash change, and print thermal invoice
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
          <button
            type="button"
            onClick={() => navigate('/sales')}
            className="h-8 px-3 flex items-center gap-1.5 bg-[#FFFFFF] border border-slate-300 hover:border-[#0F52BA] hover:text-[#0F52BA] rounded-lg text-xs font-semibold text-slate-700 transition-colors cursor-pointer shadow-2xs"
          >
            <ArrowLeft size={13} />
            <span>Back to Catalog</span>
          </button>

          {cart.length > 0 && (
            <button
              type="button"
              onClick={resetCart}
              className="h-8 px-3 flex items-center gap-1.5 bg-[#EF4444]/10 hover:bg-[#EF4444] text-[#EF4444] hover:text-[#FFFFFF] border border-[#EF4444]/25 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            >
              <Trash2 size={13} />
              <span>Clear Cart</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Main Cart & Settlement Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        
        {/* LEFT 2 COLUMNS: Cart Items Table + Quick Add Search */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* Quick-Add Search Bar (Add extra items without leaving the Cart page) */}
          <div className="bg-[#FFFFFF] p-3.5 rounded-xl border border-slate-200 shadow-xs relative">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#0F52BA]" size={14} />
              <input
                type="text"
                value={quickAddSearch}
                onChange={e => setQuickAddSearch(e.target.value)}
                placeholder="Forgot an item? Search product name or scan SKU here to add directly to cart..."
                className="h-8 w-full pl-9 pr-8 bg-[#F8FAFC] focus:bg-[#FFFFFF] border border-slate-300 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#0F52BA]"
              />
              {quickAddSearch && (
                <button
                  type="button"
                  onClick={() => setQuickAddSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {quickMatches.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 mx-3.5 bg-[#FFFFFF] border border-slate-200 rounded-xl shadow-xl z-40 divide-y divide-slate-100 overflow-hidden">
                {quickMatches.map(p => (
                  <div
                    key={p.id}
                    onClick={() => handleQuickAddProduct(p)}
                    className="p-2.5 hover:bg-[#0F52BA]/5 flex items-center justify-between cursor-pointer text-xs"
                  >
                    <div>
                      <p className="font-bold text-slate-900">{p.name}</p>
                      <span className="font-mono text-[10px] text-slate-400">
                        {p.sku} &bull; Stock: {p.stock_quantity} &bull; Rs {Number(p.price).toLocaleString()}
                      </span>
                    </div>
                    <span className="px-2.5 py-1 bg-[#0F52BA] text-white rounded-md text-[11px] font-semibold">
                      + Add
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cart Items Table */}
          <div className="bg-[#FFFFFF] rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            {cart.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center justify-center">
                <ShoppingCart size={38} strokeWidth={1.3} className="text-slate-300 mb-2" />
                <p className="text-sm font-bold text-slate-800">Your POS Cart is Empty</p>
                <p className="text-xs text-slate-400 mt-1 max-w-xs">
                  Browse the POS Product Catalog or use the search bar above to add items to this order.
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/sales')}
                  className="mt-4 h-8 px-4 bg-[#0F52BA] hover:bg-[#0c449c] text-white rounded-lg text-xs font-semibold cursor-pointer shadow-xs"
                >
                  Open Product Catalog
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse min-w-[640px]">
                  <thead>
                    <tr className="bg-[#F8FAFC] border-b border-slate-200 text-slate-600 uppercase font-bold text-[10px] tracking-wider">
                      <th className="py-2.5 px-4">#</th>
                      <th className="py-2.5 px-3">Product Description</th>
                      <th className="py-2.5 px-3 text-right">Unit Price</th>
                      <th className="py-2.5 px-3 text-center">Quantity</th>
                      <th className="py-2.5 px-3 text-right">Line Total</th>
                      <th className="py-2.5 px-4 text-right">Remove</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {cart.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-[#F8FAFC] transition-colors">
                        <td className="py-3 px-4 font-mono text-slate-400">{idx + 1}</td>
                        <td className="py-3 px-3">
                          <p className="font-bold text-slate-900 leading-snug">{item.name}</p>
                          <span className="font-mono text-[10px] text-slate-400">
                            SKU: {item.sku} &bull; Max Available: {item.stock_quantity}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-semibold text-slate-700 whitespace-nowrap">
                          Rs {Number(item.price).toLocaleString()}
                        </td>
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <div className="inline-flex items-center gap-1 bg-slate-100 rounded-lg p-0.5 border border-slate-200">
                            <button
                              type="button"
                              onClick={() => changeQuantity(item.id, -1)}
                              className="w-6 h-6 flex items-center justify-center text-slate-600 hover:bg-white rounded cursor-pointer"
                            >
                              <Minus size={11} />
                            </button>
                            <input
                              type="number"
                              min="1"
                              max={item.stock_quantity}
                              value={item.sellQuantity}
                              onChange={e => setDirectQuantity(item.id, e.target.value)}
                              className="w-10 text-center font-mono font-bold text-xs text-slate-900 bg-transparent focus:outline-none"
                            />
                            <button
                              type="button"
                              disabled={item.sellQuantity >= Number(item.stock_quantity)}
                              onClick={() => changeQuantity(item.id, 1)}
                              className="w-6 h-6 flex items-center justify-center text-slate-600 hover:bg-white rounded disabled:opacity-30 cursor-pointer"
                            >
                              <Plus size={11} />
                            </button>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-[#0F52BA] whitespace-nowrap">
                          Rs {(Number(item.price) * item.sellQuantity).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => removeFromCart(item.id)}
                            className="p-1.5 text-slate-400 hover:text-[#EF4444] hover:bg-[#EF4444]/10 rounded-lg transition-colors cursor-pointer"
                            title="Remove item"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Invoice Summary & Cash Calculator */}
        <div className="bg-[#FFFFFF] p-4 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-2.5">
            Invoice Summary &amp; Payment
          </h2>

          <div className="space-y-2 text-xs text-slate-600">
            <div className="flex justify-between">
              <span>Product Lines:</span>
              <span className="font-mono font-semibold text-slate-900">{cart.length} items</span>
            </div>
            <div className="flex justify-between">
              <span>Total Quantity:</span>
              <span className="font-mono font-bold text-slate-900">{totalQtyCount} units</span>
            </div>
            <div className="flex justify-between">
              <span>Items Subtotal:</span>
              <span className="font-mono font-semibold text-slate-900">Rs {subTotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Sales Tax (5% Included):</span>
              <span className="font-mono font-semibold text-slate-900">Rs {tax.toLocaleString()}</span>
            </div>

            <div className="p-3 bg-[#F8FAFC] border border-slate-200 rounded-xl flex justify-between items-baseline mt-2">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-900 block">
                  Net Payable
                </span>
                <span className="text-[10px] text-slate-400">Final customer bill</span>
              </div>
              <span className="text-xl font-black text-[#0F52BA] font-mono">
                Rs {netTotal.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Cash Tendered & Change Return Calculator */}
          <div className="p-3 bg-[#F8FAFC] border border-slate-200 rounded-xl space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Banknote size={14} className="text-[#10B981]" />
                <span>Cash Received:</span>
              </label>
              <input
                type="number"
                min="0"
                disabled={cart.length === 0}
                value={cashReceived}
                onChange={e => setCashReceived(e.target.value)}
                placeholder={`Rs ${netTotal.toLocaleString()}`}
                className="h-8 w-36 bg-[#FFFFFF] border border-slate-300 rounded-lg px-2.5 text-xs font-mono font-bold text-right text-slate-900 focus:outline-none focus:border-[#0F52BA]"
              />
            </div>

            <div className="grid grid-cols-4 gap-1.5">
              <button
                type="button"
                disabled={cart.length === 0}
                onClick={() => setCashReceived(String(netTotal))}
                className="py-1 text-[10px] font-bold bg-[#FFFFFF] hover:bg-[#0F52BA]/10 hover:text-[#0F52BA] border border-slate-200 rounded cursor-pointer disabled:opacity-40"
              >
                Exact
              </button>
              {[1000, 5000, 10000].map(note => (
                <button
                  key={note}
                  type="button"
                  disabled={cart.length === 0}
                  onClick={() => setCashReceived(String(Math.ceil((netTotal || 1) / note) * note))}
                  className="py-1 text-[10px] font-mono font-bold bg-[#FFFFFF] hover:bg-[#0F52BA]/10 hover:text-[#0F52BA] border border-slate-200 rounded cursor-pointer disabled:opacity-40"
                >
                  {(Math.ceil((netTotal || 1) / note) * note).toLocaleString()}
                </button>
              ))}
            </div>

            {numericCashReceived >= netTotal && netTotal > 0 && (
              <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                <span className="font-bold text-[#10B981]">Change to Return:</span>
                <span className="font-mono font-black text-sm text-[#10B981]">
                  Rs {changeDue.toLocaleString()}
                </span>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleCheckout}
            disabled={cart.length === 0 || submitting}
            className="w-full h-10 bg-[#0F52BA] hover:bg-[#0c449c] text-[#FFFFFF] font-bold px-4 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer text-xs shadow-sm active:scale-[0.98]"
          >
            {submitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Processing Transaction...</span>
              </>
            ) : (
              <>
                <Printer size={15} />
                <span>Confirm Payment &amp; Print Invoice</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}