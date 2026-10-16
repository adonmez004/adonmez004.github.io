import { setTimeout as delay } from 'node:timers/promises';

// Retry DOM observations until the UI reaches the expected state. Failed checks
// throw and therefore make both the suite and run-all exit nonzero.
export async function check(name, read, verify, { timeout = 3000, interval = 25 } = {}) {
  const deadline = Date.now() + timeout;
  let lastError, actual;
  do {
    try {
      actual = await read();
      await verify(actual);
      console.log(`PASS ${name}`);
      return actual;
    } catch (error) { lastError = error; }
    if (Date.now() >= deadline) break;
    await delay(interval);
  } while (true);
  throw new Error(`${name}: ${lastError?.message}\nLast observation: ${JSON.stringify(actual)}`, { cause: lastError });
}
