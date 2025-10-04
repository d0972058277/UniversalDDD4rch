"""CachingBehavior - Query result caching."""

import json
from typing import Protocol, TypeVar, Optional, Any
from architecture_core.functional import Result
from architecture_shell_cqrs.behaviors import IPipelineBehavior
from architecture_shell_cqrs.requests import IQuery

TRequest = TypeVar("TRequest")
TResponse = TypeVar("TResponse")


class ICacheProvider(Protocol):
    """
    Cache abstraction for query results.

    Integrate with caching libraries like Redis, Memcached, Django cache, etc.
    """

    async def get(self, key: str) -> Optional[Any]:
        """
        Retrieve cached value if exists.

        Args:
            key: Cache key

        Returns:
            Cached value or None if not found
        """
        ...

    async def set(self, key: str, value: Any, ttl_seconds: Optional[int] = None) -> None:
        """
        Store value in cache with optional TTL.

        Args:
            key: Cache key
            value: Value to cache
            ttl_seconds: Time-to-live in seconds (optional)
        """
        ...

    async def remove(self, key: str) -> None:
        """
        Remove value from cache.

        Args:
            key: Cache key
        """
        ...


class ICacheable(Protocol):
    """
    Interface for queries that support caching.

    Implement this protocol on queries to enable caching behavior.
    """

    @property
    def cache_ttl_seconds(self) -> Optional[int]:
        """Cache time-to-live in seconds."""
        ...

    @property
    def cache_key(self) -> Optional[str]:
        """
        Custom cache key (optional).

        If not provided, key is derived from query properties.
        """
        ...


class CachingBehavior(IPipelineBehavior[TRequest, TResponse]):
    """
    Pipeline behavior that caches query results.

    Short-circuits handler execution on cache hit (returns cached value).
    Writes to cache on cache miss.
    Only applies to queries implementing ICacheable interface.

    **Recommended order:** 50 (after telemetry, applies to queries only)

    **Cache key strategy:**
    - If query implements ICacheable with cache_key, use that
    - Otherwise, serialize query properties to deterministic JSON string
    - Include type name to prevent collisions

    Example:
        ```python
        behavior = CachingBehavior(cache_provider)
        mediator.register_behavior(behavior)
        ```
    """

    order = 50

    def __init__(self, cache: ICacheProvider):
        """
        Initialize CachingBehavior.

        Args:
            cache: Cache provider implementation
        """
        self.cache = cache

    async def handle(self, request: TRequest, next_handler) -> Result[TResponse]:
        """
        Handle request with caching.

        Args:
            request: The request being processed
            next_handler: Delegate to invoke next behavior or handler

        Returns:
            Result containing response or error
        """
        # Only cache queries that implement ICacheable
        if not self._is_cacheable(request):
            return await next_handler()

        # Generate cache key
        cache_key = self._generate_cache_key(request)

        # Check cache
        cached_value = await self.cache.get(cache_key)
        if cached_value is not None:
            return cached_value

        # Cache miss - execute handler
        response = await next_handler()

        # Write to cache
        ttl = getattr(request, "cache_ttl_seconds", None)
        await self.cache.set(cache_key, response, ttl)

        return response

    def _is_cacheable(self, request) -> bool:
        """Type guard to detect cacheable queries."""
        return self._is_query(request)

    def _is_query(self, request) -> bool:
        """Type guard to detect query requests."""
        return isinstance(request, IQuery)

    def _generate_cache_key(self, request) -> str:
        """Generate deterministic cache key from query properties."""
        # Use custom cache key if provided
        custom_key = getattr(request, "cache_key", None)
        if custom_key:
            return f"{type(request).__name__}:{custom_key}"

        # Serialize query properties to JSON with sorted keys
        # Exclude caching metadata from the cache key calculation
        properties = {
            k: v
            for k, v in vars(request).items()
            if k not in ("cache_ttl_seconds", "cache_key")
        }

        serialized = json.dumps(properties, sort_keys=True)
        return f"{type(request).__name__}:{serialized}"


__all__ = ["CachingBehavior", "ICacheProvider", "ICacheable"]
