import { Android, Apple, type HybridObject } from 'nitro-core'

export * from '#nitro/AssetLoader'

@Apple({
  language: 'swift',
  implementation: { className: 'HybridAssetLoader' },
})
@Android({
  language: 'kotlin',
  implementation: { className: 'HybridAssetLoader' },
})
export declare class AssetLoader extends HybridObject {
  constructor()

  /**
   * Load an asset from the given {@linkcode path} and
   * return its contents as an {@linkcode ArrayBuffer}.
   */
  loadAsset(path: string): Promise<ArrayBuffer>
}
