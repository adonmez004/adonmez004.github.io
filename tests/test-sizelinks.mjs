import { runFeature } from './lib/feature-native.mjs';
import { runSizeLinks } from './lib/feature-scenarios.mjs';
await runFeature('sizelinks', runSizeLinks);
