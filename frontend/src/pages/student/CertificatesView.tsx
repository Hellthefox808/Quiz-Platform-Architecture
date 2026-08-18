import React, { useState } from 'react';
import { api } from '../../api/client';
import { Certificate } from '../../types';
import {
  Award,
  CheckCircle2,
  Printer,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useCertificatesQuery } from '../../hooks/useCertificates';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
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
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-[#38281e]">
        <div>
          <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Achievements & Credentials</span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#faf4ee] tracking-tight flex items-center gap-2 mt-1">
            <Award className="w-7 h-7 text-emerald-400" />
            Verified Certificates
          </h1>
          <p className="text-xs sm:text-sm text-[#cbb8a9] mt-2 max-w-xl">
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
            className="w-full px-4 py-2.5 bg-[#110c09] border border-[#38281e] rounded-xl text-[#faf4ee] text-xs font-mono focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 placeholder:text-[#887467] shadow-inner"
          />
          <Button
            variant="primary"
            size="sm"
            type="submit"
            className="bg-emerald-600 hover:bg-emerald-500 border-emerald-500/40"
            isLoading={verifyLoading}
          >
            Verify
          </Button>
        </form>
      </div>

      {/* Verification Result Banner */}
      {verifyResult && (
        <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-start sm:items-center justify-between gap-4 shadow-sm animate-in fade-in">
          <div className="flex items-start sm:items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5 sm:mt-0" />
            <div className="text-sm">
              <span className="font-bold text-emerald-400 block tracking-tight">Certificate Authenticated Successfully</span>
              <span className="text-[#cbb8a9] mt-1 block leading-relaxed">
                Awarded to <strong className="text-[#faf4ee]">{verifyResult.recipient_name}</strong> for <strong className="text-[#faf4ee]">{verifyResult.quiz_title}</strong> with score <strong className="text-[#faf4ee] font-mono">{verifyResult.percentage}%</strong> on <strong className="text-[#faf4ee] font-mono">{verifyResult.issue_date ? new Date(verifyResult.issue_date).toLocaleDateString() : 'N/A'}</strong>.
              </span>
            </div>
          </div>
          <button onClick={() => setVerifyResult(null)} className="text-[#887467] hover:text-[#faf4ee] shrink-0 cursor-pointer p-1">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {verifyError && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between gap-4 text-xs text-rose-300 shadow-sm animate-in fade-in">
          <span className="font-semibold">{verifyError}</span>
          <button onClick={() => setVerifyError(null)} className="text-[#887467] hover:text-[#faf4ee] p-1 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Certificates Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="assess-surface rounded-2xl p-6 space-y-4 border border-[#38281e]">
              <div className="flex justify-between items-center">
                <Skeleton variant="circular" width="40px" height="40px" />
                <Skeleton variant="text" width="90px" height="20px" />
              </div>
              <Skeleton variant="text" width="80%" height="22px" />
              <Skeleton variant="text" width="100%" height="16px" />
              <div className="flex justify-between items-center pt-4 border-t border-[#38281e]">
                <Skeleton variant="text" width="80px" height="14px" />
                <Skeleton variant="rectangular" width="100px" height="32px" />
              </div>
            </div>
          ))}
        </div>
      ) : certificates.length === 0 ? (
        <EmptyState
          icon={<Award className="w-8 h-8" />}
          title="No Certificates Earned Yet"
          description="Pass any published assessment with the required pass score to receive a verifiable digital credential."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {certificates.map((cert) => (
            <Card
              key={cert.id}
              variant="interactive"
              className="hover:border-emerald-500/30 rounded-2xl p-6 shadow-xl flex flex-col justify-between space-y-6 group border border-[#38281e]"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <Badge variant="success" size="sm">
                    {cert.percentage}% Verified
                  </Badge>
                </div>

                <div>
                  <h3 className="text-base font-bold text-[#faf4ee] tracking-tight group-hover:text-emerald-400 transition-colors">
                    {cert.quiz_title}
                  </h3>
                  <div className="text-xs text-[#cbb8a9] mt-1 font-medium">Recipient: <span className="text-[#faf4ee]">{cert.user_name}</span></div>
                  <div className="text-[10px] font-mono text-[#cbb8a9] mt-3 bg-[#110c09] border border-[#38281e] p-2.5 rounded-lg break-all">
                    Code: <span className="text-emerald-400 font-bold">{cert.certificate_code}</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-[#38281e]/80 flex items-center justify-between text-xs">
                <span className="text-[#887467] font-mono text-[11px]">{new Date(cert.issued_at).toLocaleDateString()}</span>
                <Button
                  variant="glass"
                  size="sm"
                  onClick={() => setSelectedCert(cert)}
                >
                  View Credential
                </Button>
              </div>
            </Card>
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
            <div className="border-4 border-double border-[#d4a373]/40 bg-gradient-to-b from-[#140e0b] via-[#1c140f] to-[#140e0b] p-6 sm:p-10 rounded-2xl text-center space-y-8 shadow-2xl">
              <div className="flex items-center justify-center gap-3">
                <ShieldCheck className="w-8 h-8 text-[#d4a373]" />
                <span className="text-xs sm:text-sm font-mono tracking-widest text-[#d4a373] uppercase font-bold">
                  ApexAssess Verified Credential
                </span>
              </div>

              <div className="space-y-3">
                <div className="text-[11px] sm:text-xs uppercase tracking-[0.2em] text-[#cbb8a9] font-serif">This certifies that</div>
                <div className="text-3xl sm:text-4xl font-black text-[#faf4ee] font-serif tracking-tight">{selectedCert.user_name}</div>
                <div className="text-xs sm:text-sm text-[#cbb8a9] max-w-sm mx-auto">has successfully passed the comprehensive assessment</div>
              </div>

              <div className="text-xl sm:text-2xl font-bold text-[#d4a373] font-serif px-6 py-3 bg-[#c89666]/10 rounded-xl inline-block border border-[#c89666]/30 shadow-inner">
                {selectedCert.quiz_title}
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-[#cbb8a9] border-t border-[#38281e] pt-6 mt-4 gap-4 sm:gap-0 font-mono">
                <div className="text-center sm:text-left">
                  <span className="block text-[10px] text-[#887467] mb-1">SCORE</span>
                  <strong className="text-[#faf4ee] text-sm">{selectedCert.percentage}%</strong>
                </div>
                <div className="text-center">
                  <span className="block text-[10px] text-[#887467] mb-1">DATE</span>
                  <strong className="text-[#faf4ee] text-sm">{new Date(selectedCert.issued_at).toLocaleDateString()}</strong>
                </div>
                <div className="text-center sm:text-right">
                  <span className="block text-[10px] text-[#887467] mb-1">VERIFICATION CODE</span>
                  <strong className="text-[#d4a373] tracking-wider text-sm">{selectedCert.certificate_code}</strong>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="primary"
                size="md"
                className="bg-emerald-600 hover:bg-emerald-500 border-emerald-500/40"
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
