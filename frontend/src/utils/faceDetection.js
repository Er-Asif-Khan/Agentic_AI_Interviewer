/**
 * Real-time face detection utility using face-api.js TinyFaceDetector.
 *
 * Provides:
 * - Model loading
 * - Face count detection from a <video> element
 * - Detection loop management (start/stop)
 *
 * The TinyFaceDetector model weights must be available at /models/
 */

import * as faceapi from "face-api.js";

let modelsLoaded = false;

/**
 * Load the TinyFaceDetector model weights.
 * Call this once before starting detection.
 */
export async function loadFaceDetectionModels() {
  if (modelsLoaded) return;

  try {
    await faceapi.nets.tinyFaceDetector.loadFromUri("/models");
    modelsLoaded = true;
    console.log("[FaceDetection] TinyFaceDetector model loaded.");
  } catch (err) {
    console.error("[FaceDetection] Failed to load model:", err.message);
    throw err;
  }
}

/**
 * Detect faces in the given video element.
 * @param {HTMLVideoElement} videoElement
 * @returns {Promise<number>} Number of faces detected
 */
export async function detectFaces(videoElement) {
  if (!modelsLoaded || !videoElement || videoElement.paused || videoElement.ended) {
    return -1; // -1 indicates detection not possible
  }

  try {
    const detections = await faceapi.detectAllFaces(
      videoElement,
      new faceapi.TinyFaceDetectorOptions({
        inputSize: 224,
        scoreThreshold: 0.5,
      })
    );
    return detections.length;
  } catch (err) {
    console.warn("[FaceDetection] Detection error:", err.message);
    return -1;
  }
}

/**
 * Create a managed face detection loop.
 *
 * @param {React.RefObject<HTMLVideoElement>} videoRef - Ref to the video element
 * @param {Function} onResult - Callback called with face count (0, 1, 2+, or -1 for error)
 * @param {number} intervalMs - Detection interval in milliseconds (default: 2000)
 * @returns {{ start: () => void, stop: () => void }}
 */
export function createFaceDetectionLoop(videoRef, onResult, intervalMs = 2000) {
  let intervalId = null;
  let running = false;

  const start = () => {
    if (running) return;
    running = true;

    intervalId = setInterval(async () => {
      if (!running) return;

      const video = videoRef.current;
      if (!video || video.paused || video.ended || !video.srcObject) return;

      const faceCount = await detectFaces(video);
      if (faceCount >= 0) {
        onResult(faceCount);
      }
    }, intervalMs);
  };

  const stop = () => {
    running = false;
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  };

  return { start, stop };
}

export function isModelLoaded() {
  return modelsLoaded;
}
