import { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import { 
  Truck, Search, X, Trash2, Building2, UserPlus, 
  RefreshCw, Package, FileText, Eye, Printer, 
  CheckCircle2, DollarSign, Wallet, ArrowRight, CreditCard,
  Sparkles, Plus, Minus, Check, CheckSquare, Square
} from 'lucide-react';

export default function Purchases() {
  const [activeTab, setActiveTab] = useState('inward');
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [payments, setPayments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Search Filters for Each Tab
  const [historySearch, setHistorySearch] = useState('');
  const [balanceSearch, setBalanceSearch] = useState('');
  const [supplierQuery, setSupplierQuery] = useState('');

  // Inward Purchase Form States
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [billNo, setBillNo] = useState('');
  const [inwardItems, setInwardItems] = useState([]);
  
  // Product Search & Selection States
  const [productSearch, setProductSearch] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [purchaseRate, setPurchaseRate] = useState('');
  const [purchaseQty, setPurchaseQty] = useState('');
  
  // Settlement Payment on Inward
  const [paidAmount, setPaidAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modals States
  const [selectedPurchaseDetails, setSelectedPurchaseDetails] = useState(null);
  const [selectedVendorLedger, setSelectedVendorLedger] = useState(null);
  const [paymentModalVendor, setPaymentModalVendor] = useState(null);
  const [selectedBillIds, setSelectedBillIds] = useState([]);
  const [paymentFormData, setPaymentFormData] = useState({
    amountPaid: '',
    paymentMode: 'Bank Transfer / Raast',
    paymentReferenceNo: '',
    notes: ''
  });
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [supplierFormData, setSupplierFormData] = useState({
    name: '', contact_person: '', phone: '', email: '', address: ''
  });

  const searchContainerRef = useRef(null);

  // Load all module data with visual spinning feedback
  const loadData = async () => {
    setIsRefreshing(true);
    try {
      const [supRes, prodRes, purRes, payRes] = await Promise.allSettled([
        axios.get('http://localhost:5000/api/suppliers'),
        axios.get('http://localhost:5000/api/products'),
        axios.get('http://localhost:5000/api/purchases'),
        axios.get('http://localhost:5000/api/supplier-payments')
      ]);

      if (supRes.status === 'fulfilled') setSuppliers(supRes.value.data || []);
      if (prodRes.status === 'fulfilled') setProducts(prodRes.value.data || []);
      if (purRes.status === 'fulfilled') setPurchases(purRes.value.data || []);
      if (payRes.status === 'fulfilled') setPayments(payRes.value.data || []);
    } catch (err) {
      console.error('Failed to load purchase module data:', err);
    } finally {
      setIsLoading(false);
      setTimeout(() => setIsRefreshing(false), 300);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Close search dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Helper for Payment Status Badges (System Palette Tokens)
  const getPaymentStatus = (total, paid, due) => {
    const t = Number(total) || 0;
    const p = Number(paid) || 0;
    const d = Number(due) || 0;

    if (d <= 0 || p >= t) {
      return {
        label: 'Fully Paid',
        bg: 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/30',
        dot: 'bg-[#10B981]'
      };
    }
    if (p > 0 && d > 0) {
      return {
        label: 'Partially Paid',
        bg: 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/30',
        dot: 'bg-[#F59E0B]'
      };
    }
    return {
      label: 'Unpaid (Due)',
      bg: 'bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/30',
      dot: 'bg-[#EF4444]'
    };
  };

  // Smart Product Suggestions: Shows Low-Stock items immediately on focus
  const matchingProducts = useMemo(() => {
    const q = productSearch.toLowerCase().trim();
    if (!q) {
      return [...products]
        .sort((a, b) => Number(a.stock_quantity) - Number(b.stock_quantity))
        .slice(0, 8);
    }
    return products.filter(
      p => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)
    ).slice(0, 8);
  }, [products, productSearch]);

  const currentSupplier = useMemo(() => {
    return suppliers.find(s => String(s.id) === String(selectedSupplierId));
  }, [suppliers, selectedSupplierId]);

  // Financial Calculations for Inward Form
  const totalBillAmount = useMemo(() => {
    return inwardItems.reduce((sum, item) => sum + (Number(item.cost) * Number(item.quantity)), 0);
  }, [inwardItems]);

  const totalInwardUnits = useMemo(() => {
    return inwardItems.reduce((sum, item) => sum + Number(item.quantity), 0);
  }, [inwardItems]);

  const numericPaid = Number(paidAmount) || 0;
  const dueBalance = Math.max(0, totalBillAmount - numericPaid);

  // 1-Click Auto Bill Number Generator
  const handleGenerateBillNo = () => {
    const randomDigits = Date.now().toString().slice(-6);
    setBillNo(`GRN-${randomDigits}`);
  };

  // Inward Product Select Handlers
  const handleSelectProduct = (product) => {
    setSelectedProduct(product);
    setProductSearch('');
    setIsDropdownOpen(false);
    setPurchaseRate(product.price ? String(Math.round(product.price * 0.75)) : '');
    setPurchaseQty('10');
  };

  const handleCancelSelectedProduct = () => {
    setSelectedProduct(null);
    setProductSearch('');
    setPurchaseRate('');
    setPurchaseQty('');
    setIsDropdownOpen(false);
  };

  const handleAddItemToInward = () => {
    const rate = Number(purchaseRate);
    const qty = Number(purchaseQty);

    if (!selectedProduct) return;
    if (isNaN(rate) || rate <= 0) {
      alert('Please enter a valid purchase cost rate.');
      return;
    }
    if (isNaN(qty) || qty <= 0) {
      alert('Please enter a valid inward quantity.');
      return;
    }

    const existingIndex = inwardItems.findIndex(i => i.productId === selectedProduct.id);
    if (existingIndex > -1) {
      const updated = [...inwardItems];
      updated[existingIndex].quantity = Number(updated[existingIndex].quantity) + qty;
      updated[existingIndex].cost = rate;
      setInwardItems(updated);
    } else {
      setInwardItems([
        ...inwardItems,
        {
          productId: selectedProduct.id,
          name: selectedProduct.name,
          sku: selectedProduct.sku,
          cost: rate,
          quantity: qty
        }
      ]);
    }

    handleCancelSelectedProduct();
  };

  // Inline Quantity Adjuster inside Table
  const handleUpdateInwardQty = (index, delta) => {
    setInwardItems(prev => prev.map((item, idx) => {
      if (idx !== index) return item;
      const nextQty = Math.max(1, Number(item.quantity) + delta);
      return { ...item, quantity: nextQty };
    }));
  };

  const handleRemoveInwardItem = (index) => {
    setInwardItems(inwardItems.filter((_, idx) => idx !== index));
  };

  // Submit Stock Inward Bill
  const handleSubmitPurchase = async (e) => {
    e.preventDefault();
    if (!selectedSupplierId) {
      alert('Step 1 Incomplete: Please select a supplier.');
      return;
    }
    if (!billNo.trim()) {
      alert('Step 1 Incomplete: Please enter or auto-generate the bill number.');
      return;
    }
    if (inwardItems.length === 0) {
      alert('Step 2 Incomplete: Please add at least one product to the bill.');
      return;
    }

    setIsSubmitting(true);

    const payload = {
      purchaseInvoiceNo: billNo.trim(),
      supplierId: selectedSupplierId,
      supplierName: currentSupplier ? currentSupplier.name : 'Direct Vendor',
      totalAmount: totalBillAmount,
      paidAmount: numericPaid,
      dueAmount: dueBalance,
      totalItems: totalInwardUnits,
      items: inwardItems
    };

    try {
      await axios.post('http://localhost:5000/api/purchases', payload);
      alert('Stock inward recorded successfully! Warehouse inventory has been updated.');
      setInwardItems([]);
      setBillNo('');
      setPaidAmount('');
      setSelectedSupplierId('');
      loadData();
    } catch (err) {
      alert(err.response?.data?.error || 'Purchase inward failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Aggregated Vendor Ledger & Balances
  const vendorLedgerData = useMemo(() => {
    const q = balanceSearch.toLowerCase().trim();

    return suppliers
      .map(supplier => {
        const vendorBills = purchases.filter(p => String(p.supplier_id) === String(supplier.id));
        const vendorPayments = payments.filter(p => String(p.supplier_id) === String(supplier.id));

        const totalPurchased = vendorBills.reduce((sum, p) => sum + Number(p.total_amount || 0), 0);
        const totalPaid = vendorBills.reduce((sum, p) => sum + Number(p.paid_amount || 0), 0);
        const outstandingDue = Number(supplier.balance || 0);

        return {
          id: supplier.id,
          name: supplier.name,
          contact_person: supplier.contact_person,
          phone: supplier.phone,
          billsCount: vendorBills.length,
          totalPurchased,
          totalPaid,
          outstandingDue,
          bills: vendorBills,
          paymentsList: vendorPayments
        };
      })
      .filter(v => !q || v.name.toLowerCase().includes(q) || (v.phone && v.phone.includes(q)));
  }, [suppliers, purchases, payments, balanceSearch]);

  // Unpaid Bills for the Currently Active Payment Modal Vendor (Oldest First)
  const modalVendorUnpaidBills = useMemo(() => {
    if (!paymentModalVendor) return [];
    return purchases
      .filter(p => String(p.supplier_id) === String(paymentModalVendor.id) && Number(p.due_amount) > 0)
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  }, [purchases, paymentModalVendor]);

  // Live Bill-by-Bill Allocation Preview inside Payment Modal
  const liveBillAllocation = useMemo(() => {
    const payAmt = Number(paymentFormData.amountPaid) || 0;
    let remaining = payAmt;
    const allocationMap = {};

    const selectedSet = new Set(selectedBillIds.map(String));
    const orderedBills = [
      ...modalVendorUnpaidBills.filter(b => selectedSet.has(String(b.id))),
      ...modalVendorUnpaidBills.filter(b => !selectedSet.has(String(b.id)))
    ];

    for (const bill of orderedBills) {
      const due = Number(bill.due_amount) || 0;
      if (remaining <= 0) {
        allocationMap[bill.id] = { allocated: 0, remainingDue: due, status: 'none' };
      } else {
        const allocated = Math.min(due, remaining);
        const remainingDue = due - allocated;
        allocationMap[bill.id] = {
          allocated,
          remainingDue,
          status: remainingDue === 0 ? 'full' : 'partial'
        };
        remaining -= allocated;
      }
    }

    return allocationMap;
  }, [modalVendorUnpaidBills, paymentFormData.amountPaid, selectedBillIds]);

  // Open Payment Modal for Vendor (Supports pre-selecting a specific single bill or all unpaid bills)
  const handleOpenPaymentModal = (vendor, preselectedBill = null) => {
    const vendorUnpaid = purchases
      .filter(p => String(p.supplier_id) === String(vendor.id) && Number(p.due_amount) > 0)
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

    setPaymentModalVendor(vendor);

    if (preselectedBill) {
      setSelectedBillIds([preselectedBill.id]);
      setPaymentFormData({
        amountPaid: String(preselectedBill.due_amount || ''),
        paymentMode: 'Bank Transfer / Raast',
        paymentReferenceNo: '',
        notes: ''
      });
    } else {
      const allIds = vendorUnpaid.map(b => b.id);
      setSelectedBillIds(allIds);
      setPaymentFormData({
        amountPaid: String(vendor.outstandingDue || vendor.balance || ''),
        paymentMode: 'Bank Transfer / Raast',
        paymentReferenceNo: '',
        notes: ''
      });
    }
  };

  // Toggle Checkbox for a Specific Bill in the Payment Modal
  const handleToggleBillSelection = (bill) => {
    const exists = selectedBillIds.includes(bill.id);
    const nextIds = exists
      ? selectedBillIds.filter(id => id !== bill.id)
      : [...selectedBillIds, bill.id];

    setSelectedBillIds(nextIds);

    const selectedSum = modalVendorUnpaidBills
      .filter(b => nextIds.includes(b.id))
      .reduce((sum, b) => sum + Number(b.due_amount || 0), 0);

    setPaymentFormData(prev => ({
      ...prev,
      amountPaid: selectedSum > 0 ? String(selectedSum) : ''
    }));
  };

  // Select All / Deselect All Unpaid Bills in Modal
  const handleToggleAllModalBills = () => {
    if (selectedBillIds.length === modalVendorUnpaidBills.length) {
      setSelectedBillIds([]);
      setPaymentFormData(prev => ({ ...prev, amountPaid: '' }));
    } else {
      const allIds = modalVendorUnpaidBills.map(b => b.id);
      const totalUnpaidSum = modalVendorUnpaidBills.reduce((s, b) => s + Number(b.due_amount || 0), 0);
      setSelectedBillIds(allIds);
      setPaymentFormData(prev => ({ ...prev, amountPaid: String(totalUnpaidSum) }));
    }
  };

  // Submit Vendor Payment Out
  const handleSubmitPayment = async (e) => {
    e.preventDefault();
    const payVal = Number(paymentFormData.amountPaid);

    if (!paymentModalVendor || isNaN(payVal) || payVal <= 0) {
      alert('Please enter a valid payment amount.');
      return;
    }

    setIsSubmittingPayment(true);
    try {
      const payload = {
        supplierId: paymentModalVendor.id,
        amountPaid: payVal,
        paymentMode: paymentFormData.paymentMode,
        paymentReferenceNo: paymentFormData.paymentReferenceNo,
        notes: paymentFormData.notes,
        selectedBillIds
      };

      const res = await axios.post('http://localhost:5000/api/supplier-payments', payload);
      const settledInfo = res.data?.settledBills?.length
        ? `\n\nSettled Invoices:\n• ${res.data.settledBills.join('\n• ')}`
        : '';

      alert(`Payment of Rs ${payVal.toLocaleString()} recorded successfully for ${paymentModalVendor.name}.${settledInfo}`);
      setPaymentModalVendor(null);
      setSelectedBillIds([]);
      loadData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to record supplier payment.');
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  // Print Official Goods Receiving Voucher (GRN)
  const printPurchaseVoucher = (purchase) => {
    const w = window.open('', '_blank', 'width=520,height=750');
    if (!w) return;

    const dateObj = new Date(purchase.created_at);
    const dateStr = dateObj.toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeStr = dateObj.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', hour12: true });

    w.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>GRN - ${purchase.purchase_invoice_no}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600;700&display=swap');
          @page { margin: 15mm; size: A4; }
          * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          body { font-family: 'Inter', sans-serif; font-size: 11px; color: #0f172a; margin: 0; padding: 20px; line-height: 1.4; }
          .header { border-bottom: 2px solid #0F52BA; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-end; }
          .title { font-size: 18px; font-weight: 800; color: #0F52BA; text-transform: uppercase; }
          .subtitle { font-size: 10px; color: #64748b; margin-top: 2px; }
          .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 10.5px; margin-bottom: 16px; background: #F8FAFC; padding: 10px 14px; border: 1px solid #e2e8f0; border-radius: 6px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
          th { background: #F8FAFC; text-align: left; padding: 7px 10px; font-size: 9.5px; text-transform: uppercase; color: #475569; border-bottom: 1.5px solid #0F52BA; }
          td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 10px; }
          .font-mono { font-family: 'JetBrains Mono', monospace; }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .total-box { margin-left: auto; width: 260px; font-size: 11px; line-height: 1.6; }
          .grand-row { display: flex; justify-content: space-between; border-top: 1.5px solid #0F52BA; padding-top: 4px; font-weight: 800; font-size: 13px; }
          .footer { margin-top: 40px; display: flex; justify-content: space-between; font-size: 9px; color: #64748b; border-top: 1px dashed #cbd5e1; padding-top: 10px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="title">SHEIKH'S ERP &bull; WAREHOUSE</div>
            <div class="subtitle">Official Goods Receiving Voucher (Stock Inward Note)</div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 13px; font-weight: 700; color: #0F52BA;">${purchase.purchase_invoice_no}</div>
            <div class="subtitle">Date: ${dateStr} &bull; ${timeStr}</div>
          </div>
        </div>

        <div class="meta-grid">
          <div>Distributor / Vendor: <strong>${purchase.supplier_name}</strong></div>
          <div style="text-align: right;">Receiving Location: <strong>Main Warehouse (Rawalpindi)</strong></div>
          <div>Total Consignment Items: <strong>${purchase.total_items} Units</strong></div>
          <div style="text-align: right;">Receiver / Inspector: <strong>Tahir (Store Admin)</strong></div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 50%;">Item Description</th>
              <th style="width: 15%; text-align: center;">Inward Qty</th>
              <th style="width: 15%; text-align: right;">Unit Cost</th>
              <th style="width: 20%; text-align: right;">Total Amount</th>
            </tr>
          </thead>
          <tbody>
            ${purchase.items?.map(item => `
              <tr>
                <td>
                  <div style="font-weight: 600;">${item.name}</div>
                  <div style="font-size: 9px; color: #64748b;" class="font-mono">${item.sku}</div>
                </td>
                <td class="text-center font-mono font-bold">+${item.quantity}</td>
                <td class="text-right font-mono">Rs ${Number(item.cost).toLocaleString()}</td>
                <td class="text-right font-mono font-bold">Rs ${(item.cost * item.quantity).toLocaleString()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="total-box">
          <div style="display: flex; justify-content: space-between;">
            <span>Consignment Bill Total:</span>
            <span class="font-mono font-bold">Rs ${Number(purchase.total_amount).toLocaleString()}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span>Amount Disbursed (Paid):</span>
            <span class="font-mono font-bold" style="color: #10B981;">Rs ${Number(purchase.paid_amount || 0).toLocaleString()}</span>
          </div>
          <div class="grand-row">
            <span>Payable Balance Due:</span>
            <span class="font-mono" style="color: ${Number(purchase.due_amount) > 0 ? '#F59E0B' : '#0f172a'};">
              Rs ${Number(purchase.due_amount || 0).toLocaleString()}
            </span>
          </div>
        </div>

        <div class="footer">
          <div>Verified Stock Intake &bull; Added to Current Active Assets</div>
          <div>Warehouse Authorized Signature: _______________________</div>
        </div>

        <script>
          window.onload = function() { window.print(); window.close(); }
        </script>
      </body>
      </html>
    `);
    w.document.close();
  };

  // Print Complete Vendor Statement / Ledger (Includes Exact Bills Settled Per Payment)
  const printVendorStatement = (vendorSummary, vendorBills, vendorPayments) => {
    const w = window.open('', '_blank', 'width=640,height=820');
    if (!w) return;

    const dateStr = new Date().toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' });

    w.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Vendor Statement - ${vendorSummary.name}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600;700&display=swap');
          @page { margin: 14mm; size: A4; }
          * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          body { font-family: 'Inter', sans-serif; font-size: 11px; color: #0f172a; margin: 0; padding: 20px; line-height: 1.4; }
          .header { border-bottom: 2px solid #0F52BA; padding-bottom: 14px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-end; }
          .title { font-size: 19px; font-weight: 800; color: #0F52BA; }
          .meta-box { background: #F8FAFC; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th { background: #F8FAFC; text-align: left; padding: 7px 9px; font-size: 9px; text-transform: uppercase; color: #475569; border-bottom: 1.5px solid #0F52BA; }
          td { padding: 8px 9px; border-bottom: 1px solid #e2e8f0; font-size: 10px; vertical-align: top; }
          .font-mono { font-family: 'JetBrains Mono', monospace; }
          .text-right { text-align: right; }
          .summary-card { margin-left: auto; width: 280px; font-size: 11.5px; line-height: 1.7; border-top: 2px solid #0F52BA; padding-top: 8px; }
          .grand { font-size: 14px; font-weight: 800; color: #F59E0B; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="title">SHEIKH'S ERP &bull; VENDOR ACCOUNT STATEMENT</div>
            <div style="font-size: 10px; color: #64748b; margin-top: 2px;">Official Accounts Payable & Bill-by-Bill Settlement Ledger</div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 11px; font-weight: 600;">Statement Date: ${dateStr}</div>
          </div>
        </div>

        <div class="meta-box">
          <div>Distributor: <strong>${vendorSummary.name}</strong></div>
          <div style="text-align: right;">Contact Person: <strong>${vendorSummary.contact_person || 'N/A'}</strong></div>
          <div>Phone Number: <strong class="font-mono">${vendorSummary.phone || 'N/A'}</strong></div>
          <div style="text-align: right;">Total Consignment Bills: <strong>${vendorBills.length}</strong></div>
        </div>

        <h4 style="font-size: 11px; text-transform: uppercase; margin-bottom: 6px; color: #334155;">1. Invoiced Consignment Bills</h4>
        <table>
          <thead>
            <tr>
              <th style="width: 24%;">Invoice #</th>
              <th style="width: 18%;">Date</th>
              <th style="width: 16%; text-align: right;">Invoiced</th>
              <th style="width: 16%; text-align: right;">Paid</th>
              <th style="width: 16%; text-align: right;">Balance Due</th>
              <th style="width: 10%; text-align: right;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${vendorBills.map(b => {
              const d = new Date(b.created_at).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' });
              const due = Number(b.due_amount);
              return `
                <tr>
                  <td class="font-mono font-bold">${b.purchase_invoice_no}</td>
                  <td class="font-mono text-slate-500">${d}</td>
                  <td class="text-right font-mono">Rs ${Number(b.total_amount).toLocaleString()}</td>
                  <td class="text-right font-mono font-bold" style="color: #10B981;">Rs ${Number(b.paid_amount || 0).toLocaleString()}</td>
                  <td class="text-right font-mono font-bold" style="color: ${due > 0 ? '#F59E0B' : '#94a3b8'};">Rs ${due.toLocaleString()}</td>
                  <td class="text-right" style="font-weight: 700; font-size: 9px; color: ${due > 0 ? '#F59E0B' : '#10B981'};">
                    ${due <= 0 ? 'CLEARED' : b.paid_amount > 0 ? 'PARTIAL' : 'UNPAID'}
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>

        ${vendorPayments && vendorPayments.length > 0 ? `
          <h4 style="font-size: 11px; text-transform: uppercase; margin-top: 16px; margin-bottom: 6px; color: #334155;">2. Payment Out Vouchers & Settled Invoices Breakdown</h4>
          <table>
            <thead>
              <tr>
                <th style="width: 16%;">Voucher #</th>
                <th style="width: 14%;">Date</th>
                <th style="width: 22%;">Mode & Reference</th>
                <th style="width: 32%;">Allocated Bills & Audit Notes</th>
                <th style="width: 16%; text-align: right;">Amount Paid</th>
              </tr>
            </thead>
            <tbody>
              ${vendorPayments.map(p => `
                <tr>
                  <td class="font-mono font-bold" style="color: #0F52BA;">${p.payment_reference}</td>
                  <td class="font-mono text-slate-500">${new Date(p.created_at).toLocaleDateString('en-PK')}</td>
                  <td>${p.payment_mode} ${p.payment_reference_no ? `<br/><span class="font-mono" style="font-size:9px; color:#64748b;">Ref: ${p.payment_reference_no}</span>` : ''}</td>
                  <td style="font-size: 9.5px; color: #334155;">${p.notes || 'FIFO Account Settlement'}</td>
                  <td class="text-right font-mono font-bold" style="color: #10B981;">Rs ${Number(p.amount_paid).toLocaleString()}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : ''}

        <div class="summary-card">
          <div style="display: flex; justify-content: space-between;">
            <span>Total Invoiced Purchases:</span>
            <span class="font-mono font-bold">Rs ${vendorSummary.totalPurchased.toLocaleString()}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span>Total Disbursed (Paid):</span>
            <span class="font-mono font-bold" style="color: #10B981;">Rs ${vendorSummary.totalPaid.toLocaleString()}</span>
          </div>
          <div style="display: flex; justify-content: space-between; border-top: 1px solid #cbd5e1; padding-top: 4px; margin-top: 4px;">
            <span class="grand">Net Outstanding Due:</span>
            <span class="grand font-mono">Rs ${vendorSummary.outstandingDue.toLocaleString()}</span>
          </div>
        </div>

        <script>
          window.onload = function() { window.print(); window.close(); }
        </script>
      </body>
      </html>
    `);
    w.document.close();
  };

  // Register New Supplier
  const handleCreateSupplier = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('http://localhost:5000/api/suppliers', supplierFormData);
      setSuppliers(prev => [...prev, res.data]);
      setSelectedSupplierId(res.data.id);
      setIsSupplierModalOpen(false);
      setSupplierFormData({ name: '', contact_person: '', phone: '', email: '', address: '' });
      alert('New supplier registered and automatically selected!');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create supplier.');
    }
  };

  // Filtered Lists for Each Tab
  const filteredHistory = useMemo(() => {
    const q = historySearch.toLowerCase().trim();
    if (!q) return purchases;
    return purchases.filter(p => 
      p.purchase_invoice_no?.toLowerCase().includes(q) ||
      p.supplier_name?.toLowerCase().includes(q) ||
      p.items?.some(i => i.name?.toLowerCase().includes(q))
    );
  }, [purchases, historySearch]);

  const filteredSuppliers = useMemo(() => {
    const q = supplierQuery.toLowerCase().trim();
    if (!q) return suppliers;
    return suppliers.filter(s => 
      s.name.toLowerCase().includes(q) || 
      (s.contact_person && s.contact_person.toLowerCase().includes(q)) ||
      (s.phone && s.phone.includes(q))
    );
  }, [suppliers, supplierQuery]);

  // Summary Metrics
  const totalPayablesSummary = useMemo(() => {
    const totalPurchased = purchases.reduce((sum, p) => sum + Number(p.total_amount || 0), 0);
    const totalPaid = purchases.reduce((sum, p) => sum + Number(p.paid_amount || 0), 0);
    const totalDue = suppliers.reduce((sum, s) => sum + Number(s.balance || 0), 0);
    return { totalPurchased, totalPaid, totalDue };
  }, [purchases, suppliers]);

  // Step Completion Flags for Guided UX
  const isStep1Complete = Boolean(selectedSupplierId && billNo.trim());
  const isStep2Complete = inwardItems.length > 0;

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-8 font-sans select-none bg-[#F8FAFC]">
      
      {/* 1. Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#FFFFFF] px-5 py-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-[#0F52BA]/10 border border-[#0F52BA]/20 flex items-center justify-center text-[#0F52BA] shrink-0">
            <Truck size={18} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900 tracking-tight leading-none">
                Purchases & Stock Inward
              </h1>
              <span className="text-[11px] font-semibold text-[#0F52BA] bg-[#0F52BA]/10 border border-[#0F52BA]/20 px-2 py-0.5 rounded-full leading-none">
                {suppliers.length} Active Vendors
              </span>
            </div>
            <p className="text-xs text-slate-500 truncate mt-1 leading-none">
              Receive stock from suppliers, target specific invoices for payment, and audit vendor statements
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
          <button 
            onClick={loadData}
            disabled={isRefreshing}
            title="Refresh All Records"
            className="h-8 px-2.5 flex items-center gap-1.5 bg-[#FFFFFF] border border-slate-300 hover:border-[#0F52BA] hover:text-[#0F52BA] rounded-lg text-slate-600 transition-colors cursor-pointer shadow-2xs active:scale-95 disabled:opacity-50"
          >
            <RefreshCw size={13} className={isRefreshing ? 'animate-spin text-[#0F52BA]' : ''} />
            <span className="text-xs font-semibold hidden sm:inline">
              {isRefreshing ? 'Syncing...' : 'Refresh'}
            </span>
          </button>

          <button
            onClick={() => setIsSupplierModalOpen(true)}
            className="h-8 px-3.5 flex items-center gap-1.5 bg-[#0F52BA] hover:bg-[#0c449c] text-[#FFFFFF] rounded-lg text-xs font-semibold shadow-xs transition-all cursor-pointer active:scale-95"
          >
            <UserPlus size={14} />
            <span>Add New Supplier</span>
          </button>
        </div>
      </div>

      {/* 2. Segmented Pill Navigation Tabs */}
      <div className="bg-[#FFFFFF] p-1.5 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-1.5 overflow-x-auto">
        <button
          onClick={() => setActiveTab('inward')}
          className={`flex-1 min-w-[160px] py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'inward' 
              ? 'bg-[#0F52BA] text-[#FFFFFF] shadow-xs' 
              : 'text-slate-600 hover:bg-[#F8FAFC] hover:text-slate-900'
          }`}
        >
          <Package size={14} />
          <span>1. Receive New Stock</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 min-w-[175px] py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'history' 
              ? 'bg-[#0F52BA] text-[#FFFFFF] shadow-xs' 
              : 'text-slate-600 hover:bg-[#F8FAFC] hover:text-slate-900'
          }`}
        >
          <FileText size={14} />
          <span>2. Purchase Bills</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
            activeTab === 'history' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
          }`}>
            {purchases.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('balances')}
          className={`flex-1 min-w-[180px] py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'balances' 
              ? 'bg-[#0F52BA] text-[#FFFFFF] shadow-xs' 
              : 'text-slate-600 hover:bg-[#F8FAFC] hover:text-slate-900'
          }`}
        >
          <Wallet size={14} />
          <span>3. Vendor Payables</span>
          {totalPayablesSummary.totalDue > 0 && (
            <span className={`w-2 h-2 rounded-full ${activeTab === 'balances' ? 'bg-[#F59E0B]' : 'bg-[#F59E0B] animate-pulse'}`} />
          )}
        </button>

        <button
          onClick={() => setActiveTab('suppliers')}
          className={`flex-1 min-w-[160px] py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'suppliers' 
              ? 'bg-[#0F52BA] text-[#FFFFFF] shadow-xs' 
              : 'text-slate-600 hover:bg-[#F8FAFC] hover:text-slate-900'
          }`}
        >
          <Building2 size={14} />
          <span>4. Suppliers Directory</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
            activeTab === 'suppliers' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
          }`}>
            {suppliers.length}
          </span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: NEW STOCK INWARD (3-STEP GUIDED WORKFLOW)                          */}
      {/* ========================================================================= */}
      {activeTab === 'inward' && (
        <div className="space-y-4">
          
          {/* Interactive 3-Step Visual Progress Banner */}
          <div className="bg-[#FFFFFF] p-3 rounded-xl border border-slate-200 shadow-2xs grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className={`flex items-center gap-2.5 p-2 rounded-lg border transition-colors ${
              isStep1Complete ? 'bg-[#10B981]/5 border-[#10B981]/30' : 'bg-[#0F52BA]/5 border-[#0F52BA]/20'
            }`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                isStep1Complete ? 'bg-[#10B981] text-white' : 'bg-[#0F52BA] text-white'
              }`}>
                {isStep1Complete ? <Check size={13} /> : '1'}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 leading-none">Select Vendor & Bill #</p>
                <p className="text-[10px] text-slate-500 mt-0.5 truncate">Choose supplier or auto-generate bill</p>
              </div>
            </div>

            <div className={`flex items-center gap-2.5 p-2 rounded-lg border transition-colors ${
              isStep2Complete ? 'bg-[#10B981]/5 border-[#10B981]/30' : isStep1Complete ? 'bg-[#0F52BA]/5 border-[#0F52BA]/20' : 'bg-[#F8FAFC] border-slate-200 opacity-75'
            }`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                isStep2Complete ? 'bg-[#10B981] text-white' : isStep1Complete ? 'bg-[#0F52BA] text-white' : 'bg-slate-200 text-slate-600'
              }`}>
                {isStep2Complete ? <Check size={13} /> : '2'}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 leading-none">Add Received Items</p>
                <p className="text-[10px] text-slate-500 mt-0.5 truncate">Pick products, cost price & quantity</p>
              </div>
            </div>

            <div className={`flex items-center gap-2.5 p-2 rounded-lg border transition-colors ${
              isStep1Complete && isStep2Complete ? 'bg-[#0F52BA]/5 border-[#0F52BA]/20' : 'bg-[#F8FAFC] border-slate-200 opacity-75'
            }`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                isStep1Complete && isStep2Complete ? 'bg-[#0F52BA] text-white' : 'bg-slate-200 text-slate-600'
              }`}>
                3
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 leading-none">Payment & Save Stock</p>
                <p className="text-[10px] text-slate-500 mt-0.5 truncate">Enter cash paid or record on credit</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            
            <div className="lg:col-span-2 space-y-4">
              
              {/* STEP 1 CARD: VENDOR & BILL REFERENCE */}
              <div className="bg-[#FFFFFF] p-4 rounded-xl border border-slate-200 shadow-xs space-y-3.5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className={`w-5 h-5 rounded-md text-[11px] font-bold flex items-center justify-center ${
                      isStep1Complete ? 'bg-[#10B981] text-white' : 'bg-[#0F52BA] text-white'
                    }`}>
                      {isStep1Complete ? <Check size={12} /> : '1'}
                    </span>
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                      Step 1: Supplier & Invoice Reference
                    </h2>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsSupplierModalOpen(true)}
                    className="text-[11px] font-semibold text-[#0F52BA] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus size={12} /> New Vendor? Click here
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Select Distributor / Supplier <span className="text-[#EF4444]">*</span>
                    </label>
                    <select 
                      value={selectedSupplierId}
                      onChange={e => setSelectedSupplierId(e.target.value)}
                      className="h-9 w-full border border-slate-300 rounded-lg px-2.5 text-xs focus:outline-none focus:border-[#0F52BA] bg-[#FFFFFF] text-slate-900 cursor-pointer font-medium"
                    >
                      <option value="">-- Click to Choose Supplier --</option>
                      {suppliers.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.name} (Payable: Rs {Number(s.balance || 0).toLocaleString()})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-slate-700">
                        Vendor Bill / Invoice # <span className="text-[#EF4444]">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={handleGenerateBillNo}
                        className="text-[11px] font-semibold text-[#0F52BA] hover:text-[#4F46E5] flex items-center gap-1 cursor-pointer"
                        title="Generate automatic bill number if vendor did not provide one"
                      >
                        <Sparkles size={11} />
                        <span>Auto-Generate #</span>
                      </button>
                    </div>
                    <input 
                      type="text" 
                      value={billNo}
                      onChange={e => setBillNo(e.target.value)}
                      placeholder="Type bill # or click Auto-Generate..." 
                      className="h-9 w-full border border-slate-300 rounded-lg px-2.5 text-xs focus:outline-none focus:border-[#0F52BA] focus:ring-2 focus:ring-[#0F52BA]/15 font-mono text-slate-900"
                    />
                  </div>
                </div>

                {currentSupplier && (
                  <div className="p-3 bg-[#0F52BA]/5 border border-[#0F52BA]/20 rounded-lg flex flex-wrap items-center justify-between text-xs gap-2">
                    <div className="flex items-center gap-2">
                      <Building2 size={15} className="text-[#0F52BA]" />
                      <span className="font-bold text-slate-900">{currentSupplier.name}</span>
                      {currentSupplier.phone && <span className="text-slate-500 font-mono text-[11px]">({currentSupplier.phone})</span>}
                    </div>
                    <div>
                      <span className="text-slate-500 mr-1.5">Previous Ledger Balance:</span>
                      <strong className={`font-mono font-bold ${Number(currentSupplier.balance) > 0 ? 'text-[#F59E0B]' : 'text-[#10B981]'}`}>
                        Rs {Number(currentSupplier.balance || 0).toLocaleString()}
                      </strong>
                    </div>
                  </div>
                )}
              </div>

              {/* STEP 2 CARD: LINE ITEMS BUILDER */}
              <div className="bg-[#FFFFFF] p-4 rounded-xl border border-slate-200 shadow-xs space-y-3.5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className={`w-5 h-5 rounded-md text-[11px] font-bold flex items-center justify-center ${
                      isStep2Complete ? 'bg-[#10B981] text-white' : 'bg-[#0F52BA] text-white'
                    }`}>
                      {isStep2Complete ? <Check size={12} /> : '2'}
                    </span>
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                      Step 2: Search & Add Received Products
                    </h2>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    Click search box to view low-stock items
                  </span>
                </div>

                {!selectedProduct ? (
                  <div ref={searchContainerRef} className="relative">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#0F52BA]" size={15} />
                      <input 
                        type="text"
                        value={productSearch}
                        onChange={e => {
                          setProductSearch(e.target.value);
                          setIsDropdownOpen(true);
                        }}
                        onFocus={() => setIsDropdownOpen(true)}
                        placeholder="Click here to pick a product or type product name / SKU..."
                        className="h-9 w-full pl-9 pr-8 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-[#0F52BA] focus:ring-2 focus:ring-[#0F52BA]/15 bg-[#F8FAFC] focus:bg-[#FFFFFF] text-slate-900 font-medium transition-all"
                      />
                      {productSearch && (
                        <button 
                          onClick={() => {
                            setProductSearch('');
                            setIsDropdownOpen(false);
                          }}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>

                    {isDropdownOpen && matchingProducts.length > 0 && (
                      <div className="absolute top-full left-0 w-full mt-1 bg-[#FFFFFF] border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden divide-y divide-slate-100 max-h-64 overflow-y-auto">
                        <div className="px-3 py-1.5 bg-[#F8FAFC] text-[10px] font-bold uppercase tracking-wider text-slate-400 flex justify-between">
                          <span>{productSearch ? 'Matching Products' : 'Suggested Products (Lowest Stock First)'}</span>
                          <span>Click to Select</span>
                        </div>
                        {matchingProducts.map(p => {
                          const stock = Number(p.stock_quantity);
                          return (
                            <div 
                              key={p.id}
                              onClick={() => handleSelectProduct(p)}
                              className="p-2.5 hover:bg-[#0F52BA]/5 cursor-pointer flex justify-between items-center transition-colors text-xs"
                            >
                              <div className="min-w-0 pr-3">
                                <p className="font-bold text-slate-900 truncate">{p.name}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="font-mono text-slate-400 text-[10px]">{p.sku}</span>
                                  <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded ${
                                    stock <= 0 ? 'bg-[#EF4444]/10 text-[#EF4444]' : stock < 10 ? 'bg-[#F59E0B]/10 text-[#F59E0B]' : 'bg-slate-100 text-slate-600'
                                  }`}>
                                    Current Stock: {stock}
                                  </span>
                                </div>
                              </div>
                              <span className="px-2.5 py-1 bg-[#0F52BA] text-[#FFFFFF] font-semibold rounded-md text-[11px] shrink-0">
                                + Select
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-4 bg-[#0F52BA]/5 border-2 border-[#0F52BA]/30 rounded-xl space-y-3 animate-in fade-in duration-100">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider bg-[#0F52BA] text-[#FFFFFF] px-2 py-0.5 rounded">
                            Selected Product
                          </span>
                          <span className="text-xs text-slate-600">
                            Warehouse Stock: <strong className="text-slate-900">{selectedProduct.stock_quantity} units</strong> &bull; Retail Price: <strong>Rs {Number(selectedProduct.price).toLocaleString()}</strong>
                          </span>
                        </div>
                        <h3 className="font-bold text-slate-900 text-sm mt-1">{selectedProduct.name}</h3>
                        <span className="font-mono text-[11px] text-slate-500">SKU: {selectedProduct.sku}</span>
                      </div>

                      <button
                        type="button"
                        onClick={handleCancelSelectedProduct}
                        className="text-xs font-semibold text-slate-500 hover:text-[#EF4444] flex items-center gap-1 px-2 py-1 rounded-md bg-[#FFFFFF] border border-slate-200 transition-colors cursor-pointer"
                      >
                        <X size={13} />
                        <span>Change</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2.5 border-t border-[#0F52BA]/15 items-end">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Purchase Rate / Unit Cost (Rs)
                        </label>
                        <input 
                          type="number"
                          min="0"
                          value={purchaseRate}
                          onChange={e => setPurchaseRate(e.target.value)}
                          placeholder="0.00"
                          className="h-9 w-full bg-[#FFFFFF] border border-slate-300 rounded-lg px-2.5 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-[#0F52BA]"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Received Quantity (Units)
                        </label>
                        <input 
                          type="number"
                          min="1"
                          value={purchaseQty}
                          onChange={e => setPurchaseQty(e.target.value)}
                          placeholder="1"
                          className="h-9 w-full bg-[#FFFFFF] border border-slate-300 rounded-lg px-2.5 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-[#0F52BA]"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={handleAddItemToInward}
                        className="h-9 w-full bg-[#0F52BA] hover:bg-[#0c449c] text-[#FFFFFF] rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-xs active:scale-95 flex items-center justify-center gap-1.5"
                      >
                        <Plus size={14} />
                        <span>Add to Bill (Rs {((Number(purchaseRate) || 0) * (Number(purchaseQty) || 0)).toLocaleString()})</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Inward Items Table with Inline +/- Stepper */}
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-[#F8FAFC] border-b border-slate-200 text-slate-600 uppercase font-bold text-[10px] tracking-wider">
                      <tr>
                        <th className="py-2.5 px-3.5">Product Description</th>
                        <th className="py-2.5 px-3 text-right">Unit Cost</th>
                        <th className="py-2.5 px-3 text-center">Received Qty</th>
                        <th className="py-2.5 px-3 text-right">Line Total</th>
                        <th className="py-2.5 px-3.5 text-right">Remove</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {inwardItems.length === 0 ? (
                        <tr>
                          <td colSpan="5" className="p-8 text-center text-slate-400 bg-[#F8FAFC]/40">
                            <Package size={28} strokeWidth={1.4} className="mx-auto mb-1.5 text-slate-300" />
                            <p className="font-semibold text-slate-700 text-xs">Your inward bill list is empty</p>
                            <p className="text-[11px] text-slate-400 mt-0.5">Click the search box above to select items received from the supplier.</p>
                          </td>
                        </tr>
                      ) : (
                        inwardItems.map((item, idx) => (
                          <tr key={idx} className="hover:bg-[#F8FAFC] transition-colors">
                            <td className="py-2.5 px-3.5 font-semibold text-slate-900">
                              {item.name}
                              <span className="block font-mono text-[10px] text-slate-400 mt-0.5">{item.sku}</span>
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                              Rs {item.cost.toLocaleString()}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <div className="inline-flex items-center gap-1 bg-slate-100 border border-slate-200 rounded-md p-0.5">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateInwardQty(idx, -1)}
                                  className="w-5 h-5 flex items-center justify-center rounded bg-white text-slate-600 hover:text-slate-900 cursor-pointer"
                                  title="Decrease Quantity"
                                >
                                  <Minus size={10} />
                                </button>
                                <span className="px-2 font-mono font-bold text-[#0F52BA] text-xs">
                                  +{item.quantity}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateInwardQty(idx, 1)}
                                  className="w-5 h-5 flex items-center justify-center rounded bg-white text-slate-600 hover:text-slate-900 cursor-pointer"
                                  title="Increase Quantity"
                                >
                                  <Plus size={10} />
                                </button>
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                              Rs {(item.cost * item.quantity).toLocaleString()}
                            </td>
                            <td className="py-2.5 px-3.5 text-right">
                              <button 
                                type="button" 
                                onClick={() => handleRemoveInwardItem(idx)}
                                className="text-slate-400 hover:text-[#EF4444] p-1 rounded transition-colors cursor-pointer"
                                title="Remove from bill"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

              </div>
            </div>

            {/* STEP 3 CARD: SETTLEMENT & CONFIRMATION */}
            <div className="bg-[#FFFFFF] p-4 rounded-xl border border-slate-200 shadow-xs h-fit space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
                <span className="w-5 h-5 rounded-md bg-[#0F52BA] text-white text-[11px] font-bold flex items-center justify-center">
                  3
                </span>
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Step 3: Bill Settlement
                </h2>
              </div>

              {/* Bill Summary Box */}
              <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between text-slate-500">
                  <span>Product Lines:</span>
                  <span className="font-mono font-semibold text-slate-800">{inwardItems.length} items</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Total Stock Units:</span>
                  <span className="font-mono font-bold text-[#10B981]">+{totalInwardUnits} pcs</span>
                </div>
                <div className="flex justify-between text-xs font-bold text-slate-900 pt-2 border-t border-slate-200 items-baseline">
                  <span>Total Bill Amount:</span>
                  <span className="text-[#0F52BA] font-mono text-lg font-black">
                    Rs {totalBillAmount.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* 1-Click Payment Presets */}
              <div className="space-y-2.5">
                <label className="block text-xs font-bold text-slate-700">
                  How are you paying the supplier?
                </label>

                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    disabled={totalBillAmount <= 0}
                    onClick={() => setPaidAmount(String(totalBillAmount))}
                    className={`py-1.5 px-2 rounded-lg text-[11px] font-bold border transition-all cursor-pointer disabled:opacity-40 ${
                      totalBillAmount > 0 && numericPaid === totalBillAmount
                        ? 'bg-[#10B981] text-white border-[#10B981]'
                        : 'bg-[#FFFFFF] text-slate-700 border-slate-300 hover:border-[#10B981]'
                    }`}
                  >
                    100% Paid
                  </button>

                  <button
                    type="button"
                    disabled={totalBillAmount <= 0}
                    onClick={() => setPaidAmount(String(Math.round(totalBillAmount / 2)))}
                    className={`py-1.5 px-2 rounded-lg text-[11px] font-bold border transition-all cursor-pointer disabled:opacity-40 ${
                      totalBillAmount > 0 && numericPaid === Math.round(totalBillAmount / 2)
                        ? 'bg-[#0F52BA] text-white border-[#0F52BA]'
                        : 'bg-[#FFFFFF] text-slate-700 border-slate-300 hover:border-[#0F52BA]'
                    }`}
                  >
                    50% Half
                  </button>

                  <button
                    type="button"
                    disabled={totalBillAmount <= 0}
                    onClick={() => setPaidAmount('0')}
                    className={`py-1.5 px-2 rounded-lg text-[11px] font-bold border transition-all cursor-pointer disabled:opacity-40 ${
                      paidAmount === '0'
                        ? 'bg-[#F59E0B] text-white border-[#F59E0B]'
                        : 'bg-[#FFFFFF] text-slate-700 border-slate-300 hover:border-[#F59E0B]'
                    }`}
                  >
                    On Credit (0)
                  </button>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    Or enter custom cash paid now (Rs):
                  </label>
                  <input 
                    type="number" 
                    min="0"
                    max={totalBillAmount}
                    value={paidAmount}
                    onChange={e => setPaidAmount(e.target.value)}
                    placeholder="0.00"
                    className="h-9 w-full border border-slate-300 rounded-lg px-3 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-[#0F52BA] focus:ring-2 focus:ring-[#0F52BA]/15"
                  />
                </div>

                {/* Live Balance Preview */}
                <div className={`p-3 rounded-xl border flex justify-between items-center text-xs ${
                  dueBalance > 0 
                    ? 'bg-[#F59E0B]/10 border-[#F59E0B]/30 text-[#F59E0B]' 
                    : 'bg-[#10B981]/10 border-[#10B981]/30 text-[#10B981]'
                }`}>
                  <span className="font-bold">
                    {dueBalance > 0 ? 'Added to Vendor Payable Ledger:' : 'Bill Status:'}
                  </span>
                  <span className="font-mono font-black text-sm">
                    {dueBalance > 0 ? `Rs ${dueBalance.toLocaleString()} Due` : 'Fully Settled'}
                  </span>
                </div>
              </div>

              <button
                onClick={handleSubmitPurchase}
                disabled={isSubmitting || inwardItems.length === 0}
                className="w-full py-3 bg-[#0F52BA] hover:bg-[#0c449c] text-[#FFFFFF] rounded-xl text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-sm active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <CheckCircle2 size={15} />
                <span>{isSubmitting ? 'Updating Inventory...' : 'Save Bill & Add to Stock'}</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: PURCHASE BILLS HISTORY (With Direct Single-Bill Pay Action)        */}
      {/* ========================================================================= */}
      {activeTab === 'history' && (
        <div className="bg-[#FFFFFF] rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          
          <div className="p-3.5 border-b border-slate-200 bg-[#F8FAFC] flex flex-col sm:flex-row justify-between items-center gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input 
                type="text" 
                placeholder="Search by Bill #, Distributor, or item name..." 
                value={historySearch}
                onChange={e => setHistorySearch(e.target.value)}
                className="h-8 w-full pl-8 pr-7 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-[#0F52BA] bg-[#FFFFFF]"
              />
              {historySearch && (
                <button 
                  onClick={() => setHistorySearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            <span className="text-xs font-semibold text-slate-500">
              Showing <strong className="text-slate-800">{filteredHistory.length}</strong> of {purchases.length} Purchase Bills
            </span>
          </div>

          <div className="overflow-x-auto min-h-[350px]">
            <table className="w-full text-left text-xs min-w-[820px] border-collapse">
              <thead className="bg-[#F8FAFC] border-b border-slate-200 text-slate-600 uppercase font-bold text-[10px] tracking-wider">
                <tr>
                  <th className="py-2.5 px-4">Invoice / Bill #</th>
                  <th className="py-2.5 px-3">Distributor</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3 text-center">Units</th>
                  <th className="py-2.5 px-3 text-right">Total Bill</th>
                  <th className="py-2.5 px-3 text-right">Paid Amount</th>
                  <th className="py-2.5 px-3 text-right">Balance Due</th>
                  <th className="py-2.5 px-3 text-center">Payment Status</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredHistory.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="p-10 text-center text-slate-400">
                      <FileText size={34} strokeWidth={1.3} className="mx-auto mb-1.5 text-slate-300" />
                      <p className="font-semibold text-slate-600 text-xs">No purchase records found</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Try searching with a different bill number or distributor name.</p>
                    </td>
                  </tr>
                ) : (
                  filteredHistory.map(p => {
                    const status = getPaymentStatus(p.total_amount, p.paid_amount, p.due_amount);
                    const dueAmt = Number(p.due_amount || 0);
                    const vendorObj = suppliers.find(s => String(s.id) === String(p.supplier_id));

                    return (
                      <tr 
                        key={p.id} 
                        className="hover:bg-[#F8FAFC] transition-colors cursor-pointer group"
                        onClick={() => setSelectedPurchaseDetails(p)}
                      >
                        <td className="py-2.5 px-4 font-mono font-bold text-[#0F52BA] whitespace-nowrap">{p.purchase_invoice_no}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900 whitespace-nowrap">{p.supplier_name}</td>
                        <td className="py-2.5 px-3 text-slate-500 font-mono whitespace-nowrap">
                          {new Date(p.created_at).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-800 whitespace-nowrap">{p.total_items} pcs</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                          Rs {Number(p.total_amount).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-[#10B981] whitespace-nowrap">
                          Rs {Number(p.paid_amount || 0).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold whitespace-nowrap">
                          {dueAmt > 0 ? (
                            <span className="text-[#F59E0B]">Rs {dueAmt.toLocaleString()}</span>
                          ) : (
                            <span className="text-slate-400">Rs 0</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${status.bg}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                            {status.label}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-right whitespace-nowrap" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            {dueAmt > 0 && vendorObj && (
                              <button
                                onClick={() => handleOpenPaymentModal(vendorObj, p)}
                                title={`Pay this specific bill (${p.purchase_invoice_no})`}
                                className="h-6 px-2 bg-[#10B981] hover:bg-[#059669] text-white rounded text-[10px] font-bold flex items-center gap-1 cursor-pointer shadow-2xs"
                              >
                                <DollarSign size={11} />
                                <span>Pay Bill</span>
                              </button>
                            )}
                            <button
                              onClick={() => setSelectedPurchaseDetails(p)}
                              title="View Full Bill"
                              className="p-1.5 text-slate-400 hover:text-[#0F52BA] hover:bg-[#0F52BA]/10 rounded-md transition-colors cursor-pointer"
                            >
                              <Eye size={14} />
                            </button>
                            <button
                              onClick={() => printPurchaseVoucher(p)}
                              title="Print Receiving Slip"
                              className="p-1.5 text-slate-400 hover:text-[#0F52BA] hover:bg-[#0F52BA]/10 rounded-md transition-colors cursor-pointer"
                            >
                              <Printer size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: VENDOR BALANCES & PAYABLES                                         */}
      {/* ========================================================================= */}
      {activeTab === 'balances' && (
        <div className="space-y-4">
          
          {/* Summary KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-[#FFFFFF] border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Total Invoiced Purchases
              </span>
              <div className="mt-1 text-xl font-black text-slate-900 font-mono">
                Rs {totalPayablesSummary.totalPurchased.toLocaleString()}
              </div>
              <div className="text-[11px] text-[#4F46E5] font-semibold mt-1 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#4F46E5]"></span>
                Cumulative Consignments
              </div>
            </div>

            <div className="bg-[#FFFFFF] border border-[#10B981]/30 bg-[#10B981]/5 rounded-xl p-4 shadow-xs flex flex-col justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#10B981]">
                Total Disbursed (Paid)
              </span>
              <div className="mt-1 text-xl font-black text-[#10B981] font-mono">
                Rs {totalPayablesSummary.totalPaid.toLocaleString()}
              </div>
              <div className="text-[11px] text-[#10B981] font-semibold mt-1 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]"></span>
                Settled Vendor Outflows
              </div>
            </div>

            <div className="bg-[#FFFFFF] border border-[#F59E0B]/30 bg-[#F59E0B]/5 rounded-xl p-4 shadow-xs flex flex-col justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#F59E0B]">
                Net Outstanding Payables
              </span>
              <div className="mt-1 text-xl font-black text-[#F59E0B] font-mono">
                Rs {totalPayablesSummary.totalDue.toLocaleString()}
              </div>
              <div className="text-[11px] text-[#F59E0B] font-semibold mt-1 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]"></span>
                Active Payable Liability
              </div>
            </div>
          </div>

          {/* Vendor Balances Table */}
          <div className="bg-[#FFFFFF] rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-3.5 border-b border-slate-200 bg-[#F8FAFC] flex flex-col sm:flex-row justify-between items-center gap-3">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input 
                  type="text" 
                  placeholder="Search vendor balances by name or phone..." 
                  value={balanceSearch}
                  onChange={e => setBalanceSearch(e.target.value)}
                  className="h-8 w-full pl-8 pr-7 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-[#0F52BA] bg-[#FFFFFF]"
                />
                {balanceSearch && (
                  <button 
                    onClick={() => setBalanceSearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              <span className="text-xs font-semibold text-slate-500">
                <strong className="text-slate-800">{vendorLedgerData.length}</strong> Vendors Listed
              </span>
            </div>

            <div className="overflow-x-auto min-h-[350px]">
              <table className="w-full text-left text-xs min-w-[760px] border-collapse">
                <thead className="bg-[#F8FAFC] border-b border-slate-200 text-slate-600 uppercase font-bold text-[10px] tracking-wider">
                  <tr>
                    <th className="py-2.5 px-4">Vendor Company</th>
                    <th className="py-2.5 px-3">Contact Info</th>
                    <th className="py-2.5 px-3 text-center">Consignments</th>
                    <th className="py-2.5 px-3 text-right">Total Invoiced</th>
                    <th className="py-2.5 px-3 text-right">Total Paid</th>
                    <th className="py-2.5 px-3 text-right">Outstanding Due</th>
                    <th className="py-2.5 px-4 text-right">Actions & Pay</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {vendorLedgerData.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="p-10 text-center text-slate-400">
                        No vendor records matched your search.
                      </td>
                    </tr>
                  ) : (
                    vendorLedgerData.map(v => {
                      const unpaidBillsCount = v.bills.filter(b => Number(b.due_amount) > 0).length;
                      return (
                        <tr 
                          key={v.id} 
                          className="hover:bg-[#F8FAFC] transition-colors"
                        >
                          <td 
                            onClick={() => setSelectedVendorLedger(v)}
                            className="py-2.5 px-4 font-bold text-slate-900 flex items-center gap-2 cursor-pointer hover:text-[#0F52BA] transition-colors whitespace-nowrap"
                          >
                            <Building2 size={15} className="text-[#0F52BA] shrink-0" />
                            <span>{v.name}</span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                            <div className="font-medium text-slate-800">{v.contact_person || 'N/A'}</div>
                            <div className="font-mono text-[10px] text-slate-400">{v.phone || 'N/A'}</div>
                          </td>
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-700 rounded font-mono font-bold text-[11px]">
                              {v.billsCount} total ({unpaidBillsCount} unpaid)
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                            Rs {v.totalPurchased.toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-[#10B981] whitespace-nowrap">
                            Rs {v.totalPaid.toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold whitespace-nowrap">
                            <span className={v.outstandingDue > 0 ? 'text-[#F59E0B] font-extrabold' : 'text-slate-400'}>
                              Rs {v.outstandingDue.toLocaleString()}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-2">
                              {v.outstandingDue > 0 && (
                                <button
                                  onClick={() => handleOpenPaymentModal(v)}
                                  className="h-7 px-2.5 inline-flex items-center gap-1 bg-[#10B981] hover:bg-[#059669] text-[#FFFFFF] rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer active:scale-95"
                                >
                                  <DollarSign size={12} />
                                  <span>Select Bills & Pay</span>
                                </button>
                              )}
                              <button
                                onClick={() => setSelectedVendorLedger(v)}
                                className="h-7 px-2.5 inline-flex items-center gap-1 bg-[#FFFFFF] border border-slate-300 hover:border-[#0F52BA] hover:text-[#0F52BA] text-slate-700 rounded-lg text-xs font-semibold shadow-2xs transition-all cursor-pointer active:scale-95"
                              >
                                <span>Statement</span>
                                <ArrowRight size={12} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: SUPPLIERS DIRECTORY                                                */}
      {/* ========================================================================= */}
      {activeTab === 'suppliers' && (
        <div className="bg-[#FFFFFF] rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          
          <div className="p-3.5 border-b border-slate-200 bg-[#F8FAFC] flex justify-between items-center gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input 
                type="text" 
                placeholder="Search vendor directory by name or phone..." 
                value={supplierQuery}
                onChange={e => setSupplierQuery(e.target.value)}
                className="h-8 w-full pl-8 pr-7 border border-slate-300 rounded-lg text-xs focus:outline-none focus:border-[#0F52BA] bg-[#FFFFFF]"
              />
              {supplierQuery && (
                <button 
                  onClick={() => setSupplierQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            <span className="text-xs font-semibold text-slate-500">
              <strong className="text-slate-800">{filteredSuppliers.length}</strong> Registered Vendors
            </span>
          </div>

          <div className="overflow-x-auto min-h-[350px]">
            <table className="w-full text-left text-xs min-w-[700px] border-collapse">
              <thead className="bg-[#F8FAFC] border-b border-slate-200 text-slate-600 uppercase font-bold text-[10px] tracking-wider">
                <tr>
                  <th className="py-2.5 px-4">Vendor Company</th>
                  <th className="py-2.5 px-3">Contact Person</th>
                  <th className="py-2.5 px-3">Phone Number</th>
                  <th className="py-2.5 px-3">Address</th>
                  <th className="py-2.5 px-4 text-right">Payable Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSuppliers.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="p-10 text-center text-slate-400">
                      <Building2 size={34} strokeWidth={1.3} className="mx-auto mb-1.5 text-slate-300" />
                      <p className="font-semibold text-slate-600 text-xs">No suppliers found</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Click &quot;Add New Supplier&quot; to register vendors.</p>
                    </td>
                  </tr>
                ) : (
                  filteredSuppliers.map(s => (
                    <tr key={s.id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="py-2.5 px-4 font-bold text-slate-900 flex items-center gap-2 whitespace-nowrap">
                        <Building2 size={15} className="text-[#0F52BA] shrink-0" />
                        <span>{s.name}</span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">{s.contact_person || 'N/A'}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-600 whitespace-nowrap">{s.phone || 'N/A'}</td>
                      <td className="py-2.5 px-3 text-slate-500 truncate max-w-xs">{s.address || 'N/A'}</td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                        Rs {Number(s.balance || 0).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: MULTI-BILL SMART ALLOCATION & SUPPLIER PAYMENT                   */}
      {/* ========================================================================= */}
      {paymentModalVendor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-3 animate-in fade-in duration-150">
          <div className="bg-[#FFFFFF] rounded-2xl shadow-xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
            
            <div className="px-5 py-3.5 border-b border-slate-200 bg-[#F8FAFC] flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-[#10B981]/10 text-[#10B981] flex items-center justify-center">
                  <CreditCard size={15} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-xs tracking-tight">
                    Bill-by-Bill Payment Allocation &mdash; {paymentModalVendor.name}
                  </h3>
                  <p className="text-[10px] text-slate-500">
                    Select specific invoices to pay or enter a custom amount for automatic settlement
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setPaymentModalVendor(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmitPayment} className="p-5 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
              
              {/* Total Vendor Payable Banner */}
              <div className="p-3 bg-[#F59E0B]/10 border border-[#F59E0B]/30 rounded-xl flex justify-between items-center text-xs">
                <div>
                  <span className="font-bold text-slate-900 block">Total Unpaid Balance ({modalVendorUnpaidBills.length} Open Bills)</span>
                  <span className="text-[10px] text-slate-500">Check or uncheck bills below to calculate exact payment</span>
                </div>
                <span className="font-mono font-black text-[#F59E0B] text-base">
                  Rs {Number(paymentModalVendor.outstandingDue || paymentModalVendor.balance || 0).toLocaleString()}
                </span>
              </div>

              {/* Interactive Unpaid Bills Selector Table */}
              {modalVendorUnpaidBills.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <span>1. Select Unpaid Invoices to Settle</span>
                      <span className="text-[10px] font-semibold bg-[#0F52BA]/10 text-[#0F52BA] px-2 py-0.2 rounded-full">
                        {selectedBillIds.length} of {modalVendorUnpaidBills.length} Selected
                      </span>
                    </label>
                    <button
                      type="button"
                      onClick={handleToggleAllModalBills}
                      className="text-[11px] font-semibold text-[#0F52BA] hover:underline cursor-pointer"
                    >
                      {selectedBillIds.length === modalVendorUnpaidBills.length ? 'Deselect All' : 'Select All Bills'}
                    </button>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden max-h-52 overflow-y-auto custom-scrollbar">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-[#F8FAFC] border-b border-slate-200 text-slate-500 uppercase font-bold text-[10px] sticky top-0">
                        <tr>
                          <th className="py-2 px-3 w-8">Pick</th>
                          <th className="py-2 px-2">Bill #</th>
                          <th className="py-2 px-2">Date</th>
                          <th className="py-2 px-2 text-right">Bill Due</th>
                          <th className="py-2 px-3 text-right">Live Payment Allocation</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {modalVendorUnpaidBills.map(bill => {
                          const isChecked = selectedBillIds.includes(bill.id);
                          const alloc = liveBillAllocation[bill.id] || { allocated: 0, remainingDue: Number(bill.due_amount), status: 'none' };

                          return (
                            <tr 
                              key={bill.id}
                              onClick={() => handleToggleBillSelection(bill)}
                              className={`cursor-pointer transition-colors ${
                                isChecked ? 'bg-[#0F52BA]/5 hover:bg-[#0F52BA]/10' : 'hover:bg-[#F8FAFC]'
                              }`}
                            >
                              <td className="py-2 px-3">
                                {isChecked ? (
                                  <CheckSquare size={15} className="text-[#0F52BA]" />
                                ) : (
                                  <Square size={15} className="text-slate-300" />
                                )}
                              </td>
                              <td className="py-2 px-2 font-mono font-bold text-[#0F52BA]">
                                {bill.purchase_invoice_no}
                              </td>
                              <td className="py-2 px-2 font-mono text-[11px] text-slate-500">
                                {new Date(bill.created_at).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </td>
                              <td className="py-2 px-2 text-right font-mono font-bold text-slate-800">
                                Rs {Number(bill.due_amount).toLocaleString()}
                              </td>
                              <td className="py-2 px-3 text-right whitespace-nowrap">
                                {alloc.status === 'full' ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/30">
                                    <Check size={10} /> Full Clear (Rs {alloc.allocated.toLocaleString()})
                                  </span>
                                ) : alloc.status === 'partial' ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/30">
                                    Partial: Rs {alloc.allocated.toLocaleString()} (Rem: Rs {alloc.remainingDue.toLocaleString()})
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-slate-400 font-medium">
                                    Unallocated
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Payment Amount & Mode Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-bold text-slate-700">
                      2. Payment Amount (Rs) <span className="text-[#EF4444]">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const allIds = modalVendorUnpaidBills.map(b => b.id);
                        setSelectedBillIds(allIds);
                        setPaymentFormData({
                          ...paymentFormData,
                          amountPaid: String(paymentModalVendor.outstandingDue || paymentModalVendor.balance || 0)
                        });
                      }}
                      className="text-[11px] text-[#10B981] hover:underline font-semibold cursor-pointer"
                    >
                      Pay Full Balance
                    </button>
                  </div>
                  <input 
                    type="number"
                    required
                    min="1"
                    max={Number(paymentModalVendor.outstandingDue || paymentModalVendor.balance || 0)}
                    value={paymentFormData.amountPaid}
                    onChange={e => setPaymentFormData({ ...paymentFormData, amountPaid: e.target.value })}
                    placeholder="0.00"
                    className="h-9 w-full border border-slate-300 rounded-lg px-2.5 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-[#0F52BA] focus:ring-2 focus:ring-[#0F52BA]/15"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Payment Method</label>
                  <select
                    value={paymentFormData.paymentMode}
                    onChange={e => setPaymentFormData({ ...paymentFormData, paymentMode: e.target.value })}
                    className="h-9 w-full border border-slate-300 rounded-lg px-2.5 text-xs focus:outline-none focus:border-[#0F52BA] bg-[#FFFFFF] cursor-pointer font-medium"
                  >
                    <option value="Cash">Cash Counter</option>
                    <option value="Bank Transfer / Raast">Bank Transfer / Raast</option>
                    <option value="Cheque">Bank Cheque</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Bank Transaction / Cheque / Slip Ref #</label>
                  <input 
                    type="text"
                    value={paymentFormData.paymentReferenceNo}
                    onChange={e => setPaymentFormData({ ...paymentFormData, paymentReferenceNo: e.target.value })}
                    placeholder="e.g. TR-941042 / CHQ-00129"
                    className="h-8 w-full border border-slate-300 rounded-lg px-2.5 text-xs font-mono focus:outline-none focus:border-[#0F52BA]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Additional Remarks (Optional)</label>
                  <input 
                    type="text"
                    value={paymentFormData.notes}
                    onChange={e => setPaymentFormData({ ...paymentFormData, notes: e.target.value })}
                    placeholder="Settled bill numbers are auto-logged..."
                    className="h-8 w-full border border-slate-300 rounded-lg px-2.5 text-xs focus:outline-none focus:border-[#0F52BA]"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPaymentModalVendor(null)}
                  className="h-8 px-3.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPayment}
                  className="h-8 px-4 text-xs font-semibold bg-[#10B981] hover:bg-[#059669] text-[#FFFFFF] rounded-lg transition-colors cursor-pointer shadow-xs disabled:opacity-50 active:scale-95 flex items-center gap-1.5"
                >
                  <CheckCircle2 size={13} />
                  <span>{isSubmittingPayment ? 'Processing Settlement...' : 'Confirm & Settle Selected Bills'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: VENDOR DETAILED STATEMENT / LEDGER                               */}
      {/* ========================================================================= */}
      {selectedVendorLedger && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-3 animate-in fade-in duration-150">
          <div className="bg-[#FFFFFF] rounded-2xl shadow-xl border border-slate-200 w-full max-w-4xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[88vh]">
            
            <div className="px-5 py-3.5 border-b border-slate-200 bg-[#F8FAFC] flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-[#0F52BA]/10 text-[#0F52BA] flex items-center justify-center">
                  <Building2 size={15} />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">{selectedVendorLedger.name}</h2>
                  <p className="text-[11px] text-slate-500">
                    Contact: {selectedVendorLedger.contact_person || 'N/A'} &bull; Phone: {selectedVendorLedger.phone || 'N/A'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => printVendorStatement(selectedVendorLedger, selectedVendorLedger.bills, selectedVendorLedger.paymentsList)}
                  className="h-8 flex items-center gap-1.5 px-3 bg-[#0F52BA] text-[#FFFFFF] rounded-lg text-xs font-semibold hover:bg-[#0c449c] transition-colors shadow-xs cursor-pointer active:scale-95"
                >
                  <Printer size={13} />
                  <span>Print Statement</span>
                </button>
                <button 
                  onClick={() => setSelectedVendorLedger(null)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-md cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 divide-x divide-slate-200 border-b border-slate-200 bg-[#FFFFFF] p-3 text-center text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider">Total Purchases</span>
                <strong className="text-slate-900 font-mono text-sm block mt-0.5">
                  Rs {selectedVendorLedger.totalPurchased.toLocaleString()}
                </strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider">Total Paid</span>
                <strong className="text-[#10B981] font-mono text-sm block mt-0.5">
                  Rs {selectedVendorLedger.totalPaid.toLocaleString()}
                </strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider">Outstanding Due</span>
                <strong className="text-[#F59E0B] font-mono text-sm block mt-0.5">
                  Rs {selectedVendorLedger.outstandingDue.toLocaleString()}
                </strong>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-5">
              
              {/* 1. Consignment Bills with Direct Single-Bill Pay Action */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  1. Invoiced Consignment Bills ({selectedVendorLedger.bills.length})
                </h3>
                {selectedVendorLedger.bills.length === 0 ? (
                  <div className="p-4 text-center text-slate-400 text-xs border border-slate-200 rounded-lg">No consignment bills.</div>
                ) : (
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-[#F8FAFC] border-b border-slate-200 text-slate-600 uppercase font-bold text-[10px]">
                        <tr>
                          <th className="py-2 px-3">Bill #</th>
                          <th className="py-2 px-3">Date</th>
                          <th className="py-2 px-3 text-center">Items</th>
                          <th className="py-2 px-3 text-right">Invoiced</th>
                          <th className="py-2 px-3 text-right">Paid</th>
                          <th className="py-2 px-3 text-right">Due</th>
                          <th className="py-2 px-3 text-center">Status</th>
                          <th className="py-2 px-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedVendorLedger.bills.map((b) => {
                          const billStatus = getPaymentStatus(b.total_amount, b.paid_amount, b.due_amount);
                          const isUnpaid = Number(b.due_amount) > 0;
                          return (
                            <tr key={b.id} className="hover:bg-[#F8FAFC] transition-colors">
                              <td className="py-2 px-3 font-mono font-bold text-[#0F52BA]">{b.purchase_invoice_no}</td>
                              <td className="py-2 px-3 text-slate-500 font-mono">
                                {new Date(b.created_at).toLocaleDateString('en-PK')}
                              </td>
                              <td className="py-2 px-3 text-center font-mono font-semibold">{b.total_items} pcs</td>
                              <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                                Rs {Number(b.total_amount).toLocaleString()}
                              </td>
                              <td className="py-2 px-3 text-right font-mono font-bold text-[#10B981]">
                                Rs {Number(b.paid_amount || 0).toLocaleString()}
                              </td>
                              <td className="py-2 px-3 text-right font-mono font-bold">
                                {isUnpaid ? (
                                  <span className="text-[#F59E0B]">Rs {Number(b.due_amount).toLocaleString()}</span>
                                ) : (
                                  <span className="text-slate-400">Rs 0</span>
                                )}
                              </td>
                              <td className="py-2 px-3 text-center">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${billStatus.bg}`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${billStatus.dot}`} />
                                  {billStatus.label}
                                </span>
                              </td>
                              <td className="py-2 px-3 text-right">
                                {isUnpaid ? (
                                  <button
                                    onClick={() => {
                                      const targetVendor = selectedVendorLedger;
                                      setSelectedVendorLedger(null);
                                      handleOpenPaymentModal(targetVendor, b);
                                    }}
                                    className="px-2 py-1 bg-[#10B981] hover:bg-[#059669] text-white rounded text-[10px] font-bold cursor-pointer"
                                  >
                                    Pay This Bill
                                  </button>
                                ) : (
                                  <span className="text-[10px] text-slate-400">Cleared</span>
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

              {/* 2. Payments Disbursed with Allocated Bills Breakdown */}
              {selectedVendorLedger.paymentsList && selectedVendorLedger.paymentsList.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                    2. Payment Out Vouchers & Allocated Invoices ({selectedVendorLedger.paymentsList.length})
                  </h3>
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-[#F8FAFC] border-b border-slate-200 text-slate-600 uppercase font-bold text-[10px]">
                        <tr>
                          <th className="py-2 px-3">Voucher Ref #</th>
                          <th className="py-2 px-3">Date</th>
                          <th className="py-2 px-3">Payment Mode</th>
                          <th className="py-2 px-3">Allocated Bills & Remarks</th>
                          <th className="py-2 px-3 text-right">Disbursed Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedVendorLedger.paymentsList.map(pay => (
                          <tr key={pay.id} className="hover:bg-[#F8FAFC]">
                            <td className="py-2 px-3 font-mono font-bold text-[#10B981] whitespace-nowrap">{pay.payment_reference}</td>
                            <td className="py-2 px-3 font-mono text-slate-500 whitespace-nowrap">{new Date(pay.created_at).toLocaleDateString('en-PK')}</td>
                            <td className="py-2 px-3 text-slate-700 whitespace-nowrap">
                              <span className="font-semibold">{pay.payment_mode}</span>
                              {pay.payment_reference_no && <span className="font-mono text-slate-400 block text-[10px]">{pay.payment_reference_no}</span>}
                            </td>
                            <td className="py-2 px-3 text-[11px] text-slate-600">
                              {pay.notes || 'FIFO Account Settlement'}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-[#10B981] whitespace-nowrap">
                              Rs {Number(pay.amount_paid).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>

            <div className="p-3 border-t border-slate-200 bg-[#F8FAFC] flex justify-between items-center">
              {selectedVendorLedger.outstandingDue > 0 ? (
                <button
                  onClick={() => {
                    const targetVendor = selectedVendorLedger;
                    setSelectedVendorLedger(null);
                    handleOpenPaymentModal(targetVendor);
                  }}
                  className="h-8 px-3.5 bg-[#10B981] hover:bg-[#059669] text-[#FFFFFF] rounded-lg text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1.5 shadow-xs"
                >
                  <DollarSign size={13} />
                  <span>Select Multiple Bills & Pay</span>
                </button>
              ) : <div />}
              <button
                onClick={() => setSelectedVendorLedger(null)}
                className="h-8 px-4 bg-[#FFFFFF] border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
              >
                Close Statement
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL 3: PURCHASE BILL DETAILS & RE-PRINT */}
      {selectedPurchaseDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-3 animate-in fade-in duration-150">
          <div className="bg-[#FFFFFF] rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="px-5 py-3.5 border-b border-slate-200 flex justify-between items-center bg-[#F8FAFC]">
              <div>
                <h3 className="font-bold text-slate-900 text-xs">
                  Consignment Bill: <span className="font-mono text-[#0F52BA]">{selectedPurchaseDetails.purchase_invoice_no}</span>
                </h3>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  {selectedPurchaseDetails.supplier_name} &bull; {new Date(selectedPurchaseDetails.created_at).toLocaleString('en-PK')}
                </p>
              </div>
              <button 
                onClick={() => setSelectedPurchaseDetails(null)}
                className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <div className="p-4 max-h-[320px] overflow-y-auto divide-y divide-slate-100 custom-scrollbar">
              {selectedPurchaseDetails.items?.map((item, idx) => (
                <div key={idx} className="py-2.5 flex justify-between items-center text-xs">
                  <div>
                    <p className="font-semibold text-slate-900">{item.name}</p>
                    <span className="font-mono text-[10px] text-slate-400">
                      {item.sku} &bull; Rs {Number(item.cost).toLocaleString()} &times; {item.quantity} pcs
                    </span>
                  </div>
                  <span className="font-bold text-slate-900 font-mono">
                    Rs {(item.cost * item.quantity).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>

            <div className="p-4 bg-[#F8FAFC] border-t border-slate-200 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>Total Bill Amount</span>
                <span className="font-mono font-bold text-slate-800">
                  Rs {Number(selectedPurchaseDetails.total_amount).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-[#10B981]">
                <span>Amount Paid</span>
                <span className="font-mono font-bold">
                  Rs {Number(selectedPurchaseDetails.paid_amount || 0).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-sm font-bold text-slate-900 pt-1.5 border-t border-slate-200">
                <span>Balance Due</span>
                <span className="font-mono text-[#F59E0B]">
                  Rs {Number(selectedPurchaseDetails.due_amount || 0).toLocaleString()}
                </span>
              </div>
            </div>

            <div className="p-3 border-t border-slate-100 flex justify-end gap-2 bg-[#FFFFFF]">
              <button 
                onClick={() => setSelectedPurchaseDetails(null)}
                className="h-8 px-3.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Close
              </button>
              <button 
                onClick={() => {
                  printPurchaseVoucher(selectedPurchaseDetails);
                  setSelectedPurchaseDetails(null);
                }}
                className="h-8 px-4 flex items-center gap-1.5 text-xs font-semibold bg-[#0F52BA] text-[#FFFFFF] rounded-lg hover:bg-[#0c449c] cursor-pointer shadow-xs active:scale-95"
              >
                <Printer size={13} />
                <span>Print Receiving Slip</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: NEW SUPPLIER MODAL */}
      {isSupplierModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-3 animate-in fade-in duration-150">
          <div className="bg-[#FFFFFF] rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="px-5 py-3.5 border-b border-slate-200 flex justify-between items-center bg-[#F8FAFC]">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-[#0F52BA]/10 text-[#0F52BA] flex items-center justify-center">
                  <UserPlus size={14} />
                </div>
                <h2 className="text-xs font-bold text-slate-900 tracking-tight">Register New Supplier</h2>
              </div>
              <button 
                onClick={() => setIsSupplierModalOpen(false)} 
                className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleCreateSupplier} className="p-5 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Company / Distributor Name <span className="text-[#EF4444]">*</span>
                </label>
                <input 
                  type="text" 
                  required
                  value={supplierFormData.name}
                  onChange={e => setSupplierFormData({ ...supplierFormData, name: e.target.value })}
                  placeholder="e.g. Delta Wholesale Distribution"
                  className="h-8 w-full border border-slate-300 rounded-lg px-2.5 text-xs focus:outline-none focus:border-[#0F52BA] focus:ring-2 focus:ring-[#0F52BA]/15"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Person</label>
                <input 
                  type="text" 
                  value={supplierFormData.contact_person}
                  onChange={e => setSupplierFormData({ ...supplierFormData, contact_person: e.target.value })}
                  placeholder="e.g. Asif Mehmood"
                  className="h-8 w-full border border-slate-300 rounded-lg px-2.5 text-xs focus:outline-none focus:border-[#0F52BA] focus:ring-2 focus:ring-[#0F52BA]/15"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
                  <input 
                    type="text" 
                    value={supplierFormData.phone}
                    onChange={e => setSupplierFormData({ ...supplierFormData, phone: e.target.value })}
                    placeholder="0300-1234567"
                    className="h-8 w-full border border-slate-300 rounded-lg px-2.5 text-xs font-mono focus:outline-none focus:border-[#0F52BA] focus:ring-2 focus:ring-[#0F52BA]/15"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                  <input 
                    type="email" 
                    value={supplierFormData.email}
                    onChange={e => setSupplierFormData({ ...supplierFormData, email: e.target.value })}
                    placeholder="vendor@company.com"
                    className="h-8 w-full border border-slate-300 rounded-lg px-2.5 text-xs focus:outline-none focus:border-[#0F52BA] focus:ring-2 focus:ring-[#0F52BA]/15"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Warehouse / Office Address</label>
                <textarea 
                  rows="2"
                  value={supplierFormData.address}
                  onChange={e => setSupplierFormData({ ...supplierFormData, address: e.target.value })}
                  placeholder="Plot/Street address, City..."
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-xs focus:outline-none focus:border-[#0F52BA] focus:ring-2 focus:ring-[#0F52BA]/15"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setIsSupplierModalOpen(false)}
                  className="h-8 px-3.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="h-8 px-4 text-xs font-semibold bg-[#0F52BA] text-[#FFFFFF] rounded-lg hover:bg-[#0c449c] shadow-xs cursor-pointer active:scale-95"
                >
                  Save Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}