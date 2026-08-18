import React, { useState } from 'react';
import { api } from '../../api/client';
import { Certificate } from '../../types';
import {
  Award,
  CheckCircle2,
  Printer,
  ShieldCheck,
  X,
  Sparkles,
} from 'lucide-react';
import { useCertificatesQuery } from '../../hooks/useCertificates';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { EmptyState } from '../../components/ui/EmptyState';
import { Skeleton } from '../../components/ui/Skeleton';

interface VerificationResult {
  recipient_name?: string;
  quiz_title?: string;
  percentage?: number;
  issue_date?: string;
}

export const CertificatesView: React.FC = () => {
  const { data: certificates = [], isLoading: loading } = useCertificatesQuery();
  const [verifyCode, setVerifyCode] = useState('');
  const [verifyResult, setVerifyResult] = useState<VerificationResult | null>(null);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [selectedCert, setSelectedCert] = useState<Certificate | null>(null);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyCode.trim()) return;
    setVerifyLoading(true);
    setVerifyError(null);
    setVerifyResult(null);

    try {
      const res = await api.get<VerificationResult>(`/certificates/verify/${encodeURIComponent(verifyCode.trim())}`);
      setVerifyResult(res);
    } catch (err: unknown) {
      const errObj = err as Error | undefined;
      setVerifyError(errObj?.message || 'Invalid or unverified certificate code');
    } finally {
      setVerifyLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-[#e8dfd5]">
        <div>
          <span className="text-xs font-bold text-[#b46927] uppercase tracking-wider">Achievements & Credentials</span>
          <h1 className="text-2xl sm:text-3xl font-black text-[#1c130d] tracking-tight flex items-center gap-2 mt-1">
            <Award className="w-7 h-7 text-emerald-600" />
            Verified Certificates
          </h1>
          <p className="text-xs sm:text-sm text-[#5c4738] mt-2 max-w-xl">
            Official verifiable credentials issued upon achieving passing marks on platform assessments.
          </p>
        </div>

        {/* Quick Verify Code Bar */}
        <form onSubmit={handleVerify} className="flex gap-2 max-w-sm w-full">
          <input
            type="text"
            value={verifyCode}
            onChange={(e) => setVerifyCode(e.target.value)}
            placeholder="Verify Code: CERT-XXXX-XXXX"
            className="w-full px-4 py-2.5 bg-white border border-[#e8dfd5] rounded-2xl text-[#1c130d] text-xs font-mono focus:outline-none focus:border-[#b46927] placeholder:text-[#9e897b] shadow-sm"
          />
          <Button
            variant="primary"
            size="sm"
            type="submit"
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
            isLoading={verifyLoading}
          >
            Verify
          </Button>
        </form>
      </div>

      {/* Verification Result Banner */}
      {verifyResult && (
        <div className="p-5 rounded-3xl bg-emerald-50 border border-emerald-200 flex items-start sm:items-center justify-between gap-4 shadow-sm animate-in fade-in">
          <div className="flex items-start sm:items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5 sm:mt-0" />
            <div className="text-sm">
              <span className="font-bold text-emerald-900 block tracking-tight">Certificate Authenticated Successfully</span>
              <span className="text-[#5c4738] mt-1 block leading-relaxed">
                Awarded to <strong className="text-[#1c130d]">{verifyResult.recipient_name}</strong> for <strong className="text-[#1c130d]">{verifyResult.quiz_title}</strong> with score <strong className="text-[#1c130d] font-mono">{verifyResult.percentage}%</strong> on <strong className="text-[#1c130d] font-mono">{verifyResult.issue_date ? new Date(verifyResult.issue_date).toLocaleDateString() : 'N/A'}</strong>.
              </span>
            </div>
          </div>
          <button onClick={() => setVerifyResult(null)} className="text-[#8a7465] hover:text-[#1c130d] shrink-0 cursor-pointer p-1">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {verifyError && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-between gap-4 text-xs text-rose-700 shadow-sm animate-in fade-in">
          <span className="font-semibold">{verifyError}</span>
          <button onClick={() => setVerifyError(null)} className="text-[#8a7465] hover:text-[#1c130d] p-1 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Certificates Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-3xl p-6 space-y-4 border border-[#e8dfd5] shadow-sm">
              <div className="flex justify-between items-center">
                <Skeleton variant="circular" width="40px" height="40px" />
                <Skeleton variant="text" width="90px" height="20px" />
              </div>
              <Skeleton variant="text" width="80%" height="22px" />
              <Skeleton variant="text" width="100%" height="16px" />
              <div className="flex justify-between items-center pt-4 border-t border-[#e8dfd5]">
                <Skeleton variant="text" width="80px" height="14px" />
                <Skeleton variant="rectangular" width="100px" height="32px" />
              </div>
            </div>
          ))}
        </div>
      ) : certificates.length === 0 ? (
        <EmptyState
          icon={<Award className="w-10 h-10 text-emerald-600" />}
          title="No Certificates Earned Yet"
          description="Pass any published assessment with the required pass score to receive a verifiable digital credential."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {certificates.map((cert) => (
            <div
              key={cert.id}
              className="bg-white hover:border-[#b46927]/40 rounded-3xl p-6 shadow-sm flex flex-col justify-between space-y-6 group border border-[#e8dfd5] transition-all hover:shadow-md"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <Badge variant="success" size="sm">
                    {cert.percentage}% Verified
                  </Badge>
                </div>

                <div>
                  <h3 className="text-base font-black text-[#1c130d] tracking-tight group-hover:text-[#b46927] transition-colors">
                    {cert.quiz_title}
                  </h3>
                  <div className="text-xs text-[#5c4738] mt-1 font-medium">Recipient: <span className="text-[#1c130d] font-bold">{cert.user_name}</span></div>
                  <div className="text-[11px] font-mono text-[#5c4738] mt-3 bg-[#faf7f2] border border-[#e8dfd5] p-2.5 rounded-2xl break-all">
                    Code: <span className="text-emerald-700 font-bold">{cert.certificate_code}</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-[#e8dfd5] flex items-center justify-between text-xs">
                <span className="text-[#8a7465] font-mono text-[11px]">{new Date(cert.issued_at).toLocaleDateString()}</span>
                <Button
                  variant="primary"
                  size="sm"
                  className="font-bold text-xs"
                  onClick={() => setSelectedCert(cert)}
                >
                  View Credential
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Printable Certificate Modal */}
      {selectedCert && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedCert(null)}
          title="Digital Credential Certificate"
          subtitle="Verifiable cryptographic proof of assessment completion."
          maxWidth="2xl"
        >
          <div className="space-y-6">
            {/* Certificate Canvas */}
            <div className="border-4 border-double border-[#b46927]/40 bg-gradient-to-b from-[#faf7f2] via-[#ffffff] to-[#faf7f2] p-6 sm:p-10 rounded-3xl text-center space-y-8 shadow-xl text-[#1c130d]">
              <div className="flex items-center justify-center gap-2">
                <ShieldCheck className="w-8 h-8 text-[#b46927]" />
                <span className="text-xs sm:text-sm font-mono tracking-widest text-[#b46927] uppercase font-bold flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-[#b46927]" />
                  ApexAssess Verified Credential
                </span>
              </div>

              <div className="space-y-3">
                <div className="text-[11px] sm:text-xs uppercase tracking-[0.2em] text-[#5c4738] font-serif">This certifies that</div>
                <div className="text-3xl sm:text-4xl font-black text-[#1c130d] font-serif tracking-tight">{selectedCert.user_name}</div>
                <div className="text-xs sm:text-sm text-[#5c4738] max-w-sm mx-auto">has successfully passed the comprehensive assessment</div>
              </div>

              <div className="text-xl sm:text-2xl font-bold text-[#b46927] font-serif px-6 py-3 bg-[#b07238]/10 rounded-2xl inline-block border border-[#b07238]/25 shadow-sm">
                {selectedCert.quiz_title}
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-[#5c4738] border-t border-[#e8dfd5] pt-6 mt-4 gap-4 sm:gap-0 font-mono">
                <div className="text-center sm:text-left">
                  <span className="block text-[10px] text-[#8a7465] mb-1 font-bold">SCORE</span>
                  <strong className="text-[#1c130d] text-base font-black">{selectedCert.percentage}%</strong>
                </div>
                <div className="text-center">
                  <span className="block text-[10px] text-[#8a7465] mb-1 font-bold">DATE</span>
                  <strong className="text-[#1c130d] text-sm font-bold">{new Date(selectedCert.issued_at).toLocaleDateString()}</strong>
                </div>
                <div className="text-center sm:text-right">
                  <span className="block text-[10px] text-[#8a7465] mb-1 font-bold">VERIFICATION CODE</span>
                  <strong className="text-[#b46927] tracking-wider text-sm font-black">{selectedCert.certificate_code}</strong>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="primary"
                size="md"
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                leftIcon={<Printer className="w-4 h-4" />}
                onClick={() => window.print()}
              >
                Print / Save PDF
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
