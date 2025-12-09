import pLimit from 'p-limit';

/**
 * Determines the optimal number of concurrent tasks based on hardware capabilities.
 * @returns {number} The optimal concurrency level (clamped between 2 and 16).
 */
export const getOptimalConcurrency = (): number => {
    // Use hardwareConcurrency if available, defaulting to 4
    const cpuCores = typeof navigator !== 'undefined' ? (navigator.hardwareConcurrency || 4) : 4;

    // Clamp between 2 (minimum parallel) and 16 (high-end)
    // For PDF processing (WASM + Worker), we can go higher than main thread logic.
    // 1 worker per core is ideal.
    return Math.max(2, Math.min(cpuCores, 16));
};

/**
 * Runs tasks with limited concurrency using p-limit.
 */
export const runWithConcurrency = async <T>(
    tasks: (() => Promise<T>)[],
    concurrency: number
): Promise<T[]> => {
    const limit = pLimit(concurrency);
    return Promise.all(tasks.map(task => limit(task)));
};
