import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, CheckCircle, MapPin, AlertCircle, Navigation, Loader2 } from 'lucide-react';
import { useCartStore } from '../../store/useCartStore';
import { useAuthStore } from '../../store/useAuthStore';
import { createOrder } from '../../lib/db';
import toast from 'react-hot-toast';

const SERVICEABLE_PINCODES = ['10001', '10002', '10003', '400001', '400002', '500001', '600001', '700001', '110001'];

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

const getPincodeWarning = (pincode) => {
  if (!pincode || pincode.length < 6) return '';
  if (!SERVICEABLE_PINCODES.includes(pincode.trim())) {
    return `We don't deliver to ${pincode} yet. Check back soon!`;
  }
  return '';
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
  const [pincodeWarning, setPincodeWarning] = useState('');
  const [isLocating, setIsLocating] = useState(false);

  const updateAddressField = (key, value) => {
    setAddress((prev) => ({ ...prev, [key]: value }));
  };

  const handlePincodeChange = (value) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 6);
    setAddress((prev) => ({ ...prev, pincode: cleaned }));
    setPincodeWarning(getPincodeWarning(cleaned));
  };

  const fetchAddressFromCoords = async (lat, lon) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=jsonv2&addressdetails=1`,
        {
          headers: {
            Accept: 'application/json',
          },
        }
      );

      if (!res.ok) {
        throw new Error(`Reverse geocoding failed with status ${res.status}`);
      }

      const data = await res.json();
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

      const houseNo =
        addressObj.house_number ||
        addressObj.house ||
        pickHouseNoFromDisplay(data?.display_name) ||
        '';

      const streetParts = [
        addressObj.road,
        addressObj.neighbourhood,
        addressObj.suburb,
        addressObj.residential,
        addressObj.hamlet,
      ].filter(Boolean);

      const street =
        streetParts.join(', ') ||
        (data?.display_name ? data.display_name.split(',').slice(0, 2).join(',').trim() : '');

      setAddress((prev) => ({
        ...prev,
        house_no: houseNo || prev.house_no,
        street_address: street || prev.street_address,
        city: city || prev.city,
        state: state || prev.state,
        pincode: normalizedPincode || prev.pincode,
        latitude: Number(lat).toFixed(7),
        longitude: Number(lon).toFixed(7),
        formatted_address: data?.display_name || prev.formatted_address,
      }));

      setPincodeWarning(getPincodeWarning(normalizedPincode || address.pincode));
      toast.success('GPS location fetched. Please verify house no and street details.');
    } catch (error) {
      console.warn('Reverse geocoding failed:', error.message);
      toast.error('Failed to fetch address from GPS. Please fill manually.');
    }
  };

  const handleGetLocation = () => {
    setIsLocating(true);

    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        fetchAddressFromCoords(position.coords.latitude, position.coords.longitude).finally(() =>
          setIsLocating(false)
        );
      },
      (error) => {
        setIsLocating(false);
        if (error.code === 1) {
          toast.error('Location permission denied.');
        } else {
          toast.error('Unable to retrieve your location.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const initRazorpay = (orderData) => {
    return new Promise((resolve) => {
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: Math.round(getCartTotal() * 100),
        currency: 'INR',
        name: 'GoldenGrain',
        description: 'Premium Rice Order',
        order_id: orderData?.razorpay_order_id,
        handler: (response) => resolve({ success: true, response }),
        prefill: { name: '', contact: user?.phone || '' },
        theme: { color: '#f59e0b' },
        modal: { ondismiss: () => resolve({ success: false }) },
      };

      if (window.Razorpay) {
        const rzp = new window.Razorpay(options);
        rzp.open();
      } else {
        console.warn('Razorpay SDK not loaded. Simulating payment in dev mode.');
        setTimeout(
          () => resolve({ success: true, response: { razorpay_payment_id: 'sim_' + Date.now() } }),
          1500
        );
      }
    });
  };

  const handleCheckout = async (e) => {
    e.preventDefault();

    if (!user) {
      toast.error('Please login to place an order');
      navigate('/login');
      return;
    }

    if (!SERVICEABLE_PINCODES.includes(address.pincode.trim())) {
      toast.error(`Sorry, we don't deliver to ${address.pincode} currently.`);
      return;
    }

    setIsProcessing(true);

    try {
      const order = await createOrder({
        userId: user.id,
        items,
        addressData: address,
        totalAmount: getCartTotal(),
      });

      const { success } = await initRazorpay(order);
      if (!success) {
        toast.error('Payment cancelled.');
        setIsProcessing(false);
        return;
      }

      toast.success('Payment successful! Order placed.');
      clearCart();
      setIsSuccess(true);
    } catch (error) {
      console.warn('DB error (tables may not exist):', error.message);
      const { success } = await initRazorpay({});
      if (success) {
        clearCart();
        setIsSuccess(true);
        toast.success('Order placed! (Demo mode - run SQL schema to persist orders)');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="container" style={{ padding: '6rem 2rem', textAlign: 'center' }}>
        <div
          style={{
            width: '100px',
            height: '100px',
            borderRadius: '50%',
            background: 'rgba(16,185,129,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 2rem',
          }}
        >
          <CheckCircle size={56} color="#10b981" />
        </div>
        <h2 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>Order Confirmed!</h2>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '500px', margin: '0 auto 2rem' }}>
          Thank you for your order! We will notify you once your premium grain is out for delivery.
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <button onClick={() => navigate('/profile')} className="btn btn-outline">
            View My Orders
          </button>
          <button onClick={() => navigate('/')} className="btn btn-primary">
            Continue Shopping
          </button>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    setTimeout(() => navigate('/cart'), 0);
    return null;
  }

  return (
    <div className="container" style={{ padding: '4rem 2rem' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '2.5rem' }}>Checkout</h1>
      <div className="checkout-grid">
        <div>
          <div
            style={{
              background: 'var(--surface)',
              padding: '2rem',
              borderRadius: '24px',
              border: '1px solid var(--border)',
            }}
          >
            <h3
              style={{
                fontSize: '1.1rem',
                marginBottom: '1.5rem',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MapPin size={20} /> Delivery Address
              </div>
              <button
                type="button"
                onClick={handleGetLocation}
                disabled={isLocating}
                className="btn btn-outline"
                style={{
                  padding: '0.4rem 0.8rem',
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                {isLocating ? <Loader2 size={16} /> : <Navigation size={16} />}
                {isLocating ? 'Locating...' : 'Use GPS'}
              </button>
            </h3>

            {address.formatted_address && (
              <div
                style={{
                  fontSize: '0.8rem',
                  color: 'var(--text-secondary)',
                  background: 'rgba(245,158,11,0.08)',
                  border: '1px solid rgba(245,158,11,0.2)',
                  borderRadius: '10px',
                  padding: '0.6rem 0.75rem',
                  marginBottom: '1rem',
                }}
              >
                GPS match: {address.formatted_address}
              </div>
            )}

            <form id="checkout-form" onSubmit={handleCheckout} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              {[
                ['House No / Flat (optional)', 'house_no', 'text', false],
                ['Street Address', 'street_address', 'text', true],
                ['City', 'city', 'text', true],
                ['State', 'state', 'text', true],
              ].map(([label, key, type, required]) => (
                <div key={key}>
                  <label
                    style={{
                      display: 'block',
                      marginBottom: '0.4rem',
                      fontSize: '0.85rem',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    {label}
                  </label>
                  <input
                    type={type}
                    required={required}
                    value={address[key]}
                    onChange={(e) => updateAddressField(key, e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: '10px',
                      background: 'var(--bg-color)',
                      border: '1px solid var(--border)',
                      color: 'white',
                      outline: 'none',
                    }}
                  />
                </div>
              ))}

              <div>
                <label
                  style={{
                    display: 'block',
                    marginBottom: '0.4rem',
                    fontSize: '0.85rem',
                    color: 'var(--text-secondary)',
                  }}
                >
                  Pincode
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={address.pincode}
                  onChange={(e) => handlePincodeChange(e.target.value)}
                  placeholder="e.g. 400001"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '10px',
                    background: 'var(--bg-color)',
                    border: `1px solid ${pincodeWarning ? '#ef4444' : 'var(--border)'}`,
                    color: 'white',
                    outline: 'none',
                  }}
                />
                {pincodeWarning && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      marginTop: '0.5rem',
                      color: '#ef4444',
                      fontSize: '0.85rem',
                    }}
                  >
                    <AlertCircle size={14} /> {pincodeWarning}
                  </div>
                )}
              </div>
            </form>
          </div>
        </div>

        <div>
          <div
            style={{
              background: 'var(--surface)',
              padding: '2rem',
              borderRadius: '24px',
              border: '1px solid var(--border)',
              position: 'sticky',
              top: '100px',
            }}
          >
            <h3
              style={{
                fontSize: '1.2rem',
                marginBottom: '1.5rem',
                borderBottom: '1px solid var(--border)',
                paddingBottom: '1rem',
              }}
            >
              Order Summary
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
              {items.map((item) => (
                <div key={item.product.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>
                    {item.product.name} x {item.quantity}
                  </span>
                  <span>Rs {(item.product.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '1rem 0',
                borderTop: '1px solid var(--border)',
                fontSize: '1.2rem',
                fontWeight: 700,
                marginBottom: '1.5rem',
              }}
            >
              <span>Total</span>
              <span style={{ color: 'var(--primary)' }}>Rs {getCartTotal().toFixed(2)}</span>
            </div>

            <button
              type="submit"
              form="checkout-form"
              disabled={isProcessing || !!pincodeWarning}
              className="btn btn-primary"
              style={{
                width: '100%',
                justifyContent: 'center',
                padding: '1rem',
                fontSize: '1rem',
                opacity: isProcessing || !!pincodeWarning ? 0.6 : 1,
              }}
            >
              {isProcessing ? (
                'Processing Payment...'
              ) : (
                <>
                  <CreditCard size={20} /> Pay Rs {getCartTotal().toFixed(2)} via Razorpay
                </>
              )}
            </button>

            <p style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Secured by Razorpay
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
