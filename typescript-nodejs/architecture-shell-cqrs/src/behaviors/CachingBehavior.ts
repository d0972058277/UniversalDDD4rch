import { BaseRequest } from '../BaseRequest';
import { Query } from '../Query';
import {
  IPipelineBehavior,
  RequestHandlerDelegate,
} from '../IPipelineBehavior';

/**
 * ICache - Cache abstraction for query results
 *
 * Integrate with caching libraries like node-cache, Redis, Memcached, etc.
 */
export interface ICache {
  /**
   * Retrieves cached value if exists
   *
   * @param key - Cache key
   * @returns Cached value or undefined if not found
   */
  get<T>(key: string): Promise<T | undefined>;

  /**
   * Stores value in cache with optional TTL
   *
   * @param key - Cache key
   * @param value - Value to cache
   * @param ttlSeconds - Time-to-live in seconds (optional)
   */
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;

  /**
   * Removes value from cache
   *
   * @param key - Cache key
   */
  remove(key: string): Promise<void>;
}

/**
 * ICacheable - Interface for queries that support caching
 *
 * Implement this interface on queries to enable caching behavior.
 */
export interface ICacheable {
  /**
   * Cache time-to-live in seconds
   */
  readonly cacheTtlSeconds?: number;

  /**
   * Custom cache key (optional)
   * If not provided, key is derived from query properties
   */
  readonly cacheKey?: string;
}

/**
 * CachingBehavior - Pipeline behavior that caches query results
 *
 * Short-circuits handler execution on cache hit (returns cached value).
 * Writes to cache on cache miss.
 * Only applies to queries implementing ICacheable interface.
 *
 * @typeParam TRequest - The request type (must be Query)
 * @typeParam TResponse - The response type
 *
 * @remarks
 * Recommended order: 50 (after telemetry, applies to queries only)
 *
 * Cache key strategy:
 * - If query implements ICacheable with cacheKey, use that
 * - Otherwise, serialize query properties to deterministic JSON string
 * - Include type name to prevent collisions
 *
 * @example
 * ```typescript
 * const behavior = new CachingBehavior(cache);
 * mediator.addBehavior(behavior, new QueryOnlyMatcher());
 * ```
 */
export class CachingBehavior<
  TRequest extends BaseRequest<TResponse>,
  TResponse
> implements IPipelineBehavior<TRequest, TResponse>
{
  readonly order = 50;

  constructor(private readonly cache: ICache) {}

  async handle(
    request: TRequest,
    next: RequestHandlerDelegate<TResponse>,
    _signal: AbortSignal
  ): Promise<TResponse> {
    // Only cache queries that implement ICacheable
    if (!this.isCacheable(request)) {
      return await next();
    }

    // Generate cache key
    const cacheKey = this.generateCacheKey(request);

    // Check cache
    const cachedValue = await this.cache.get<TResponse>(cacheKey);
    if (cachedValue !== undefined) {
      return cachedValue;
    }

    // Cache miss - execute handler
    const response = await next();

    // Write to cache
    const ttl = (request as ICacheable).cacheTtlSeconds;
    await this.cache.set(cacheKey, response, ttl);

    return response;
  }

  /**
   * Type guard to detect cacheable queries
   */
  private isCacheable(request: any): request is Query<any> & ICacheable {
    return this.isQuery(request);
    // Note: Could add additional check for ICacheable interface
    // return this.isQuery(request) && 'cacheTtlSeconds' in request;
  }

  /**
   * Type guard to detect query requests
   */
  private isQuery(request: any): request is Query<any> {
    return (
      '_isQuery' in request ||
      request.constructor.name.endsWith('Query') ||
      Object.getPrototypeOf(request).constructor.name.endsWith('Query')
    );
  }

  /**
   * Generates deterministic cache key from query properties
   */
  private generateCacheKey(request: TRequest & ICacheable): string {
    // Use custom cache key if provided
    if (request.cacheKey) {
      return `${request.constructor.name}:${request.cacheKey}`;
    }

    // Serialize query properties to JSON with sorted keys
    const properties = { ...request };
    delete (properties as any).cacheTtlSeconds;
    delete (properties as any).cacheKey;

    const serialized = JSON.stringify(properties, Object.keys(properties).sort());
    return `${request.constructor.name}:${serialized}`;
  }
}
