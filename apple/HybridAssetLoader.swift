import Foundation
import NitroModules

final class HybridAssetLoader: HybridAssetLoaderSpec {
  func loadAsset(path: String) throws -> any Promise<ArrayBuffer> {
    guard let url = URL(string: path) else {
      throw RuntimeError("Invalid URL: \(path)")
    }
    // Data(contentsOf:) blocks until the file or download is read,
    // so it runs on a background queue instead of the JS thread.
    return .parallel {
      let data = try Data(contentsOf: url)
      return try ArrayBuffer.copy(data: data)
    }
  }
}
