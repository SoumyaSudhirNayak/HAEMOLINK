import { useState } from 'react';
import { Heart, ArrowLeft, Mail, User, Truck, Upload, AlertCircle, Eye, EyeOff, CheckCircle, XCircle } from 'lucide-react';

interface RiderAuthProps {
  onBackToRoles: () => void;
  onAuthSuccess: (userData: any) => void;
}

export function RiderAuth({ onBackToRoles, onAuthSuccess }: RiderAuthProps) {
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [step, setStep] = useState<'auth' | 'details'>('auth');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [locationStatus, setLocationStatus] = useState<string | null>(null);

  const [authData, setAuthData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    dob: '',
    address: '',
    city: '',
    vehicleType: '',
    vehicleNumber: '',
    licenseNumber: '',
    licenseUpload: null as File | null,
    govtIdUpload: null as File | null,
    policeVerification: null as File | null,
    vaccinationStatus: false,
    availability: 'full-time',
    consentColdChain: false,
  });

  const passwordValidation = {
    minLength: authData.password.length >= 8,
    hasUppercase: /[A-Z]/.test(authData.password),
    hasNumber: /[0-9]/.test(authData.password),
  };
  const isPasswordValid = passwordValidation.minLength && passwordValidation.hasUppercase && passwordValidation.hasNumber;
  const passwordsMatch = authData.password === authData.confirmPassword && authData.confirmPassword !== '';

  const handleUseLocation = () => {
    if (!navigator.geolocation) {
      setErrorMessage('Location is not supported on this device.');
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude: lat, longitude: lng } = position.coords;
          setLatitude(typeof lat === 'number' ? lat : null);
          setLongitude(typeof lng === 'number' ? lng : null);
          if (typeof lat === 'number' && typeof lng === 'number') {
            try {
              const resp = await fetch(`/geo/reverse?lat=${lat}&lon=${lng}&format=jsonv2&addressdetails=1&zoom=10`);
              if (resp.ok) {
                const j = await resp.json();
                const city = j?.city || '';
                setFormData((prev) => ({
                  ...prev,
                  city: city || prev.city,
                }));
                if (city) {
                  setLocationStatus(`Detected ${city}`);
                }
              }
            } catch {}
          }
          setErrorMessage(null);
        } catch (error) {
          console.error('Geolocation processing error:', error);
          setErrorMessage('Unable to detect location. Please enter your city manually.');
        } finally {
          setLoading(false);
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        if (error.code === 1) {
          setErrorMessage(
            'Location access denied. Please enter your details manually.'
          );
        } else {
          setErrorMessage(
            'Unable to access location. Please try again or enter manually.'
          );
        }
        setLoading(false);
      }
    );
  };

  const handleLogin = async () => {
    setLoading(true);
    try {
      const { signInWithEmail, getSessionAndRole } = await import('../../services/auth');
      await signInWithEmail('rider', authData.email, authData.password);
      const { role } = await getSessionAndRole();
      onAuthSuccess({ role: role || 'rider', email: authData.email });
      setErrorMessage(null);
    } catch (err: any) {
      const message = err && typeof err.message === 'string' ? err.message : '';
      console.log('Rider login error:', message || err);
      if (message === 'ROLE_MISMATCH') {
        setErrorMessage('This email is not registered for this role.');
      } else {
        setErrorMessage('Invalid email or password. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignupAuth = async () => {
    if (!isPasswordValid || !passwordsMatch) return;
    setLoading(true);
    try {
      const { signUpWithEmail } = await import('../../services/auth');
      await signUpWithEmail('rider', authData.email, authData.password);
      setErrorMessage(null);
      setStep('details');
    } catch (err: any) {
      const message = err && typeof err.message === 'string' ? err.message : '';
      console.log('Rider signup error:', message || err);
      if (message === 'ACCOUNT_EXISTS') {
        setErrorMessage('Account already exists. Please log in.');
        setMode('login');
        setStep('auth');
      } else {
        setErrorMessage('Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteSignup = async () => {
    setLoading(true);
    try {
      const { upsertProfile } = await import('../../services/auth');
      await upsertProfile('rider', {
        full_name: formData.fullName,
        phone: formData.phone,
        vehicle_number: formData.vehicleNumber,
        vehicle_type: formData.vehicleType,
        license_number: formData.licenseNumber,
        verification_status: 'pending',
        availability_status: formData.availability,
        latitude: latitude,
        longitude: longitude,
      });
      onAuthSuccess({ role: 'rider', email: authData.email });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setLoading(true);
    try {
      const { resetPassword } = await import('../../services/auth');
      await resetPassword(authData.email);
      setResetSent(true);
      setErrorMessage(null);
    } finally {
      setLoading(false);
    }
  };

  const vehicleTypes = ['Two-Wheeler', 'Four-Wheeler', 'Both'];
  const availabilityOptions = [
    { value: 'full-time', label: 'Full Time' },
    { value: 'part-time', label: 'Part Time' },
    { value: 'weekends', label: 'Weekends Only' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted to-background text-foreground">
      <header className="bg-background/95 backdrop-blur-sm border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={onBackToRoles}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="hidden sm:inline">Back to Roles</span>
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg">
                <Heart className="w-6 h-6 text-white" fill="white" />
              </div>
              <span className="text-xl text-foreground">HAEMOLINK</span>
            </div>
            <div className="w-24 sm:w-32"></div>
          </div>
        </div>
      </header>

      <div className="max-w-md mx-auto px-4 sm:px-6 py-8 md:py-12">
        {/* LOGIN */}
        {mode === 'login' && step === 'auth' && (
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6 md:p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Truck className="w-8 h-8 text-orange-600" />
              </div>
              <h2 className="text-2xl md:text-3xl text-gray-900 mb-2">Delivery Agent Login</h2>
              <p className="text-gray-600">Enter your details to access your dashboard</p>
            </div>

            {errorMessage && (
              <div className="mb-4 flex items-center gap-2 text-sm text-red-600">
                <AlertCircle className="w-4 h-4" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleLogin(); }}>
              <div>
                <label className="block text-gray-700 mb-2">Email Address</label>
                <input
                  type="email"
                  required
                  value={authData.email}
                  onChange={(e) => setAuthData({ ...authData, email: e.target.value })}
                  placeholder="rider@example.com"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-gray-700 mb-2">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={authData.password}
                    onChange={(e) => setAuthData({ ...authData, password: e.target.value })}
                    placeholder="Enter your password"
                    className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="text-right">
                <button
                  type="button"
                  onClick={() => setMode('forgot')}
                  className="text-orange-600 hover:text-orange-700 text-sm"
                >
                  Forgot Password?
                </button>
              </div>

              <button
                type="submit"
                disabled={!authData.email || !authData.password || loading}
                className="w-full py-3 min-h-[48px] bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl hover:from-orange-600 hover:to-orange-700 transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Logging in...' : 'Log In'}
              </button>
            </form>

            <div className="text-center mt-6">
              <p className="text-gray-600">
                New user?{' '}
                <button
                  onClick={() => {
                    setMode('signup');
                    setAuthData({ email: '', password: '', confirmPassword: '' });
                    setErrorMessage(null);
                  }}
                  className="text-orange-600 hover:text-orange-700"
                >
                  Sign Up
                </button>
              </p>
            </div>
          </div>
        )}

        {/* FORGOT PASSWORD */}
        {mode === 'forgot' && (
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6 md:p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-orange-600" />
              </div>
              <h2 className="text-2xl md:text-3xl text-gray-900 mb-2">Reset Password</h2>
              <p className="text-gray-600">Enter your email to receive a password reset link</p>
            </div>

            {!resetSent ? (
              <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleForgotPassword(); }}>
                <div>
                  <label className="block text-gray-700 mb-2">Email Address</label>
                  <input
                    type="email"
                    required
                    value={authData.email}
                    onChange={(e) => setAuthData({ ...authData, email: e.target.value })}
                    placeholder="rider@example.com"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>

                <button
                  type="submit"
                  disabled={!authData.email || loading}
                  className="w-full py-3 min-h-[48px] bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl hover:from-orange-600 hover:to-orange-700 transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </form>
            ) : (
              <div className="text-center py-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <p className="text-gray-700 mb-2">Password reset link has been sent to your email address.</p>
                <p className="text-gray-500 text-sm">Please check your inbox and follow the instructions.</p>
              </div>
            )}

            <div className="text-center mt-6">
              <button
                onClick={() => {
                  setMode('login');
                  setResetSent(false);
                  setAuthData({ email: '', password: '', confirmPassword: '' });
                }}
                className="text-orange-600 hover:text-orange-700"
              >
                ← Back to Login
              </button>
            </div>
          </div>
        )}

        {/* SIGN UP - AUTH */}
        {mode === 'signup' && step === 'auth' && (
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6 md:p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Truck className="w-8 h-8 text-orange-600" />
              </div>
              <h2 className="text-2xl md:text-3xl text-gray-900 mb-2">Delivery Agent Sign Up</h2>
              <p className="text-gray-600">Create your delivery agent account</p>
            </div>

            {errorMessage && (
              <div className="mb-4 flex items-center gap-2 text-sm text-red-600">
                <AlertCircle className="w-4 h-4" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleSignupAuth(); }}>
              <div>
                <label className="block text-gray-700 mb-2">Email Address *</label>
                <input
                  type="email"
                  required
                  value={authData.email}
                  onChange={(e) => setAuthData({ ...authData, email: e.target.value })}
                  placeholder="rider@example.com"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-gray-700 mb-2">Password *</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={authData.password}
                    onChange={(e) => setAuthData({ ...authData, password: e.target.value })}
                    placeholder="Create a strong password"
                    className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                
                {authData.password && (
                  <div className="mt-2 space-y-1">
                    <div className={`flex items-center gap-2 text-sm ${passwordValidation.minLength ? 'text-green-600' : 'text-gray-500'}`}>
                      {passwordValidation.minLength ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                      Minimum 8 characters
                    </div>
                    <div className={`flex items-center gap-2 text-sm ${passwordValidation.hasUppercase ? 'text-green-600' : 'text-gray-500'}`}>
                      {passwordValidation.hasUppercase ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                      At least 1 uppercase letter
                    </div>
                    <div className={`flex items-center gap-2 text-sm ${passwordValidation.hasNumber ? 'text-green-600' : 'text-gray-500'}`}>
                      {passwordValidation.hasNumber ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                      At least 1 number
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-gray-700 mb-2">Confirm Password *</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={authData.confirmPassword}
                    onChange={(e) => setAuthData({ ...authData, confirmPassword: e.target.value })}
                    placeholder="Re-enter your password"
                    className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {authData.confirmPassword && !passwordsMatch && (
                  <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                    <XCircle className="w-4 h-4" />
                    Passwords do not match
                  </p>
                )}
                {passwordsMatch && (
                  <p className="mt-2 text-sm text-green-600 flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" />
                    Passwords match
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={!authData.email || !isPasswordValid || !passwordsMatch || loading}
                className="w-full py-3 min-h-[48px] bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl hover:from-orange-600 hover:to-orange-700 transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Processing...' : 'Continue'}
              </button>
            </form>

            <div className="text-center mt-6">
              <p className="text-gray-600">
                Already have an account?{' '}
                <button
                  onClick={() => {
                    setMode('login');
                    setAuthData({ email: '', password: '', confirmPassword: '' });
                    setErrorMessage(null);
                  }}
                  className="text-orange-600 hover:text-orange-700"
                >
                  Login
                </button>
              </p>
            </div>
          </div>
        )}

        {/* SIGN UP - DETAILS (UNCHANGED FIELDS) */}
        {step === 'details' && mode === 'signup' && (
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6 md:p-8 max-h-[80vh] overflow-y-auto">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <User className="w-8 h-8 text-orange-600" />
              </div>
              <h2 className="text-2xl md:text-3xl text-gray-900 mb-2">Complete Your Profile</h2>
              <p className="text-gray-600">Vehicle and document details</p>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
              <div className="flex gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-yellow-800 mb-1">Admin Approval Required</p>
                  <p className="text-xs text-yellow-700">
                    Your application will be reviewed by our team. You'll receive an email once approved.
                  </p>
                </div>
              </div>
            </div>

            <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleCompleteSignup(); }}>
              <div>
                <label className="block text-gray-700 mb-2">Full Name *</label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Rajesh Kumar"
                />
              </div>

              <div>
                <label className="block text-gray-700 mb-2">Phone Number *</label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="+91 98765 43210"
                />
              </div>

              <div>
                <label className="block text-gray-700 mb-2">Date of Birth *</label>
                <input
                  type="date"
                  required
                  value={formData.dob}
                  onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-gray-700 mb-2">Address *</label>
                <textarea
                  required
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  rows={2}
                  placeholder="Full residential address"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleUseLocation}
                  disabled={loading}
                  className="text-sm font-medium text-orange-600 hover:text-orange-700 disabled:opacity-50"
                >
                  Use my location
                </button>
              </div>
              {locationStatus && (
                <div className="mt-2 text-orange-700 text-sm">{locationStatus}</div>
              )}

              <div>
                <label className="block text-gray-700 mb-2">City *</label>
                <input
                  type="text"
                  required
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Bangalore"
                />
              </div>

              <div>
                <label className="block text-gray-700 mb-2">Vehicle Type *</label>
                <select
                  required
                  value={formData.vehicleType}
                  onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="">Select</option>
                  {vehicleTypes.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-700 mb-2">Vehicle Number *</label>
                <input
                  type="text"
                  required
                  value={formData.vehicleNumber}
                  onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="KA 01 AB 1234"
                />
              </div>

              <div>
                <label className="block text-gray-700 mb-2">Driving License Number *</label>
                <input
                  type="text"
                  required
                  value={formData.licenseNumber}
                  onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="DL-1234567890"
                />
              </div>

              <div>
                <label className="block text-gray-700 mb-2">License Upload * (PDF/Image)</label>
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center">
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <input
                    type="file"
                    required
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => setFormData({ ...formData, licenseUpload: e.target.files?.[0] || null })}
                    className="hidden"
                    id="license-upload"
                  />
                  <label htmlFor="license-upload" className="text-orange-600 hover:text-orange-700 cursor-pointer">
                    {formData.licenseUpload ? formData.licenseUpload.name : 'Click to upload license'}
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-gray-700 mb-2">Government ID * (PDF/Image)</label>
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center">
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <input
                    type="file"
                    required
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => setFormData({ ...formData, govtIdUpload: e.target.files?.[0] || null })}
                    className="hidden"
                    id="govt-id-upload"
                  />
                  <label htmlFor="govt-id-upload" className="text-orange-600 hover:text-orange-700 cursor-pointer">
                    {formData.govtIdUpload ? formData.govtIdUpload.name : 'Click to upload ID'}
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-gray-700 mb-2">Police Verification (Optional)</label>
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center">
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => setFormData({ ...formData, policeVerification: e.target.files?.[0] || null })}
                    className="hidden"
                    id="police-upload"
                  />
                  <label htmlFor="police-upload" className="text-orange-600 hover:text-orange-700 cursor-pointer">
                    {formData.policeVerification ? formData.policeVerification.name : 'Click to upload'}
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-gray-700 mb-2">Availability *</label>
                <select
                  required
                  value={formData.availability}
                  onChange={(e) => setFormData({ ...formData, availability: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  {availabilityOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <label className="flex items-start gap-3 bg-orange-50 rounded-xl p-4">
                <input
                  type="checkbox"
                  checked={formData.vaccinationStatus}
                  onChange={(e) => setFormData({ ...formData, vaccinationStatus: e.target.checked })}
                  className="mt-1 w-4 h-4 text-orange-600 rounded focus:ring-2 focus:ring-orange-500"
                />
                <div>
                  <div className="text-gray-900">COVID-19 Vaccination</div>
                  <div className="text-sm text-gray-600">I am fully vaccinated against COVID-19</div>
                </div>
              </label>

              <div className="border-t pt-4">
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    required
                    checked={formData.consentColdChain}
                    onChange={(e) => setFormData({ ...formData, consentColdChain: e.target.checked })}
                    className="mt-1 w-4 h-4 text-orange-600 rounded focus:ring-2 focus:ring-orange-500"
                  />
                  <span className="text-sm text-gray-700">
                    I understand and agree to maintain cold chain protocols for blood transportation *
                  </span>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading || !formData.consentColdChain}
                className="w-full py-3 min-h-[48px] bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl hover:from-orange-600 hover:to-orange-700 transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Submitting Application...' : 'Submit Application'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
