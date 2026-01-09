import { useState } from 'react';
import { Heart, ArrowLeft, Mail, User, MapPin, Droplet, Calendar, AlertCircle, Eye, EyeOff, CheckCircle, XCircle } from 'lucide-react';

interface PatientAuthProps {
  onBackToRoles: () => void;
  onAuthSuccess: (userData: any) => void;
}

export function PatientAuth({ onBackToRoles, onAuthSuccess }: PatientAuthProps) {
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

  // Auth form data
  const [authData, setAuthData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  });

  // Signup form data
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    age: '',
    gender: '',
    bloodGroup: '',
    chronicCondition: false,
    thalassemia: false,
    emergencyContactName: '',
    emergencyContactPhone: '',
    city: '',
    state: '',
    pincode: '',
    consentMedical: false,
    consentPrivacy: false,
  });

  // Password validation
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
      await signInWithEmail('patient', authData.email, authData.password);
      const { role } = await getSessionAndRole();
      onAuthSuccess({ role: role || 'patient', email: authData.email });
      setErrorMessage(null);
    } catch (err: any) {
      const message = err && typeof err.message === 'string' ? err.message : '';
      console.log('Patient login error:', message || err);
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
      await signUpWithEmail('patient', authData.email, authData.password);
      setErrorMessage(null);
      setStep('details');
    } catch (err: any) {
      const message = err && typeof err.message === 'string' ? err.message : '';
      console.log('Patient signup error:', message || err);
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
      await upsertProfile('patient', {
        full_name: formData.fullName,
        phone: formData.phone,
        age: Number(formData.age) || null,
        gender: formData.gender,
        blood_group: formData.bloodGroup,
        chronic_conditions: formData.chronicCondition ? 'chronic' : null,
        thalassemia_flag: formData.thalassemia,
        emergency_contact: `${formData.emergencyContactName} ${formData.emergencyContactPhone}`,
        location: formData.city,
        latitude: latitude,
        longitude: longitude,
      });
      onAuthSuccess({ role: 'patient', email: authData.email });
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

  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  const genders = ['Male', 'Female', 'Other'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted to-background text-foreground">
      {/* Header */}
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

      {/* Content */}
      <div className="max-w-md mx-auto px-4 sm:px-6 py-8 md:py-12">
        {/* LOGIN SCREEN */}
        {mode === 'login' && step === 'auth' && (
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6 md:p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Heart className="w-8 h-8 text-blue-600" />
              </div>
              <h2 className="text-2xl md:text-3xl text-gray-900 mb-2">
                Patient Login
              </h2>
              <p className="text-gray-600">
                Enter your details to access your dashboard
              </p>
            </div>

            {errorMessage && (
              <div className="mb-4 flex items-center gap-2 text-sm text-red-600">
                <AlertCircle className="w-4 h-4" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleLogin(); }}>
              {/* Email */}
              <div>
                <label className="block text-gray-700 mb-2">Email Address</label>
                <input
                  type="email"
                  required
                  value={authData.email}
                  onChange={(e) => setAuthData({ ...authData, email: e.target.value })}
                  placeholder="patient@example.com"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-gray-700 mb-2">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={authData.password}
                    onChange={(e) => setAuthData({ ...authData, password: e.target.value })}
                    placeholder="Enter your password"
                    className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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

              {/* Forgot Password Link */}
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => setMode('forgot')}
                  className="text-blue-600 hover:text-blue-700 text-sm"
                >
                  Forgot Password?
                </button>
              </div>

              {/* Login Button */}
              <button
                type="submit"
                disabled={!authData.email || !authData.password || loading}
                className="w-full py-3 min-h-[48px] bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Logging in...' : 'Log In'}
              </button>
            </form>

            {/* Toggle to Sign Up */}
            <div className="text-center mt-6">
              <p className="text-gray-600">
                New user?{' '}
                <button
                  onClick={() => {
                    setMode('signup');
                    setAuthData({ email: '', password: '', confirmPassword: '' });
                    setErrorMessage(null);
                  }}
                  className="text-blue-600 hover:text-blue-700"
                >
                  Sign Up
                </button>
              </p>
            </div>
          </div>
        )}

        {/* FORGOT PASSWORD SCREEN */}
        {mode === 'forgot' && (
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6 md:p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-blue-600" />
              </div>
              <h2 className="text-2xl md:text-3xl text-gray-900 mb-2">
                Reset Password
              </h2>
              <p className="text-gray-600">
                Enter your email to receive a password reset link
              </p>
            </div>

            {!resetSent ? (
              <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleForgotPassword(); }}>
                {/* Email */}
                <div>
                  <label className="block text-gray-700 mb-2">Email Address</label>
                  <input
                    type="email"
                    required
                    value={authData.email}
                    onChange={(e) => setAuthData({ ...authData, email: e.target.value })}
                    placeholder="patient@example.com"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Send Reset Link Button */}
                <button
                  type="submit"
                  disabled={!authData.email || loading}
                  className="w-full py-3 min-h-[48px] bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
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

            {/* Back to Login */}
            <div className="text-center mt-6">
              <button
                onClick={() => {
                  setMode('login');
                  setResetSent(false);
                  setAuthData({ email: '', password: '', confirmPassword: '' });
                }}
                className="text-blue-600 hover:text-blue-700"
              >
                ← Back to Login
              </button>
            </div>
          </div>
        )}

        {/* SIGN UP - AUTH STEP */}
        {mode === 'signup' && step === 'auth' && (
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6 md:p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Heart className="w-8 h-8 text-blue-600" />
              </div>
              <h2 className="text-2xl md:text-3xl text-gray-900 mb-2">
                Patient Sign Up
              </h2>
              <p className="text-gray-600">
                Create your patient account
              </p>
            </div>

            {errorMessage && (
              <div className="mb-4 flex items-center gap-2 text-sm text-red-600">
                <AlertCircle className="w-4 h-4" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleSignupAuth(); }}>
              {/* Email */}
              <div>
                <label className="block text-gray-700 mb-2">Email Address *</label>
                <input
                  type="email"
                  required
                  value={authData.email}
                  onChange={(e) => setAuthData({ ...authData, email: e.target.value })}
                  placeholder="patient@example.com"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-gray-700 mb-2">Password *</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={authData.password}
                    onChange={(e) => setAuthData({ ...authData, password: e.target.value })}
                    placeholder="Create a strong password"
                    className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                
                {/* Password Requirements */}
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

              {/* Confirm Password */}
              <div>
                <label className="block text-gray-700 mb-2">Confirm Password *</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={authData.confirmPassword}
                    onChange={(e) => setAuthData({ ...authData, confirmPassword: e.target.value })}
                    placeholder="Re-enter your password"
                    className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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

              {/* Continue Button */}
              <button
                type="submit"
                disabled={!authData.email || !isPasswordValid || !passwordsMatch || loading}
                className="w-full py-3 min-h-[48px] bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Processing...' : 'Continue'}
              </button>
            </form>

            {/* Toggle to Login */}
            <div className="text-center mt-6">
              <p className="text-gray-600">
                Already have an account?{' '}
                <button
                  onClick={() => {
                    setMode('login');
                    setAuthData({ email: '', password: '', confirmPassword: '' });
                    setErrorMessage(null);
                  }}
                  className="text-blue-600 hover:text-blue-700"
                >
                  Login
                </button>
              </p>
            </div>
          </div>
        )}

        {/* SIGN UP - DETAILS STEP (UNCHANGED) */}
        {step === 'details' && mode === 'signup' && (
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6 md:p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <User className="w-8 h-8 text-blue-600" />
              </div>
              <h2 className="text-2xl md:text-3xl text-gray-900 mb-2">
                Complete Your Profile
              </h2>
              <p className="text-gray-600">
                Just a few more details to get started
              </p>
            </div>

            <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleCompleteSignup(); }}>
              {/* Full Name */}
              <div>
                <label className="block text-gray-700 mb-2">Full Name *</label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="John Doe"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-gray-700 mb-2">Phone Number *</label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="+91 98765 43210"
                />
              </div>

              {/* Age & Gender */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 mb-2">Age *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="120"
                    value={formData.age}
                    onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="25"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 mb-2">Gender *</label>
                  <select
                    required
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select</option>
                    {genders.map((gender) => (
                      <option key={gender} value={gender}>{gender}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Blood Group */}
              <div>
                <label className="block text-gray-700 mb-2">Blood Group *</label>
                <select
                  required
                  value={formData.bloodGroup}
                  onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select</option>
                  {bloodGroups.map((bg) => (
                    <option key={bg} value={bg}>{bg}</option>
                  ))}
                </select>
              </div>

              {/* Medical Conditions */}
              <div className="bg-blue-50 rounded-xl p-4 space-y-3">
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={formData.chronicCondition}
                    onChange={(e) => setFormData({ ...formData, chronicCondition: e.target.checked })}
                    className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <div>
                    <div className="text-gray-900">Chronic Condition</div>
                    <div className="text-sm text-gray-600">I have a chronic medical condition</div>
                  </div>
                </label>
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={formData.thalassemia}
                    onChange={(e) => setFormData({ ...formData, thalassemia: e.target.checked })}
                    className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <div>
                    <div className="text-gray-900">Thalassemia Patient</div>
                    <div className="text-sm text-gray-600">I require regular blood transfusions</div>
                  </div>
                </label>
              </div>

              {/* Emergency Contact */}
              <div className="border-t pt-4">
                <h3 className="text-gray-900 mb-4 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-blue-600" />
                  Emergency Contact
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-gray-700 mb-2">Contact Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.emergencyContactName}
                      onChange={(e) => setFormData({ ...formData, emergencyContactName: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Jane Doe"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 mb-2">Contact Phone *</label>
                    <input
                      type="tel"
                      required
                      value={formData.emergencyContactPhone}
                      onChange={(e) => setFormData({ ...formData, emergencyContactPhone: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="+91 98765 43210"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="text-gray-900 mb-4 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-blue-600" />
                  Location
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleUseLocation}
                    disabled={loading}
                    className="text-sm font-medium text-blue-600 hover:text-blue-700 disabled:opacity-50"
                  >
                    Use my location
                  </button>
                </div>
                {locationStatus && (
                  <div className="mt-2 text-blue-700 text-sm">{locationStatus}</div>
                )}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-700 mb-2">City *</label>
                      <input
                        type="text"
                        required
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Maharashtra"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-gray-700 mb-2">Pincode *</label>
                    <input
                      type="text"
                      required
                      value={formData.pincode}
                      onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="400001"
                    />
                  </div>
                </div>
              </div>

              {/* Consent */}
              <div className="border-t pt-4 space-y-3">
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    required
                    checked={formData.consentMedical}
                    onChange={(e) => setFormData({ ...formData, consentMedical: e.target.checked })}
                    className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">
                    I consent to share my medical data with blood banks and hospitals for emergency purposes *
                  </span>
                </label>
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    required
                    checked={formData.consentPrivacy}
                    onChange={(e) => setFormData({ ...formData, consentPrivacy: e.target.checked })}
                    className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">
                    I agree to the Terms of Service and Privacy Policy *
                  </span>
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || !formData.consentMedical || !formData.consentPrivacy}
                className="w-full py-3 min-h-[48px] bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating Account...' : 'Create Account'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
