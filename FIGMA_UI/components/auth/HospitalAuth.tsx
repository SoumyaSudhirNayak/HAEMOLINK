import { useState } from 'react';
import { Heart, ArrowLeft, Mail, Building2, Upload, AlertCircle, Shield, Eye, EyeOff, CheckCircle, XCircle } from 'lucide-react';

interface HospitalAuthProps {
  onBackToRoles: () => void;
  onAuthSuccess: (userData: any) => void;
}

export function HospitalAuth({ onBackToRoles, onAuthSuccess }: HospitalAuthProps) {
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
    hospitalName: '',
    orgType: '',
    registrationNumber: '',
    licenseNumber: '',
    officialEmail: '',
    officialPhone: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    adminName: '',
    adminPhone: '',
    adminEmail: '',
    licenseUpload: null as File | null,
    certificationUpload: null as File | null,
    inventorySync: true,
    offlineSupport: false,
    consentLegal: false,
    consentCompliance: false,
  });

  const passwordValidation = {
    minLength: authData.password.length >= 8,
    hasUppercase: /[A-Z]/.test(authData.password),
    hasNumber: /[0-9]/.test(authData.password),
  };
  const isPasswordValid = passwordValidation.minLength && passwordValidation.hasUppercase && passwordValidation.hasNumber;
  const passwordsMatch = authData.password === authData.confirmPassword && authData.confirmPassword !== '';

  const handleLogin = async () => {
    setLoading(true);
    try {
      const { signInWithEmail, getSessionAndRole } = await import('../../services/auth');
      await signInWithEmail('hospital', authData.email, authData.password);
      const { role } = await getSessionAndRole();
      onAuthSuccess({ role: role || 'hospital', email: authData.email });
      setErrorMessage(null);
    } catch (err: any) {
      const message = err && typeof err.message === 'string' ? err.message : '';
      console.log('Hospital login error:', message || err);
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
      await signUpWithEmail('hospital', authData.email, authData.password);
      setErrorMessage(null);
      setStep('details');
    } catch (err: any) {
      const message = err && typeof err.message === 'string' ? err.message : '';
      console.log('Hospital signup error:', message || err);
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
      await upsertProfile('hospital', {
        organization_name: formData.hospitalName,
        license_number: formData.licenseNumber,
        verification_status: 'pending',
        address: `${formData.address}, ${formData.city}, ${formData.state}, ${formData.pincode}`,
        admin_contact: `${formData.adminName} ${formData.adminPhone}`,
        latitude: latitude,
        longitude: longitude,
      });
      onAuthSuccess({ role: 'hospital', email: authData.email });
    } finally {
      setLoading(false);
    }
  };

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
                const state = j?.state || '';
                const postcode = j?.postcode || '';
                setFormData((prev) => ({
                  ...prev,
                  city: city || prev.city,
                  state: state || prev.state,
                  pincode: postcode || prev.pincode,
                }));
                if (city || state || postcode) {
                  setLocationStatus(`Detected ${city || 'Unknown city'}${state ? `, ${state}` : ''}${postcode ? ` • ${postcode}` : ''}`);
                }
              }
            } catch {}
          }
          setErrorMessage(null);
        } catch (error) {
          console.error('Geolocation processing error:', error);
          setErrorMessage('Unable to detect location. Please enter your city/state/pincode manually.');
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

  const orgTypes = ['Government Hospital', 'Private Hospital', 'Blood Bank', 'Diagnostic Center'];

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
              <div className="w-16 h-16 bg-violet-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Building2 className="w-8 h-8 text-violet-600" />
              </div>
              <h2 className="text-2xl md:text-3xl text-gray-900 mb-2">Hospital / Blood Bank Login</h2>
              <p className="text-gray-600">Enter your institutional credentials</p>
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
                  placeholder="contact@hospital.com"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent"
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
                    className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent"
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
                  className="text-violet-600 hover:text-violet-700 text-sm"
                >
                  Forgot Password?
                </button>
              </div>

              <button
                type="submit"
                disabled={!authData.email || !authData.password || loading}
                className="w-full py-3 min-h-[48px] bg-gradient-to-r from-violet-500 to-violet-600 text-white rounded-xl hover:from-violet-600 hover:to-violet-700 transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Logging in...' : 'Log In'}
              </button>
            </form>

            <div className="text-center mt-6">
              <p className="text-gray-600">
                New institution?{' '}
                <button
                  onClick={() => {
                    setMode('signup');
                    setAuthData({ email: '', password: '', confirmPassword: '' });
                    setErrorMessage(null);
                  }}
                  className="text-violet-600 hover:text-violet-700"
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
              <div className="w-16 h-16 bg-violet-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-violet-600" />
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
                    placeholder="contact@hospital.com"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  />
                </div>

                <button
                  type="submit"
                  disabled={!authData.email || loading}
                  className="w-full py-3 min-h-[48px] bg-gradient-to-r from-violet-500 to-violet-600 text-white rounded-xl hover:from-violet-600 hover:to-violet-700 transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
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
                className="text-violet-600 hover:text-violet-700"
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
              <div className="w-16 h-16 bg-violet-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Building2 className="w-8 h-8 text-violet-600" />
              </div>
              <h2 className="text-2xl md:text-3xl text-gray-900 mb-2">Hospital / Blood Bank Sign Up</h2>
              <p className="text-gray-600">Register your institution</p>
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
                  placeholder="contact@hospital.com"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent"
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
                    className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent"
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
                    className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent"
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
                className="w-full py-3 min-h-[48px] bg-gradient-to-r from-violet-500 to-violet-600 text-white rounded-xl hover:from-violet-600 hover:to-violet-700 transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Processing...' : 'Continue'}
              </button>
            </form>

            <div className="text-center mt-6">
              <p className="text-gray-600">
                Already registered?{' '}
                <button
                  onClick={() => {
                    setMode('login');
                    setAuthData({ email: '', password: '', confirmPassword: '' });
                    setErrorMessage(null);
                  }}
                  className="text-violet-600 hover:text-violet-700"
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
              <div className="w-16 h-16 bg-violet-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-violet-600" />
              </div>
              <h2 className="text-2xl md:text-3xl text-gray-900 mb-2">Institution Details</h2>
              <p className="text-gray-600">Complete your registration</p>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
              <div className="flex gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-yellow-800 mb-1">Admin Approval Required</p>
                  <p className="text-xs text-yellow-700">
                    Your application will be reviewed. You'll be notified once approved.
                  </p>
                </div>
              </div>
            </div>

            <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleCompleteSignup(); }}>
              <div>
                <label className="block text-gray-700 mb-2">Hospital/Blood Bank Name *</label>
                <input
                  type="text"
                  required
                  value={formData.hospitalName}
                  onChange={(e) => setFormData({ ...formData, hospitalName: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  placeholder="City General Hospital"
                />
              </div>

              <div>
                <label className="block text-gray-700 mb-2">Organization Type *</label>
                <select
                  required
                  value={formData.orgType}
                  onChange={(e) => setFormData({ ...formData, orgType: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                >
                  <option value="">Select</option>
                  {orgTypes.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 mb-2">Registration Number *</label>
                  <input
                    type="text"
                    required
                    value={formData.registrationNumber}
                    onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    placeholder="REG-12345"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 mb-2">License Number *</label>
                  <input
                    type="text"
                    required
                    value={formData.licenseNumber}
                    onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    placeholder="NABH/2020/12345"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 mb-2">Official Email *</label>
                  <input
                    type="email"
                    required
                    value={formData.officialEmail}
                    onChange={(e) => setFormData({ ...formData, officialEmail: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    placeholder="contact@hospital.com"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 mb-2">Official Phone *</label>
                  <input
                    type="tel"
                    required
                    value={formData.officialPhone}
                    onChange={(e) => setFormData({ ...formData, officialPhone: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    placeholder="+91 80 1234 5678"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-700 mb-2">Address *</label>
                <textarea
                  required
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  rows={2}
                  placeholder="Full institutional address"
                />
              </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleUseLocation}
              disabled={loading}
              className="text-sm font-medium text-violet-600 hover:text-violet-700 disabled:opacity-50"
            >
              Use my location
            </button>
          </div>
          {locationStatus && (
            <div className="mt-2 text-violet-700 text-sm">{locationStatus}</div>
          )}

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-gray-700 mb-2">City *</label>
                  <input
                    type="text"
                    required
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    placeholder="Mumbai"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 mb-2">State *</label>
                  <input
                    type="text"
                    required
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    placeholder="Maharashtra"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 mb-2">Pincode *</label>
                  <input
                    type="text"
                    required
                    value={formData.pincode}
                    onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    placeholder="400001"
                  />
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="text-gray-900 mb-4">Admin Contact Person</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-gray-700 mb-2">Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.adminName}
                      onChange={(e) => setFormData({ ...formData, adminName: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                      placeholder="Dr. Sarah Williams"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-700 mb-2">Phone *</label>
                      <input
                        type="tel"
                        required
                        value={formData.adminPhone}
                        onChange={(e) => setFormData({ ...formData, adminPhone: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                        placeholder="+91 98765 43210"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-700 mb-2">Email *</label>
                      <input
                        type="email"
                        required
                        value={formData.adminEmail}
                        onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                        placeholder="admin@hospital.com"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-gray-700 mb-2">License Document * (PDF/Image)</label>
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
                  <label htmlFor="license-upload" className="text-violet-600 hover:text-violet-700 cursor-pointer">
                    {formData.licenseUpload ? formData.licenseUpload.name : 'Click to upload license'}
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-gray-700 mb-2">Certification (Optional)</label>
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center">
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => setFormData({ ...formData, certificationUpload: e.target.files?.[0] || null })}
                    className="hidden"
                    id="cert-upload"
                  />
                  <label htmlFor="cert-upload" className="text-violet-600 hover:text-violet-700 cursor-pointer">
                    {formData.certificationUpload ? formData.certificationUpload.name : 'Click to upload certification'}
                  </label>
                </div>
              </div>

              <div className="bg-violet-50 rounded-xl p-4 space-y-3">
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={formData.inventorySync}
                    onChange={(e) => setFormData({ ...formData, inventorySync: e.target.checked })}
                    className="mt-1 w-4 h-4 text-violet-600 rounded focus:ring-2 focus:ring-violet-500"
                  />
                  <div>
                    <div className="text-gray-900">Real-time Inventory Sync</div>
                    <div className="text-sm text-gray-600">Enable automatic inventory updates</div>
                  </div>
                </label>
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={formData.offlineSupport}
                    onChange={(e) => setFormData({ ...formData, offlineSupport: e.target.checked })}
                    className="mt-1 w-4 h-4 text-violet-600 rounded focus:ring-2 focus:ring-violet-500"
                  />
                  <div>
                    <div className="text-gray-900">Offline Mode Support</div>
                    <div className="text-sm text-gray-600">Work during internet outages</div>
                  </div>
                </label>
              </div>

              <div className="border-t pt-4 space-y-3">
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    required
                    checked={formData.consentLegal}
                    onChange={(e) => setFormData({ ...formData, consentLegal: e.target.checked })}
                    className="mt-1 w-4 h-4 text-violet-600 rounded focus:ring-2 focus:ring-violet-500"
                  />
                  <span className="text-sm text-gray-700">
                    I confirm that all information provided is accurate and I have the legal authority to register this institution *
                  </span>
                </label>
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    required
                    checked={formData.consentCompliance}
                    onChange={(e) => setFormData({ ...formData, consentCompliance: e.target.checked })}
                    className="mt-1 w-4 h-4 text-violet-600 rounded focus:ring-2 focus:ring-violet-500"
                  />
                  <span className="text-sm text-gray-700">
                    I agree to comply with all regulatory requirements and HAEMOLINK platform policies *
                  </span>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading || !formData.consentLegal || !formData.consentCompliance}
                className="w-full py-3 min-h-[48px] bg-gradient-to-r from-violet-500 to-violet-600 text-white rounded-xl hover:from-violet-600 hover:to-violet-700 transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
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
