import { useState, useEffect, useMemo, useCallback, useDeferredValue } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { 
  Search, ShoppingCart, Plus, Minus, 
  Package, RefreshCw, X, ArrowRight,
  LayoutGrid, List, ScanLine
} from 'lucide-react';

const INITIAL_DISPLAY_COUNT = 48;

export default function Sales() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('erp_pos_cart') || '[]');
      return Array.isArray(saved) ? saved : [];
    } catch {
      return [];
    }
  });

  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearch = useDeferredValue(searchQuery);

  const [stockFilter, setStockFilter] = useState('all'); // 'all' | 'available' | 'low'
  const [displayLimit, setDisplayLimit] = useState(INITIAL_DISPLAY_COUNT);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'

  const navigate = useNavigate();

  // Sync cart changes to localStorage & notify Navbar badge
  const updateGlobalCart = useCallback((updater) => {
    setCart(prev => {
      const nextCart = typeof updater === 'function' ? updater(prev) : updater;
      localStorage.setItem('erp_pos_cart', JSON.stringify(nextCart));
      window.dispatchEvent(new Event('erp_cart_updated'));
      return nextCart;
    });
  }, []);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get('http://localhost:5000/api/products');
      setProducts(res.data || []);
    } catch (err) {
      console.error('Failed to load inventory catalog:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Stock Summary Counts
  const stockCounts = useMemo(() => {
    let available = 0;
    let low = 0;
    for (let i = 0; i < products.length; i++) {
      const s = Number(products[i].stock_quantity);
      if (s > 0) available++;
      if (s > 0 && s < 10) low++;
    }
    return { all: products.length, available, low };
  }, [products]);

  const filteredProducts = useMemo(() => {
    const q = deferredSearch.toLowerCase().trim();
    return products.filter(p => {
      const stock = Number(p.stock_quantity);
      if (stockFilter === 'available' && stock <= 0) return false;
      if (stockFilter === 'low' && (stock <= 0 || stock >= 10)) return false;

      if (!q) return true;
      return p.name?.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q);
    });
  }, [products, deferredSearch, stockFilter]);

  const visibleProducts = useMemo(() => {
    return filteredProducts.slice(0, displayLimit);
  }, [filteredProducts, displayLimit]);

  const cartMap = useMemo(() => {
    const map = new Map();
    for (const item of cart) {
      map.set(item.id, item.sellQuantity);
    }
    return map;
  }, [cart]);

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setDisplayLimit(INITIAL_DISPLAY_COUNT);
  };

  const addToCart = useCallback((product) => {
    const available = Number(product.stock_quantity);
    if (available <= 0) return;

    updateGlobalCart(prev => {
      const existIndex = prev.findIndex(i => i.id === product.id);
      if (existIndex > -1) {
        const currentQty = prev[existIndex].sellQuantity;
        if (currentQty >= available) return prev;
        const updated = [...prev];
        updated[existIndex] = { ...updated[existIndex], sellQuantity: currentQty + 1 };
        return updated;
      }
      return [...prev, { ...product, sellQuantity: 1 }];
    });
  }, [updateGlobalCart]);

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

  // Barcode Enter-Key Quick Add
  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      e.preventDefault();
      const q = searchQuery.toLowerCase().trim();
      const exactSku = products.find(p => p.sku?.toLowerCase() === q);
      const target = exactSku || (filteredProducts.length === 1 ? filteredProducts[0] : null);

      if (target && Number(target.stock_quantity) > 0) {
        addToCart(target);
        setSearchQuery('');
      }
    }
  };

  const totalQtyCount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.sellQuantity, 0);
  }, [cart]);

  const subTotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + (Number(item.price) * item.sellQuantity), 0);
  }, [cart]);

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-16 font-sans select-none bg-[#F8FAFC]">
      
      {/* 1. Unified Top POS Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#FFFFFF] px-5 py-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-[#0F52BA]/10 border border-[#0F52BA]/20 flex items-center justify-center text-[#0F52BA] shrink-0">
            <ShoppingCart size={18} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base font-bold text-slate-900 tracking-tight leading-none">
                Point of Sale (POS) Product Catalog
              </h1>
              <span className="text-[11px] font-semibold text-[#10B981] bg-[#10B981]/10 border border-[#10B981]/25 px-2 py-0.5 rounded-full leading-none">
                {stockCounts.available} Available
              </span>
            </div>
            <p className="text-xs text-slate-500 truncate mt-1 leading-none">
              Select products or scan barcodes to add items to your checkout cart
            </p>
          </div>
        </div>

        {/* View Mode, Stock Filters & Proceed to Cart Button */}
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto flex-wrap">
          <div className="flex items-center bg-[#F8FAFC] p-0.5 rounded-lg border border-slate-200">
            <button
              type="button"
              onClick={() => { setStockFilter('all'); setDisplayLimit(INITIAL_DISPLAY_COUNT); }}
              className={`h-7 px-2.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                stockFilter === 'all'
                  ? 'bg-[#0F52BA] text-[#FFFFFF] shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({stockCounts.all})
            </button>
            <button
              type="button"
              onClick={() => { setStockFilter('available'); setDisplayLimit(INITIAL_DISPLAY_COUNT); }}
              className={`h-7 px-2.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                stockFilter === 'available'
                  ? 'bg-[#10B981] text-[#FFFFFF] shadow-2xs'
                  : 'text-slate-600 hover:text-[#10B981]'
              }`}
            >
              In Stock ({stockCounts.available})
            </button>
            <button
              type="button"
              onClick={() => { setStockFilter('low'); setDisplayLimit(INITIAL_DISPLAY_COUNT); }}
              className={`h-7 px-2.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                stockFilter === 'low'
                  ? 'bg-[#F59E0B] text-[#FFFFFF] shadow-2xs'
                  : 'text-slate-600 hover:text-[#F59E0B]'
              }`}
            >
              Low ({stockCounts.low})
            </button>
          </div>

          <div className="flex items-center bg-[#F8FAFC] p-0.5 rounded-lg border border-slate-200">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`h-7 px-2.5 rounded-md text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                viewMode === 'grid' 
                  ? 'bg-[#FFFFFF] text-[#0F52BA] shadow-2xs border border-slate-200/80' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <LayoutGrid size={13} />
              <span className="hidden sm:inline">Cards</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`h-7 px-2.5 rounded-md text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                viewMode === 'list' 
                  ? 'bg-[#FFFFFF] text-[#0F52BA] shadow-2xs border border-slate-200/80' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <List size={13} />
              <span className="hidden sm:inline">List</span>
            </button>
          </div>

          <button 
            onClick={loadProducts}
            title="Refresh Catalog"
            className="h-8 w-8 flex items-center justify-center border border-slate-300 bg-[#FFFFFF] hover:border-[#0F52BA] hover:text-[#0F52BA] rounded-lg text-slate-600 transition-colors cursor-pointer shadow-2xs active:scale-95"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin text-[#0F52BA]' : ''} />
          </button>

          <button
            type="button"
            onClick={() => navigate('/cart')}
            className="h-8 px-3.5 flex items-center gap-1.5 bg-[#0F52BA] hover:bg-[#0c449c] text-[#FFFFFF] rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-xs active:scale-95"
          >
            <ShoppingCart size={13} />
            <span>View Cart ({totalQtyCount})</span>
          </button>
        </div>
      </div>

      {/* 2. Full-Width Catalog Container */}
      <section className="bg-[#FFFFFF] border border-slate-200 rounded-xl overflow-hidden shadow-xs flex flex-col">
        
        {/* Search & Barcode Scanner Input Bar */}
        <div className="p-3.5 border-b border-slate-200 bg-[#F8FAFC] flex items-center justify-between gap-3">
          <div className="relative flex-1 max-w-xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#0F52BA]" size={15} />
            <input 
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search product name, brand, or scan SKU barcode (Press Enter to auto-add)..."
              className="h-8 w-full bg-[#FFFFFF] border border-slate-300 rounded-lg pl-9 pr-8 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#0F52BA] focus:ring-2 focus:ring-[#0F52BA]/15 transition-all font-medium"
            />
            {searchQuery && (
              <button 
                onClick={() => { setSearchQuery(''); setDisplayLimit(INITIAL_DISPLAY_COUNT); }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
              >
                <X size={13} />
              </button>
            )}
          </div>

          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#0F52BA]/5 border border-[#0F52BA]/20 text-[11px] font-semibold text-[#0F52BA] shrink-0">
            <ScanLine size={13} />
            <span>Barcode Scanner Ready</span>
          </div>
        </div>

        {/* Full-Width 4-Column Product Grid / List */}
        <div className="p-4 min-h-[420px]">
          {loading ? (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400 gap-2">
              <div className="w-5 h-5 border-2 border-[#0F52BA] border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-medium">Loading catalog items...</span>
            </div>
          ) : visibleProducts.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-center">
              <Package size={36} strokeWidth={1.3} className="text-slate-300 mb-1.5" />
              <p className="text-xs font-semibold text-slate-700">No products match your filter</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Try clearing your search or switching the stock filter above.</p>
            </div>
          ) : viewMode === 'grid' ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
                {visibleProducts.map(product => {
                  const inCartQty = cartMap.get(product.id) || 0;
                  const totalStock = Number(product.stock_quantity);
                  const isOutOfStock = totalStock <= 0;
                  const isLowStock = totalStock > 0 && totalStock < 10;
                  const remaining = totalStock - inCartQty;
                  const isMaxAdded = remaining <= 0 && !isOutOfStock;

                  return (
                    <div
                      key={product.id}
                      onClick={() => !isOutOfStock && !isMaxAdded && addToCart(product)}
                      className={`border rounded-xl p-4 flex flex-col justify-between transition-colors duration-75 select-none min-w-0 ${
                        isOutOfStock 
                          ? 'border-[#EF4444]/30 bg-[#EF4444]/5 opacity-75 cursor-not-allowed'
                          : inCartQty > 0
                          ? 'border-[#0F52BA] bg-[#0F52BA]/[0.03] shadow-2xs cursor-pointer'
                          : 'border-slate-200 bg-[#FFFFFF] hover:border-[#0F52BA]/60 hover:shadow-2xs cursor-pointer'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-2">
                          <span className="text-[10px] font-mono font-medium text-slate-400 truncate">
                            {product.sku}
                          </span>

                          {isOutOfStock ? (
                            <span className="shrink-0 text-[10px] font-semibold text-[#EF4444] bg-[#EF4444]/10 px-2 py-0.5 rounded-full border border-[#EF4444]/20">
                              Out of Stock
                            </span>
                          ) : isLowStock ? (
                            <span className="shrink-0 text-[10px] font-semibold text-[#F59E0B] bg-[#F59E0B]/10 px-2 py-0.5 rounded-full border border-[#F59E0B]/20">
                              Low ({remaining} left)
                            </span>
                          ) : (
                            <span className="shrink-0 text-[10px] font-semibold text-[#10B981] bg-[#10B981]/10 px-2 py-0.5 rounded-full border border-[#10B981]/20">
                              {remaining} in stock
                            </span>
                          )}
                        </div>

                        <h3 
                          className="font-bold text-slate-900 text-xs leading-snug line-clamp-2 min-h-[2.2rem]" 
                          title={product.name}
                        >
                          {product.name}
                        </h3>
                      </div>

                      <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2 min-w-0" onClick={e => e.stopPropagation()}>
                        <div className="min-w-0">
                          <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider leading-none mb-0.5">
                            Unit Price
                          </span>
                          <span className="text-xs font-black text-slate-900 font-mono block truncate">
                            Rs {Number(product.price).toLocaleString()}
                          </span>
                        </div>

                        {inCartQty > 0 ? (
                          <div className="flex items-center gap-1 bg-[#0F52BA] text-white rounded-lg p-0.5 shadow-2xs">
                            <button
                              type="button"
                              onClick={() => changeQuantity(product.id, -1)}
                              className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-white/15 cursor-pointer"
                              title="Decrease quantity"
                            >
                              <Minus size={12} />
                            </button>
                            <span className="px-2 font-mono font-bold text-xs">
                              {inCartQty}
                            </span>
                            <button
                              type="button"
                              disabled={isMaxAdded}
                              onClick={() => changeQuantity(product.id, 1)}
                              className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-white/15 disabled:opacity-30 cursor-pointer"
                              title="Increase quantity"
                            >
                              <Plus size={12} />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            disabled={isOutOfStock}
                            onClick={() => addToCart(product)}
                            className={`shrink-0 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                              isOutOfStock
                                ? 'bg-[#EF4444]/10 text-[#EF4444] cursor-not-allowed'
                                : 'bg-[#0F52BA] hover:bg-[#0c449c] text-[#FFFFFF] active:scale-95'
                            }`}
                          >
                            {isOutOfStock ? 'Unavailable' : '+ Add to Cart'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {visibleProducts.length < filteredProducts.length && (
                <div className="text-center mt-5">
                  <button
                    onClick={() => setDisplayLimit(prev => prev + INITIAL_DISPLAY_COUNT)}
                    className="px-4 py-2 text-xs font-semibold text-[#0F52BA] bg-[#0F52BA]/10 border border-[#0F52BA]/20 rounded-lg hover:bg-[#0F52BA]/15 transition-colors cursor-pointer"
                  >
                    Load More ({filteredProducts.length - visibleProducts.length} items remaining)
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#F8FAFC] border-b border-slate-200 text-slate-600 uppercase font-bold text-[10px] tracking-wider">
                    <th className="py-2.5 px-4">Product Name & Model</th>
                    <th className="py-2.5 px-3 whitespace-nowrap">SKU Code</th>
                    <th className="py-2.5 px-3 text-right whitespace-nowrap">Unit Price</th>
                    <th className="py-2.5 px-3 text-center whitespace-nowrap">Remaining Stock</th>
                    <th className="py-2.5 px-4 text-right whitespace-nowrap">Cart Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visibleProducts.map(product => {
                    const inCartQty = cartMap.get(product.id) || 0;
                    const totalStock = Number(product.stock_quantity);
                    const isOutOfStock = totalStock <= 0;
                    const isLowStock = totalStock > 0 && totalStock < 10;
                    const remaining = totalStock - inCartQty;
                    const isMaxAdded = remaining <= 0 && !isOutOfStock;

                    return (
                      <tr 
                        key={product.id}
                        className={`hover:bg-[#F8FAFC] transition-colors ${
                          inCartQty > 0 ? 'bg-[#0F52BA]/5' : ''
                        }`}
                      >
                        <td className="py-2.5 px-4 font-semibold text-slate-900">
                          {product.name}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                          {product.sku}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                          Rs {Number(product.price).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          {isOutOfStock ? (
                            <span className="text-[10px] font-semibold text-[#EF4444] bg-[#EF4444]/10 px-2 py-0.5 rounded-full">
                              Out of Stock
                            </span>
                          ) : isLowStock ? (
                            <span className="text-[10px] font-semibold text-[#F59E0B] bg-[#F59E0B]/10 px-2 py-0.5 rounded-full">
                              {remaining} left
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold text-[#10B981] bg-[#10B981]/10 px-2 py-0.5 rounded-full">
                              {remaining} in stock
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-right whitespace-nowrap">
                          {inCartQty > 0 ? (
                            <div className="inline-flex items-center gap-1 bg-[#0F52BA] text-white rounded-lg p-0.5">
                              <button
                                type="button"
                                onClick={() => changeQuantity(product.id, -1)}
                                className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/15 cursor-pointer"
                              >
                                <Minus size={11} />
                              </button>
                              <span className="px-2 font-mono font-bold text-xs">{inCartQty}</span>
                              <button
                                type="button"
                                disabled={isMaxAdded}
                                onClick={() => changeQuantity(product.id, 1)}
                                className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/15 disabled:opacity-30 cursor-pointer"
                              >
                                <Plus size={11} />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              disabled={isOutOfStock}
                              onClick={() => addToCart(product)}
                              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                                isOutOfStock
                                  ? 'bg-[#EF4444]/10 text-[#EF4444] cursor-not-allowed'
                                  : 'bg-[#0F52BA] hover:bg-[#0c449c] text-[#FFFFFF]'
                              }`}
                            >
                              {isOutOfStock ? 'Unavailable' : '+ Add to Cart'}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="px-4 py-2.5 bg-[#F8FAFC] border-t border-slate-200 text-xs text-slate-500 flex justify-between items-center">
          <span>Showing <strong className="text-slate-800">{visibleProducts.length}</strong> of {filteredProducts.length} catalog products</span>
          <span className="text-[11px] text-[#10B981] font-semibold">Live Cart Sync Active</span>
        </div>
      </section>

      {/* 3. Floating Bottom Checkout Bar (Appears automatically when Cart has items) */}
      {cart.length > 0 && (
        <div className="fixed bottom-5 right-6 z-40 animate-in fade-in slide-in-from-bottom-4 duration-150">
          <div className="bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#0F52BA] text-white flex items-center justify-center font-mono font-black text-sm">
                {totalQtyCount}
              </div>
              <div>
                <p className="text-xs font-bold text-white leading-none">
                  {cart.length} Product Line{cart.length === 1 ? '' : 's'} in Cart
                </p>
                <p className="text-xs text-[#06B6D4] font-mono font-bold mt-1 leading-none">
                  Subtotal: Rs {subTotal.toLocaleString()}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate('/cart')}
              className="h-9 px-4 bg-[#10B981] hover:bg-[#059669] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95 transition-all"
            >
              <span>Proceed to Cart &amp; Checkout</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

    </div>
  );
}