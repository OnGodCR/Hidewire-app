// ---------------------------------------------------------------------------
// TEST MODE: the single switch.
//
// **To turn off every piece of fake data in the app, set TEST_MODE to false.**
// That is the whole procedure. Nothing else needs touching, and nothing
// simulated survives it.
//
// You can also override without editing code:
//
//     EXPO_PUBLIC_TEST_MODE=false npx expo start
//
// A release build must have this false. `assertProductionSafe()` below throws
// if it is ever true in a non-development bundle, so a mistake fails loudly at
// startup rather than quietly shipping fake friends to real users.
//
// The full register of what is fake lives in TEST-FIXTURES.md. Anything added
// there must be gated by this flag, or the flag is a lie.
// ---------------------------------------------------------------------------

const envOverride = process.env.EXPO_PUBLIC_TEST_MODE;

/** Default when nothing is set. Flip this to false to kill all fixtures. */
const TEST_MODE_DEFAULT = true;

export const TEST_MODE: boolean =
  envOverride === 'false' ? false : envOverride === 'true' ? true : TEST_MODE_DEFAULT;

/**
 * Exactly what TEST_MODE controls, so the effect of flipping it is auditable
 * without reading the whole codebase. Keep this in sync with TEST-FIXTURES.md.
 */
export const TEST_MODE_CONTROLS = [
  'Seeded mid-progression profile (level 7, 1,250 FILM)',
  'ADD TEST PLAYERS in the lobby, and the simulated party roster',
  'The friend-code directory that makes KAY2XQ7M and friends resolve',
  'The global leaderboard ladder',
  'The rival seeker bid in the lobby',
  'Store and bundle purchases granting for free with no payment provider',
  'The scripted round timeline speed multiplier',
  'The pretend storefront country (US) that lets the crate shelf open at all',
] as const;

/**
 * The storefront country the demo pretends the player buys from.
 *
 * `boxAvailability()` fails closed on an unknown country, which is correct:
 * with no payment provider there is no real storefront, so nothing should be
 * purchasable. But it also means the whole crate shelf renders as
 * region-blocked in the demo, which makes the store impossible to design or
 * playtest. This fixture exists only for that. Outside TEST_MODE it is null
 * and the fail-closed behaviour is back in charge; the real value must come
 * from the payment provider's storefront, never from IP or GPS.
 */
export const TEST_STORE_COUNTRY: string | null = TEST_MODE ? 'US' : null;

/**
 * True only in a development bundle. `__DEV__` is injected by Metro.
 */
export const IS_DEV: boolean =
  typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV !== 'production';

/**
 * Fails loudly if fixtures are enabled in a production bundle.
 *
 * Called once at app start. A silent fixture in a shipped build is the exact
 * failure this whole file exists to prevent: it would put invented friends,
 * an invented leaderboard, and free purchases in front of real users.
 */
export function assertProductionSafe(): void {
  if (!IS_DEV && TEST_MODE) {
    throw new Error(
      'Hidewire: TEST_MODE is enabled in a production build. Set TEST_MODE to false ' +
        'in src/config.ts, or build with EXPO_PUBLIC_TEST_MODE=false. ' +
        'See TEST-FIXTURES.md.',
    );
  }
}

/**
 * Clock multiplier for the scripted round. 1 is real time.
 *
 * Forced to 1 outside test mode so a sped-up round can never reach a player.
 */
export const TIME_SCALE = TEST_MODE ? 1 : 1;
