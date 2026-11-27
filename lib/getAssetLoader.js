import { AssetLoader } from './specs/AssetLoader.nitro';
let assetLoader;
export function getAssetLoader() {
    if (assetLoader == null) {
        assetLoader = new AssetLoader();
    }
    return assetLoader;
}
