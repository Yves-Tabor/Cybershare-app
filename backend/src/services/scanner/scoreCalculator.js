/**
 * Security Score Calculator
 * Calculates security score based on scan findings
 */

const SEVERITY_DEDUCTIONS = {
  critical: 20,
  high: 10,
  medium: 5,
  low: 2,
  informational: 0,
};

const SCORE_RATINGS = {
  excellent: { min: 90, max: 100, label: 'Excellent' },
  good: { min: 75, max: 89, label: 'Good' },
  fair: { min: 50, max: 74, label: 'Fair' },
  poor: { min: 0, max: 49, label: 'Poor' },
};

function calculateSecurityScore(results) {
  let score = 100;
  const severityCounts = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    informational: 0,
  };

  // Count findings by severity and deduct points
  results.forEach(result => {
    const severity = result.severity?.toLowerCase() || 'informational';
    if (severityCounts.hasOwnProperty(severity)) {
      severityCounts[severity]++;
      score -= SEVERITY_DEDUCTIONS[severity];
    }
  });

  // Ensure score doesn't go below 0
  score = Math.max(0, score);

  // Determine rating
  let rating = SCORE_RATINGS.poor.label;
  if (score >= SCORE_RATINGS.excellent.min) {
    rating = SCORE_RATINGS.excellent.label;
  } else if (score >= SCORE_RATINGS.good.min) {
    rating = SCORE_RATINGS.good.label;
  } else if (score >= SCORE_RATINGS.fair.min) {
    rating = SCORE_RATINGS.fair.label;
  }

  return {
    score,
    rating,
    maxScore: 100,
    severityCounts,
    totalFindings: results.length,
  };
}

function getScoreRating(score) {
  if (score >= SCORE_RATINGS.excellent.min) {
    return SCORE_RATINGS.excellent.label;
  } else if (score >= SCORE_RATINGS.good.min) {
    return SCORE_RATINGS.good.label;
  } else if (score >= SCORE_RATINGS.fair.min) {
    return SCORE_RATINGS.fair.label;
  } else {
    return SCORE_RATINGS.poor.label;
  }
}

module.exports = {
  calculateSecurityScore,
  getScoreRating,
  SEVERITY_DEDUCTIONS,
  SCORE_RATINGS,
};
