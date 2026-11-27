#include "HybridTfliteModule.hpp"
#include "HybridTfliteModel.hpp"
#include "TfliteHelpers.hpp"

#include <memory>

#if defined(ANDROID)
#include <tflite/c/c_api.h>
#elif defined(__APPLE__)
#include <TensorFlowLiteC/TensorFlowLiteC.h>
#else
#error "Invalid Platform!"
#endif

namespace margelo::nitro::tflite {

/**
 * Return a Hardware accelerated delegate, or throws
 * if the given delegate type is not available.
 */
static TfLiteDelegate* getDelegate(TensorflowModelDelegate delegateType) {
  switch (delegateType) {
    case TensorflowModelDelegate::CORE_ML:
      return getCoreMLDelegate();
    case TensorflowModelDelegate::METAL:
      return getMetalDelegate();
    case TensorflowModelDelegate::NNAPI:
      return getNNAPIDelegate();
    case TensorflowModelDelegate::ANDROID_GPU:
      return getAndroidGPUDelegate();
  }
  throw std::runtime_error("Unknown Delegate \"" + std::to_string(static_cast<int>(delegateType)) +
                           "\"!");
}

std::shared_ptr<HybridTfliteModelSpec>
HybridTfliteModule::createModel(const ArrayBuffer& modelData,
                                const std::vector<TensorflowModelDelegate>& delegates) {
  // The interpreter reads the model's weights from this buffer for its whole lifetime.
  // A buffer that came from JS only borrows its storage, so take ownership here, on the
  // JS thread, before the interpreter is created from it.
  ArrayBuffer ownedModelData = modelData.asOwning();
  // The model and options are only needed to create the interpreter. unique_ptr frees them
  // on every path, including when a delegate below throws.
  std::unique_ptr<TfLiteModel, decltype(&TfLiteModelDelete)> model(
      TfLiteModelCreate(ownedModelData.data(), ownedModelData.size()), &TfLiteModelDelete);
  if (model == nullptr) {
    throw std::runtime_error("Failed to create TFLite model from data!");
  }

  // Configure interpreter via options
  std::unique_ptr<TfLiteInterpreterOptions, decltype(&TfLiteInterpreterOptionsDelete)> options(
      TfLiteInterpreterOptionsCreate(), &TfLiteInterpreterOptionsDelete);

  // Add all hardware accelerated delegates (e.g. GPU, NPU, ...)
  // if any. The default CPU delegate will always be available.
  for (const TensorflowModelDelegate& delegateType : delegates) {
    TfLiteDelegate* delegate = getDelegate(delegateType);
    TfLiteInterpreterOptionsAddDelegate(options.get(), delegate);
  }

  // Per the TFLite C API docs the model_data buffer must outlive the interpreter,
  // which HybridTfliteModel guarantees by holding ownedModelData.
  TfLiteInterpreter* interpreter = TfLiteInterpreterCreate(model.get(), options.get());
  if (interpreter == nullptr) {
    throw std::runtime_error("Failed to create TFLite interpreter!");
  }

  return std::make_shared<HybridTfliteModel>(interpreter, std::move(ownedModelData), delegates);
}

} // namespace margelo::nitro::tflite
