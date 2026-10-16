// No Playwright installation needed for the interactive fixtures.
import { featureServer } from './lib/feature-server.mjs';
const server = await featureServer(process.env.INSPECTOR);
console.log(`Feature checks: ${server.url}/features/index.html`);
console.log(`Native input fixture: ${server.url}/features/native.html`);
process.once('SIGINT', async () => { await server.close(); process.exit(0); });
process.once('SIGTERM', async () => { await server.close(); process.exit(0); });
