/**
 * Behavioral-aware interview scoring utilities.
 *
 * Uses per-answer behavioral analysis stored in `transcript[i].analysis`
 * to compute a holistic score with the following weights:
 *
 * - Content Quality:        40%
 * - Communication Clarity:  25%
 * - Behavioral Metrics:     25%
 * - Confidence Trend:       10%
 *
 * Behavioral metrics consider:
 * - hesitation_rate
 * - filler_word_count
 * - interruptions
 *
 * Confidence trend uses:
 * - confidence_score
 */

/**
 * Safely extracts all analysis objects from transcript entries.
 * @param {Array<Object>} transcript
 * @returns {Array<Object>}
 */
function extractAnalyses(transcript) {
  if (!Array.isArray(transcript)) return [];
  return transcript
    .map((entry) => entry && entry.analysis)
    .filter((a) => a && typeof a === "object");
}

/**
 * Compute an aggregate behavioral score (0–100) from per-answer analyses.
 *
 * Behavioral metrics:
 * - hesitation_rate: lower is better
 * - filler_word_count: lower is better
 * - interruptions: lower is better
 *
 * The mapping is heuristic and intentionally simple.
 *
 * @param {Array<Object>} analyses
 * @returns {number}
 */
function computeBehavioralScore(analyses) {
  if (!analyses.length) return 0;

  let totalHesitation = 0;
  let totalFillers = 0;
  let totalInterruptions = 0;

  for (const a of analyses) {
    totalHesitation += Number(a.hesitation_rate ?? 0);
    totalFillers += Number(a.filler_word_count ?? 0);
    totalInterruptions += Number(a.interruptions ?? 0);
  }

  const n = analyses.length || 1;
  const avgHesitation = totalHesitation / n; // already a percentage
  const avgFillers = totalFillers / n;
  const avgInterruptions = totalInterruptions / n;

  // Hesitation component: 0% -> 100, 30%+ -> 0 (linear falloff)
  const hesitationComponent = Math.max(
    0,
    100 - Math.min(avgHesitation, 30) * (100 / 30)
  );

  // Filler component: 0 -> 100, 5+ fillers/answer -> 0 (linear falloff)
  const fillerComponent = Math.max(
    0,
    100 - Math.min(avgFillers, 5) * (100 / 5)
  );

  // Interruptions component: 0 -> 100, 3+ interruptions/answer -> 0
  const interruptionComponent = Math.max(
    0,
    100 - Math.min(avgInterruptions, 3) * (100 / 3)
  );

  const behavioralScore =
    (hesitationComponent + fillerComponent + interruptionComponent) / 3;

  return Math.max(0, Math.min(100, behavioralScore));
}

/**
 * Compute a confidence trend score (0–100) from per-answer analyses.
 *
 * Uses `confidence_score` from each analysis; missing values are treated as 0.
 *
 * @param {Array<Object>} analyses
 * @returns {number}
 */
function computeConfidenceTrendScore(analyses) {
  if (!analyses.length) return 0;

  let totalConfidence = 0;
  let count = 0;

  for (const a of analyses) {
    if (a.confidence_score != null) {
      totalConfidence += Number(a.confidence_score);
      count += 1;
    }
  }

  if (!count) return 0;

  const avgConfidence = totalConfidence / count;
  return Math.max(0, Math.min(100, avgConfidence));
}

/**
 * Compute communication clarity (0–100).
 *
 * Currently derived as a smoothed combination of:
 * - behavioral noise (hesitation, fillers, interruptions)
 * - confidence trend
 *
 * This keeps clarity correlated with both behavior and perceived confidence.
 *
 * @param {number} behavioralScore
 * @param {number} confidenceTrendScore
 * @returns {number}
 */
function computeCommunicationClarityScore(behavioralScore, confidenceTrendScore) {
  // Weight behavioral signal more heavily for clarity.
  const clarity =
    0.7 * behavioralScore +
    0.3 * confidenceTrendScore;

  return Math.max(0, Math.min(100, clarity));
}

/**
 * Compute content quality score (0–100) from overall rating (0–10).
 *
 * This uses the existing numeric rating as the primary proxy for content.
 *
 * @param {number} rating
 * @returns {number}
 */
function computeContentQualityScore(rating) {
  if (rating == null || Number.isNaN(Number(rating))) return 0;
  const normalized = (Number(rating) / 10) * 100;
  return Math.max(0, Math.min(100, normalized));
}

/**
 * Compute the full scoring breakdown for an interview.
 *
 * Weights:
 * - Content Quality:        40%
 * - Communication Clarity:  25%
 * - Behavioral Metrics:     25%
 * - Confidence Trend:       10%
 *
 * @param {Object} params
 * @param {number} params.rating - Overall numeric rating (0–10)
 * @param {Array<Object>} params.transcript - Transcript entries with `analysis`
 * @returns {{
 *   total_score: number,
 *   breakdown: {
 *     content_quality: number,
 *     communication_clarity: number,
 *     behavioral_analysis: number,
 *     confidence_trend: number
 *   }
 * }}
 */
function computeInterviewScore({ rating, transcript }) {
  const analyses = extractAnalyses(transcript);

  const behavioralScore = computeBehavioralScore(analyses);
  const confidenceTrendScore = computeConfidenceTrendScore(analyses);
  const contentQualityScore = computeContentQualityScore(rating);
  const communicationClarityScore = computeCommunicationClarityScore(
    behavioralScore,
    confidenceTrendScore
  );

  const totalScore =
    contentQualityScore * 0.4 +
    communicationClarityScore * 0.25 +
    behavioralScore * 0.25 +
    confidenceTrendScore * 0.1;

  const breakdown = {
    content_quality: Number(contentQualityScore.toFixed(1)),
    communication_clarity: Number(communicationClarityScore.toFixed(1)),
    behavioral_analysis: Number(behavioralScore.toFixed(1)),
    confidence_trend: Number(confidenceTrendScore.toFixed(1)),
  };

  return {
    total_score: Number(totalScore.toFixed(1)),
    breakdown,
  };
}

module.exports = {
  computeInterviewScore,
};

