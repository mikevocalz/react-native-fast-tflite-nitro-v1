/**
 * A hardware-accelerated delegate that TensorFlow Lite can run a model on.
 *
 * - `core-ml`: Apple's CoreML delegate (iOS)
 * - `metal`: Apple's Metal delegate (not supported yet, throws)
 * - `nnapi`: Android's Neural Networks API delegate
 * - `android-gpu`: TensorFlow Lite's GPU delegate (Android)
 */
export type TensorflowModelDelegate =
  | 'metal'
  | 'core-ml'
  | 'nnapi'
  | 'android-gpu'
