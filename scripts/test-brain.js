
import * as brain from 'brain.js';

// Simple test script for Brain.js integration
console.log("Testing Brain.js integration...");

try {
    const net = new brain.recurrent.LSTMTimeStep({
        inputSize: 1,
        hiddenLayers: [4],
        outputSize: 1
    });

    const trainingData = [[0.1, 0.2, 0.3, 0.4, 0.5]];

    console.log("Training simple network...");
    const start = performance.now();
    net.train(trainingData, { iterations: 100, log: true });
    const end = performance.now();

    console.log(`Training complete in ${(end - start).toFixed(2)}ms`);

    const result = net.run(trainingData[0]);
    console.log("Prediction for next value (expected ~0.6):", result);

    if (Math.abs(result - 0.6) < 0.2) {
        console.log("✅ SUCCESS: Prediction is reasonable.");
    } else {
        console.log("⚠️ WARNING: Prediction is a bit off, but library works.");
    }

} catch (e) {
    console.error("❌ ERROR: Brain.js failed to run.", e);
    process.exit(1);
}
