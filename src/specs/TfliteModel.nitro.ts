import { Android, Apple, type HybridObject } from 'nitro-core'
import type { Tensor } from './Tensor'
import type { TensorflowModelDelegate } from './TensorflowModelDelegate'

export * from '#nitro/TfliteModel'

/**
 * A loaded TensorFlow Lite model.
 *
 * Create one with `loadTensorflowModel(...)` or `useTensorflowModel(...)`.
 * This class has no public constructor.
 */
@Apple({
  language: 'c++',
  implementation: {
    className: 'HybridTfliteModel',
    include: '"HybridTfliteModel.hpp"',
  },
})
@Android({
  language: 'c++',
  implementation: {
    className: 'HybridTfliteModel',
    include: '"HybridTfliteModel.hpp"',
  },
})
export declare class TfliteModel extends HybridObject {
  /**
   * The hardware-accelerated delegates this model was created with.
   * Empty if the model runs on the default CPU delegate.
   */
  readonly delegates: TensorflowModelDelegate[]
  /**
   * The model's input tensors.
   */
  readonly inputs: Tensor[]
  /**
   * The model's output tensors.
   */
  readonly outputs: Tensor[]
  /**
   * Run the model synchronously on the calling thread, for example inside a
   * VisionCamera Frame Processor worklet.
   *
   * Pass one {@linkcode ArrayBuffer} per input tensor. Returns one
   * {@linkcode ArrayBuffer} per output tensor. The output buffers are owned by
   * this model and are reused (overwritten) by the next run.
   */
  runSync(input: ArrayBuffer[]): ArrayBuffer[]
  /**
   * Run the model on a background thread.
   *
   * The input buffers are copied into the input tensors before this method
   * returns, so they may be reused right away.
   */
  run(input: ArrayBuffer[]): Promise<ArrayBuffer[]>
}
