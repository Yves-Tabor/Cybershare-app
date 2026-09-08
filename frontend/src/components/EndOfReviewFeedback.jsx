import { useState } from 'react';
import { cascadeAPI } from '../utils/api';
import { CASCADE_ENABLED } from '../utils/cascadeUtils';

function EndOfReviewFeedback({ scanId, onDismiss, onSubmit }) {
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
    <div className="bg-[#0a0a0a] border border-[#1e1e1e] rounded-xl p-6 mt-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-[13px] font-semibold text-white mb-1">
            Report Review Complete
          </h3>
          <p className="text-[11px] text-[#888]">
            Help us improve your experience
          </p>
        </div>
        <button
          onClick={onDismiss}
          className="text-[#555] hover:text-white transition-colors bg-transparent border-none cursor-pointer"
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
          <label className="block text-[10px] font-mono text-[#888] uppercase tracking-wider mb-2">
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
          <label htmlFor="feedback-comment" className="block text-[10px] font-mono text-[#888] uppercase tracking-wider mb-2">
            Any additional feedback? (optional)
          </label>
          <textarea
            id="feedback-comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Tell us what worked well or what could be improved..."
            rows={3}
            className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-[12px] text-[#ccc] p-3 outline-none focus:border-[#3a3a3a] resize-none placeholder:text-[#333]"
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
            className="flex-1 bg-[#7F77DD]/10 border border-[#7F77DD]/30 rounded-lg text-[12px] font-mono text-[#7F77DD] py-3 px-4 hover:bg-[#7F77DD]/20 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Submitting...' : 'Submit Feedback'}
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-[12px] font-mono text-[#888] py-3 px-4 hover:border-[#3a3a3a] hover:text-white transition-colors cursor-pointer"
          >
            Skip
          </button>
        </div>
      </form>
    </div>
  );
}

export default EndOfReviewFeedback;
