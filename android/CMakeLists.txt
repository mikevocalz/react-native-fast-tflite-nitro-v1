cmake_minimum_required(VERSION 3.22.1)
project(NitroTflite LANGUAGES C CXX)

set (PACKAGE_NAME NitroTflite)

# TFLite C libraries, extracted from the LiteRT AARs by build.gradle
# (extractSOFiles / extractAARHeaders) before CMake runs.
set (TFLITE_LIB_DIR "${CMAKE_CURRENT_SOURCE_DIR}/src/main/cpp/lib/litert")

find_library(
  TFLITE
  tensorflowlite_jni
  PATHS "${TFLITE_LIB_DIR}/jni/${ANDROID_ABI}"
  NO_DEFAULT_PATH
  NO_CMAKE_FIND_ROOT_PATH
  REQUIRED
)

find_library(
  TFLITE_GPU
  tensorflowlite_gpu_jni
  PATHS "${TFLITE_LIB_DIR}/jni/${ANDROID_ABI}"
  NO_DEFAULT_PATH
  NO_CMAKE_FIND_ROOT_PATH
  REQUIRED
)

# Define C++ library and add all sources
add_library(${PACKAGE_NAME} SHARED
        src/main/cpp/cpp-adapter.cpp
        ../cpp/HybridTfliteModel.cpp
        ../cpp/HybridTfliteModule.cpp
        ../cpp/TfliteHelpers.cpp
)
target_compile_features(${PACKAGE_NAME} PUBLIC cxx_std_20)
target_compile_definitions(${PACKAGE_NAME} PRIVATE ANDROID)

# Add Nitrogen specs :)
include(${CMAKE_CURRENT_SOURCE_DIR}/../nitrogen/generated/android/NitroTflite+autolinking.cmake)

# Set up local includes
target_include_directories(${PACKAGE_NAME} PRIVATE
        "src/main/cpp"
        "../cpp"
        "${TFLITE_LIB_DIR}/headers"
        "${TFLITE_LIB_DIR}/headers/tflite"
)

find_library(LOG_LIB log)

# Link all libraries together
target_link_libraries(
        ${PACKAGE_NAME}
        ${LOG_LIB}
        android
        ${TFLITE}
        ${TFLITE_GPU}
)
