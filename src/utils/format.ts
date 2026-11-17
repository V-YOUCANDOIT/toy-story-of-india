export function formatPrice(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(iso: string): string {
  const date = new Date(iso.includes('T') ? iso : `${iso.replace(' ', 'T')}Z`);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

export function formatPaymentMethod(method: string): string {
  switch (method) {
    case 'cod':
      return 'Cash on Delivery';
    case 'demo_online':
      return 'Test Online Payment';
    case 'razorpay':
      return 'Razorpay Checkout';
    default:
      return method;
  }
}

export function formatPaymentStatus(status: string): string {
  switch (status) {
    case 'pending':
      return 'Pay on Delivery';
    case 'awaiting_verification':
      return 'Awaiting Verification';
    case 'paid':
      return 'Paid';
    case 'failed':
      return 'Payment Failed';
    case 'refunded':
      return 'Refunded';
    default:
      return status;
  }
}
