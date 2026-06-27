import { formatCurrency } from './formatters';

/**
 * Generate receipt HTML for printing
 */
export const generateReceiptHTML = (order, orderItems, businessInfo) => {
  const itemsHTML = orderItems
    .map(
      (item) => `
    <tr>
      <td>${item.product_name}</td>
      <td style="text-align: center;">${item.quantity}</td>
      <td style="text-align: right;">${formatCurrency(item.unit_price)}</td>
      <td style="text-align: right;">${formatCurrency(item.subtotal)}</td>
    </tr>
  `
    )
    .join('');

  const receiptHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Receipt - ${order.order_number}</title>
  <style>
    @media print {
      @page {
        size: 80mm auto;
        margin: 0;
      }
      body {
        margin: 10mm;
      }
    }
    body {
      font-family: 'Courier New', monospace;
      font-size: 12px;
      max-width: 300px;
      margin: 0 auto;
      padding: 10px;
    }
    .header {
      text-align: center;
      margin-bottom: 20px;
      border-bottom: 2px dashed #000;
      padding-bottom: 10px;
    }
    .business-name {
      font-size: 18px;
      font-weight: bold;
      margin-bottom: 5px;
    }
    .business-info {
      font-size: 10px;
      color: #333;
    }
    .order-info {
      margin-bottom: 15px;
      font-size: 11px;
    }
    .order-info div {
      display: flex;
      justify-content: space-between;
      margin-bottom: 3px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 15px;
    }
    th {
      text-align: left;
      border-bottom: 1px solid #000;
      padding: 5px 0;
      font-size: 11px;
    }
    td {
      padding: 5px 0;
      font-size: 11px;
    }
    .totals {
      border-top: 1px solid #000;
      padding-top: 10px;
      margin-top: 10px;
    }
    .totals div {
      display: flex;
      justify-content: space-between;
      margin-bottom: 5px;
    }
    .total-amount {
      font-weight: bold;
      font-size: 14px;
      border-top: 2px solid #000;
      padding-top: 8px;
      margin-top: 8px;
    }
    .payment-info {
      margin-top: 15px;
      border-top: 1px dashed #000;
      padding-top: 10px;
    }
    .payment-info div {
      display: flex;
      justify-content: space-between;
      margin-bottom: 3px;
      font-size: 11px;
    }
    .footer {
      text-align: center;
      margin-top: 20px;
      padding-top: 10px;
      border-top: 2px dashed #000;
      font-size: 10px;
    }
    .thank-you {
      font-weight: bold;
      margin-bottom: 5px;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="business-name">${businessInfo.name || 'BAR MANAGEMENT'}</div>
    <div class="business-info">${businessInfo.address || 'Kigali, Rwanda'}</div>
    <div class="business-info">Tel: ${businessInfo.phone || '+250 XXX XXX XXX'}</div>
    ${businessInfo.tin ? `<div class="business-info">TIN: ${businessInfo.tin}</div>` : ''}
  </div>

  <div class="order-info">
    <div>
      <span>Receipt #:</span>
      <span><strong>${order.order_number}</strong></span>
    </div>
    <div>
      <span>Date:</span>
      <span>${new Date(order.created_at).toLocaleString('en-RW', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })}</span>
    </div>
    ${order.table_number ? `
    <div>
      <span>Table:</span>
      <span>${order.table_number}</span>
    </div>
    ` : ''}
    ${order.waiter_name ? `
    <div>
      <span>Served by:</span>
      <span>${order.waiter_name}</span>
    </div>
    ` : ''}
    ${order.customer_name ? `
    <div>
      <span>Customer:</span>
      <span>${order.customer_name}</span>
    </div>
    ` : ''}
  </div>

  <table>
    <thead>
      <tr>
        <th>Item</th>
        <th style="text-align: center;">Qty</th>
        <th style="text-align: right;">Price</th>
        <th style="text-align: right;">Total</th>
      </tr>
    </thead>
    <tbody>
      ${itemsHTML}
    </tbody>
  </table>

  <div class="totals">
    <div>
      <span>Subtotal:</span>
      <span>${formatCurrency(order.total_amount)}</span>
    </div>
    ${order.discount_amount && order.discount_amount > 0 ? `
    <div>
      <span>Discount:</span>
      <span>-${formatCurrency(order.discount_amount)}</span>
    </div>
    ` : ''}
    <div class="total-amount">
      <span>TOTAL:</span>
      <span>${formatCurrency(order.total_amount)}</span>
    </div>
  </div>

  ${order.payment_status === 'paid' ? `
  <div class="payment-info">
    <div>
      <span>Payment Method:</span>
      <span>${(order.payment_method || '').toUpperCase().replace('_', ' ')}</span>
    </div>
    <div>
      <span>Amount Paid:</span>
      <span>${formatCurrency(order.amount_paid || order.total_amount)}</span>
    </div>
    ${(order.amount_paid || order.total_amount) > order.total_amount ? `
    <div>
      <span>Change:</span>
      <span>${formatCurrency((order.amount_paid || order.total_amount) - order.total_amount)}</span>
    </div>
    ` : ''}
    <div style="margin-top: 8px;">
      <span><strong>PAID</strong></span>
      <span><strong>✓</strong></span>
    </div>
  </div>
  ` : ''}

  <div class="footer">
    <div class="thank-you">THANK YOU FOR YOUR VISIT!</div>
    <div>Please come again</div>
    ${businessInfo.website ? `<div>${businessInfo.website}</div>` : ''}
  </div>
</body>
</html>
`;

  return receiptHTML;
};

/**
 * Print receipt (opens print dialog)
 */
export const printReceipt = (receiptHTML) => {
  const printWindow = window.open('', '_blank', 'width=300,height=600');
  printWindow.document.write(receiptHTML);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 250);
};

/**
 * Generate receipt text for SMS/Email
 */
export const generateReceiptText = (order, orderItems, businessInfo) => {
  const itemsText = orderItems
    .map((item) => `${item.quantity}x ${item.product_name} - ${formatCurrency(item.subtotal)}`)
    .join('\n');

  return `
${businessInfo.name || 'BAR MANAGEMENT'}
${businessInfo.address || 'Kigali, Rwanda'}
${businessInfo.phone || 'Tel: +250 XXX XXX XXX'}
${'='.repeat(40)}
Receipt #: ${order.order_number}
Date: ${new Date(order.created_at).toLocaleString()}
${order.table_number ? `Table: ${order.table_number}` : ''}
${order.waiter_name ? `Served by: ${order.waiter_name}` : ''}
${'='.repeat(40)}

${itemsText}

${'-'.repeat(40)}
TOTAL: ${formatCurrency(order.total_amount)}
${'-'.repeat(40)}

${order.payment_status === 'paid' ? `Payment: ${(order.payment_method || '').toUpperCase()}\nPAID ✓` : 'UNPAID'}

${'='.repeat(40)}
THANK YOU FOR YOUR VISIT!
Please come again
`.trim();
};

/**
 * Get default business info (can be configured in settings)
 */
export const getBusinessInfo = () => {
  // Try to load from localStorage
  const saved = localStorage.getItem('business_info');
  if (saved) {
    return JSON.parse(saved);
  }

  // Default values
  return {
    name: 'BAR & RESTAURANT',
    address: 'Kigali, Rwanda',
    phone: '+250 XXX XXX XXX',
    tin: null,
    website: null,
  };
};

/**
 * Save business info to localStorage
 */
export const saveBusinessInfo = (info) => {
  localStorage.setItem('business_info', JSON.stringify(info));
};
