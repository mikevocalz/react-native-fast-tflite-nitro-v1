import type { TensorDataType } from './TensorDataType'

/**
 * Describes one input or output tensor of a TensorFlow Lite model.
 */
export interface Tensor {
  name: string
  dataType: TensorDataType
  shape: number[]
}
