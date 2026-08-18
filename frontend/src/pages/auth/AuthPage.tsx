import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Shield, Lock, Mail, User as UserIcon, ArrowRight, AlertCircle, Eye, EyeOff, Sparkles } from 'lucide-react';
import { api } from '../../api/client';
import { Card } from '../../components/ui/Card';
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
    <div className="min-h-screen bg-[#faf7f2] text-[#1c130d] flex flex-col lg:flex-row relative selection:bg-[#b07238]/20">
      {/* Background Subtle Warm Caramel Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(180,105,39,0.08),rgba(250,247,242,0))] pointer-events-none" />
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#b07238]/5 rounded-full blur-3xl pointer-events-none" />

      {/* Left Feature Showcase (Desktop) */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 lg:p-16 border-r border-[#e8dfd5] bg-[#fbf8f4]/90 backdrop-blur-md relative z-10">
        <div>
          {/* Brand Logo */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#b07238] via-[#c89666] to-[#8c531e] flex items-center justify-center shadow-md shadow-[#b07238]/20 border border-[#dfb58a]/40">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-2xl font-black tracking-tight text-[#1c130d]">Apex<span className="text-[#b46927]">Assess</span></span>
              <span className="ml-2.5 px-2.5 py-0.5 text-[10px] font-bold bg-[#b07238]/10 text-[#b46927] border border-[#b07238]/25 rounded-full font-mono">v2.0 Pro</span>
            </div>
          </div>

          {/* Hero Typography */}
          <div className="mt-12 max-w-lg">
            <h1 className="text-3xl lg:text-4xl font-extrabold text-[#1c130d] leading-tight tracking-tight">
              Enterprise Assessment & Exam Governance Platform
            </h1>
            <p className="mt-4 text-sm text-[#5c4738] leading-relaxed">
              Engineered with server-authoritative timer synchronization, immutable assessment versioning, negative marking, and real-time autosave persistence.
            </p>
          </div>

          {/* Visual Hero Showcase Banner */}
          <div className="mt-8 relative rounded-2xl overflow-hidden border border-[#e8dfd5] bg-white shadow-xl group max-w-lg coffee-card-hover">
            <div className="aspect-[4/3] w-full overflow-hidden relative">
              <img
                src={heroImage}
                alt="ApexAssess Platform Architecture"
                className="w-full h-full object-cover object-center transform transition duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-50" />
            </div>

            <div className="p-4 bg-white/95 backdrop-blur-md border-t border-[#e8dfd5] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-sm shadow-emerald-500/50" />
                <span className="text-xs font-bold text-[#1c130d]">Authoritative Exam Infrastructure</span>
              </div>
              <span className="text-[10px] font-mono text-[#b46927] bg-[#b07238]/10 border border-[#b07238]/25 px-2.5 py-1 rounded-lg font-bold">
                Cryptographic Validation
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Form Container */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 sm:p-12 lg:p-16 z-10">
        <div className="w-full max-w-md">
          {/* Mobile Brand Header */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#c89666] to-[#7f5539] flex items-center justify-center shadow-lg shadow-[#c89666]/25 border border-[#e6ccb2]/40">
              <Shield className="w-5 h-5 text-[#17110d]" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-[#faf4ee]">Apex<span className="text-[#d4a373]">Assess</span></span>
            </div>
          </div>

          {/* Form Card */}
          <Card variant="raised" className="p-6 sm:p-8 shadow-xl border border-[#e8dfd5] bg-white">
            {/* Header Tabs */}
            <div className="flex p-1 bg-[#f5efe8] rounded-xl border border-[#e8dfd5] mb-6">
              <button
                type="button"
                onClick={() => { setIsRegister(false); setError(null); }}
                className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                  !isRegister ? 'bg-gradient-to-r from-[#b07238] to-[#d4a373] text-white font-black shadow-md shadow-[#b07238]/20' : 'text-[#5c4738] hover:text-[#1c130d]'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setIsRegister(true); setError(null); }}
                className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                  isRegister ? 'bg-gradient-to-r from-[#b07238] to-[#d4a373] text-white font-black shadow-md shadow-[#b07238]/20' : 'text-[#5c4738] hover:text-[#1c130d]'
                }`}
              >
                Create Account
              </button>
            </div>

            {/* Error Banner */}
            {error && (
              <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-3">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold text-rose-900">Authentication Alert</div>
                  <div>{error}</div>
                </div>
              </div>
            )}

            {/* Form */}
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
                  <label className="block text-xs font-semibold text-[#5c4738] uppercase tracking-wider">Password</label>
                  {!isRegister && (
                    <button
                      type="button"
                      onClick={() => { setForgotModal(true); setForgotMsg(null); setForgotEmail(email); }}
                      className="text-xs text-[#b46927] hover:text-[#8c531e] font-semibold transition-colors cursor-pointer"
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
                    className="w-full pl-10 pr-10 py-2.5 bg-white border border-[#e8dfd5] rounded-xl text-[#1c130d] text-xs sm:text-sm placeholder-[#9e897b] focus:outline-none focus:border-[#b46927] focus:ring-1 focus:ring-[#b46927] transition-colors shadow-sm"
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
                  className="w-full shadow-md shadow-[#b07238]/20 hover:shadow-lg hover:shadow-[#b07238]/30 transition-all font-bold"
                  isLoading={loading}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  {isRegister ? 'Complete Registration' : 'Sign In'}
                </Button>
              </div>
            </form>

            {/* Quick Demo Credentials Switcher */}
            <div className="mt-6 pt-5 border-t border-[#e8dfd5]">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#5c4738]">
                  <Sparkles className="w-3.5 h-3.5 text-[#b46927]" />
                  <span>Instant 1-Click Demo Login</span>
                </div>
                <span className="text-[9px] text-[#8a7465] font-mono">Select Role</span>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => fillDemo('admin', true)}
                  className="px-3.5 py-2.5 rounded-xl bg-[#f5efe8] hover:bg-[#ede4d8] active:scale-[0.98] border border-[#e8dfd5] hover:border-[#b46927]/50 text-xs text-[#1c130d] font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
                >
                  <span className="w-2 h-2 rounded-full bg-[#b46927] shrink-0 animate-pulse" />
                  <span>Admin Console</span>
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => fillDemo('alice', true)}
                  className="px-3.5 py-2.5 rounded-xl bg-[#f5efe8] hover:bg-[#ede4d8] active:scale-[0.98] border border-[#e8dfd5] hover:border-emerald-500/50 text-xs text-[#1c130d] font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
                  <span>Student Portal</span>
                </button>
              </div>
            </div>
          </Card>
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
            <div className={`p-3 rounded-xl text-xs ${
              forgotMsg.isError ? 'bg-rose-500/10 border border-rose-500/30 text-rose-300' : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
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

            <div className="flex justify-end gap-3 pt-3 border-t border-[#38281e]">
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
