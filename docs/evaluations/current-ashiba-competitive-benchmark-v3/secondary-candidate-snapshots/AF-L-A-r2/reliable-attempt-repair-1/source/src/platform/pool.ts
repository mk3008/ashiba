/** Application-owned native-pg pool seam. A candidate must preserve this seam. */
export interface PoolProvider {
  withPool<T>(operation: (pool: unknown) => Promise<T>): Promise<T>;
}
