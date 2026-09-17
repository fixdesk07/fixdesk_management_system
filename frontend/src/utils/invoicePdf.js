/**
 * FixDesk Invoice PDF & Print Generator
 * Produces a high-fidelity, branded A4 invoice document suitable for immediate
 * print-to-PDF, physical printing, or standalone HTML file download.
 */

export function generateInvoiceHTML(invoice) {
  const invNumber = `INV-${invoice.id.substring(0, 8).toUpperCase()}`;
  const issueDate = new Date(invoice.issued_at || Date.now()).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const paidDate = invoice.paid_at
    ? new Date(invoice.paid_at).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : null;

  const items = invoice.items || [];
  const subtotal = parseFloat(invoice.subtotal || 0);
  const taxRate = parseFloat(invoice.tax_rate || 0);
  const taxAmount = parseFloat(invoice.tax_amount || 0);
  const subtotalWithTax = subtotal + taxAmount;
  const discountAmount = parseFloat(invoice.discount_amount || 0);
  const discountRate = parseFloat(invoice.discount_rate || 0);
  const discountType = invoice.discount_type || 'fixed';
  const grandTotal = parseFloat(invoice.total || 0);

  const isPaid = invoice.status === 'Paid';
  const isCancelled = invoice.status === 'Cancelled';
  const statusColor = isPaid ? '#15803d' : isCancelled ? '#b91c1c' : '#b45309';
  const statusBg = isPaid ? '#dcfce7' : isCancelled ? '#fee2e2' : '#fef3c7';
  const statusBorder = isPaid ? '#86efac' : isCancelled ? '#fca5a5' : '#fde68a';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Invoice - ${invNumber} - FixDesk</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

    @page {
      size: A4 portrait;
      margin: 12mm 15mm;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #1e293b;
      background: #ffffff;
      font-size: 13px;
      line-height: 1.5;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .invoice-container {
      max-width: 800px;
      margin: 0 auto;
      padding: 24px;
      background: #ffffff;
    }

    /* Header */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 20px;
      margin-bottom: 24px;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .logo-badge {
      width: 44px;
      height: 44px;
      background: linear-gradient(135deg, #2563eb, #4f46e5);
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #ffffff;
      font-weight: 800;
      font-size: 22px;
    }

    .brand-title {
      font-size: 22px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.03em;
    }

    .brand-subtitle {
      font-size: 11px;
      color: #64748b;
      font-weight: 500;
    }

    .shop-meta {
      text-align: right;
      font-size: 11px;
      color: #64748b;
      line-height: 1.6;
    }

    .shop-meta strong {
      color: #0f172a;
    }

    /* Invoice Title Bar */
    .invoice-title-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 14px 18px;
      margin-bottom: 24px;
    }

    .inv-number {
      font-size: 18px;
      font-weight: 800;
      color: #1e293b;
      letter-spacing: -0.02em;
    }

    .inv-date {
      font-size: 12px;
      color: #64748b;
      margin-top: 2px;
    }

    .status-badge {
      display: inline-block;
      padding: 6px 14px;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      border-radius: 9999px;
      background: ${statusBg};
      color: ${statusColor};
      border: 1px solid ${statusBorder};
    }

    /* Details Grid */
    .details-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 24px;
    }

    .card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 14px 16px;
    }

    .card-title {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #64748b;
      margin-bottom: 8px;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 4px;
    }

    .card-row {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      margin-bottom: 4px;
    }

    .card-row:last-child {
      margin-bottom: 0;
    }

    .card-label {
      color: #64748b;
    }

    .card-value {
      font-weight: 600;
      color: #0f172a;
      text-align: right;
    }

    /* Table */
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
      font-size: 12px;
    }

    .items-table th {
      background: #0f172a;
      color: #ffffff;
      font-weight: 600;
      text-align: left;
      padding: 10px 12px;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .items-table th.text-right,
    .items-table td.text-right {
      text-align: right;
    }

    .items-table th.text-center,
    .items-table td.text-center {
      text-align: center;
    }

    .items-table td {
      padding: 10px 12px;
      border-bottom: 1px solid #e2e8f0;
      color: #334155;
    }

    .items-table tr:nth-child(even) td {
      background: #f8fafc;
    }

    .item-badge {
      display: inline-block;
      font-size: 9px;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 4px;
      text-transform: uppercase;
      margin-left: 6px;
    }

    .badge-part {
      background: #dbeafe;
      color: #1d4ed8;
    }

    .badge-labor {
      background: #f3e8ff;
      color: #7e22ce;
    }

    /* Summary Layout */
    .summary-section {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 24px;
      margin-bottom: 28px;
    }

    .terms-box {
      flex: 1;
      font-size: 11px;
      color: #64748b;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 14px;
      line-height: 1.6;
    }

    .terms-title {
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 6px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      font-size: 10px;
    }

    .totals-box {
      width: 320px;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 16px;
    }

    .total-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 12px;
      margin-bottom: 8px;
      color: #475569;
    }

    .total-row.discount {
      color: #15803d;
      font-weight: 600;
      background: #dcfce7;
      padding: 4px 8px;
      border-radius: 4px;
      margin: 6px 0;
    }

    .total-row.grand {
      font-size: 15px;
      font-weight: 800;
      color: #0f172a;
      border-top: 2px solid #cbd5e1;
      padding-top: 10px;
      margin-top: 8px;
      margin-bottom: 0;
    }

    .total-row.grand .amount {
      color: #2563eb;
      font-size: 17px;
    }

    /* Footer Signatures */
    .footer-signatures {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-top: 36px;
      padding-top: 20px;
      border-top: 1px solid #e2e8f0;
    }

    .sign-block {
      text-align: center;
      width: 200px;
    }

    .sign-line {
      border-bottom: 1px dashed #94a3b8;
      height: 40px;
      margin-bottom: 6px;
    }

    .sign-label {
      font-size: 11px;
      color: #64748b;
      font-weight: 600;
    }

    /* Print Controls (hidden when printed) */
    .no-print {
      display: flex;
      justify-content: center;
      gap: 12px;
      margin-bottom: 20px;
      padding: 12px;
      background: #0f172a;
      border-radius: 8px;
    }

    .btn-action {
      background: #2563eb;
      color: #ffffff;
      border: none;
      padding: 8px 18px;
      border-radius: 6px;
      font-weight: 600;
      font-size: 13px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      text-decoration: none;
    }

    .btn-action:hover {
      background: #1d4ed8;
    }

    .btn-close {
      background: #334155;
    }
    .btn-close:hover {
      background: #475569;
    }

    @media print {
      .no-print {
        display: none !important;
      }
      body {
        background: transparent;
      }
      .invoice-container {
        padding: 0;
        max-width: 100%;
      }
    }
  </style>
</head>
<body>
  <div class="invoice-container">
    <!-- Action bar for viewing window -->
    <div class="no-print">
      <button class="btn-action" onclick="window.print()">
        🖨️ Print / Save as PDF
      </button>
      <button class="btn-action btn-close" onclick="window.close()">
        ✕ Close
      </button>
    </div>

    <!-- Header -->
    <div class="header">
      <div class="brand">
        <div class="logo-badge">⚡</div>
        <div>
          <div class="brand-title">FixDesk</div>
          <div class="brand-subtitle">Smart Device Repair &amp; Service Hub</div>
        </div>
      </div>
      <div class="shop-meta">
        <div><strong>FixDesk Technologies Pvt Ltd</strong></div>
        <div>Sector 5, HSR Layout, Tech Park #104</div>
        <div>Bangalore, Karnataka — 560102</div>
        <div>GSTIN: 29AAACF4932K1ZX | +91 98765 00000</div>
        <div>support@fixdesk.com | www.fixdesk.com</div>
      </div>
    </div>

    <!-- Title Bar -->
    <div class="invoice-title-bar">
      <div>
        <div class="inv-number">TAX INVOICE &bull; ${invNumber}</div>
        <div class="inv-date">Issued on: <strong>${issueDate}</strong>${paidDate ? ` &bull; Paid on: <strong>${paidDate}</strong>` : ''}</div>
      </div>
      <div class="status-badge">${invoice.status}</div>
    </div>

    <!-- Customer & Device Info -->
    <div class="details-grid">
      <div class="card">
        <div class="card-title">Billed To (Customer Details)</div>
        <div class="card-row">
          <span class="card-label">Customer:</span>
          <span class="card-value">${invoice.customer_name || 'Walk-in Customer'}</span>
        </div>
        <div class="card-row">
          <span class="card-label">Phone:</span>
          <span class="card-value">${invoice.customer_phone || '—'}</span>
        </div>
        ${invoice.customer_email ? `
        <div class="card-row">
          <span class="card-label">Email:</span>
          <span class="card-value">${invoice.customer_email}</span>
        </div>` : ''}
        ${invoice.customer_address ? `
        <div class="card-row">
          <span class="card-label">Address:</span>
          <span class="card-value">${invoice.customer_address}</span>
        </div>` : ''}
      </div>

      <div class="card">
        <div class="card-title">Service &amp; Device Reference</div>
        ${invoice.job_code ? `
        <div class="card-row">
          <span class="card-label">Job ID:</span>
          <span class="card-value" style="font-weight: 700; color: #2563eb;">${invoice.job_code}</span>
        </div>` : ''}
        ${invoice.device_type || invoice.device_model ? `
        <div class="card-row">
          <span class="card-label">Device Model:</span>
          <span class="card-value">${[invoice.device_brand, invoice.device_model].filter(Boolean).join(' ') || invoice.device_type}</span>
        </div>` : `
        <div class="card-row">
          <span class="card-label">Service Type:</span>
          <span class="card-value">Direct Sale &amp; Parts</span>
        </div>`}
        ${invoice.serial_number ? `
        <div class="card-row">
          <span class="card-label">Serial Number:</span>
          <span class="card-value">${invoice.serial_number}</span>
        </div>` : ''}
        ${invoice.technician ? `
        <div class="card-row">
          <span class="card-label">Technician:</span>
          <span class="card-value">${invoice.technician}</span>
        </div>` : ''}
        <div class="card-row">
          <span class="card-label">Payment Mode:</span>
          <span class="card-value">${isPaid ? 'Settled (UPI / Card / Cash)' : 'Pending Settlement'}</span>
        </div>
      </div>
    </div>

    <!-- Items Table -->
    <table class="items-table">
      <thead>
        <tr>
          <th style="width: 38px;" class="text-center">#</th>
          <th>Item / Service Description</th>
          <th class="text-center" style="width: 70px;">Qty</th>
          <th class="text-right" style="width: 120px;">Unit Rate (₹)</th>
          <th class="text-right" style="width: 130px;">Amount (₹)</th>
        </tr>
      </thead>
      <tbody>
        ${items.length > 0 ? items.map((it, idx) => `
          <tr>
            <td class="text-center" style="color: #64748b;">${idx + 1}</td>
            <td>
              <strong>${it.description}</strong>
              <span class="item-badge ${it.is_part ? 'badge-part' : 'badge-labor'}">
                ${it.is_part ? 'Spare Part' : 'Labor Fee'}
              </span>
            </td>
            <td class="text-center font-bold">${it.quantity}</td>
            <td class="text-right">₹${parseFloat(it.unit_price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            <td class="text-right font-bold">₹${parseFloat(it.total_price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
          </tr>
        `).join('') : `
          <tr>
            <td class="text-center">1</td>
            <td><strong>Diagnostic, Labor &amp; Repair Services</strong> <span class="item-badge badge-labor">Labor Fee</span></td>
            <td class="text-center">1</td>
            <td class="text-right">₹${subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            <td class="text-right font-bold">₹${subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
          </tr>
        `}
      </tbody>
    </table>

    <!-- Totals & Terms -->
    <div class="summary-section">
      <div class="terms-box">
        <div class="terms-title">Terms &amp; Warranty Conditions</div>
        <ul style="padding-left: 16px; margin-top: 4px;">
          <li>90-Day warranty on replaced spare parts from date of invoice.</li>
          <li>Warranty does not cover physical damage, liquid ingress, or tampering.</li>
          <li>Uncollected repaired devices after 30 days are subject to storage charges.</li>
          <li>For warranty claims, please present this invoice receipt.</li>
        </ul>
      </div>

      <div class="totals-box">
        <div class="total-row">
          <span>Gross Subtotal:</span>
          <span>₹${subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
        </div>

        <div class="total-row">
          <span>GST Tax (${taxRate}%):</span>
          <span>₹${taxAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
        </div>

        ${discountAmount > 0 ? `
        <div class="total-row">
          <span>Subtotal (incl. Tax):</span>
          <span>₹${subtotalWithTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
        </div>
        <div class="total-row discount">
          <span>Discount (${discountType === 'percentage' ? `${discountRate}% off` : 'Special Promo'}):</span>
          <span>-₹${discountAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
        </div>
        ` : ''}

        <div class="total-row grand">
          <span>Total Amount:</span>
          <span class="amount">₹${grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
        </div>
      </div>
    </div>

    <!-- Signatures -->
    <div class="footer-signatures">
      <div class="sign-block">
        <div class="sign-line"></div>
        <div class="sign-label">Customer's Signature</div>
      </div>
      <div style="font-size: 11px; color: #94a3b8; text-align: center;">
        Thank you for choosing FixDesk!<br />
        This is a computer-generated tax invoice.
      </div>
      <div class="sign-block">
        <div class="sign-line"></div>
        <div class="sign-label">Authorized Signatory (FixDesk)</div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Opens a print dialog / PDF view in a new window and triggers window.print().
 */
export function printInvoiceDocument(invoice) {
  const html = generateInvoiceHTML(invoice);
  const printWindow = window.open('', '_blank', 'width=900,height=900');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    // Allow styles to render before triggering print
    setTimeout(() => {
      printWindow.print();
    }, 400);
  }
}

/**
 * Downloads the invoice document directly as a standalone HTML file.
 */
export function downloadInvoiceHTML(invoice) {
  const html = generateInvoiceHTML(invoice);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const invNumber = `INV-${invoice.id.substring(0, 8).toUpperCase()}`;
  link.href = url;
  link.download = `${invNumber}_FixDesk_Invoice.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
