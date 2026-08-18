import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import {
  Shield,
  Lock,
  Mail,
  User as UserIcon,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
  Sparkles,
  CheckCircle2,
  Clock,
  Award,
  Zap,
} from 'lucide-react';
import { api } from '../../api/client';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import heroImage from '../../assets/assessment_hero.jpg';

export const AuthPage: React.FC = () => {
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotModal, setForgotModal] = useState(false);
  const [forgotMsg, setForgotMsg] = useState<{ text: string; isError?: boolean } | null>(null);
  const [forgotLoading, setForgotLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isRegister) {
        await register(name, email, password);
      } else {
        await login(email, password);
      }
    } catch (err: unknown) {
      const errObj = err as Error | undefined;
      setError(errObj?.message || 'Authentication failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;
    setForgotLoading(true);
    setForgotMsg(null);
    try {
      const res = await api.post<{ message: string }>('/auth/forgot-password', { email: forgotEmail });
      setForgotMsg({ text: res.message });
    } catch (err: unknown) {
      const errObj = err as Error | undefined;
      setForgotMsg({ text: errObj?.message || 'Failed to request password reset.', isError: true });
    } finally {
      setForgotLoading(false);
    }
  };

  const fillDemo = async (role: 'admin' | 'alice' | 'bob', autoLogin = true) => {
    let demoEmail = '';
    let demoPassword = '';
    if (role === 'admin') {
      demoEmail = 'admin@assessment.io';
      demoPassword = 'Admin@12345';
    } else if (role === 'alice') {
      demoEmail = 'alice@student.io';
      demoPassword = 'Student@12345';
    } else {
      demoEmail = 'bob@student.io';
      demoPassword = 'Student@12345';
    }
    setEmail(demoEmail);
    setPassword(demoPassword);
    setIsRegister(false);
    setError(null);

    if (autoLogin) {
      setLoading(true);
      try {
        await login(demoEmail, demoPassword);
      } catch (err: unknown) {
        const errObj = err as Error | undefined;
        setError(errObj?.message || 'Authentication failed. Please verify your credentials.');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#faf7f2] text-[#1c130d] flex flex-col justify-center relative selection:bg-[#b07238]/20 overflow-x-hidden">
      {/* Background Subtle Warm Caramel & Golden Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(180,105,39,0.08),rgba(250,247,242,0))] pointer-events-none" />
      <div className="absolute top-10 left-10 w-96 h-96 bg-[#b07238]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-[#b07238]/5 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-16 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center">
          
          {/* Left Column: Platform Showcase */}
          <div className="lg:col-span-7 space-y-8">
            {/* Brand Logo & Version Badge */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#b07238] via-[#c89666] to-[#8c531e] flex items-center justify-center shadow-lg shadow-[#b07238]/25 border border-[#dfb58a]/40">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl sm:text-3xl font-black tracking-tight text-[#1c130d]">
                    Apex<span className="text-[#b46927]">Assess</span>
                  </span>
                  <span className="px-2.5 py-0.5 text-[10px] font-bold bg-[#b07238]/10 text-[#b46927] border border-[#b07238]/25 rounded-full font-mono">
                    v2.0 Pro
                  </span>
                </div>
                <span className="text-[11px] text-[#8a7465] font-mono font-bold tracking-wider uppercase block">
                  Enterprise Assessment & Exam Governance Engine
                </span>
              </div>
            </div>

            {/* Headline & Description */}
            <div className="space-y-4 max-w-2xl">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#1c130d] leading-[1.15] tracking-tight">
                High-Stakes Technical Assessments & Real-Time Grading
              </h1>
              <p className="text-sm sm:text-base text-[#5c4738] leading-relaxed max-w-xl">
                Engineered with server-authoritative timer synchronization, immutable assessment versioning, negative marking, and real-time autosave persistence.
              </p>
            </div>

            {/* Feature Highlights Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 max-w-2xl">
              <div className="bg-white/80 backdrop-blur-sm border border-[#e8dfd5] rounded-2xl p-4 shadow-sm hover:border-[#b07238]/40 transition-colors">
                <div className="w-8 h-8 rounded-xl bg-[#b07238]/10 flex items-center justify-center text-[#b46927] mb-2.5">
                  <Clock className="w-4 h-4" />
                </div>
                <div className="text-xs font-bold text-[#1c130d]">Authoritative Timing</div>
                <div className="text-[11px] text-[#8a7465] mt-0.5">Strict server clocks prevent client-side time tampering</div>
              </div>

              <div className="bg-white/80 backdrop-blur-sm border border-[#e8dfd5] rounded-2xl p-4 shadow-sm hover:border-[#b07238]/40 transition-colors">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 mb-2.5 border border-emerald-100">
                  <Zap className="w-4 h-4" />
                </div>
                <div className="text-xs font-bold text-[#1c130d]">Real-Time Autosave</div>
                <div className="text-[11px] text-[#8a7465] mt-0.5">Continuous sync with exponential backoff retry</div>
              </div>

              <div className="bg-white/80 backdrop-blur-sm border border-[#e8dfd5] rounded-2xl p-4 shadow-sm hover:border-[#b07238]/40 transition-colors">
                <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 mb-2.5 border border-amber-100">
                  <Award className="w-4 h-4" />
                </div>
                <div className="text-xs font-bold text-[#1c130d]">Verifiable Badges</div>
                <div className="text-[11px] text-[#8a7465] mt-0.5">Cryptographically signed completion certificates</div>
              </div>
            </div>

            {/* Visual Hero Card Showcase */}
            <div className="relative rounded-3xl overflow-hidden border border-[#e8dfd5] bg-white shadow-xl max-w-2xl group">
              <div className="aspect-[16/9] w-full overflow-hidden relative">
                <img
                  src={heroImage}
                  alt="ApexAssess Platform Architecture"
                  className="w-full h-full object-cover object-center transform transition duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                
                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-white">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400/50" />
                    <span className="text-xs font-bold">Server Authoritative Infrastructure</span>
                  </div>
                  <span className="text-[10px] font-mono text-amber-200 bg-white/10 backdrop-blur-md border border-white/20 px-2.5 py-1 rounded-full font-bold">
                    Cryptographic Validation
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Authentication Card */}
          <div className="lg:col-span-5 w-full max-w-md mx-auto lg:max-w-none">
            <div className="bg-white border border-[#e8dfd5] rounded-3xl p-7 sm:p-9 shadow-xl relative">
              
              {/* Form Mode Tabs */}
              <div className="flex p-1.5 bg-[#f5efe8] rounded-2xl border border-[#e8dfd5] mb-6">
                <button
                  type="button"
                  onClick={() => { setIsRegister(false); setError(null); }}
                  className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
                    !isRegister
                      ? 'bg-gradient-to-r from-[#b07238] to-[#d4a373] text-white font-black shadow-md shadow-[#b07238]/25'
                      : 'text-[#5c4738] hover:text-[#1c130d]'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => { setIsRegister(true); setError(null); }}
                  className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
                    isRegister
                      ? 'bg-gradient-to-r from-[#b07238] to-[#d4a373] text-white font-black shadow-md shadow-[#b07238]/25'
                      : 'text-[#5c4738] hover:text-[#1c130d]'
                  }`}
                >
                  Create Account
                </button>
              </div>

              {/* Error Banner */}
              {error && (
                <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-3 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <div className="font-bold text-rose-900">Authentication Alert</div>
                    <div>{error}</div>
                  </div>
                </div>
              )}

              {/* Form Fields */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {isRegister && (
                  <Input
                    label="Full Name"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Jane Doe"
                    leftIcon={<UserIcon className="w-4 h-4" />}
                  />
                )}

                <Input
                  label="Email Address"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@assessment.io"
                  leftIcon={<Mail className="w-4 h-4" />}
                />

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-[#5c4738] uppercase tracking-wider">
                      Password
                    </label>
                    {!isRegister && (
                      <button
                        type="button"
                        onClick={() => { setForgotModal(true); setForgotMsg(null); setForgotEmail(email); }}
                        className="text-xs text-[#b46927] hover:text-[#8c531e] font-bold transition-colors cursor-pointer"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#8a7465]">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full pl-10 pr-10 py-2.5 bg-[#faf7f2] border border-[#e8dfd5] rounded-2xl text-[#1c130d] text-xs sm:text-sm placeholder-[#9e897b] focus:outline-none focus:border-[#b46927] focus:ring-2 focus:ring-[#b46927]/20 transition-all shadow-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#8a7465] hover:text-[#1c130d] transition-colors cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    className="w-full shadow-md shadow-[#b07238]/25 hover:shadow-lg font-bold text-sm py-3"
                    isLoading={loading}
                    rightIcon={<ArrowRight className="w-4 h-4" />}
                  >
                    {isRegister ? 'Complete Registration' : 'Sign In to Portal'}
                  </Button>
                </div>
              </form>

              {/* Instant 1-Click Demo Login */}
              <div className="mt-6 pt-5 border-t border-[#e8dfd5] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#5c4738]">
                    <Sparkles className="w-3.5 h-3.5 text-[#b46927]" />
                    <span>Instant 1-Click Demo Access</span>
                  </div>
                  <span className="text-[9px] text-[#8a7465] font-mono">Select Role</span>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => fillDemo('admin', true)}
                    className="p-3 rounded-2xl bg-[#faf7f2] hover:bg-[#ede4d8] active:scale-[0.98] border border-[#e8dfd5] hover:border-[#b46927] text-left transition-all cursor-pointer shadow-sm group"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-black text-[#1c130d] group-hover:text-[#b46927]">Admin Console</span>
                      <span className="w-2 h-2 rounded-full bg-[#b46927] animate-pulse" />
                    </div>
                    <span className="text-[10px] text-[#8a7465] block font-mono">Full Gov Access</span>
                  </button>

                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => fillDemo('alice', true)}
                    className="p-3 rounded-2xl bg-[#faf7f2] hover:bg-[#ede4d8] active:scale-[0.98] border border-[#e8dfd5] hover:border-emerald-500 text-left transition-all cursor-pointer shadow-sm group"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-black text-[#1c130d] group-hover:text-emerald-700">Student Portal</span>
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    </div>
                    <span className="text-[10px] text-[#8a7465] block font-mono">Alice Walker</span>
                  </button>
                </div>
              </div>

              {/* Security Badge */}
              <div className="mt-5 text-center text-[10px] text-[#8a7465] font-mono flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>256-Bit Encrypted Authoritative Session</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      <Modal
        isOpen={forgotModal}
        onClose={() => setForgotModal(false)}
        title="Reset Account Password"
        subtitle="Enter your registered account email to receive a single-use reset token."
        maxWidth="md"
      >
        <div className="space-y-4">
          {forgotMsg && (
            <div className={`p-3 rounded-2xl text-xs ${
              forgotMsg.isError
                ? 'bg-rose-50 border border-rose-200 text-rose-700'
                : 'bg-emerald-50 border border-emerald-200 text-emerald-700'
            }`}>
              {forgotMsg.text}
            </div>
          )}

          <form onSubmit={handleForgotPassword} className="space-y-4">
            <Input
              label="Email Address"
              type="email"
              required
              value={forgotEmail}
              onChange={(e) => setForgotEmail(e.target.value)}
              placeholder="admin@assessment.io"
              leftIcon={<Mail className="w-4 h-4" />}
            />

            <div className="flex justify-end gap-3 pt-3 border-t border-[#e8dfd5]">
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => setForgotModal(false)}
              >
                Close
              </Button>
              <Button
                variant="primary"
                size="sm"
                type="submit"
                isLoading={forgotLoading}
              >
                Request Reset
              </Button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
};
