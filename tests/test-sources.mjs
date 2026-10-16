// Native clicks; shared DOM expectations also run in features/index.html.
import { runFeature } from './lib/feature-native.mjs';
import { runSources } from './lib/feature-scenarios.mjs';
await runFeature('sources', runSources);
