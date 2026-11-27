import { type HybridObject } from 'nitro-core';
import type { TfliteModel } from './TfliteModel.nitro';
import type { TensorflowModelDelegate } from './TensorflowModelDelegate';
export * from '#nitro/TfliteModule';
export declare class TfliteModule extends HybridObject {
    constructor();
    /**
     * Create a new {@linkcode TfliteModel} with the given
     * {@linkcode modelData} (a binary representation of the
     * TFLite model), and optionally a list of hardware
     * accelerating {@linkcode TensorflowModelDelegate}s.
     *
     * If {@linkcode delegates} is empty (`[]`), the default
     * CPU delegate will be used.
     */
    createModel(modelData: ArrayBuffer, delegates: TensorflowModelDelegate[]): TfliteModel;
}
