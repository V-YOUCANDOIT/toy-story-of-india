import React, { useState } from 'react';
import { Mail, MapPin, Phone } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SafeImage } from '../components/SafeImage';
import { useToast } from '../contexts/ToastContext';
import { api } from '../services/api';

export function AboutPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-16">
      <div className="max-w-3xl">
        <p className="text-xs uppercase tracking-[0.18em] text-[#30251F]/60 mb-3">
          Our Story
        </p>
        <h1 className="font-serif-editorial text-4xl sm:text-5xl font-semibold text-[#30251F] leading-tight mb-5">
          Quiet Objects Built for Decades of Wonder
        </h1>
        <p className="text-base text-[#30251F]/80 leading-relaxed">
          Petit Atelier was founded on a simple conviction: the objects surrounding a child’s earliest years shape their sense of calm, curiosity, and craft. Rather than fleeting plastic novelties, we curate heirloom toys from family-run European woodworking ateliers, organic linen makers, and Montessori educators.
        </p>
      </div>

      <div className="aspect-[16/9] rounded-2xl overflow-hidden border border-[#30251F]/10 bg-[#F0E8DD]">
        <SafeImage
          src="/src/assets/images/promo_playroom_craft_1794898614493.jpg"
          alt="Sunlit children playroom furnished with wooden toys"
          className="w-full h-full object-cover"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-4">
        <div className="space-y-2">
          <h2 className="font-serif-editorial text-2xl font-semibold text-[#30251F]">
            01. Honest Materials
          </h2>
          <p className="text-sm text-[#30251F]/75 leading-relaxed">
            FSC-certified beech, walnut, and maple hardwoods paired with GOTS organic cotton, Belgian flax linen, and natural mineral pigments.
          </p>
        </div>
        <div className="space-y-2">
          <h2 className="font-serif-editorial text-2xl font-semibold text-[#30251F]">
            02. Open-Ended Play
          </h2>
          <p className="text-sm text-[#30251F]/75 leading-relaxed">
            No batteries or flashing screens where imagination belongs. Our toys invite children to direct the narrative at their own unhurried pace.
          </p>
        </div>
        <div className="space-y-2">
          <h2 className="font-serif-editorial text-2xl font-semibold text-[#30251F]">
            03. Certified Safety
          </h2>
          <p className="text-sm text-[#30251F]/75 leading-relaxed">
            Every workshop partner meets stringent EN71 and ASTM F963 safety benchmarks with food-safe beeswax and plant-oil finishes.
          </p>
        </div>
      </div>

      <div className="bg-[#F0E8DD] rounded-2xl p-8 sm:p-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div>
          <h3 className="font-serif-editorial text-2xl font-semibold text-[#30251F] mb-1">
            Looking for nursery gifting guidance?
          </h3>
          <p className="text-sm text-[#30251F]/75">
            Explore our age-matched collection or speak with our concierge.
          </p>
        </div>
        <Link
          to="/shop"
          className="px-6 py-3 rounded-md bg-[#49372F] text-[#FAF7F2] text-sm font-medium hover:bg-[#30251F] transition-colors whitespace-nowrap"
        >
          Explore Collection
        </Link>
      </div>
    </div>
  );
}

export function ContactPage() {
  const { showToast } = useToast();
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.post<{ message: string }>('/api/contact', form);
      showToast(res.message, 'success');
      setSent(true);
      setForm({ name: '', email: '', subject: '', message: '' });
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to send message', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-5 space-y-6">
          <p className="text-xs uppercase tracking-[0.18em] text-[#30251F]/60">
            Concierge &amp; Showroom
          </p>
          <h1 className="font-serif-editorial text-4xl sm:text-5xl font-semibold text-[#30251F]">
            We Would Love to Hear From You
          </h1>
          <p className="text-sm sm:text-base text-[#30251F]/75 leading-relaxed">
            Whether you need age-tailored gifting advice, bespoke playroom curation, or assistance with an existing order, our concierge team responds within one business day.
          </p>

          <div className="space-y-4 pt-4 border-t border-[#30251F]/10 text-sm text-[#30251F]/80">
            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 text-[#49372F] mt-1 shrink-0" />
              <div>
                <p className="font-medium text-[#30251F]">SoHo Flagship Atelier</p>
                <p>418 Mercer Street, New York, NY 10013</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Mail className="w-4 h-4 text-[#49372F] mt-1 shrink-0" />
              <div>
                <p className="font-medium text-[#30251F]">Concierge Desk</p>
                <p>concierge@petitatelier.com</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Phone className="w-4 h-4 text-[#49372F] mt-1 shrink-0" />
              <div>
                <p className="font-medium text-[#30251F]">Telephone</p>
                <p>+1 (555) 204-8800 · Mon–Sat 10am–6pm EST</p>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 bg-[#F0E8DD]/65 border border-[#30251F]/10 rounded-2xl p-8 sm:p-10">
          {sent ? (
            <div className="py-12 text-center space-y-3">
              <h2 className="font-serif-editorial text-3xl text-[#30251F]">
                Thank You for Reaching Out
              </h2>
              <p className="text-sm text-[#30251F]/75 max-w-md mx-auto">
                Your note has been recorded with our client care desk. A member of our team will reply shortly.
              </p>
              <button
                type="button"
                onClick={() => setSent(false)}
                className="mt-4 px-5 py-2 rounded-md border border-[#30251F]/25 text-sm font-medium hover:bg-[#FAF7F2]"
              >
                Send Another Inquiry
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="text-xs uppercase tracking-[0.12em] text-[#30251F]/70 block mb-1.5">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full bg-[#FAF7F2] border border-[#30251F]/20 rounded-md px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#49372F]"
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-[0.12em] text-[#30251F]/70 block mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full bg-[#FAF7F2] border border-[#30251F]/20 rounded-md px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#49372F]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs uppercase tracking-[0.12em] text-[#30251F]/70 block mb-1.5">
                  Subject
                </label>
                <input
                  type="text"
                  required
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  className="w-full bg-[#FAF7F2] border border-[#30251F]/20 rounded-md px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#49372F]"
                />
              </div>

              <div>
                <label className="text-xs uppercase tracking-[0.12em] text-[#30251F]/70 block mb-1.5">
                  Message
                </label>
                <textarea
                  rows={5}
                  required
                  minLength={10}
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  className="w-full bg-[#FAF7F2] border border-[#30251F]/20 rounded-md px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#49372F]"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-3 rounded-md bg-[#49372F] text-[#FAF7F2] text-sm font-medium hover:bg-[#30251F] disabled:opacity-50 transition-colors"
              >
                {submitting ? 'Sending…' : 'Send Message'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export function PrivacyPolicyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-6">
      <p className="text-xs uppercase tracking-[0.16em] text-[#30251F]/60">Legal</p>
      <h1 className="font-serif-editorial text-4xl font-semibold text-[#30251F]">
        Privacy Policy
      </h1>
      <p className="text-xs text-[#30251F]/55">Effective Date: November 2026</p>
      <div className="space-y-5 text-sm text-[#30251F]/80 leading-relaxed">
        <p>
          Petit Atelier Toy Merchants respects your family’s privacy. We collect only the information necessary to fulfill orders, manage saved delivery addresses, maintain your wishlist and shopping bag, and provide order status updates.
        </p>
        <h2 className="font-serif-editorial text-2xl text-[#30251F] pt-2">
          1. Information We Collect
        </h2>
        <p>
          When you register an account or place an order, we store your name, email address, telephone number, and shipping addresses securely in our database. Passwords are salted and hashed prior to storage; we never retain plain-text passwords.
        </p>
        <h2 className="font-serif-editorial text-2xl text-[#30251F] pt-2">
          2. Cookies &amp; Session Security
        </h2>
        <p>
          We utilize strictly necessary HTTP-only authentication cookies and CSRF protection tokens to safeguard your account session and preserve your shopping bag across visits.
        </p>
        <h2 className="font-serif-editorial text-2xl text-[#30251F] pt-2">
          3. Payment Security
        </h2>
        <p>
          Online payment transactions are routed through certified payment gateways. Petit Atelier stores only verified transaction references and payment status metadata—never raw card numbers.
        </p>
      </div>
    </div>
  );
}

export function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-6">
      <p className="text-xs uppercase tracking-[0.16em] text-[#30251F]/60">Legal</p>
      <h1 className="font-serif-editorial text-4xl font-semibold text-[#30251F]">
        Terms &amp; Conditions
      </h1>
      <p className="text-xs text-[#30251F]/55">Effective Date: November 2026</p>
      <div className="space-y-5 text-sm text-[#30251F]/80 leading-relaxed">
        <p>
          Welcome to Petit Atelier. By placing an order through our storefront, you agree to the terms outlined below regarding pricing, fulfillment, age suitability, and cancellations.
        </p>
        <h2 className="font-serif-editorial text-2xl text-[#30251F] pt-2">
          1. Orders &amp; Availability
        </h2>
        <p>
          All toy quantities are validated against live studio inventory at checkout. Once an order is placed, inventory is reserved for your shipment. Orders in Pending or Confirmed status may be cancelled directly from your account, automatically restoring inventory.
        </p>
        <h2 className="font-serif-editorial text-2xl text-[#30251F] pt-2">
          2. Safety &amp; Age Guidance
        </h2>
        <p>
          Every product page lists manufacturer age recommendations and material specifications. Please supervise young children appropriately when playing with small wooden components or ceramic pretend-play sets.
        </p>
        <h2 className="font-serif-editorial text-2xl text-[#30251F] pt-2">
          3. Shipping &amp; Returns
        </h2>
        <p>
          Orders meeting our complimentary shipping threshold ship free of charge. Unused toys in original packaging may be returned within 30 days of delivery.
        </p>
      </div>
    </div>
  );
}
