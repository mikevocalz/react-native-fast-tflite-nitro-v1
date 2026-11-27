"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_plugins_1 = require("@expo/config-plugins");
const withAndroidGpuLibraries_1 = require("./withAndroidGpuLibraries");
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-var-requires
const pkg = require('../../../package.json'); // from the lib directory, the package.json is three levels up
const withFastTFLite = (config, props) => {
    // `enableCoreMLDelegate` is accepted but ignored: SwiftPM links the CoreML
    // delegate by default, and there is no Podfile to edit.
    if (props?.enableAndroidGpuLibraries === true ||
        Array.isArray(props?.enableAndroidGpuLibraries))
        config = (0, withAndroidGpuLibraries_1.withAndroidGpuLibraries)(config, props.enableAndroidGpuLibraries);
    return config;
};
exports.default = (0, config_plugins_1.createRunOncePlugin)(withFastTFLite, pkg.name, pkg.version);
