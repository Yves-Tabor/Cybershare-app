import { useState } from 'react';
import { cascadeAPI } from '../utils/api';
import { CASCADE_ENABLED } from '../utils/cascadeUtils';
import { useTheme } from '../contexts/ThemeContext';

function EndOfReviewFeedback({ scanId, onDismiss, onSubmit }) {
  const { isLight } = useTheme();
  const [rating, setRating] = useState(null);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!rating || !scanId) return;

    setLoading(true);
    setError(null);

    try {
      await cascadeAPI.submitFeedback(scanId, rating, comment || null);
      setSubmitted(true);
      onSubmit?.();
    } catch (err) {
      setError(err.message || 'Failed to submit feedback');
    } finally {
      setLoading(false);
    }
  };

  if (!CASCADE_ENABLED || submitted) {
    return null;
  }

  return (
    <div className={`rounded-xl p-6 mt-8 animate-in fade-in slide-in-from-bottom-4 duration-300 transition-all ${
      isLight
        ? "bg-white border border-slate-200 text-slate-900 shadow-lg"
        : "bg-[#0a0a0a] border border-[#1e1e1e] text-[#e0e0e0]"
    }`}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className={`text-[13px] font-semibold mb-1 ${
            isLight ? "text-slate-900" : "text-white"
          }`}>
            Report Review Complete
          </h3>
          <p className={`text-[11px] ${
            isLight ? "text-slate-500" : "text-[#888]"
          }`}>
            Help us improve your experience
          </p>
        </div>
        <button
          onClick={onDismiss}
          className={`transition-colors bg-transparent border-none cursor-pointer ${
            isLight ? "text-slate-400 hover:text-slate-900" : "text-[#555] hover:text-white"
          }`}
          aria-label="Dismiss feedback"
        >
          <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <line x1={18} y1={6} x2={6} y2={18} />
            <line x1={6} y1={6} x2={18} y2={18} />
          </svg>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Rating */}
        <div>
          <label className={`block text-[10px] font-mono uppercase tracking-wider mb-2 ${
            isLight ? "text-slate-500" : "text-[#888]"
          }`}>
            Was this report clear?
          </label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setRating(value)}
                className={`w-10 h-10 rounded-lg border transition-all cursor-pointer font-mono text-[12px] ${
                  rating === value
                    ? 'bg-[#7F77DD] border-[#7F77DD] text-white'
                    : isLight
                      ? 'bg-slate-100 border-slate-200 text-slate-700 hover:border-slate-300 hover:text-slate-900'
                      : 'bg-[#1a1a1a] border-[#2a2a2a] text-[#888] hover:border-[#3a3a3a] hover:text-white'
                }`}
                aria-label={`Rate ${value} out of 5`}
              >
                {value}
              </button>
            ))}
          </div>
        </div>

        {/* Optional comment */}
        <div>
          <label htmlFor="feedback-comment" className={`block text-[10px] font-mono uppercase tracking-wider mb-2 ${
            isLight ? "text-slate-500" : "text-[#888]"
          }`}>
            Any additional feedback? (optional)
          </label>
          <textarea
            id="feedback-comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Tell us what worked well or what could be improved..."
            rows={3}
            className={`w-full rounded-lg text-[12px] p-3 outline-none resize-none transition-colors ${
              isLight
                ? "bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-[#7F77DD]"
                : "bg-[#1a1a1a] border border-[#2a2a2a] text-[#ccc] placeholder:text-[#444] focus:border-[#3a3a3a]"
            }`}
          />
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-[#E24B4A]/10 border border-[#E24B4A]/30 rounded-lg p-3">
            <p className="text-[11px] text-[#E24B4A]">{error}</p>
          </div>
        )}

        {/* Submit button */}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={!rating || loading}
            className={`flex-1 rounded-lg text-[12px] font-mono py-3 px-4 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
              isLight
                ? "bg-violet-50 border border-violet-200 text-violet-700 hover:bg-violet-100"
                : "bg-[#7F77DD]/10 border border-[#7F77DD]/30 text-[#7F77DD] hover:bg-[#7F77DD]/20"
            }`}
          >
            {loading ? 'Submitting...' : 'Submit Feedback'}
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className={`flex-1 rounded-lg text-[12px] font-mono py-3 px-4 transition-colors cursor-pointer ${
              isLight
                ? "bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200"
                : "bg-[#1a1a1a] border border-[#2a2a2a] text-[#888] hover:border-[#3a3a3a] hover:text-white"
            }`}
          >
            Skip
          </button>
        </div>
      </form>
    </div>
  );
}

export default EndOfReviewFeedback;
