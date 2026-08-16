import React, { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { Certificate } from '../../types';
import { 
  Award, 
  CheckCircle2, 
  Download, 
  ExternalLink, 
  HelpCircle, 
  Printer, 
  Search, 
  ShieldCheck, 
  Sparkles, 
  X 
} from 'lucide-react';

export const CertificatesView: React.FC = () => {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifyCode, setVerifyCode] = useState('');
  const [verifyResult, setVerifyResult] = useState<any>(null);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [selectedCert, setSelectedCert] = useState<Certificate | null>(null);

  const fetchCertificates = async () => {
    try {
      const data = await api.get<Certificate[]>('/certificates/my');
      setCertificates(data);
    } catch (err) {
      console.error('Failed to load certificates:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCertificates();
  }, []);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyCode.trim()) return;
    setVerifyLoading(true);
    setVerifyError(null);
    setVerifyResult(null);

    try {
      const res = await api.get(`/certificates/verify/${encodeURIComponent(verifyCode.trim())}`);
      setVerifyResult(res);
    } catch (err: any) {
      setVerifyError(err.message || 'Invalid or unverified certificate code');
    } finally {
      setVerifyLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <Award className="w-8 h-8 text-emerald-400" />
            Verified Certificates
          </h1>
          <p className="text-sm text-slate-400 mt-1">
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
            className="w-full px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <button
            type="submit"
            disabled={verifyLoading}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shrink-0 transition"
          >
            {verifyLoading ? 'Verifying...' : 'Verify'}
          </button>
        </form>
      </div>

      {/* Verification Result Banner */}
      {verifyResult && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
            <div className="text-xs">
              <span className="font-bold text-white block">Certificate Authenticated Successfully!</span>
              <span className="text-slate-300">
                Awarded to <strong>{verifyResult.recipient_name}</strong> for <strong>{verifyResult.quiz_title}</strong> with score <strong>{verifyResult.percentage}%</strong> on {new Date(verifyResult.issue_date).toLocaleDateString()}.
              </span>
            </div>
          </div>
          <button onClick={() => setVerifyResult(null)} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {verifyError && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between gap-4 text-xs text-rose-300">
          <span>{verifyError}</span>
          <button onClick={() => setVerifyError(null)} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Certificates Grid */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : certificates.length === 0 ? (
        <div className="text-center py-16 bg-slate-900 border border-slate-800 rounded-3xl p-8">
          <Award className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-white mb-1">No Certificates Earned Yet</h3>
          <p className="text-sm text-slate-400 max-w-sm mx-auto">
            Pass any published assessment with the required grade to receive a verifiable digital certificate.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {certificates.map((cert) => (
            <div
              key={cert.id}
              className="bg-slate-900 border border-slate-800 hover:border-emerald-500/40 rounded-3xl p-6 shadow-xl relative overflow-hidden flex flex-col justify-between space-y-6"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <span className="text-[11px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg">
                    {cert.percentage}% Verified
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-white tracking-tight">{cert.quiz_title}</h3>
                  <div className="text-xs text-slate-400 mt-1">Recipient: {cert.user_name}</div>
                  <div className="text-[11px] font-mono text-slate-500 mt-2 bg-slate-800/80 p-2 rounded-lg break-all">
                    Code: {cert.certificate_code}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-500">{new Date(cert.issued_at).toLocaleDateString()}</span>
                <button
                  onClick={() => setSelectedCert(cert)}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold shadow-md transition cursor-pointer"
                >
                  View Credential
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Printable Certificate Modal */}
      {selectedCert && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-8 shadow-2xl space-y-6 relative">
            <button
              onClick={() => setSelectedCert(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Certificate Canvas */}
            <div className="border-4 border-double border-amber-500/40 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-8 rounded-2xl text-center space-y-6">
              <div className="flex items-center justify-center gap-2">
                <ShieldCheck className="w-8 h-8 text-amber-400" />
                <span className="text-sm font-mono tracking-widest text-amber-400 uppercase font-bold">
                  ApexAssess Verified Credential
                </span>
              </div>

              <div className="space-y-1">
                <div className="text-xs uppercase tracking-widest text-slate-400 font-serif">This certifies that</div>
                <div className="text-2xl font-black text-white font-serif">{selectedCert.user_name}</div>
                <div className="text-xs text-slate-400">has successfully passed the comprehensive assessment</div>
              </div>

              <div className="text-xl font-bold text-amber-300 font-serif px-4 py-2 bg-amber-500/10 rounded-xl inline-block border border-amber-500/20">
                {selectedCert.quiz_title}
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400 border-t border-amber-500/20 pt-4 font-mono">
                <div>
                  <span className="block text-[10px] text-slate-500">SCORE</span>
                  <strong className="text-white">{selectedCert.percentage}%</strong>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-500">DATE</span>
                  <strong className="text-white">{new Date(selectedCert.issued_at).toLocaleDateString()}</strong>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-500">VERIFICATION CODE</span>
                  <strong className="text-amber-400">{selectedCert.certificate_code}</strong>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl flex items-center gap-2 transition"
              >
                <Printer className="w-4 h-4" />
                Print / Save PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
