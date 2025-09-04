import { logger } from "./logger.ts";

/**
 * Cryptographically secure random selection of winners from participants.
 * Uses Web Crypto API for true randomness.
 *
 * @param participants Array of participant user IDs
 * @param winnerCount Number of winners to select
 * @returns Array of selected winner user IDs
 */
export function selectRandomWinners(participants: string[], winnerCount: number): string[] {
  if (participants.length === 0) {
    logger.warn("No participants to select from");
    return [];
  }

  // If fewer participants than winners needed, return all participants
  if (participants.length <= winnerCount) {
    logger.info(`Only ${participants.length} participants, all will be winners`);
    return [...participants];
  }

  const winners: string[] = [];
  const availableParticipants = [...participants];

  // Select winners one by one
  for (let i = 0; i < winnerCount; i++) {
    if (availableParticipants.length === 0) break;

    // Generate a cryptographically secure random index
    const randomIndex = getSecureRandomInt(0, availableParticipants.length - 1);

    // Select and remove the winner from available pool
    const winner = availableParticipants.splice(randomIndex, 1)[0];
    winners.push(winner);

    logger.debug(`Selected winner ${i + 1}: ${winner}`);
  }

  return winners;
}

/**
 * Generate a cryptographically secure random integer between min and max (inclusive).
 * Uses Web Crypto API for true randomness.
 */
function getSecureRandomInt(min: number, max: number): number {
  const range = max - min + 1;
  const bytesNeeded = Math.ceil(Math.log2(range) / 8);
  const maxValue = Math.pow(256, bytesNeeded);
  const threshold = maxValue - (maxValue % range);

  let randomValue: number;
  do {
    const randomBytes = new Uint8Array(bytesNeeded);
    crypto.getRandomValues(randomBytes);
    randomValue = randomBytes.reduce((acc, byte, index) => acc + byte * Math.pow(256, index), 0);
  } while (randomValue >= threshold);

  return min + (randomValue % range);
}

/**
 * Verify the randomness quality of the selection algorithm.
 * This is for testing purposes to ensure fair distribution.
 */
export function testRandomDistribution(sampleSize: number = 10000): void {
  const participants = ["A", "B", "C", "D", "E"];
  const results: Record<string, number> = {};

  // Initialize counters
  for (const p of participants) {
    results[p] = 0;
  }

  // Run multiple selections
  for (let i = 0; i < sampleSize; i++) {
    const winner = selectRandomWinners(participants, 1)[0];
    results[winner]++;
  }

  // Calculate and log distribution
  console.log("Random Distribution Test Results:");
  console.log(`Sample size: ${sampleSize}`);
  console.log("Expected probability: 20% each");
  console.log("Actual distribution:");

  for (const [participant, count] of Object.entries(results)) {
    const percentage = ((count / sampleSize) * 100).toFixed(2);
    console.log(`  ${participant}: ${percentage}% (${count} times)`);
  }
}
