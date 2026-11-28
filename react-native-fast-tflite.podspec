require "json"
require_relative "nitro_v1_cocoapods"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

# iOS builds through Package.swift under SwiftPM and through this pod under
# CocoaPods (Expo). nitro_v1_cocoapods.rb mirrors the Package.swift targets.
# The Swift module (nitro.json apple.moduleName) is NitroTflite; the pod keeps
# its npm-derived name so `pod 'react-native-fast-tflite'` still resolves.
enable_core_ml = ENV["FAST_TFLITE_ENABLE_CORE_ML"] != "0"

Pod::Spec.new do |s|
  s.name         = "react-native-fast-tflite"
  s.module_name  = "NitroTflite"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = package["homepage"]
  s.license      = package["license"]
  s.authors      = package["author"]
  s.source       = { :git => "https://github.com/mikevocalz/react-native-fast-tflite-nitro-v1.git", :tag => "#{s.version}" }

  s.ios.deployment_target = "16.0"

  NitroV1CocoaPods.configure(
    s,
    package_dir: __dir__,
    module_name: "NitroTflite",
    defines: ["FAST_TFLITE_ENABLE_CORE_ML=#{enable_core_ml ? 1 : 0}"],
  )
  s.dependency "TensorFlowLiteC", "2.17.0"
  if enable_core_ml
    s.dependency "TensorFlowLiteC/CoreML", "2.17.0"
    s.frameworks = "CoreML"
  end
  s.libraries = "c++"
end
