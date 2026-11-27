#include "HybridTfliteModel.hpp"
#include "TfliteHelpers.hpp"

#include <NitroModules/ArrayBuffer.hpp>
#include <NitroModules/Promise.hpp>
#include <cstring>
#include <string>

#if defined(ANDROID)
#include <tflite/c/c_api.h>
#elif defined(__APPLE__)
#include <TensorFlowLiteC/TensorFlowLiteC.h>
#else
#error "Invalid Platform!"
#endif

namespace margelo::nitro::tflite {

HybridTfliteModel::HybridTfliteModel(TfLiteInterpreter* interpreter, ArrayBuffer modelData,
                                     std::vector<TensorflowModelDelegate> delegates)
    : _interpreter(interpreter), _delegates(std::move(delegates)),
      _modelData(std::move(modelData)) {
  TfLiteStatus status = TfLiteInterpreterAllocateTensors(_interpreter);
  if (status != kTfLiteOk) {
    // The destructor does not run when a constructor throws, so free the interpreter here.
    TfLiteInterpreterDelete(_interpreter);
    _interpreter = nullptr;
    throw std::runtime_error(
        "TFLite: Failed to allocate memory for input/output tensors! Status: " +
        tfLiteStatusToString(status));
  }
}

HybridTfliteModel::~HybridTfliteModel() {
  if (_interpreter != nullptr) {
    TfLiteInterpreterDelete(_interpreter);
    _interpreter = nullptr;
  }
  // _modelData is released after the interpreter that reads from it.
}

std::vector<TensorflowModelDelegate> HybridTfliteModel::getDelegates() {
  return _delegates;
}

std::vector<Tensor> HybridTfliteModel::getInputs() {
  int count = TfLiteInterpreterGetInputTensorCount(_interpreter);
  std::vector<Tensor> tensors;
  tensors.reserve(count);
  for (int32_t i = 0; i < count; i++) {
    TfLiteTensor* tensor = TfLiteInterpreterGetInputTensor(_interpreter, i);
    if (tensor == nullptr) {
      throw std::runtime_error("TFLite: Failed to get input tensor " + std::to_string(i) + "!");
    }
    int dimensions = TfLiteTensorNumDims(tensor);
    std::vector<double> shape;
    shape.reserve(dimensions);
    for (int32_t d = 0; d < dimensions; d++) {
      int32_t size = TfLiteTensorDim(tensor, d);
      shape.push_back(static_cast<double>(size));
    }
    tensors.push_back(Tensor(std::string(TfLiteTensorName(tensor)),
                             getTensorDataType(TfLiteTensorType(tensor)), std::move(shape)));
  }
  return tensors;
}

std::vector<Tensor> HybridTfliteModel::getOutputs() {
  int count = TfLiteInterpreterGetOutputTensorCount(_interpreter);
  std::vector<Tensor> tensors;
  tensors.reserve(count);
  for (int32_t i = 0; i < count; i++) {
    const TfLiteTensor* tensor = TfLiteInterpreterGetOutputTensor(_interpreter, i);
    if (tensor == nullptr) {
      throw std::runtime_error("TFLite: Failed to get output tensor " + std::to_string(i) + "!");
    }
    int dimensions = TfLiteTensorNumDims(tensor);
    std::vector<double> shape;
    shape.reserve(dimensions);
    for (int32_t d = 0; d < dimensions; d++) {
      int32_t size = TfLiteTensorDim(tensor, d);
      shape.push_back(static_cast<double>(size));
    }
    tensors.push_back(Tensor(std::string(TfLiteTensorName(tensor)),
                             getTensorDataType(TfLiteTensorType(tensor)), std::move(shape)));
  }
  return tensors;
}

void HybridTfliteModel::copyInputBuffers(const std::vector<ArrayBuffer>& input) {
  size_t inputCount = TfLiteInterpreterGetInputTensorCount(_interpreter);
  if (input.size() != inputCount) [[unlikely]] {
    throw std::runtime_error("TFLite: Input array size (" + std::to_string(input.size()) +
                             ") does not match input tensor count (" + std::to_string(inputCount) +
                             ")!");
  }

  for (int32_t i = 0; i < inputCount; i++) {
    TfLiteTensor* tensor = TfLiteInterpreterGetInputTensor(_interpreter, i);
    const ArrayBuffer& buffer = input[i];
    TfLiteStatus status = TfLiteTensorCopyFromBuffer(tensor, buffer.data(), buffer.size());
    if (status != kTfLiteOk) [[unlikely]] {
      throw std::runtime_error("TFLite: Failed to copy input buffer " + std::to_string(i) + " (" +
                               std::to_string(buffer.size()) + " bytes) into input tensor \"" +
                               std::string(TfLiteTensorName(tensor)) + "\" (" +
                               std::to_string(TfLiteTensorByteSize(tensor)) +
                               " bytes)! Status: " + tfLiteStatusToString(status));
    }
  }
}

// Pre-allocates a buffer per output tensor, reuses on subsequent calls.
ArrayBuffer HybridTfliteModel::getOutputBufferForTensor(const TfLiteTensor* tensor) {
  std::string name = TfLiteTensorName(tensor);
  auto existing = _outputBuffers.find(name);
  if (existing != _outputBuffers.end()) {
    return existing->second;
  }
  TfLiteType dataType = TfLiteTensorType(tensor);
  int totalLength = getTensorTotalLength(tensor);
  size_t byteSize = totalLength * getTFLTensorDataTypeSize(dataType);
  ArrayBuffer buffer = ArrayBuffer::allocate(byteSize);
  _outputBuffers.emplace(name, buffer);
  return buffer;
}

std::vector<ArrayBuffer> HybridTfliteModel::copyOutputBuffers() {
  int outputCount = TfLiteInterpreterGetOutputTensorCount(_interpreter);
  std::vector<ArrayBuffer> results;
  results.reserve(outputCount);

  for (int32_t i = 0; i < outputCount; i++) {
    const TfLiteTensor* tensor = TfLiteInterpreterGetOutputTensor(_interpreter, i);
    ArrayBuffer outputBuffer = getOutputBufferForTensor(tensor);

    std::string name = TfLiteTensorName(tensor);

    void* tensorData = TfLiteTensorData(tensor);
    if (tensorData == nullptr) {
      [[unlikely]];
      throw std::runtime_error("TFLite: Failed to get data from tensor \"" + name + "\"!");
    }

    std::memcpy(outputBuffer.data(), tensorData, outputBuffer.size());
    results.push_back(outputBuffer);
  }

  return results;
}

void HybridTfliteModel::invoke() {
  TfLiteStatus status = TfLiteInterpreterInvoke(_interpreter);
  if (status != kTfLiteOk) {
    throw std::runtime_error("TFLite: Failed to run TFLite Model! Status: " +
                             tfLiteStatusToString(status));
  }
}

std::vector<ArrayBuffer> HybridTfliteModel::runSync(const std::vector<ArrayBuffer>& input) {
  copyInputBuffers(input);
  invoke();
  return copyOutputBuffers();
}

Promise<std::vector<ArrayBuffer>> HybridTfliteModel::run(const std::vector<ArrayBuffer>& input) {
  // Copy input buffers on caller (JS) thread first — input ArrayBuffers are
  // non-owning JS buffers that may be GC'd if we access them async.
  copyInputBuffers(input);
  std::shared_ptr<HybridTfliteModel> sharedThis = shared_cast<HybridTfliteModel>();
  return Promise<std::vector<ArrayBuffer>>::async([sharedThis]() -> std::vector<ArrayBuffer> {
    sharedThis->invoke();
    return sharedThis->copyOutputBuffers();
  });
}

size_t HybridTfliteModel::getExternalMemorySize() noexcept {
  size_t size = _modelData.size();
  for (const auto& [name, buffer] : _outputBuffers) {
    size += buffer.size();
  }
  return size;
}

} // namespace margelo::nitro::tflite
