import React, { useEffect, useState } from 'react';
import { CheckCircle2, CreditCard, Lock, ShieldCheck, Truck } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { SafeImage } from '../components/SafeImage';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { useToast } from '../contexts/ToastContext';
import { api } from '../services/api';
import type { Address, Order, PaymentConfig, PaymentMethod } from '../types';
import { formatPrice } from '../utils/format';

interface InitiatedPayment {
  provider: PaymentMethod;
  order_id: number;
  order_number: string;
  amount: number;
  provider_order_id: string;
  challenge_signature?: string;
  test_mode: boolean;
}

export function CheckoutPage() {
  const { user } = useAuth();
  const { cart, refreshCart } = useCart();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<number | 'new'>('new');
  const [saveNewAddress, setSaveNewAddress] = useState(true);
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfig | null>(null);

  const [customerInfo, setCustomerInfo] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
  });

  const [shippingForm, setShippingForm] = useState({
    full_name: user?.name || '',
    phone: user?.phone || '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'United States',
  });

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cod');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [placedOrder, setPlacedOrder] = useState<Order | null>(null);
  const [pendingPayment, setPendingPayment] = useState<InitiatedPayment | null>(null);
  const [verifyingPayment, setVerifyingPayment] = useState(false);

  useEffect(() => {
    if (!user) return;
    setCustomerInfo({ name: user.name, email: user.email, phone: user.phone });

    Promise.all([
      api.get<{ addresses: Address[] }>('/api/user/addresses'),
      api.get<PaymentConfig>('/api/payments/config'),
    ]).then(([addrRes, payRes]) => {
      setAddresses(addrRes.addresses);
      if (addrRes.addresses.length > 0) {
        const def =
          addrRes.addresses.find((a) => a.is_default === 1) || addrRes.addresses[0];
        setSelectedAddressId(def.id);
        setShippingForm({
          full_name: def.full_name,
          phone: def.phone,
          line1: def.line1,
          line2: def.line2,
          city: def.city,
          state: def.state,
          postal_code: def.postal_code,
          country: def.country,
        });
      }
      setPaymentConfig(payRes);
      if (payRes.cod_enabled) {
        setPaymentMethod('cod');
      } else if (payRes.demo_payment_enabled) {
        setPaymentMethod('demo_online');
      }
    });
  }, [user]);

  const handleSelectAddress = (choice: number | 'new') => {
    setSelectedAddressId(choice);
    if (choice === 'new') {
      setShippingForm({
        full_name: customerInfo.name,
        phone: customerInfo.phone,
        line1: '',
        line2: '',
        city: '',
        state: '',
        postal_code: '',
        country: 'United States',
      });
    } else {
      const addr = addresses.find((a) => a.id === choice);
      if (addr) {
        setShippingForm({
          full_name: addr.full_name,
          phone: addr.phone,
          line1: addr.line1,
          line2: addr.line2,
          city: addr.city,
          state: addr.state,
          postal_code: addr.postal_code,
          country: addr.country,
        });
      }
    }
  };

  const handlePlaceOrder = async () => {
    setSubmitting(true);
    try {
      if (selectedAddressId === 'new' && saveNewAddress) {
        await api.post('/api/user/addresses', {
          label: 'Delivery',
          ...shippingForm,
          is_default: addresses.length === 0,
        });
      }

      const orderRes = await api.post<{ order: Order }>('/api/orders', {
        customer_name: customerInfo.name,
        customer_email: customerInfo.email,
        customer_phone: customerInfo.phone,
        shipping_address: shippingForm,
        payment_method: paymentMethod,
        notes,
      });

      setPlacedOrder(orderRes.order);
      await refreshCart();

      if (paymentMethod === 'cod') {
        await api.post('/api/payments/create', { order_id: orderRes.order.id });
        setStep(5);
        showToast(`Order ${orderRes.order.order_number} confirmed!`, 'success');
      } else {
        const payRes = await api.post<{ payment: InitiatedPayment }>(
          '/api/payments/create',
          { order_id: orderRes.order.id }
        );
        setPendingPayment(payRes.payment);
        setStep(5);
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Checkout failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyDemoPayment = async (outcome: 'success' | 'fail') => {
    if (!pendingPayment || !placedOrder) return;
    setVerifyingPayment(true);
    try {
      const res = await api.post<{
        verification: { payment_status: string; order_status: string };
      }>('/api/payments/verify', {
        order_id: placedOrder.id,
        provider_order_id: pendingPayment.provider_order_id,
        provider_payment_id: `demo_pay_${Date.now()}`,
        provider_signature: pendingPayment.challenge_signature || '',
        simulated_outcome: outcome,
      });

      setPlacedOrder({
        ...placedOrder,
        payment_status: res.verification.payment_status as Order['payment_status'],
        order_status: res.verification.order_status as Order['order_status'],
      });
      setPendingPayment(null);
      showToast(
        outcome === 'success'
          ? 'Payment verified and order confirmed.'
          : 'Payment marked as failed. You may retry from your order page.',
        outcome === 'success' ? 'success' : 'error'
      );
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Payment verification failed',
        'error'
      );
    } finally {
      setVerifyingPayment(false);
    }
  };

  if (cart.items.length === 0 && !placedOrder) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <h1 className="font-serif-editorial text-4xl text-[#30251F] mb-3">
          Your bag is empty
        </h1>
        <p className="text-sm text-[#30251F]/70 mb-6">
          Add heirloom toys to your shopping bag before proceeding to checkout.
        </p>
        <Link
          to="/shop"
          className="inline-flex px-6 py-3 rounded-md bg-[#49372F] text-[#FAF7F2] text-sm font-medium"
        >
          Return to Shop
        </Link>
      </div>
    );
  }

  const stepsList = [
    { num: 1, label: 'Customer Info' },
    { num: 2, label: 'Delivery Address' },
    { num: 3, label: 'Order Summary' },
    { num: 4, label: 'Payment Method' },
    { num: 5, label: 'Confirmation' },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-10">
        <p className="text-xs uppercase tracking-[0.16em] text-[#30251F]/60 mb-2">
          Secure Checkout
        </p>
        <h1 className="font-serif-editorial text-4xl font-semibold text-[#30251F] mb-6">
          Complete Your Order
        </h1>

        {/* Step Indicator */}
        <ol className="grid grid-cols-2 sm:grid-cols-5 gap-2 border-y border-[#30251F]/10 py-4">
          {stepsList.map((s) => (
            <li
              key={s.num}
              className={`flex items-center gap-2 text-xs ${
                step === s.num
                  ? 'font-semibold text-[#30251F]'
                  : step > s.num
                  ? 'text-[#929B83]'
                  : 'text-[#30251F]/45'
              }`}
            >
              <span className="font-mono-tabular">0{s.num}.</span>
              <span>{s.label}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        <div className="lg:col-span-7 bg-[#FAF7F2] border border-[#30251F]/12 rounded-2xl p-6 sm:p-8">
          {/* STEP 1: Customer Information */}
          {step === 1 && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setStep(2);
              }}
              className="space-y-5"
            >
              <h2 className="font-serif-editorial text-2xl font-semibold text-[#30251F]">
                1. Customer Information
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="text-xs uppercase tracking-[0.12em] text-[#30251F]/70 block mb-1.5">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    minLength={2}
                    value={customerInfo.name}
                    onChange={(e) =>
                      setCustomerInfo({ ...customerInfo, name: e.target.value })
                    }
                    className="w-full bg-[#FAF7F2] border border-[#30251F]/20 rounded-md px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#49372F]"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs uppercase tracking-[0.12em] text-[#30251F]/70 block mb-1.5">
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={customerInfo.email}
                      onChange={(e) =>
                        setCustomerInfo({ ...customerInfo, email: e.target.value })
                      }
                      className="w-full bg-[#FAF7F2] border border-[#30251F]/20 rounded-md px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#49372F]"
                    />
                  </div>
                  <div>
                    <label className="text-xs uppercase tracking-[0.12em] text-[#30251F]/70 block mb-1.5">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      required
                      minLength={6}
                      value={customerInfo.phone}
                      onChange={(e) =>
                        setCustomerInfo({ ...customerInfo, phone: e.target.value })
                      }
                      className="w-full bg-[#FAF7F2] border border-[#30251F]/20 rounded-md px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#49372F]"
                    />
                  </div>
                </div>
              </div>
              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-md bg-[#49372F] text-[#FAF7F2] text-sm font-medium hover:bg-[#30251F]"
                >
                  Continue to Delivery Address
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: Delivery Address */}
          {step === 2 && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setStep(3);
              }}
              className="space-y-5"
            >
              <h2 className="font-serif-editorial text-2xl font-semibold text-[#30251F]">
                2. Delivery Address
              </h2>

              {addresses.length > 0 && (
                <div className="space-y-2.5">
                  <p className="text-xs uppercase tracking-[0.12em] text-[#30251F]/65">
                    Saved Addresses
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {addresses.map((addr) => (
                      <button
                        key={addr.id}
                        type="button"
                        onClick={() => handleSelectAddress(addr.id)}
                        className={`text-left p-3.5 rounded-lg border transition-colors ${
                          selectedAddressId === addr.id
                            ? 'border-[#49372F] bg-[#F0E8DD]/70'
                            : 'border-[#30251F]/15 hover:bg-[#F0E8DD]/35'
                        }`}
                      >
                        <p className="text-xs font-semibold uppercase tracking-wider text-[#49372F] mb-1">
                          {addr.label}
                        </p>
                        <p className="text-sm font-medium text-[#30251F]">
                          {addr.full_name}
                        </p>
                        <p className="text-xs text-[#30251F]/70">
                          {addr.line1}, {addr.city}, {addr.state} {addr.postal_code}
                        </p>
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => handleSelectAddress('new')}
                      className={`text-left p-3.5 rounded-lg border transition-colors ${
                        selectedAddressId === 'new'
                          ? 'border-[#49372F] bg-[#F0E8DD]/70'
                          : 'border-[#30251F]/15 hover:bg-[#F0E8DD]/35'
                      }`}
                    >
                      <p className="text-sm font-medium text-[#30251F]">
                        + Use a Different Address
                      </p>
                      <p className="text-xs text-[#30251F]/65 mt-0.5">
                        Enter new recipient details
                      </p>
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-4 pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs uppercase tracking-[0.12em] text-[#30251F]/70 block mb-1.5">
                      Recipient Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={shippingForm.full_name}
                      onChange={(e) =>
                        setShippingForm({ ...shippingForm, full_name: e.target.value })
                      }
                      className="w-full bg-[#FAF7F2] border border-[#30251F]/20 rounded-md px-3.5 py-2 text-sm focus:outline-none focus:border-[#49372F]"
                    />
                  </div>
                  <div>
                    <label className="text-xs uppercase tracking-[0.12em] text-[#30251F]/70 block mb-1.5">
                      Delivery Phone
                    </label>
                    <input
                      type="tel"
                      required
                      value={shippingForm.phone}
                      onChange={(e) =>
                        setShippingForm({ ...shippingForm, phone: e.target.value })
                      }
                      className="w-full bg-[#FAF7F2] border border-[#30251F]/20 rounded-md px-3.5 py-2 text-sm focus:outline-none focus:border-[#49372F]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs uppercase tracking-[0.12em] text-[#30251F]/70 block mb-1.5">
                    Street Address
                  </label>
                  <input
                    type="text"
                    required
                    value={shippingForm.line1}
                    onChange={(e) =>
                      setShippingForm({ ...shippingForm, line1: e.target.value })
                    }
                    className="w-full bg-[#FAF7F2] border border-[#30251F]/20 rounded-md px-3.5 py-2 text-sm focus:outline-none focus:border-[#49372F]"
                  />
                </div>

                <div>
                  <label className="text-xs uppercase tracking-[0.12em] text-[#30251F]/70 block mb-1.5">
                    Apartment / Suite (Optional)
                  </label>
                  <input
                    type="text"
                    value={shippingForm.line2}
                    onChange={(e) =>
                      setShippingForm({ ...shippingForm, line2: e.target.value })
                    }
                    className="w-full bg-[#FAF7F2] border border-[#30251F]/20 rounded-md px-3.5 py-2 text-sm focus:outline-none focus:border-[#49372F]"
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs uppercase tracking-[0.12em] text-[#30251F]/70 block mb-1.5">
                      City
                    </label>
                    <input
                      type="text"
                      required
                      value={shippingForm.city}
                      onChange={(e) =>
                        setShippingForm({ ...shippingForm, city: e.target.value })
                      }
                      className="w-full bg-[#FAF7F2] border border-[#30251F]/20 rounded-md px-3.5 py-2 text-sm focus:outline-none focus:border-[#49372F]"
                    />
                  </div>
                  <div>
                    <label className="text-xs uppercase tracking-[0.12em] text-[#30251F]/70 block mb-1.5">
                      State
                    </label>
                    <input
                      type="text"
                      required
                      value={shippingForm.state}
                      onChange={(e) =>
                        setShippingForm({ ...shippingForm, state: e.target.value })
                      }
                      className="w-full bg-[#FAF7F2] border border-[#30251F]/20 rounded-md px-3.5 py-2 text-sm focus:outline-none focus:border-[#49372F]"
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="text-xs uppercase tracking-[0.12em] text-[#30251F]/70 block mb-1.5">
                      Postal Code
                    </label>
                    <input
                      type="text"
                      required
                      value={shippingForm.postal_code}
                      onChange={(e) =>
                        setShippingForm({ ...shippingForm, postal_code: e.target.value })
                      }
                      className="w-full bg-[#FAF7F2] border border-[#30251F]/20 rounded-md px-3.5 py-2 text-sm focus:outline-none focus:border-[#49372F]"
                    />
                  </div>
                </div>

                {selectedAddressId === 'new' && (
                  <label className="inline-flex items-center gap-2 text-xs text-[#30251F]/80 pt-1">
                    <input
                      type="checkbox"
                      checked={saveNewAddress}
                      onChange={(e) => setSaveNewAddress(e.target.checked)}
                      className="accent-[#49372F]"
                    />
                    Save this address to my account for future orders
                  </label>
                )}
              </div>

              <div className="pt-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-2 text-sm text-[#30251F]/70 hover:text-[#30251F]"
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-md bg-[#49372F] text-[#FAF7F2] text-sm font-medium hover:bg-[#30251F]"
                >
                  Continue to Summary
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: Order Summary Review */}
          {step === 3 && (
            <div className="space-y-6">
              <h2 className="font-serif-editorial text-2xl font-semibold text-[#30251F]">
                3. Review Order Summary
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#F0E8DD]/55 p-4 rounded-xl text-sm">
                <div>
                  <p className="text-xs uppercase tracking-wider text-[#30251F]/55 mb-1">
                    Recipient
                  </p>
                  <p className="font-medium text-[#30251F]">{customerInfo.name}</p>
                  <p className="text-xs text-[#30251F]/75">{customerInfo.email}</p>
                  <p className="text-xs text-[#30251F]/75">{customerInfo.phone}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-[#30251F]/55 mb-1">
                    Shipping Destination
                  </p>
                  <p className="font-medium text-[#30251F]">{shippingForm.full_name}</p>
                  <p className="text-xs text-[#30251F]/75">
                    {shippingForm.line1}
                    {shippingForm.line2 ? `, ${shippingForm.line2}` : ''}
                  </p>
                  <p className="text-xs text-[#30251F]/75">
                    {shippingForm.city}, {shippingForm.state} {shippingForm.postal_code}
                  </p>
                </div>
              </div>

              <div>
                <label className="text-xs uppercase tracking-[0.12em] text-[#30251F]/70 block mb-1.5">
                  Gift Note or Delivery Instructions (Optional)
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Complimentary handwritten gift card message or gate code…"
                  className="w-full bg-[#FAF7F2] border border-[#30251F]/20 rounded-md px-3.5 py-2 text-sm focus:outline-none focus:border-[#49372F]"
                />
              </div>

              <div className="pt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-4 py-2 text-sm text-[#30251F]/70 hover:text-[#30251F]"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setStep(4)}
                  className="px-6 py-2.5 rounded-md bg-[#49372F] text-[#FAF7F2] text-sm font-medium hover:bg-[#30251F]"
                >
                  Continue to Payment
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Payment Method Selection */}
          {step === 4 && (
            <div className="space-y-6">
              <h2 className="font-serif-editorial text-2xl font-semibold text-[#30251F]">
                4. Select Payment Method
              </h2>

              <div className="space-y-3">
                {paymentConfig?.cod_enabled && (
                  <label
                    className={`flex items-start gap-3.5 p-4 rounded-xl border cursor-pointer transition-colors ${
                      paymentMethod === 'cod'
                        ? 'border-[#49372F] bg-[#F0E8DD]/70'
                        : 'border-[#30251F]/15 hover:bg-[#F0E8DD]/35'
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment_method"
                      checked={paymentMethod === 'cod'}
                      onChange={() => setPaymentMethod('cod')}
                      className="mt-1 accent-[#49372F]"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Truck className="w-4 h-4 text-[#49372F]" />
                        <span className="text-sm font-semibold text-[#30251F]">
                          Cash on Delivery
                        </span>
                      </div>
                      <p className="text-xs text-[#30251F]/70 mt-1">
                        Settle {formatPrice(cart.final_total)} upon courier arrival. Orders are confirmed immediately for dispatch.
                      </p>
                    </div>
                  </label>
                )}

                {paymentConfig?.demo_payment_enabled && (
                  <label
                    className={`flex items-start gap-3.5 p-4 rounded-xl border cursor-pointer transition-colors ${
                      paymentMethod === 'demo_online'
                        ? 'border-[#49372F] bg-[#F0E8DD]/70'
                        : 'border-[#30251F]/15 hover:bg-[#F0E8DD]/35'
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment_method"
                      checked={paymentMethod === 'demo_online'}
                      onChange={() => setPaymentMethod('demo_online')}
                      className="mt-1 accent-[#49372F]"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-[#929B83]" />
                        <span className="text-sm font-semibold text-[#30251F]">
                          Test Online Payment (Development Verification Mode)
                        </span>
                      </div>
                      <p className="text-xs text-[#30251F]/70 mt-1">
                        Initiates a server-signed payment challenge and requires explicit cryptographic verification before marking paid.
                      </p>
                    </div>
                  </label>
                )}

                <div
                  className={`flex items-start gap-3.5 p-4 rounded-xl border ${
                    paymentConfig?.razorpay_enabled
                      ? 'border-[#30251F]/15 cursor-pointer'
                      : 'border-[#30251F]/10 opacity-60 bg-[#F0E8DD]/30'
                  }`}
                >
                  <input
                    type="radio"
                    name="payment_method"
                    disabled={!paymentConfig?.razorpay_enabled}
                    checked={paymentMethod === 'razorpay'}
                    onChange={() => setPaymentMethod('razorpay')}
                    className="mt-1 accent-[#49372F]"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-[#49372F]" />
                      <span className="text-sm font-semibold text-[#30251F]">
                        Razorpay Online Gateway
                      </span>
                    </div>
                    <p className="text-xs text-[#30251F]/70 mt-1">
                      {paymentConfig?.razorpay_enabled
                        ? 'Pay securely via Razorpay cards, UPI, or netbanking.'
                        : 'Integration ready. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in server environment variables to activate live checkout.'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="px-4 py-2 text-sm text-[#30251F]/70 hover:text-[#30251F]"
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handlePlaceOrder}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-md bg-[#49372F] text-[#FAF7F2] text-sm font-medium hover:bg-[#30251F] disabled:opacity-50"
                >
                  <Lock className="w-4 h-4" />
                  {submitting ? 'Creating Order…' : 'Place Order'}
                </button>
              </div>
            </div>
          )}

          {/* STEP 5: Order Confirmation & Controlled Payment Verification */}
          {step === 5 && placedOrder && (
            <div className="space-y-6">
              {pendingPayment && pendingPayment.provider === 'demo_online' ? (
                <div className="space-y-5">
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="w-7 h-7 text-[#49372F]" />
                    <div>
                      <p className="text-xs uppercase tracking-[0.14em] text-[#30251F]/60">
                        Controlled Payment Verification
                      </p>
                      <h2 className="font-serif-editorial text-3xl font-semibold text-[#30251F]">
                        Order {placedOrder.order_number} Created
                      </h2>
                    </div>
                  </div>

                  <div className="bg-[#F0E8DD]/75 border border-[#30251F]/12 rounded-xl p-5 space-y-2 text-sm">
                    <p className="text-[#30251F]/80 leading-relaxed">
                      Your order is currently in <strong>Pending / Awaiting Verification</strong> status. Complete the server-signed test verification below to authorize payment.
                    </p>
                    <p className="font-mono-tabular text-xs text-[#30251F]/60">
                      Reference: {pendingPayment.provider_order_id} · Amount:{' '}
                      {formatPrice(pendingPayment.amount)}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      disabled={verifyingPayment}
                      onClick={() => handleVerifyDemoPayment('success')}
                      className="px-5 py-2.5 rounded-md bg-[#49372F] text-[#FAF7F2] text-sm font-medium hover:bg-[#30251F] disabled:opacity-50"
                    >
                      {verifyingPayment
                        ? 'Verifying Signature…'
                        : 'Verify & Complete Test Payment'}
                    </button>
                    <button
                      type="button"
                      disabled={verifyingPayment}
                      onClick={() => handleVerifyDemoPayment('fail')}
                      className="px-5 py-2.5 rounded-md border border-[#C58F91] text-[#30251F] text-sm font-medium hover:bg-[#C58F91]/15 disabled:opacity-50"
                    >
                      Simulate Payment Failure
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-8 h-8 text-[#929B83]" />
                    <div>
                      <p className="text-xs uppercase tracking-[0.14em] text-[#30251F]/60">
                        Order Receipt
                      </p>
                      <h2 className="font-serif-editorial text-3xl font-semibold text-[#30251F]">
                        Order {placedOrder.order_number} {placedOrder.order_status}
                      </h2>
                    </div>
                  </div>

                  <p className="text-sm text-[#30251F]/80 leading-relaxed">
                    Thank you, {placedOrder.customer_name}. We have saved your order to your account and reserved inventory from our studio.
                  </p>

                  <div className="bg-[#F0E8DD]/60 rounded-xl p-5 grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-xs text-[#30251F]/60">Order Status</p>
                      <p className="font-semibold text-[#30251F]">
                        {placedOrder.order_status}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-[#30251F]/60">Payment Status</p>
                      <p className="font-semibold text-[#30251F] capitalize">
                        {placedOrder.payment_status.replace('_', ' ')}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-[#30251F]/60">Total Amount</p>
                      <p className="font-semibold tabular-nums text-[#30251F]">
                        {formatPrice(placedOrder.final_total)}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => navigate(`/orders/${placedOrder.id}`)}
                      className="px-5 py-2.5 rounded-md bg-[#49372F] text-[#FAF7F2] text-sm font-medium hover:bg-[#30251F]"
                    >
                      View Order Details
                    </button>
                    <Link
                      to="/shop"
                      className="px-5 py-2.5 rounded-md border border-[#30251F]/25 text-sm font-medium text-[#30251F] hover:bg-[#F0E8DD]"
                    >
                      Continue Shopping
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Summary Column */}
        <aside className="lg:col-span-5 bg-[#F0E8DD]/65 border border-[#30251F]/10 rounded-2xl p-6 sm:p-7 space-y-5 lg:sticky lg:top-24">
          <h2 className="font-serif-editorial text-2xl font-semibold text-[#30251F]">
            Bag Summary
          </h2>

          <div className="space-y-3.5 max-h-72 overflow-y-auto pr-1">
            {(placedOrder?.items || cart.items).map((item) => {
              const isOrderItem = 'product_name_snapshot' in item;
              const name = isOrderItem ? item.product_name_snapshot : item.name;
              const img = isOrderItem ? item.product_image_snapshot : item.image;
              return (
                <div key={item.id} className="flex items-center gap-3.5">
                  <div className="w-14 h-14 rounded-lg bg-[#FAF7F2] overflow-hidden border border-[#30251F]/10 shrink-0">
                    <SafeImage
                      src={img}
                      alt={name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#30251F] truncate">{name}</p>
                    <p className="text-xs text-[#30251F]/60 tabular-nums">
                      Qty {item.quantity}
                    </p>
                  </div>
                  <span className="text-sm font-medium tabular-nums text-[#30251F]">
                    {formatPrice(item.line_total)}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="pt-4 border-t border-[#30251F]/10 space-y-2 text-sm">
            <div className="flex justify-between text-[#30251F]/75">
              <span>Subtotal</span>
              <span className="tabular-nums">
                {formatPrice(placedOrder ? placedOrder.subtotal : cart.subtotal)}
              </span>
            </div>
            {(placedOrder ? placedOrder.discount_total : cart.discount_total) > 0 && (
              <div className="flex justify-between text-[#929B83] font-medium">
                <span>Discounts</span>
                <span className="tabular-nums">
                  -
                  {formatPrice(
                    placedOrder ? placedOrder.discount_total : cart.discount_total
                  )}
                </span>
              </div>
            )}
            <div className="flex justify-between text-[#30251F]/75">
              <span>Delivery Charge</span>
              <span className="tabular-nums">
                {(placedOrder ? placedOrder.delivery_charge : cart.delivery_charge) === 0
                  ? 'Complimentary'
                  : formatPrice(
                      placedOrder ? placedOrder.delivery_charge : cart.delivery_charge
                    )}
              </span>
            </div>
            <div className="flex justify-between text-base font-semibold text-[#30251F] pt-2.5 border-t border-[#30251F]/10">
              <span>Total</span>
              <span className="tabular-nums">
                {formatPrice(placedOrder ? placedOrder.final_total : cart.final_total)}
              </span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
