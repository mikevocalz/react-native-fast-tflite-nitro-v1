import { TfliteModule } from './specs/TfliteModule.nitro';
let tfliteModule;
export function getTfliteModule() {
    if (tfliteModule == null) {
        tfliteModule = new TfliteModule();
    }
    return tfliteModule;
}
