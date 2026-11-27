import { TfliteModule } from './specs/TfliteModule.nitro'

let tfliteModule: TfliteModule | undefined

export function getTfliteModule(): TfliteModule {
  if (tfliteModule == null) {
    tfliteModule = new TfliteModule()
  }
  return tfliteModule
}
