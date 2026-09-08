import { useState, useEffect, useCallback, useRef } from 'react';
import { cascadeAPI } from '../utils/api';
import { interpolateTemplate, CASCADE_ENABLED } from '../utils/cascadeUtils';

/**
 * Custom hook for fetching finding insights, vulnerability types, and related groups
 * Handles loading states, error handling, and template interpolation
 * Includes debouncing to prevent overlapping requests
 */
export function useFindingInsight(resultId, findingData) {
  const [vulnerabilityType, setVulnerabilityType] = useState(null);
  const [relatedGroups, setRelatedGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const abortControllerRef = useRef(null);
  const debounceTimerRef = useRef(null);

  const fetchInsightData = useCallback(async () => {
    if (!CASCADE_ENABLED || !resultId) {
      return;
    }

    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Clear any pending debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Debounce the request to prevent rapid-fire calls
    debounceTimerRef.current = setTimeout(async () => {
      abortControllerRef.current = new AbortController();
      setLoading(true);
      setError(null);

      try {
        // Fetch related groups
        const groupsData = await cascadeAPI.getRelatedGroups(resultId);
        setRelatedGroups(groupsData.groups || []);

        // If finding has type_slug, fetch vulnerability type
        if (findingData?.type_slug) {
          try {
            const typeData = await cascadeAPI.getVulnerabilityType(findingData.type_slug);
            setVulnerabilityType(typeData.vulnerabilityType);
          } catch (typeError) {
            // Graceful degradation - if type fetch fails, continue without it
            console.warn('Failed to fetch vulnerability type:', typeError);
            setVulnerabilityType(null);
          }
        }
      } catch (err) {
        // Don't set error if request was aborted
        if (err.name !== 'AbortError') {
          console.error('Failed to fetch insight data:', err);
          setError(err.message || 'Failed to load related discussions');
          setRelatedGroups([]);
          setVulnerabilityType(null);
        }
      } finally {
        setLoading(false);
        abortControllerRef.current = null;
      }
    }, 300); // 300ms debounce
  }, [resultId, findingData?.type_slug]);

  useEffect(() => {
    fetchInsightData();

    // Cleanup on unmount
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [fetchInsightData]);

  // Get interpolated explanation
  const getExplanation = useCallback(() => {
    if (!vulnerabilityType?.explanation_template) {
      return null;
    }
    return interpolateTemplate(vulnerabilityType.explanation_template, findingData);
  }, [vulnerabilityType, findingData]);

  // Get remediation steps
  const getRemediationSteps = useCallback(() => {
    if (!vulnerabilityType?.remediation_steps) {
      return [];
    }
    return Array.isArray(vulnerabilityType.remediation_steps)
      ? vulnerabilityType.remediation_steps
      : [];
  }, [vulnerabilityType]);

  // Get tags for finding
  const getTags = useCallback(() => {
    if (vulnerabilityType?.tags) {
      return vulnerabilityType.tags;
    }
    return [];
  }, [vulnerabilityType]);

  return {
    vulnerabilityType,
    relatedGroups,
    loading,
    error,
    getExplanation,
    getRemediationSteps,
    getTags,
    refetch: fetchInsightData,
    hasInsight: !!vulnerabilityType,
  };
}
