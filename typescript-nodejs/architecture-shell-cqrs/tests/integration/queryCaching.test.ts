import 'reflect-metadata';
import { Mediator } from '../../src/Mediator';
import { Query } from '../../src/Query';
import { IQueryHandler } from '../../src/IQueryHandler';
import { CachingBehavior, ICache, ICacheable } from '../../src/behaviors/CachingBehavior';
import { QueryOnlyMatcher } from '../../src/IBehaviorMatcher';
import { IPipelineBehavior } from '../../src/IPipelineBehavior';

// In-memory cache implementation for testing
class InMemoryCache implements ICache {
  private readonly store: Map<string, any> = new Map();

  async get<T>(key: string): Promise<T | undefined> {
    return this.store.get(key);
  }

  async set<T>(key: string, value: T, _ttlSeconds?: number): Promise<void> {
    this.store.set(key, value);
  }

  async remove(key: string): Promise<void> {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}

// Cacheable query
class GetProductQuery implements Query<ProductDto>, ICacheable {
  _isQuery = true as const;
  __phantom?: ProductDto;
  cacheTtlSeconds = 60;

  constructor(public readonly productId: string) {}
}

interface ProductDto {
  productId: string;
  name: string;
  price: number;
}

describe('QueryCachingTests', () => {
  /**
   * IT-005: Query Caching Behavior
   *
   * Validates that CachingBehavior returns cached results on second execution
   * without invoking the handler again (performance optimization).
   */
  it('Should_ReturnCachedResult_When_QueryExecutedTwice', async () => {
    // Given: Cache and query handler with call counter
    const cache = new InMemoryCache();
    let handlerCallCount = 0;

    const handler: IQueryHandler<GetProductQuery, ProductDto> = {
      async handle(request: GetProductQuery, _signal: AbortSignal): Promise<ProductDto> {
        handlerCallCount++;
        return {
          productId: request.productId,
          name: 'Test Product',
          price: 49.99,
        };
      },
    };

    const mediator = new Mediator(
      [{ requestType: GetProductQuery, handler }],
      [
        {
          behavior: new CachingBehavior(cache) as IPipelineBehavior<any, any>,
          matcher: new QueryOnlyMatcher(),
        },
      ]
    );

    // When: Execute same query twice
    const query1 = new GetProductQuery('product-123');
    const query2 = new GetProductQuery('product-123');
    const controller = new AbortController();

    const result1 = await mediator.send(query1, controller.signal);
    const result2 = await mediator.send(query2, controller.signal);

    // Then: Handler called only once (second result from cache)
    expect(handlerCallCount).toBe(1);
    expect(result1).toEqual(result2);
    expect(result1.productId).toBe('product-123');
    expect(result1.name).toBe('Test Product');

    // Verify cache hit by checking handler not called again
    const result3 = await mediator.send(new GetProductQuery('product-123'), controller.signal);
    expect(handlerCallCount).toBe(1); // Still 1, not 2
    expect(result3).toEqual(result1);
  });

  /**
   * Additional test: Different cache keys for different parameters
   */
  it('Should_UseDifferentCacheKeys_When_QueryParametersDiffer', async () => {
    // Given: Cache and query handler
    const cache = new InMemoryCache();
    let handlerCallCount = 0;

    const handler: IQueryHandler<GetProductQuery, ProductDto> = {
      async handle(request: GetProductQuery, _signal: AbortSignal): Promise<ProductDto> {
        handlerCallCount++;
        return {
          productId: request.productId,
          name: `Product ${request.productId}`,
          price: 49.99,
        };
      },
    };

    const mediator = new Mediator(
      [{ requestType: GetProductQuery, handler }],
      [
        {
          behavior: new CachingBehavior(cache) as IPipelineBehavior<any, any>,
          matcher: new QueryOnlyMatcher(),
        },
      ]
    );

    // When: Execute queries with different parameters
    const controller = new AbortController();
    const result1 = await mediator.send(new GetProductQuery('product-1'), controller.signal);
    const result2 = await mediator.send(new GetProductQuery('product-2'), controller.signal);

    // Then: Handler called twice (different cache keys)
    expect(handlerCallCount).toBe(2);
    expect(result1.productId).toBe('product-1');
    expect(result2.productId).toBe('product-2');
    expect(result1.name).toBe('Product product-1');
    expect(result2.name).toBe('Product product-2');
  });
});
