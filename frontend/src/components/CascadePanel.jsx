import { useState, useEffect, useCallback } from 'react';
import { useFindingInsight } from '../hooks/useFindingInsight';
import { cascadeAPI } from '../utils/api';
import { CASCADE_ENABLED } from '../utils/cascadeUtils';

function CascadePanel({ finding, scanId, onDismiss }) {
  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem('cascade_panel_dismissed') === 'true';
    } catch {
      return false;
    }
  });
  const [quickRating, setQuickRating] = useState(null);
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  const [ratingLoading, setRatingLoading] = useState(false);

  const {
    relatedGroups,
    loading: groupsLoading,
    error: groupsError,
    getTags,
  } = useFindingInsight(finding?.id, finding);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
    try {
      sessionStorage.setItem('cascade_panel_dismissed', 'true');
    } catch {
      // ignore storage error
    }
    onDismiss?.();
  }, [onDismiss]);

  const handleQuickRating = async (rating) => {
    if (!scanId || ratingSubmitted) return;

    setRatingLoading(true);
    try {
      await cascadeAPI.submitFeedback(scanId, rating);
      setRatingSubmitted(true);
      setQuickRating(rating);
    } catch (error) {
      console.error('Failed to submit quick rating:', error);
    } finally {
      setRatingLoading(false);
    }
  };

  // Reset dismissed state when finding changes
  useEffect(() => {
    if (finding?.id) {
      const timer = setTimeout(() => {
        try {
          const dismissedState = sessionStorage.getItem('cascade_panel_dismissed');
          if (dismissedState !== 'true') {
            setDismissed(false);
          }
        } catch {
          setDismissed(false);
        }
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [finding?.id]);

  if (!CASCADE_ENABLED || dismissed || !finding) {
    return null;
  }

  const tags = getTags();

  return (
    <div className="cascade-panel absolute bottom-4 right-4 z-40 w-[320px] max-w-[calc(100vw-2rem)] animate-in slide-in-from-right-4 duration-300">
      <div className="bg-[#0a0a0a] border border-[#1e1e1e] rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#1e1e1e]">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#7F77DD]" />
            <span className="text-[11px] font-mono font-semibold text-[#ccc] uppercase tracking-wider">
              Related Discussions
            </span>
          </div>
          <button
            onClick={handleDismiss}
            className="text-[#555] hover:text-white transition-colors bg-transparent border-none cursor-pointer p-1"
            aria-label="Dismiss panel"
          >
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <line x1={18} y1={6} x2={6} y2={18} />
              <line x1={6} y1={6} x2={18} y2={18} />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Related Groups */}
          {groupsLoading ? (
            <div className="flex items-center justify-center py-4">
              <div className="w-3 h-3 border-2 border-[#7F77DD] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : groupsError ? (
            <div className="text-[11px] text-[#E24B4A] text-center py-2">
              Failed to load discussions
            </div>
          ) : relatedGroups.length > 0 ? (
            <div className="space-y-2">
              <p className="text-[10px] text-[#555] font-mono uppercase tracking-wider">
                Groups discussing this topic
              </p>
              {relatedGroups.slice(0, 3).map((group) => (
                <a
                  key={group.id}
                  href={`/main/community?group=${group.id}`}
                  className="block bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-3 hover:border-[#3a3a3a] transition-colors no-underline"
                >
                  <p className="text-[12px] font-semibold text-[#ccc] mb-1">
                    {group.name}
                  </p>
                  <p className="text-[10px] text-[#666]">
                    {group.category} • {group.member_count} members
                  </p>
                </a>
              ))}
              {tags.length > 0 && (
                <a
                  href={`/main/community?tags=${tags.join(',')}`}
                  className="block text-[11px] text-[#7F77DD] hover:text-[#9f99e8] text-center py-2 no-underline transition-colors"
                >
                  Browse all discussions about {tags[0]}
                </a>
              )}
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-[11px] text-[#555] mb-2">
                No related discussions yet
              </p>
              <a
                href="/main/community"
                className="text-[11px] text-[#7F77DD] hover:text-[#9f99e8] no-underline transition-colors"
              >
                Browse the community
              </a>
            </div>
          )}

          {/* Quick Rating */}
          {!ratingSubmitted && (
            <div className="pt-3 border-t border-[#1e1e1e]">
              <p className="text-[10px] text-[#555] font-mono uppercase tracking-wider mb-2">
                How's this report working for you?
              </p>
              <div className="flex gap-2 justify-center">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <button
                    key={rating}
                    onClick={() => handleQuickRating(rating)}
                    disabled={ratingLoading}
                    className={`w-8 h-8 rounded-lg border transition-all cursor-pointer font-mono text-[11px] ${
                      quickRating === rating
                        ? 'bg-[#7F77DD] border-[#7F77DD] text-white'
                        : 'bg-[#1a1a1a] border-[#2a2a2a] text-[#888] hover:border-[#3a3a3a] hover:text-white'
                    } ${ratingLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    aria-label={`Rate ${rating} out of 5`}
                  >
                    {rating}
                  </button>
                ))}
              </div>
            </div>
          )}

          {ratingSubmitted && (
            <div className="pt-3 border-t border-[#1e1e1e] text-center">
              <p className="text-[11px] text-[#639922]">
                Thanks for your feedback!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default CascadePanel;
