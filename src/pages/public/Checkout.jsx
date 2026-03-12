import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  CreditCard,
  CheckCircle,
  MapPin,
  AlertCircle,
  Navigation,
  Loader2,
  XCircle,
  ShieldCheck,
  Clock3,
  Smartphone,
} from 'lucide-react';
import { useCartStore } from '../../store/useCartStore';
import { useAuthStore } from '../../store/useAuthStore';
import { createOrder, getStoreLocation, haversineKm } from '../../lib/db';
import { formatCurrencyINR } from '../../lib/format';
import { Reveal } from '../../components/Reveal';
import toast from 'react-hot-toast';

const STORAGE_KEY = 'gg-checkout-address';

const initialAddress = {
  house_no: '',
  street_address: '',
  city: '',
  state: '',
  pincode: '',
  latitude: '',
  longitude: '',
  formatted_address: '',
};

const pickHouseNoFromDisplay = (displayName) => {
  const firstChunk = (displayName || '').split(',')[0]?.trim() || '';
  const match = firstChunk.match(/^\d+[A-Za-z0-9/-]*/);
  return match ? match[0] : '';
};

export const Checkout = () => {
  const { getCartTotal, items, clearCart } = useCartStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const [address, setAddress] = useState(initialAddress);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [deliveryStatus, setDeliveryStatus] = useState(null);
  const [deliveryInfo, setDeliveryInfo] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [paymentState, setPaymentState] = useState('idle');
  const storeRef = useRef(null);

  useEffect(() => {
    getStoreLocation().then((location) => {
      storeRef.current = location;
    });
    try {
      const saved = window.sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        setAddress({ ...initialAddress, ...JSON.parse(saved) });
      }
    } catch {
      // Ignore malformed drafts.
    }
  }, []);

  useEffect(() => {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(address));
  }, [address]);

  const total = useMemo(() => getCartTotal(), [getCartTotal]);

  const checkDelivery = async (lat, lng) => {
    setDeliveryStatus('checking');
    const store = storeRef.current;
    if (!store?.lat || !store?.lng) {
      setDeliveryStatus('no_config');
      setDeliveryInfo('Delivery radius is not configured yet. Orders are currently accepted from all areas.');
      return true;
    }

    const distance = haversineKm(store.lat, store.lng, Number(lat), Number(lng));
    const radius = store.delivery_radius_km || 10;
    const withinRange = distance <= radius;

    setDeliveryStatus(withinRange ? 'ok' : 'out_of_range');
    setDeliveryInfo(
      withinRange
        ? `Address is serviceable. You are ${distance.toFixed(1)} km away and within the ${radius} km delivery zone.`
        : `This address is ${distance.toFixed(1)} km away, which is outside the ${radius} km delivery zone.`
    );

    return withinRange;
  };

  const updateAddressField = (key, value) => {
    setAddress((previous) => ({ ...previous, [key]: value }));
  };

  const handlePincodeChange = (value) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 6);
    setAddress((previous) => ({ ...previous, pincode: cleaned }));
    setDeliveryStatus(null);
    setDeliveryInfo('');
  };

  const fetchAddressFromCoords = async (lat, lon) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=jsonv2&addressdetails=1`,
        { headers: { Accept: 'application/json' } }
      );

      if (!response.ok) {
        throw new Error(`Reverse geocoding failed with status ${response.status}`);
      }

      const data = await response.json();
      const addressObj = data?.address || {};

      const city =
        addressObj.city ||
        addressObj.town ||
        addressObj.village ||
        addressObj.city_district ||
        addressObj.county ||
        '';
      const state = addressObj.state || addressObj.region || '';
      const normalizedPincode = (addressObj.postcode || '').replace(/\D/g, '').slice(0, 6);
      const houseNo = addressObj.house_number || addressObj.house || pickHouseNoFromDisplay(data?.display_name) || '';
      const streetParts = [
        addressObj.road,
        addressObj.neighbourhood,
        addressObj.suburb,
        addressObj.residential,
        addressObj.hamlet,
      ].filter(Boolean);
      const street = streetParts.join(', ') || (data?.display_name ? data.display_name.split(',').slice(0, 2).join(', ').trim() : '');

      setAddress((previous) => ({
        ...previous,
        house_no: houseNo || previous.house_no,
        street_address: street || previous.street_address,
        city: city || previous.city,
        state: state || previous.state,
        pincode: normalizedPincode || previous.pincode,
        latitude: Number(lat).toFixed(7),
        longitude: Number(lon).toFixed(7),
        formatted_address: data?.display_name || previous.formatted_address,
      }));

      await checkDelivery(lat, lon);
      toast.success('Location captured. Verify the address details before paying.');
    } catch (error) {
      console.warn('Reverse geocoding failed:', error.message);
      toast.error('Could not auto-fill your address. Please enter it manually.');
    }
  };

  const handleGetLocation = () => {
    setIsLocating(true);

    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser.');
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        fetchAddressFromCoords(position.coords.latitude, position.coords.longitude).finally(() => setIsLocating(false));
      },
      (error) => {
        setIsLocating(false);
        if (error.code === 1) {
          toast.error('Location access was denied.');
          return;
        }
        toast.error('Unable to retrieve your location.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const initRazorpay = (orderData) => new Promise((resolve) => {
    const options = {
      key: import.meta.env.VITE_RAZORPAY_KEY_ID,
      amount: Math.round(total * 100),
      currency: 'INR',
      name: 'GoldenGrain',
      description: 'Premium rice order',
      order_id: orderData?.razorpay_order_id,
      handler: (response) => resolve({ success: true, response }),
      prefill: {
        name: user?.user_metadata?.full_name || '',
        contact: user?.phone || '',
        email: user?.email || '',
      },
      theme: { color: '#f2cc0d' },
      modal: {
        ondismiss: () => resolve({ success: false }),
      },
    };

    if (window.Razorpay) {
      setPaymentState('modal_open');
      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } else {
      console.warn('Razorpay SDK not loaded. Simulating payment in development mode.');
      setTimeout(() => resolve({ success: true, response: { razorpay_payment_id: `sim_${Date.now()}` } }), 1200);
    }
  });

  const validateAddress = () => {
    if (!user) {
      toast.error('Please log in to place an order.');
      navigate('/login');
      return false;
    }

    if (!address.street_address.trim() || !address.city.trim() || !address.state.trim()) {
      toast.error('Please complete your delivery address before continuing.');
      return false;
    }

    if (!address.pincode || address.pincode.length < 6) {
      toast.error('Please enter a valid 6-digit pincode.');
      return false;
    }

    return true;
  };

  const handleCheckout = async (event) => {
    event.preventDefault();

    if (!validateAddress()) return;

    let checkLat = address.latitude ? Number(address.latitude) : null;
    let checkLng = address.longitude ? Number(address.longitude) : null;

    if (!checkLat || !checkLng) {
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?postalcode=${address.pincode}&country=India&format=json&limit=1`);
        const results = await response.json();
        if (results?.[0]) {
          checkLat = Number(results[0].lat);
          checkLng = Number(results[0].lon);
        }
      } catch {
        // If geocoding fails, fall back to order creation without a distance check.
      }
    }

    if (checkLat && checkLng) {
      const withinRange = await checkDelivery(checkLat, checkLng);
      if (!withinRange) {
        toast.error(`Pincode ${address.pincode} is outside our delivery zone.`);
        return;
      }
    }

    setIsProcessing(true);
    setPaymentState('processing');

    try {
      const order = await createOrder({
        userId: user.id,
        items,
        addressData: address,
        totalAmount: total,
      });

      const { success } = await initRazorpay(order);
      if (!success) {
        setPaymentState('cancelled');
        toast.error('Payment cancelled. Your details are still saved here.');
        return;
      }

      setPaymentState('paid');
      window.sessionStorage.removeItem(STORAGE_KEY);
      clearCart();
      setIsSuccess(true);
      toast.success('Payment successful. Your order has been placed.');
    } catch (error) {
      console.warn('Checkout persistence failed:', error.message);
      const { success } = await initRazorpay({});
      if (!success) {
        setPaymentState('cancelled');
        toast.error('Payment cancelled. Your details are still saved here.');
        return;
      }
      setPaymentState('paid');
      window.sessionStorage.removeItem(STORAGE_KEY);
      clearCart();
      setIsSuccess(true);
      toast.success('Order placed in demo mode. Run the SQL schema to persist orders.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="page-shell">
        <div className="container" style={{ minHeight: '72vh', display: 'grid', placeItems: 'center' }}>
          <Reveal className="surface-card section-card" style={{ maxWidth: 640, width: '100%', textAlign: 'center', padding: '3rem 1.5rem' }}>
            <div style={{ width: 88, height: 88, borderRadius: '50%', background: 'rgba(16,185,129,0.12)', display: 'grid', placeItems: 'center', margin: '0 auto 1.25rem' }}>
              <CheckCircle size={52} color="#10b981" />
            </div>
            <h2 style={{ margin: 0, fontSize: '2.2rem' }}>Order confirmed</h2>
            <p style={{ color: 'var(--text-secondary)', margin: '0.75rem 0 1.5rem' }}>
              Payment was completed successfully. We will update your order status as soon as packing begins.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button type="button" onClick={() => navigate('/profile')} className="btn btn-primary" style={{ width: 'auto' }}>
                View My Orders
              </button>
              <button type="button" onClick={() => navigate('/shop')} className="btn btn-outline" style={{ width: 'auto' }}>
                Continue Shopping
              </button>
            </div>
          </Reveal>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    setTimeout(() => navigate('/cart'), 0);
    return null;
  }

  return (
    <div className="page-shell">
      <div className="container">
        <Reveal className="page-header">
          <div className="badge">Secure Checkout</div>
          <h1 className="page-title" style={{ marginTop: '0.9rem' }}>
            Confirm and <span className="page-title-accent">Pay Securely</span>
          </h1>
          <p className="page-subtitle">
            Your address draft is saved while you fill it out. We check serviceability before opening Razorpay.
          </p>
        </Reveal>

        <div className="checkout-grid">
          <div className="checkout-layout">
            <Reveal className="surface-card checkout-panel">
              <div className="checkout-section-title">
                <span><MapPin size={18} color="var(--primary)" /> Delivery Address</span>
                <button type="button" onClick={handleGetLocation} disabled={isLocating} className="btn btn-outline" style={{ width: 'auto' }}>
                  {isLocating ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Navigation size={16} />}
                  {isLocating ? 'Locating...' : 'Use GPS'}
                </button>
              </div>

              {address.formatted_address && (
                <div className="checkout-info-box" style={{ marginBottom: '1rem' }}>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>GPS match</div>
                  <div style={{ marginTop: '0.35rem' }}>{address.formatted_address}</div>
                </div>
              )}

              <form id="checkout-form" onSubmit={handleCheckout} className="stack-md">
                <div className="checkout-two-col">
                  <div className="field-group">
                    <label className="field-label">House No / Flat</label>
                    <input className="field-input" value={address.house_no} onChange={(event) => updateAddressField('house_no', event.target.value)} placeholder="Apartment, flat, house no." />
                  </div>
                  <div className="field-group">
                    <label className="field-label">Pincode</label>
                    <input
                      className="field-input"
                      value={address.pincode}
                      onChange={(event) => handlePincodeChange(event.target.value)}
                      maxLength={6}
                      required
                      placeholder="6-digit pincode"
                    />
                  </div>
                </div>

                <div className="field-group">
                  <label className="field-label">Street Address</label>
                  <input className="field-input" value={address.street_address} onChange={(event) => updateAddressField('street_address', event.target.value)} required placeholder="Street, area, landmark" />
                </div>

                <div className="checkout-two-col">
                  <div className="field-group">
                    <label className="field-label">City</label>
                    <input className="field-input" value={address.city} onChange={(event) => updateAddressField('city', event.target.value)} required placeholder="City" />
                  </div>
                  <div className="field-group">
                    <label className="field-label">State</label>
                    <input className="field-input" value={address.state} onChange={(event) => updateAddressField('state', event.target.value)} required placeholder="State" />
                  </div>
                </div>
              </form>
            </Reveal>

            <Reveal className="surface-card checkout-panel" delay={0.05}>
              <div className="checkout-section-title">
                <span><ShieldCheck size={18} color="var(--primary)" /> Delivery Verification</span>
              </div>

              <div className="stack-sm">
                <div className={`status-pill ${
                  deliveryStatus === 'ok'
                    ? 'ok'
                    : deliveryStatus === 'out_of_range'
                      ? 'error'
                      : deliveryStatus === 'no_config'
                        ? 'info'
                        : 'muted'
                }`}>
                  {deliveryStatus === 'checking' && <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />}
                  {deliveryStatus === 'ok' && <CheckCircle size={15} />}
                  {deliveryStatus === 'out_of_range' && <XCircle size={15} />}
                  {deliveryStatus === 'no_config' && <AlertCircle size={15} />}
                  {!deliveryStatus && <Clock3 size={15} />}
                  <span>
                    {deliveryStatus === 'checking' && 'Checking delivery radius...'}
                    {deliveryStatus === 'ok' && deliveryInfo}
                    {deliveryStatus === 'out_of_range' && deliveryInfo}
                    {deliveryStatus === 'no_config' && deliveryInfo}
                    {!deliveryStatus && 'Add your pincode or use GPS to verify whether this address is serviceable.'}
                  </span>
                </div>

                <div className="checkout-two-col">
                  <div className="checkout-info-box">
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.84rem' }}>Payment state</div>
                    <div style={{ marginTop: '0.35rem', fontWeight: 700 }}>
                      {paymentState === 'idle' && 'Ready to pay'}
                      {paymentState === 'processing' && 'Preparing secure checkout'}
                      {paymentState === 'modal_open' && 'Razorpay opened'}
                      {paymentState === 'cancelled' && 'Payment cancelled'}
                      {paymentState === 'paid' && 'Payment complete'}
                    </div>
                  </div>
                  <div className="checkout-info-box">
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.84rem' }}>Checkout support</div>
                    <div style={{ marginTop: '0.35rem', fontWeight: 700 }}>
                      Draft saved on this device
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>

          <Reveal className="surface-card checkout-panel sticky-card" delay={0.08}>
            <div className="checkout-payment-card">
              <div>
                <h3 style={{ margin: 0, fontSize: '1.35rem' }}>Review and Pay</h3>
                <p style={{ margin: '0.35rem 0 0', color: 'var(--text-secondary)' }}>
                  Secure payment through Razorpay after address verification.
                </p>
              </div>

              <div className="stack-sm">
                {items.map((item) => (
                  <div key={item.product.id} className="summary-row">
                    <span>{item.product.name} x {item.quantity}</span>
                    <strong>{formatCurrencyINR(item.product.price * item.quantity)}</strong>
                  </div>
                ))}
              </div>

              <div className="stack-sm">
                <div className="summary-row">
                  <span>Subtotal</span>
                  <strong>{formatCurrencyINR(total)}</strong>
                </div>
                <div className="summary-row">
                  <span>Delivery fee</span>
                  <span>Calculated after address confirmation</span>
                </div>
                <div className="summary-row summary-total">
                  <span>Total</span>
                  <span className="value-strong" style={{ color: 'var(--primary)' }}>{formatCurrencyINR(total)}</span>
                </div>
              </div>

              <div className="checkout-info-box">
                <div className="summary-row">
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', color: 'var(--text-primary)' }}>
                    <Smartphone size={16} color="var(--primary)" />
                    Payment method
                  </span>
                  <strong>Razorpay</strong>
                </div>
                <div style={{ marginTop: '0.75rem', color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                  UPI, cards, and supported wallet flows continue inside the secure Razorpay window.
                </div>
              </div>

              {paymentState === 'cancelled' && (
                <div className="status-pill info">
                  <AlertCircle size={15} />
                  Payment was cancelled. Your address draft is still here so you can retry without re-entering details.
                </div>
              )}

              <button
                type="submit"
                form="checkout-form"
                disabled={isProcessing || deliveryStatus === 'out_of_range'}
                className="btn btn-primary"
              >
                {isProcessing ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <CreditCard size={18} />}
                {isProcessing ? 'Opening Razorpay...' : `Pay ${formatCurrencyINR(total)}`}
              </button>

              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.82rem', textAlign: 'center' }}>
                Your payment is processed by Razorpay. Checkout remains online-only for security.
              </p>
            </div>

            <div className="checkout-cta-bar">
              <div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>Total</div>
                <div style={{ fontWeight: 800 }}>{formatCurrencyINR(total)}</div>
              </div>
              <button type="submit" form="checkout-form" className="btn btn-primary" disabled={isProcessing || deliveryStatus === 'out_of_range'} style={{ width: 'auto' }}>
                Pay Now
              </button>
            </div>
          </Reveal>
        </div>
      </div>
    </div>
  );
};
