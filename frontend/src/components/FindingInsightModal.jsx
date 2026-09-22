import { useState, useEffect, useRef } from 'react';
import { useFindingInsight } from '../hooks/useFindingInsight';
import { CASCADE_ENABLED } from '../utils/cascadeUtils';
import { useTheme } from '../contexts/ThemeContext';

const severityColors = {
  critical: '#E24B4A',
  high: '#E24B4A',
  medium: '#BA7517',
  low: '#639922',
  'good-news': '#7F77DD',
};

function FindingInsightModal({ finding, isOpen, onClose }) {
  const { isLight } = useTheme();
  const [showExplanation, setShowExplanation] = useState(false);
  const [userChoice, setUserChoice] = useState(null); // 'explain' | 'skip' | null
  const modalRef = useRef(null);

  const {
    loading,
    error,
    getExplanation,
    getRemediationSteps,
    getTags,
    hasInsight,
  } = useFindingInsight(finding?.id, finding);

  // Store previous active element to restore focus when modal closes
  const previousActiveElementRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      previousActiveElementRef.current = document.activeElement;
    } else if (previousActiveElementRef.current && typeof previousActiveElementRef.current.focus === 'function') {
      previousActiveElementRef.current.focus();
      previousActiveElementRef.current = null;
    }
  }, [isOpen]);

  // Handle Escape key to close modal
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Focus trap
  useEffect(() => {
    if (!isOpen || !modalRef.current) return;

    const focusableElements = modalRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleTab = (e) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener('keydown', handleTab);
    firstElement?.focus();

    return () => document.removeEventListener('keydown', handleTab);
  }, [isOpen]);

  // Check session storage for user's previous choice
  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      try {
        const sessionKey = `cascade_choice_${finding?.id}`;
        const savedChoice = sessionStorage.getItem(sessionKey);
        if (savedChoice) {
          setUserChoice(savedChoice);
          if (savedChoice === 'explain') {
            setShowExplanation(true);
          }
        } else {
          setUserChoice(null);
          setShowExplanation(false);
        }
      } catch {
        setUserChoice(null);
        setShowExplanation(false);
      }
    }, 0);

    return () => clearTimeout(timer);
  }, [isOpen, finding?.id]);

  // Save user choice to session storage
  const handleChoice = (choice) => {
    setUserChoice(choice);
    const sessionKey = `cascade_choice_${finding?.id}`;
    sessionStorage.setItem(sessionKey, choice);

    if (choice === 'explain') {
      setShowExplanation(true);
    } else {
      onClose();
    }
  };

  if (!CASCADE_ENABLED || !isOpen || !finding) {
    return null;
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center transition-colors ${
        isLight ? "bg-slate-900/40 backdrop-blur-sm" : "bg-black/85"
      }`}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        ref={modalRef}
        className={`w-full max-w-[500px] rounded-xl p-6 m-4 max-h-[90vh] overflow-y-auto transition-all duration-200 ${
          isLight
            ? "bg-white border border-slate-200 text-slate-900 shadow-2xl"
            : "bg-[#0a0a0a] border border-[#1e1e1e] text-[#e0e0e0]"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span
                className="text-[10px] font-mono rounded-md px-2 py-1"
                style={{
                  background: severityColors[finding.severity] + '20',
                  color: severityColors[finding.severity],
                }}
              >
                {finding.severity.toUpperCase()}
              </span>
              <span className={`text-[10px] font-mono ${isLight ? "text-slate-400" : "text-[#555]"}`}>
                {finding.category}
              </span>
            </div>
            <h2
              id="modal-title"
              className={`text-[15px] font-semibold leading-tight ${
                isLight ? "text-slate-900" : "text-white"
              }`}
            >
              {finding.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className={`ml-4 transition-colors bg-transparent border-none cursor-pointer ${
              isLight ? "text-slate-400 hover:text-slate-900" : "text-[#555] hover:text-white"
            }`}
            aria-label="Close modal"
          >
            <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <line x1={18} y1={6} x2={6} y2={18} />
              <line x1={6} y1={6} x2={18} y2={18} />
            </svg>
          </button>
        </div>

        {/* Initial choice screen */}
        {!userChoice && !showExplanation && (
          <div className="space-y-4">
            <p className={`text-[12px] leading-relaxed ${isLight ? "text-slate-600" : "text-[#b0b3b8]"}`}>
              Would you like a plain-language explanation of this finding?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => handleChoice('explain')}
                className={`flex-1 rounded-lg text-[12px] font-mono py-3 px-4 transition-colors cursor-pointer ${
                  isLight
                    ? "bg-violet-50 border border-violet-200 text-violet-700 hover:bg-violet-100"
                    : "bg-[#7F77DD]/10 border border-[#7F77DD]/30 text-[#7F77DD] hover:bg-[#7F77DD]/20"
                }`}
              >
                Explain in plain terms
              </button>
              <button
                onClick={() => handleChoice('skip')}
                className={`flex-1 rounded-lg text-[12px] font-mono py-3 px-4 transition-colors cursor-pointer ${
                  isLight
                    ? "bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200 hover:text-slate-900"
                    : "bg-[#1a1a1a] border border-[#2a2a2a] text-[#888] hover:border-[#3a3a3a] hover:text-white"
                }`}
              >
                No thanks, show raw finding
              </button>
            </div>
          </div>
        )}

        {/* Explanation view */}
        {(showExplanation || userChoice === 'explain') && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-4 h-4 border-2 border-[#7F77DD] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : error ? (
              <div className="bg-[#E24B4A]/10 border border-[#E24B4A]/30 rounded-lg p-4">
                <p className="text-[12px] text-[#E24B4A] mb-3">
                  Failed to load explanation.
                </p>
                <button
                  onClick={() => window.location.reload()}
                  className="text-[11px] text-[#E24B4A] underline cursor-pointer"
                >
                  Retry
                </button>
              </div>
            ) : !hasInsight ? (
              <div className={`rounded-lg p-4 ${
                isLight ? "bg-slate-50 border border-slate-200 text-slate-600" : "bg-[#1a1a1a] border border-[#2a2a2a] text-[#b0b3b8]"
              }`}>
                <p className="text-[12px] mb-3">
                  No automated explanation available for this finding yet.
                </p>
                {finding.recommendation && (
                  <div>
                    <p className={`text-[10px] font-semibold mb-2 ${isLight ? "text-slate-800" : "text-[#ccc]"}`}>
                      Scanner recommendation
                    </p>
                    <p className={`text-[11px] ${isLight ? "text-slate-600" : "text-[#b0b3b8]"}`}>
                      {finding.recommendation}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* Explanation */}
                {getExplanation() && (
                  <div className={`rounded-lg p-4 ${
                    isLight ? "bg-emerald-50/80 border border-emerald-200" : "bg-[#1a2e1a]/30 border border-[#1a2e1a]/50"
                  }`}>
                    <p className="text-[10px] font-semibold text-[#0D9488] mb-2">
                      What this means
                    </p>
                    <p className={`text-[12px] leading-relaxed ${isLight ? "text-emerald-950" : "text-[#b0b3b8]"}`}>
                      {getExplanation()}
                    </p>
                  </div>
                )}

                {/* Remediation steps */}
                {getRemediationSteps().length > 0 && (
                  <div className={`rounded-lg p-4 ${
                    isLight ? "bg-slate-50 border border-slate-200" : "bg-[#1a1a1a] border border-[#2a2a2a]"
                  }`}>
                    <p className={`text-[10px] font-semibold mb-3 ${isLight ? "text-slate-800" : "text-[#ccc]"}`}>
                      How to fix it
                    </p>
                    <ol className="space-y-2">
                      {getRemediationSteps().map((step, index) => (
                        <li
                          key={index}
                          className={`text-[12px] leading-relaxed flex gap-2 ${
                            isLight ? "text-slate-700" : "text-[#b0b3b8]"
                          }`}
                        >
                          <span className="text-[#7F77DD] font-mono shrink-0 font-bold">
                            {index + 1}.
                          </span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                {/* Original recommendation */}
                {finding.recommendation && (
                  <div className={`rounded-lg p-4 ${
                    isLight ? "bg-slate-50 border border-slate-200" : "bg-[#1a1a1a] border border-[#2a2a2a]"
                  }`}>
                    <p className={`text-[10px] font-semibold mb-2 ${isLight ? "text-slate-800" : "text-[#ccc]"}`}>
                      Scanner recommendation
                    </p>
                    <p className={`text-[11px] ${isLight ? "text-slate-600" : "text-[#b0b3b8]"}`}>
                      {finding.recommendation}
                    </p>
                  </div>
                )}

                {/* Discuss in community button */}
                {getTags().length > 0 && (
                  <a
                    href={`/main/community?tags=${getTags().join(',')}`}
                    className={`block w-full rounded-lg text-[11px] font-mono py-2.5 px-3 text-center transition-colors no-underline ${
                      isLight
                        ? "bg-violet-50 border border-violet-200 text-violet-700 hover:bg-violet-100"
                        : "bg-[#7F77DD]/10 border border-[#7F77DD]/30 text-[#7F77DD] hover:bg-[#7F77DD]/20"
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onClose();
                    }}
                  >
                    Discuss in community
                  </a>
                )}
              </>
            )}

            {/* Close button */}
            <button
              onClick={onClose}
              className={`w-full rounded-lg text-[12px] font-mono tracking-widest uppercase py-3 cursor-pointer transition-colors ${
                isLight
                  ? "bg-slate-900 text-white hover:bg-slate-800"
                  : "bg-[#141414] border border-[#2a2a2a] text-[#ccc] hover:border-[#3a3a3a] hover:text-white"
              }`}
            >
              Got it
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default FindingInsightModal;
