#pragma once

#include <NitroTflite/HybridTfliteModuleSpec.hpp>

namespace margelo::nitro::tflite {

class HybridTfliteModule final : public HybridTfliteModuleSpec {
public:
  static constexpr auto TAG = "TfliteModule";

  HybridTfliteModule() = default;

  // Methods (from HybridTfliteModuleSpec)
  std::shared_ptr<HybridTfliteModelSpec>
  createModel(const ArrayBuffer& modelData,
              const std::vector<TensorflowModelDelegate>& delegates) override;
};

} // namespace margelo::nitro::tflite
