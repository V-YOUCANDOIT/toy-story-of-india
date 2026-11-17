import React, { useEffect, useState } from 'react';
import { LogOut, MapPin, Package, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { api } from '../services/api';
import type { Address } from '../types';

export function AccountPage() {
  const { user, logout, refreshUser } = useAuth();
  const { showToast, confirm } = useToast();
  const navigate = useNavigate();

  const [profile, setProfile] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
  });
  const [savingProfile, setSavingProfile] = useState(false);

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addrForm, setAddrForm] = useState({
    label: 'Home',
    full_name: user?.name || '',
    phone: user?.phone || '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'United States',
    is_default: false,
  });

  useEffect(() => {
    if (user) {
      setProfile({ name: user.name, phone: user.phone });
    }
    api
      .get<{ addresses: Address[] }>('/api/user/addresses')
      .then((res) => setAddresses(res.addresses))
      .catch(() => {});
  }, [user]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await api.put('/api/user/profile', profile);
      await refreshUser();
      showToast('Profile details updated.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Update failed', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/api/user/addresses', addrForm);
      const res = await api.get<{ addresses: Address[] }>('/api/user/addresses');
      setAddresses(res.addresses);
      setShowAddressForm(false);
      setAddrForm({
        label: 'Home',
        full_name: user?.name || '',
        phone: user?.phone || '',
        line1: '',
        line2: '',
        city: '',
        state: '',
        postal_code: '',
        country: 'United States',
        is_default: false,
      });
      showToast('Delivery address saved.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not save address', 'error');
    }
  };

  const handleDeleteAddress = async (id: number) => {
    const ok = await confirm({
      title: 'Remove Saved Address',
      message: 'Are you sure you want to delete this delivery address?',
      confirmLabel: 'Remove',
      destructive: true,
    });
    if (!ok) return;
    try {
      await api.delete(`/api/user/addresses/${id}`);
      setAddresses((prev) => prev.filter((a) => a.id !== id));
      showToast('Address removed.', 'info');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to remove address', 'error');
    }
  };

  const handleLogout = async () => {
    await logout();
    showToast('You have been signed out.', 'info');
    navigate('/');
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
      <div className="border-b border-[#30251F]/10 pb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-[#30251F]/60 mb-2">
            Personal Account
          </p>
          <h1 className="font-serif-editorial text-4xl font-semibold text-[#30251F]">
            Welcome, {user?.name}
          </h1>
          <p className="text-sm text-[#30251F]/65 mt-1">{user?.email}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {user?.role === 'admin' && (
            <Link
              to="/admin"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-[#30251F] text-[#FAF7F2] text-sm font-medium hover:bg-[#49372F]"
            >
              <ShieldCheck className="w-4 h-4" />
              Admin Studio
            </Link>
          )}
          <Link
            to="/orders"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-[#30251F]/20 text-sm font-medium hover:bg-[#F0E8DD]"
          >
            <Package className="w-4 h-4" />
            My Orders
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-[#30251F]/20 text-sm text-[#30251F]/80 hover:bg-[#F0E8DD]"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* Profile Details */}
        <section className="lg:col-span-5 bg-[#FAF7F2] border border-[#30251F]/12 rounded-2xl p-7">
          <h2 className="font-serif-editorial text-2xl font-semibold text-[#30251F] mb-5">
            Profile Information
          </h2>
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div>
              <label className="text-xs uppercase tracking-[0.12em] text-[#30251F]/70 block mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                required
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                className="w-full bg-[#FAF7F2] border border-[#30251F]/20 rounded-md px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#49372F]"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-[0.12em] text-[#30251F]/70 block mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                disabled
                value={user?.email || ''}
                className="w-full bg-[#F0E8DD]/60 border border-[#30251F]/12 rounded-md px-3.5 py-2.5 text-sm text-[#30251F]/60"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-[0.12em] text-[#30251F]/70 block mb-1.5">
                Phone Number
              </label>
              <input
                type="tel"
                required
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                className="w-full bg-[#FAF7F2] border border-[#30251F]/20 rounded-md px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#49372F]"
              />
            </div>
            <button
              type="submit"
              disabled={savingProfile}
              className="px-5 py-2.5 rounded-md bg-[#49372F] text-[#FAF7F2] text-sm font-medium hover:bg-[#30251F] disabled:opacity-50"
            >
              {savingProfile ? 'Saving…' : 'Save Changes'}
            </button>
          </form>
        </section>

        {/* Saved Delivery Addresses */}
        <section className="lg:col-span-7 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="font-serif-editorial text-2xl font-semibold text-[#30251F]">
              Saved Delivery Addresses
            </h2>
            <button
              type="button"
              onClick={() => setShowAddressForm(!showAddressForm)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-[#49372F] text-[#FAF7F2] text-xs font-medium hover:bg-[#30251F]"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Address
            </button>
          </div>

          {showAddressForm && (
            <form
              onSubmit={handleAddAddress}
              className="bg-[#F0E8DD]/65 border border-[#30251F]/12 rounded-2xl p-6 space-y-4"
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  type="text"
                  placeholder="Label (e.g. Home)"
                  required
                  value={addrForm.label}
                  onChange={(e) => setAddrForm({ ...addrForm, label: e.target.value })}
                  className="bg-[#FAF7F2] border border-[#30251F]/20 rounded-md px-3 py-2 text-sm"
                />
                <input
                  type="text"
                  placeholder="Recipient Full Name"
                  required
                  value={addrForm.full_name}
                  onChange={(e) =>
                    setAddrForm({ ...addrForm, full_name: e.target.value })
                  }
                  className="bg-[#FAF7F2] border border-[#30251F]/20 rounded-md px-3 py-2 text-sm"
                />
                <input
                  type="tel"
                  placeholder="Phone"
                  required
                  value={addrForm.phone}
                  onChange={(e) => setAddrForm({ ...addrForm, phone: e.target.value })}
                  className="bg-[#FAF7F2] border border-[#30251F]/20 rounded-md px-3 py-2 text-sm"
                />
              </div>
              <input
                type="text"
                placeholder="Street Address"
                required
                value={addrForm.line1}
                onChange={(e) => setAddrForm({ ...addrForm, line1: e.target.value })}
                className="w-full bg-[#FAF7F2] border border-[#30251F]/20 rounded-md px-3 py-2 text-sm"
              />
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <input
                  type="text"
                  placeholder="Apt / Suite"
                  value={addrForm.line2}
                  onChange={(e) => setAddrForm({ ...addrForm, line2: e.target.value })}
                  className="bg-[#FAF7F2] border border-[#30251F]/20 rounded-md px-3 py-2 text-sm"
                />
                <input
                  type="text"
                  placeholder="City"
                  required
                  value={addrForm.city}
                  onChange={(e) => setAddrForm({ ...addrForm, city: e.target.value })}
                  className="bg-[#FAF7F2] border border-[#30251F]/20 rounded-md px-3 py-2 text-sm"
                />
                <input
                  type="text"
                  placeholder="State"
                  required
                  value={addrForm.state}
                  onChange={(e) => setAddrForm({ ...addrForm, state: e.target.value })}
                  className="bg-[#FAF7F2] border border-[#30251F]/20 rounded-md px-3 py-2 text-sm"
                />
                <input
                  type="text"
                  placeholder="Postal Code"
                  required
                  value={addrForm.postal_code}
                  onChange={(e) =>
                    setAddrForm({ ...addrForm, postal_code: e.target.value })
                  }
                  className="bg-[#FAF7F2] border border-[#30251F]/20 rounded-md px-3 py-2 text-sm"
                />
              </div>
              <div className="flex items-center justify-between pt-2">
                <label className="inline-flex items-center gap-2 text-xs text-[#30251F]/80">
                  <input
                    type="checkbox"
                    checked={addrForm.is_default}
                    onChange={(e) =>
                      setAddrForm({ ...addrForm, is_default: e.target.checked })
                    }
                    className="accent-[#49372F]"
                  />
                  Set as default address
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddressForm(false)}
                    className="px-4 py-2 text-xs text-[#30251F]/70"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-md bg-[#49372F] text-[#FAF7F2] text-xs font-medium"
                  >
                    Save Address
                  </button>
                </div>
              </div>
            </form>
          )}

          {addresses.length === 0 ? (
            <div className="bg-[#F0E8DD]/45 border border-[#30251F]/10 rounded-xl p-8 text-center">
              <MapPin className="w-7 h-7 text-[#30251F]/35 mx-auto mb-2" />
              <p className="text-sm text-[#30251F]/70">
                No saved addresses yet. Add one above for faster checkout.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {addresses.map((addr) => (
                <div
                  key={addr.id}
                  className="bg-[#FAF7F2] border border-[#30251F]/12 rounded-xl p-5 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs uppercase tracking-[0.12em] font-semibold text-[#49372F]">
                        {addr.label}
                        {addr.is_default === 1 ? ' · Default' : ''}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeleteAddress(addr.id)}
                        aria-label="Delete address"
                        className="text-[#30251F]/40 hover:text-[#C58F91] p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-sm font-medium text-[#30251F]">{addr.full_name}</p>
                    <p className="text-xs text-[#30251F]/70 mt-1 leading-relaxed">
                      {addr.line1}
                      {addr.line2 ? `, ${addr.line2}` : ''}
                      <br />
                      {addr.city}, {addr.state} {addr.postal_code}
                      <br />
                      {addr.country} · {addr.phone}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
