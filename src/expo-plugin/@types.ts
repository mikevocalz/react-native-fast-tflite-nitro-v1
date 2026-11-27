export type ConfigProps = {
  /**
   * Ignored. The CoreML delegate is linked by default through SwiftPM; build
   * with FAST_TFLITE_ENABLE_CORE_ML=0 to leave it out.
   * @deprecated
   */
  enableCoreMLDelegate?: boolean
  /**
   * Whether to enable the GPU acceleration delegate for GPU, by including related native libraries.
   * You can leave it as boolean for an array of native libraries.
   *
   * If enabled, "libOpenCL.so" will always be included.
   *
   * When ran prebuild, it will yield following result.
   *
   * ```xml
   * <uses-native-library android:name="libOpenCL.so" android:required="false"/>
   * ```
   *
   * @example
   * You can include more native libraries if needed.
   * ```json
   * [
   *   "react-native-fast-tflite",
   *   {
   *     "enableAndroidGpuLibraries": ["libOpenCL-pixel.so", "libGLES_mali.so"]
   *   }
   * ]
   * ```
   *
   *
   * @default false
   */
  enableAndroidGpuLibraries?: boolean | string[]
} | void
