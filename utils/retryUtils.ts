/**
 * Retries a promise-returning function with exponential backoff.
 * 
 * @param fn The function to retry.
 * @param retries Maximum number of retries (default: 3).
 * @param delay Initial delay in ms (default: 1000).
 * @param factor Multiplier for delay (default: 2).
 * @param shouldRetry Optional predicate to determine if an error should trigger a retry.
 */
export const withExponentialBackoff = async <T>(
    fn: () => Promise<T>,
    retries: number = 3,
    delay: number = 1000,
    factor: number = 2,
    shouldRetry: (error: any) => boolean = () => true
): Promise<T> => {
    try {
        return await fn();
    } catch (error) {
        if (retries <= 0 || !shouldRetry(error)) {
            throw error;
        }

        console.warn(`Operation failed. Retrying in ${delay}ms... (${retries} attempts left)`, error);

        await new Promise(resolve => setTimeout(resolve, delay));

        return withExponentialBackoff(fn, retries - 1, delay * factor, factor, shouldRetry);
    }
};
