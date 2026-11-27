import { AssetLoader } from './specs/AssetLoader.nitro'

let assetLoader: AssetLoader | undefined

export function getAssetLoader(): AssetLoader {
  if (assetLoader == null) {
    assetLoader = new AssetLoader()
  }
  return assetLoader
}
