# 🚀 Sheikh's Enterprise ERP & POS System (Frontend)

Welcome to the **Frontend Dashboard** of **Sheikh's Enterprise ERP & Point of Sale (POS) System** — a high-performance, modern business management and retail checkout solution built specifically for wholesale and retail merchants.

---

## 🌟 What is this Project?
Sheikh's Enterprise ERP is a comprehensive business management web application designed to streamline daily store operations. It bridges the gap between high-speed point-of-sale (POS) retail checkouts, inventory tracking, customer ledger management (Accounts Receivable), and automated employee attendance/payroll.

This repository contains the **React.js & Tailwind CSS frontend interface**, providing a lightning-fast UI, real-time analytics graphs, barcode scanning support, and thermal receipt printing capabilities.

---

## 🛠️ Core Features & Capabilities

1. **⚡ High-Speed POS Counter & Cart:**
   - Barcode scanner integration with instant Enter-key auto-add.
   - Dual view modes: **Grid Cards** (for visual selection) and **Compact Table List** (for technical catalogs).
   - Dedicated `/cart` checkout register with cash tendered & change-due calculator.
   - Direct thermal receipt printing (`80mm` roll invoice formatting).

2. **📊 Interactive Revenue Analytics & Reporting:**
   - Custom calendar date range picker (Today, Last 7 Days, Last 14 Days, This Month, etc.).
   - Visual SVG revenue trend graphs with hover tooltips.
   - **Custom A4 Print Studio:** Select and print custom reports combining executive KPIs, vector charts, and sales breakdown tables.

3. **📦 Inventory & Catalog Management:**
   - Real-time stock tracking with low-stock threshold alerts (`< 10 units`).
   - Catalog search by product name, brand, or SKU.

4. **👥 Role-Based Access Control (RBAC):**
   - Secure operator login with session persistence (`localStorage`).
   - Granular permission routing (Dashboard, POS, Inventory, Purchases, Payroll, CRM).

---

## 🛠️ Technology Stack
- **Framework:** React.js (Vite)
- **Styling:** Tailwind CSS
- **Icons:** Lucide React
- **HTTP Client:** Axios
- **Database & Auth:** Supabase (PostgreSQL)

---

## ⚙️ Local Development Setup

To run this frontend locally on your machine, follow these simple steps:

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed on your computer.

### 1. Clone the Repository
```bash
git clone [https://github.com/sheikhnuml/ERP-System.git](https://github.com/sheikhnuml/ERP-System.git)
cd ERP-System
