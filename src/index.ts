// Installs the Nitro V1 runtime (TurboModule, proxy, dispatcher and worklets support).
import 'react-native-nitro-modules'

export type { TensorflowModelDelegate } from './specs/TensorflowModelDelegate'
export type { TensorDataType } from './specs/TensorDataType'
export type { Tensor } from './specs/Tensor'
export type { TfliteModel } from './specs/TfliteModel.nitro'
export type { TensorflowPlugin } from './useTensorflowModel'
export type { ModelSource } from './loadTensorflowModel'
export { loadTensorflowModel } from './loadTensorflowModel'
export { useTensorflowModel } from './useTensorflowModel'

/** @alias TfliteModel - backwards compatible name from react-native-fast-tflite v2 */
export type { TfliteModel as TensorflowModel } from './specs/TfliteModel.nitro'
