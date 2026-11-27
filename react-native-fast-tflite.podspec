require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

# React Native CLI 20 still requires a podspec to discover iOS dependencies.
# Native sources and dependencies (including TensorFlowLiteC) are built through Package.swift.
Pod::Spec.new do |s|
  s.name         = "react-native-fast-tflite"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = package["homepage"]
  s.license      = package["license"]
  s.authors      = package["author"]
  s.source       = { :git => "https://github.com/mikevocalz/react-native-fast-tflite-nitro-v1.git", :tag => "#{s.version}" }
  s.ios.deployment_target = "16.0"
end
