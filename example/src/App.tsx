import * as React from 'react';

import {
  ActivityIndicator,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
} from 'react-native';
import {
  type Tensor,
  type TensorflowModel,
  type TensorflowModelDelegate,
  useTensorflowModel,
} from 'react-native-fast-tflite';
import { createWorkletRuntime, runOnRuntimeSync } from 'react-native-worklets';

function tensorToString(tensor: Tensor): string {
  return `\n  - ${tensor.dataType} ${tensor.name}[${tensor.shape}]`;
}
function modelToString(model: TensorflowModel): string {
  return (
    `TFLite Model (${model.delegates.join(', ') || 'cpu'}):\n` +
    `- Inputs: ${model.inputs.map(tensorToString).join('')}\n` +
    `- Outputs: ${model.outputs.map(tensorToString).join('')}`
  );
}

// EfficientDet's fourth output holds the number of detections.
function numDetections(outputs: ArrayBuffer[]): number {
  const buffer = outputs[3];
  return buffer == null ? 0 : new Float32Array(buffer)[0] ?? 0;
}

// A separate JS runtime on its own thread, like the one VisionCamera v5
// runs Frame Processors on.
const inferenceRuntime = createWorkletRuntime({ name: 'tflite-inference' });

const DELEGATES: TensorflowModelDelegate[] =
  Platform.OS === 'ios' ? ['core-ml'] : [];

export default function App(): React.ReactNode {
  // from https://www.kaggle.com/models/tensorflow/efficientdet/frameworks/tfLite
  const plugin = useTensorflowModel(
    require('../assets/efficientdet.tflite'),
    DELEGATES,
  );
  const model = plugin.state === 'loaded' ? plugin.model : undefined;
  const [log, setLog] = React.useState<string[]>([]);

  React.useEffect(() => {
    if (model == null) return;
    const lines: string[] = [modelToString(model)];
    const input = new ArrayBuffer(320 * 320 * 3);

    const jsResult = model.runSync([input]);
    lines.push(`runSync (JS thread): ${numDetections(jsResult)} detections`);

    // Nitro registers HybridObjects as worklet-serializable, so the model
    // can be captured directly. VisionCamera v5's useFrameOutput worklets
    // call model.runSync(...) the same way.
    const workletDetections = runOnRuntimeSync(inferenceRuntime, () => {
      'worklet';
      const outputs = model.runSync([new ArrayBuffer(320 * 320 * 3)]);
      const buffer = outputs[3];
      return buffer == null ? 0 : new Float32Array(buffer)[0] ?? 0;
    });
    lines.push(`runSync (worklet runtime): ${workletDetections} detections`);
    setLog(lines);

    model
      .run([input])
      .then(outputs => {
        setLog(current => [
          ...current,
          `run (async): ${numDetections(outputs)} detections`,
        ]);
      })
      .catch((error: unknown) => {
        setLog(current => [...current, `run (async) failed: ${error}`]);
      });
  }, [model]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {plugin.state === 'loading' && <ActivityIndicator size="small" />}
        {plugin.state === 'error' && (
          <Text>Failed to load model! {plugin.error.message}</Text>
        )}
        {log.map(line => (
          <Text key={line} style={styles.line}>
            {line}
          </Text>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  line: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginBottom: 8,
  },
});
