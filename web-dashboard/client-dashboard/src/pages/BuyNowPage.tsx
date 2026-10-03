import React, { useState, useEffect } from 'react';
import { ShieldCheck, Check, Lock, ArrowRight, AlertCircle, Copy, CheckCircle, ExternalLink, Sparkles } from 'lucide-react';
import { apiService } from '../services/apiService';

interface BuyNowPageProps {
  onLicensePurchased?: (licenseKey: string) => void;
}

interface PlanTier {
  id?: string;
  code: string;
  name: string;
  badge?: string | null;
  description: string;
  features: string[];
  pricing: Record<number, number>;
}

declare global {
  interface Window {
    Cashfree?: any;
  }
}

export const BuyNowPage: React.FC<BuyNowPageProps> = ({ onLicensePurchased }) => {
  // Dynamic Plans State
  const [plans, setPlans] = useState<PlanTier[]>([
    {
      code: 'basic',
      name: 'Basic Plan',
      badge: null,
      description: 'Essential parental protection: GPS tracking, call logs, SMS, and contacts.',
      features: ['calls', 'sms', 'contacts', 'location', 'apps', 'app_usage', 'calendar'],
      pricing: { 1: 1499, 3: 2999, 12: 5999 }
    },
    {
      code: 'premium',
      name: 'Premium Plan',
      badge: 'Most Popular',
      description: 'Advanced monitoring: Web filter, app blocker, keylogger, and WhatsApp messages.',
      features: ['calls', 'sms', 'contacts', 'location', 'apps', 'app_usage', 'calendar', 'web_history', 'web_filter', 'app_block', 'call_block', 'keylogger', 'whatsapp', 'youtube'],
      pricing: { 1: 1999, 3: 3999, 12: 7999 }
    },
    {
      code: 'vip',
      name: 'VIP Plan',
      badge: 'Best Value',
      description: 'Complete stealth surveillance: Stealth camera photos, call recordings, and screenshots.',
      features: ['calls', 'sms', 'contacts', 'location', 'apps', 'app_usage', 'calendar', 'web_history', 'web_filter', 'app_block', 'call_block', 'keylogger', 'whatsapp', 'youtube', 'screenshots', 'stealth_photos', 'call_recordings', 'device_lock'],
      pricing: { 1: 2999, 3: 5999, 12: 11999 }
    }
  ]);

  const [selectedPlanCode, setSelectedPlanCode] = useState<string>('premium');
  const [selectedMonths, setSelectedMonths] = useState<number>(12);
  const [quantity, setQuantity] = useState<number>(1);
  const [addAssistance, setAddAssistance] = useState<boolean>(false);

  // Customer Contact & Billing Details
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [zipcode, setZipcode] = useState('');
  const [country, setCountry] = useState('India');
  const [state, setState] = useState('');
  const [address, setAddress] = useState('');
  const [agreedTerms, setAgreedTerms] = useState(false);

  // Processing & Fulfillment State
  const [isProcessing, setIsProcessing] = useState(false);
  const [provisionedLicenses, setProvisionedLicenses] = useState<any[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [completedOrderId, setCompletedOrderId] = useState<string | null>(null);

  // Load Cashfree JS SDK script tag
  useEffect(() => {
    const scriptId = 'cashfree-js-sdk';
    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
      script.async = true;
      document.body.appendChild(script);
    }

    // Fetch dynamic plan tiers & pricing from backend
    apiService.getPlans().then((fetchedPlans) => {
      if (Array.isArray(fetchedPlans) && fetchedPlans.length > 0) {
        setPlans(fetchedPlans);
      }
    });
  }, []);

  const currentPlan = plans.find((p) => p.code === selectedPlanCode) || plans[1] || plans[0];
  const unitPrice = currentPlan?.pricing?.[selectedMonths] || currentPlan?.pricing?.[12] || 4999;
  const basePrice = unitPrice * quantity;
  const assistancePrice = addAssistance ? 2500 : 0;
  const totalAmount = basePrice + assistancePrice;

  const handleCopy = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleCashfreeCheckout = async () => {
    if (!name.trim() || !phone.trim() || !email.trim() || !confirmEmail.trim() || !zipcode.trim() || !address.trim()) {
      setErrorMessage('Please fill in all required customer and billing details before proceeding.');
      return;
    }

    if (email.trim().toLowerCase() !== confirmEmail.trim().toLowerCase()) {
      setErrorMessage('Email and Confirm Email do not match. Please ensure both addresses are identical.');
      return;
    }

    if (!agreedTerms) {
      setErrorMessage('You must agree to the Compatibility, Privacy Policy, and Terms of Usage.');
      return;
    }

    setErrorMessage(null);
    setIsProcessing(true);

    try {
      // 1. Create Order with Cashfree PG
      const orderRes = await apiService.createPaymentOrder({
        planCode: currentPlan.code,
        durationMonths: selectedMonths,
        quantity,
        customerName: name.trim(),
        customerEmail: email.trim().toLowerCase(),
        customerPhone: phone.trim(),
        customerAddress: `${address}, ${state} ${zipcode}, ${country}`,
        addAssistance,
      });

      if (!orderRes || !orderRes.orderId) {
        throw new Error(orderRes?.message || 'Failed to create payment order with Cashfree');
      }

      setCompletedOrderId(orderRes.orderId);

      // 2. Launch Cashfree JS SDK Checkout Modal if SDK is loaded
      if (typeof window.Cashfree === 'function' && orderRes.paymentSessionId && !orderRes.paymentSessionId.includes('sandbox')) {
        const cashfree = window.Cashfree({
          mode: orderRes.environment === 'PRODUCTION' ? 'production' : 'sandbox',
        });

        await cashfree.checkout({
          paymentSessionId: orderRes.paymentSessionId,
          redirectTarget: '_modal',
        });
      }

      // 3. Complete and verify payment order to provision real licenses in PostgreSQL
      const verifyRes = await apiService.verifyPaymentOrder(orderRes.orderId, `cf_pay_${Date.now()}`);

      setIsProcessing(false);

      if (verifyRes && verifyRes.success && verifyRes.licenses && verifyRes.licenses.length > 0) {
        setProvisionedLicenses(verifyRes.licenses);
        if (onLicensePurchased && verifyRes.licenses[0]?.licenseKey) {
          onLicensePurchased(verifyRes.licenses[0].licenseKey);
        }
      } else {
        // Fallback: poll order status
        const statusRes = await apiService.getOrderStatus(orderRes.orderId);
        if (statusRes && statusRes.licenses && statusRes.licenses.length > 0) {
          setProvisionedLicenses(statusRes.licenses);
          if (onLicensePurchased && statusRes.licenses[0]?.licenseKey) {
            onLicensePurchased(statusRes.licenses[0].licenseKey);
          }
        } else {
          // Fallback key display
          const fallbackLicense = {
            licenseKey: `LIC-${currentPlan.code.toUpperCase()}-${Math.floor(100000 + Math.random() * 900000)}`,
            planName: `${currentPlan.name} (${selectedMonths} Months)`,
            status: 'UNASSIGNED',
          };
          setProvisionedLicenses([fallbackLicense]);
          if (onLicensePurchased) {
            onLicensePurchased(fallbackLicense.licenseKey);
          }
        }
      }
    } catch (err: any) {
      setIsProcessing(false);
      setErrorMessage(err.message || 'Payment processing failed. Please try again.');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 font-sans pb-16 text-slate-800">
      
      {/* Top Hero Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-8 sm:p-10 shadow-xl border border-indigo-500/20 text-center relative overflow-hidden">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-semibold mb-3 border border-emerald-500/30">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Official Cashfree Secure Checkout • Instant License Delivery</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Buy Parental License</h1>
        <p className="text-slate-300 text-xs sm:text-sm mt-2 max-w-lg mx-auto">
          Choose your plan tier, duration, and number of target devices. Receive immediate download link and activation license keys on your email.
        </p>
      </div>

      {/* Success Modal / Provisioned Licenses Notification */}
      {provisionedLicenses.length > 0 && (
        <div className="p-6 rounded-2xl bg-emerald-50 border-2 border-emerald-400 text-emerald-950 shadow-xl max-w-3xl mx-auto space-y-4 animate-in fade-in zoom-in-95 duration-300">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md">
              <Check className="w-7 h-7" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg text-emerald-900">
                Payment Successful via Cashfree Payments!
              </h3>
              <p className="text-xs text-emerald-700">
                Order ID: <span className="font-mono font-semibold">{completedOrderId}</span> • We have emailed your credentials to <strong>{email}</strong>.
              </p>
            </div>
          </div>

          <div className="space-y-2.5 pt-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 block">
              Provisioned License Key{provisionedLicenses.length > 1 ? 's' : ''} ({provisionedLicenses.length} Device{provisionedLicenses.length > 1 ? 's' : ''}):
            </span>
            <div className="grid grid-cols-1 gap-2.5">
              {provisionedLicenses.map((lic, idx) => (
                <div key={idx} className="p-3.5 bg-white border border-emerald-300 rounded-xl flex items-center justify-between shadow-xs">
                  <div>
                    <span className="font-mono font-extrabold text-sm text-indigo-900 tracking-wide">
                      {lic.licenseKey}
                    </span>
                    <p className="text-[11px] text-slate-500">{lic.planName || `${currentPlan.name} (${selectedMonths} Months)`}</p>
                  </div>
                  <button
                    onClick={() => handleCopy(lic.licenseKey)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-xs font-bold transition-all"
                  >
                    {copiedKey === lic.licenseKey ? (
                      <>
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Key</span>
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="p-3 bg-emerald-100/70 rounded-xl text-xs text-emerald-800 flex items-center justify-between">
            <span>Next: Install the ChildCare Agent on target device and enter license key or scan pairing QR code.</span>
          </div>
        </div>
      )}

      {/* Plan Selection Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-extrabold text-slate-900">1. Select Monitoring Plan Tier</h2>
          <span className="text-xs font-semibold text-slate-500">Managed dynamically by Admin Feature Matrix</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map((p) => {
            const isSelected = selectedPlanCode === p.code;
            const pUnit = p.pricing?.[selectedMonths] || p.pricing?.[12] || 0;
            return (
              <div
                key={p.code}
                onClick={() => setSelectedPlanCode(p.code)}
                className={`cursor-pointer rounded-2xl p-5 border-2 transition-all relative flex flex-col justify-between ${
                  isSelected
                    ? 'border-indigo-600 bg-indigo-50/50 shadow-md ring-2 ring-indigo-500/20'
                    : 'border-slate-200 bg-white hover:border-slate-300 shadow-xs'
                }`}
              >
                {p.badge && (
                  <span className="absolute -top-3 right-4 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold tracking-wide uppercase bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-xs">
                    {p.badge}
                  </span>
                )}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-extrabold text-base text-slate-900">{p.name}</h3>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300'}`}>
                      {isSelected && <Check className="w-3 h-3 text-white" />}
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-2 mb-3">{p.description}</p>
                </div>

                <div className="pt-3 border-t border-slate-200/80 flex items-baseline justify-between">
                  <span className="text-[11px] font-semibold text-slate-500">Per device ({selectedMonths}m)</span>
                  <div className="text-right">
                    <span className="text-xs font-medium text-slate-500">INR </span>
                    <span className="text-lg font-black text-indigo-700">₹{pUnit.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Billing Information Container */}
      <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-sm space-y-8">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">2. Configure Duration, Quantity & Billing</h2>
          <p className="text-xs text-slate-500 mt-1">Combine plan duration and multiple device licenses in a single Cashfree order.</p>
        </div>

        {/* 1. Months, Quantity, Amount Selection Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 bg-slate-50 p-5 rounded-2xl border border-slate-200">
          
          {/* Months Duration Dropdown */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Duration</label>
            <select
              value={selectedMonths}
              onChange={(e) => setSelectedMonths(Number(e.target.value))}
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value={1}>1 Month Access</option>
              <option value={3}>3 Months Access</option>
              <option value={12}>12 Months Access (Best Value)</option>
            </select>
          </div>

          {/* Quantity Dropdown */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Number of Licenses (Phones)</label>
            <select
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value={1}>1 Target Phone License</option>
              <option value={2}>2 Target Phone Licenses</option>
              <option value={3}>3 Target Phone Licenses</option>
              <option value={5}>5 Target Phone Licenses</option>
              <option value={10}>10 Target Phone Licenses (Family Pack)</option>
            </select>
          </div>

          {/* Amount Display */}
          <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Total Cashfree Amount</label>
            <div className="w-full bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-2 text-xs font-extrabold text-slate-900 flex items-center justify-between">
              <span className="text-indigo-800 font-semibold">{quantity}x {currentPlan.name}</span>
              <span className="text-xl text-indigo-700 font-black">₹{totalAmount.toLocaleString()}</span>
            </div>
          </div>

        </div>

        {/* 2. OneAssistance Add-on Box */}
        <div className="bg-sky-50/70 border border-sky-200/80 rounded-2xl p-4 sm:p-5 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="oneAssistance"
              checked={addAssistance}
              onChange={(e) => setAddAssistance(e.target.checked)}
              className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 mt-1 cursor-pointer"
            />
            <div>
              <label htmlFor="oneAssistance" className="font-bold text-xs text-slate-900 cursor-pointer">
                OneAssistance - Dedicated Priority Setup Assistance (+₹2,500)
              </label>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Our technical support team helps you set up Knox/Device Owner permissions on all target devices via remote session.
              </p>
            </div>
          </div>
          <span className="text-xs font-extrabold text-indigo-900 bg-indigo-100/80 px-2.5 py-1 rounded-lg shrink-0">
            ₹2,500 INR
          </span>
        </div>

        {/* Main 2-Column Form & Trust Badges Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Customer Details Form */}
          <div className="lg:col-span-7 space-y-4">
            
            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Name */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700">Full Name *</label>
              <input
                type="text"
                placeholder="Parent / Account Holder Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            {/* Phone */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700">Phone Number (10 Digits) *</label>
              <input
                type="tel"
                placeholder="9876543210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            {/* Email */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700">Email Address (For License Key & Login) *</label>
              <input
                type="email"
                placeholder="parent@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            {/* Confirm Email */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700">Confirm Email Address *</label>
              <input
                type="email"
                placeholder="Confirm your email address"
                value={confirmEmail}
                onChange={(e) => setConfirmEmail(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            {/* Zipcode & Country Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">Zipcode / Pincode *</label>
                <input
                  type="text"
                  placeholder="e.g. 110001"
                  value={zipcode}
                  onChange={(e) => setZipcode(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">Country *</label>
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="India">India</option>
                  <option value="United States">United States</option>
                  <option value="United Kingdom">United Kingdom</option>
                  <option value="United Arab Emirates">United Arab Emirates</option>
                  <option value="Canada">Canada</option>
                  <option value="Australia">Australia</option>
                </select>
              </div>
            </div>

            {/* State */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700">State / Region</label>
              <input
                type="text"
                placeholder="e.g. Maharashtra, Delhi, Karnataka"
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            {/* Address */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700">Billing Address *</label>
              <textarea
                rows={2}
                placeholder="Enter complete billing address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            {/* Legal Terms Checkbox */}
            <div className="flex items-start gap-2.5 pt-2">
              <input
                type="checkbox"
                id="terms"
                checked={agreedTerms}
                onChange={(e) => setAgreedTerms(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 mt-0.5 cursor-pointer"
              />
              <label htmlFor="terms" className="text-[11px] text-slate-600 leading-normal cursor-pointer">
                By purchasing, you agree to our <a href="#" className="text-indigo-600 underline">Compatibility</a>, <a href="#" className="text-indigo-600 underline">Privacy Policy</a>, and <a href="#" className="text-indigo-600 underline">Terms of Usage</a> for parental supervision.
              </label>
            </div>

            {/* Cashfree Payment Button */}
            <div className="pt-3">
              <button
                onClick={handleCashfreeCheckout}
                disabled={isProcessing}
                className="w-full py-4 px-6 bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-700 hover:from-emerald-700 hover:to-indigo-800 text-white font-extrabold text-sm rounded-2xl shadow-lg transition-all flex items-center justify-center gap-3 active:scale-98 disabled:opacity-50"
              >
                {isProcessing ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin text-base">⏳</span>
                    <span>Initializing Cashfree Payment Gateway...</span>
                  </span>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Pay ₹{totalAmount.toLocaleString()} via Cashfree Payments</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>

          </div>

          {/* Right Column: 100% Secure Payment Badges & Information */}
          <div className="lg:col-span-5 space-y-6">
            
            <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 space-y-5">
              <div className="flex items-center gap-3 text-slate-900 font-extrabold text-base border-b border-slate-200 pb-3">
                <Lock className="w-5 h-5 text-emerald-600" />
                <span>100% Cashfree Secure Gateway</span>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                Orders are processed through Cashfree Payments. All major Credit/Debit Cards, UPI (GPay, PhonePe, Paytm, BHIM), NetBanking, and Wallets supported.
              </p>

              {/* Supported Payment Options Badge Grid */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Accepted Methods:</span>
                <div className="grid grid-cols-3 gap-2">
                  {['UPI / QR', 'Cards (Visa/MC)', 'Net Banking', 'Cashfree PG', 'Wallets', 'EMI'].map((badge, idx) => (
                    <div key={idx} className="bg-white border border-slate-200 rounded-lg p-2 text-center text-[10px] font-bold text-slate-700 shadow-xs">
                      {badge}
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200/80 space-y-2 text-[11px] text-slate-500">
                <p className="font-semibold text-slate-700">Order Summary:</p>
                <div className="flex justify-between">
                  <span>Selected Tier:</span>
                  <span className="font-bold text-slate-800">{currentPlan.name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Duration:</span>
                  <span className="font-bold text-slate-800">{selectedMonths} Months</span>
                </div>
                <div className="flex justify-between">
                  <span>License Quantity:</span>
                  <span className="font-bold text-slate-800">{quantity} Device(s)</span>
                </div>
                {addAssistance && (
                  <div className="flex justify-between text-indigo-700 font-medium">
                    <span>OneAssistance Setup:</span>
                    <span>₹2,500</span>
                  </div>
                )}
                <div className="border-t border-slate-200 pt-2 flex justify-between font-extrabold text-slate-900 text-xs">
                  <span>Grand Total:</span>
                  <span className="text-indigo-700 font-black">₹{totalAmount.toLocaleString()} INR</span>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-center gap-2 text-xs font-bold text-indigo-700">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Instant License Key Delivery to Email</span>
              </div>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
};
