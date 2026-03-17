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
 * Only substantive analyses (is_substantive !== false) are used.
 * Face detection violations reduce the final score with explanation.
 */

/**
 * Extract substantive analysis objects from transcript entries.
 * @param {Array<Object>} transcript
 * @returns {Array<Object>}
 */
function extractAnalyses(transcript) {
  if (!Array.isArray(transcript)) return [];
  return transcript
    .map((entry) => entry && entry.analysis)
    .filter((a) => a && typeof a === "object" && a.is_substantive !== false);
}

/**
 * Compute aggregate behavioral score (0-100).
 *
 * Uses ORIGINAL metrics:
 * - hesitation_rate (lower is better)
 * - filler_word_count (lower is better)
 * - interruptions (lower is better)
 *
 * Plus NEW metric:
 * - vocabulary_richness (higher is better)
 *
 * @param {Array<Object>} analyses
 * @returns {number}
 */
function computeBehavioralScore(analyses) {
  if (!analyses.length) return 0;

  let totalHesitation = 0;
  let totalFillers = 0;
  let totalInterruptions = 0;
  let totalVocab = 0;

  for (const a of analyses) {
    totalHesitation += Number(a.hesitation_rate ?? 0);
    totalFillers += Number(a.filler_word_count ?? 0);
    totalInterruptions += Number(a.interruptions ?? 0);
    totalVocab += Number(a.vocabulary_richness ?? 0);
  }

  const n = analyses.length;
  const avgHesitation = totalHesitation / n;
  const avgFillers = totalFillers / n;
  const avgInterruptions = totalInterruptions / n;
  const avgVocab = totalVocab / n;

  // Hesitation component (0-30): 0% -> 30, 30%+ -> 0
  const hesitationComponent = Math.max(
    0,
    30 * (1 - Math.min(avgHesitation, 30) / 30)
  );

  // Filler component (0-25): 0 -> 25, 5+ fillers/answer -> 0
  const fillerComponent = Math.max(
    0,
    25 * (1 - Math.min(avgFillers, 5) / 5)
  );

  // Interruptions component (0-25): 0 -> 25, 3+ -> 0
  const interruptionComponent = Math.max(
    0,
    25 * (1 - Math.min(avgInterruptions, 3) / 3)
  );

  // Vocabulary component (0-20): richer = better
  const vocabComponent = avgVocab * 20;

  const behavioralScore =
    hesitationComponent + fillerComponent + interruptionComponent + vocabComponent;

  return Math.max(0, Math.min(100, behavioralScore));
}

/**
 * Compute confidence trend score (0-100).
 * @param {Array<Object>} analyses
 * @returns {number}
 */
function computeConfidenceTrendScore(analyses) {
  if (!analyses.length) return 0;

  let totalConfidence = 0;
  let count = 0;

  for (const a of analyses) {
    const score = Number(a.confidence_score ?? 0);
    if (score > 0) {
      totalConfidence += score;
      count += 1;
    }
  }

  if (!count) return 0;
  return Math.max(0, Math.min(100, totalConfidence / count));
}

/**
 * Compute communication clarity (0-100).
 * @param {number} behavioralScore
 * @param {number} confidenceTrendScore
 * @returns {number}
 */
function computeCommunicationClarityScore(behavioralScore, confidenceTrendScore) {
  return Math.max(0, Math.min(100, 0.6 * behavioralScore + 0.4 * confidenceTrendScore));
}

/**
 * Compute content quality score (0-100) from overall rating (0-10).
 * @param {number} rating
 * @returns {number}
 */
function computeContentQualityScore(rating) {
  if (rating == null || Number.isNaN(Number(rating))) return 0;
  return Math.max(0, Math.min(100, (Number(rating) / 10) * 100));
}

/**
 * Apply face detection penalty.
 * @param {number} baseScore
 * @param {Object} faceStats
 * @returns {{ adjustedScore: number, penalty: number, reasons: string[] }}
 */
function applyFaceDetectionPenalty(baseScore, faceStats) {
  if (!faceStats || !faceStats.totalChecks) {
    return { adjustedScore: baseScore, penalty: 0, reasons: [] };
  }

  const { totalChecks, noFaceCount = 0, multipleFaceCount = 0 } = faceStats;
  const reasons = [];
  let totalPenalty = 0;

  if (noFaceCount > 0) {
    const noFaceRate = noFaceCount / totalChecks;
    const penalty = Math.min(10, noFaceRate * 20);
    totalPenalty += penalty;
    reasons.push(
      `Face not detected in ${noFaceCount}/${totalChecks} checks (${(noFaceRate * 100).toFixed(0)}%) — ${penalty.toFixed(1)}% penalty`
    );
  }

  if (multipleFaceCount > 0) {
    const penalty = Math.min(15, multipleFaceCount * 3);
    totalPenalty += penalty;
    reasons.push(
      `Multiple faces detected ${multipleFaceCount} time(s) — ${penalty.toFixed(1)}% penalty. Only the candidate should be visible.`
    );
  }

  return {
    adjustedScore: Number(Math.max(0, baseScore - totalPenalty).toFixed(1)),
    penalty: Number(totalPenalty.toFixed(1)),
    reasons,
  };
}

/**
 * Compute full scoring breakdown for an interview.
 *
 * @param {Object} params
 * @param {number} params.rating
 * @param {Array<Object>} params.transcript
 * @param {Object} [params.faceStats]
 * @returns {{ total_score: number, breakdown: Object, face_penalty: Object|null }}
 */
function computeInterviewScore({ rating, transcript, faceStats = null }) {
  const analyses = extractAnalyses(transcript);

  const behavioralScore = computeBehavioralScore(analyses);
  const confidenceTrendScore = computeConfidenceTrendScore(analyses);
  const contentQualityScore = computeContentQualityScore(rating);
  const communicationClarityScore = computeCommunicationClarityScore(
    behavioralScore,
    confidenceTrendScore
  );

  let totalScore =
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

  let facePenalty = null;
  if (faceStats && faceStats.totalChecks > 0) {
    const penaltyResult = applyFaceDetectionPenalty(totalScore, faceStats);
    totalScore = penaltyResult.adjustedScore;
    facePenalty = {
      penalty: penaltyResult.penalty,
      reasons: penaltyResult.reasons,
    };
  }

  return {
    total_score: Number(totalScore.toFixed(1)),
    breakdown,
    face_penalty: facePenalty,
  };
}

module.exports = {
  computeInterviewScore,
  applyFaceDetectionPenalty,
};
