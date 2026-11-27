#pragma once

#include <NitroTflite/HybridTfliteModelSpec.hpp>
#include <string>
#include <unordered_map>
#include <vector>

#if defined(ANDROID)
#include <tflite/c/c_api.h>
#elif defined(__APPLE__)
#include <TensorFlowLiteC/TensorFlowLiteC.h>
#else
#error "Invalid Platform!"
#endif

namespace margelo::nitro::tflite {

class HybridTfliteModel final : public HybridTfliteModelSpec {
public:
  static constexpr auto TAG = "TfliteModel";

  /**
   * Takes ownership of `interpreter`. `modelData` must be an owning buffer, since the
   * interpreter reads the model's weights from it for as long as it lives.
   */
  HybridTfliteModel(TfLiteInterpreter* interpreter, ArrayBuffer modelData,
                    std::vector<TensorflowModelDelegate> delegates);
  ~HybridTfliteModel() override;

  // Properties (from HybridTfliteModelSpec)
  std::vector<TensorflowModelDelegate> getDelegates() override;
  std::vector<Tensor> getInputs() override;
  std::vector<Tensor> getOutputs() override;

  // Methods (from HybridTfliteModelSpec)
  std::vector<ArrayBuffer> runSync(const std::vector<ArrayBuffer>& input) override;
  Promise<std::vector<ArrayBuffer>> run(const std::vector<ArrayBuffer>& input) override;

protected:
  size_t getExternalMemorySize() noexcept override;

private:
  void copyInputBuffers(const std::vector<ArrayBuffer>& input);
  void invoke();
  std::vector<ArrayBuffer> copyOutputBuffers();
  ArrayBuffer getOutputBufferForTensor(const TfLiteTensor* tensor);

private:
  TfLiteInterpreter* _interpreter = nullptr;
  std::vector<TensorflowModelDelegate> _delegates;
  ArrayBuffer _modelData;
  std::unordered_map<std::string, ArrayBuffer> _outputBuffers;
};

} // namespace margelo::nitro::tflite
