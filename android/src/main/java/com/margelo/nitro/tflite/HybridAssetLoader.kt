package com.margelo.nitro.tflite

import com.margelo.nitro.core.ArrayBuffer
import com.margelo.nitro.core.Promise
import java.net.URL

class HybridAssetLoader : HybridAssetLoaderSpec() {
  companion object : HybridAssetLoaderSpec.Companion {
    override fun constructor(): HybridAssetLoader = HybridAssetLoader()
  }

  override fun loadAsset(path: String): Promise<ArrayBuffer> {
    // URL.readBytes() blocks until the file or download is read,
    // so it runs on Nitro's shared I/O pool instead of the JS thread.
    return Promise.parallel {
      val bytes = URL(path).readBytes()
      return@parallel ArrayBuffer.copy(bytes)
    }
  }
}
