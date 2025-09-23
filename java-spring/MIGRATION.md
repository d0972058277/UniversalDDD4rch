# Migration Guide: Java Universal DDD Architecture v1.x to v2.0

## Overview

This guide helps you migrate your Java Universal DDD Architecture implementation from v1.x to v2.0. The new version provides enhanced multi-language consistency, improved API alignment, Spring Boot integration, and better CompletableFuture patterns.

## Breaking Changes Summary

### 1. Repository Interface Changes

**v1.x:**
```java
public interface Repository<TAggregate extends AggregateRoot<TId>, TId> {
    CompletableFuture<Result<Void>> saveAsync(TAggregate aggregate);
    // ... other methods
}
```

**v2.0:**
```java
public interface Repository<TAggregate extends AggregateRoot<TId>, TId> {
    CompletableFuture<Result<Void>> addAsync(TAggregate aggregate);
    CompletableFuture<Result<Void>> updateAsync(TAggregate aggregate);
    // ... other methods
}
```

**Migration Action:**
- Replace `saveAsync()` calls with appropriate `addAsync()` or `updateAsync()` calls
- For new aggregates: Use `addAsync()`
- For existing aggregates: Use `updateAsync()`

### 2. AggregateRoot API Standardization

**v1.x:**
```java
public abstract class AggregateRoot<TId> extends Entity<TId> {
    public void updateVersion() { this.version++; } // Old method name
}
```

**v2.0:**
```java
public abstract class AggregateRoot<TId> extends Entity<TId> {
    public void incrementVersion() { this.version++; } // Standardized across languages
}
```

**Migration Action:**
- Replace `updateVersion()` calls with `incrementVersion()`
- Update any custom implementations to use the new method name

### 3. Result Monad Consistency

**v1.x:**
```java
// Mixed naming patterns
Result.success(value)  // Sometimes used
Result.ok(value)       // Sometimes used
```

**v2.0:**
```java
// Standardized naming
Result.success(value)  // Always use this (Java convention)
Result.failure(error)  // Always use this
```

**Migration Action:**
- Standardize on `Result.success()` and `Result.failure()`
- Update any usage of alternative naming patterns

### 4. Package Structure Changes

**v1.x:**
```
architecture-core (monolithic JAR)
├── All functionality combined
└── Spring dependencies included
```

**v2.0:**
```
architecture-core (pure core JAR)
├── Core DDD abstractions only
├── No external dependencies
└── Integration JARs separate:
    ├── architecture-core-spring
    ├── architecture-core-jpa
    └── architecture-core-security
```

**Migration Action:**
- Update Maven/Gradle dependencies to separate core and integration packages
- Add only required integration packages
- Update import statements if needed

## Step-by-Step Migration

### Step 1: Update Maven Dependencies

**pom.xml Before:**
```xml
<dependency>
    <groupId>com.architecture</groupId>
    <artifactId>architecture-core</artifactId>
    <version>1.x.x</version>
</dependency>
```

**pom.xml After:**
```xml
<!-- Core package -->
<dependency>
    <groupId>com.architecture</groupId>
    <artifactId>architecture-core</artifactId>
    <version>2.0.0</version>
</dependency>

<!-- Add only needed integrations -->
<dependency>
    <groupId>com.architecture</groupId>
    <artifactId>architecture-core-spring</artifactId>
    <version>2.0.0</version>
</dependency>

<dependency>
    <groupId>com.architecture</groupId>
    <artifactId>architecture-core-jpa</artifactId>
    <version>2.0.0</version>
</dependency>
```

### Step 2: Update Gradle Dependencies

**build.gradle Before:**
```gradle
dependencies {
    implementation 'com.architecture:architecture-core:1.x.x'
}
```

**build.gradle After:**
```gradle
dependencies {
    implementation 'com.architecture:architecture-core:2.0.0'
    implementation 'com.architecture:architecture-core-spring:2.0.0'
    implementation 'com.architecture:architecture-core-jpa:2.0.0'
}
```

### Step 3: Update Repository Implementations

**Before:**
```java
@Service
public class CustomerService {

    private final CustomerRepository repository;

    public CompletableFuture<Result<CustomerId>> createCustomerAsync(Customer customer) {
        return repository.saveAsync(customer)
            .thenApply(result -> result.isSuccess()
                ? Result.success(customer.getId())
                : Result.failure(result.getError()));
    }

    public CompletableFuture<Result<Void>> updateCustomerAsync(Customer customer) {
        return repository.saveAsync(customer); // Same method for both
    }
}
```

**After:**
```java
@Service
public class CustomerService {

    private final CustomerRepository repository;

    public CompletableFuture<Result<CustomerId>> createCustomerAsync(Customer customer) {
        return repository.addAsync(customer)
            .thenApply(result -> result.isSuccess()
                ? Result.success(customer.getId())
                : Result.failure(result.getError()));
    }

    public CompletableFuture<Result<Void>> updateCustomerAsync(Customer customer) {
        return repository.updateAsync(customer);
    }
}
```

### Step 4: Update AggregateRoot Usage

**Before:**
```java
public class Order extends AggregateRoot<OrderId> {

    public Result<Void> confirmOrder() {
        this.status = OrderStatus.CONFIRMED;
        addDomainEvent(new OrderConfirmed(getId(), Instant.now()));
        updateVersion(); // Old method
        return Result.success(null);
    }
}
```

**After:**
```java
public class Order extends AggregateRoot<OrderId> {

    public Result<Void> confirmOrder() {
        this.status = OrderStatus.CONFIRMED;
        addDomainEvent(new OrderConfirmed(getId(), Instant.now()));
        incrementVersion(); // New standardized method
        return Result.success(null);
    }
}
```

### Step 5: Update Spring Boot Integration

**Before:**
```java
// Direct JPA usage in domain
@Repository
public class CustomerRepositoryImpl implements CustomerRepository {

    @PersistenceContext
    private EntityManager entityManager;

    // Implementation mixed with JPA concerns
}
```

**After:**
```java
// Use dedicated Spring JPA integration package
import com.architecture.core.spring.data.SpringDataRepository;

@Repository
public class CustomerRepositoryImpl extends SpringDataRepository<Customer, CustomerId>
    implements CustomerRepository {

    public CustomerRepositoryImpl(JpaRepository<CustomerEntity, String> jpaRepository,
                                 CustomerMapper mapper) {
        super(jpaRepository, mapper);
    }

    // Additional custom methods if needed
    @Override
    public CompletableFuture<Maybe<Customer>> getByEmailAsync(EmailAddress email) {
        return CompletableFuture.supplyAsync(() -> {
            // Implementation using Spring Data integration helpers
        });
    }
}
```

### Step 6: Update Spring Configuration

**Before:**
```java
@Configuration
public class ArchitectureConfig {
    // Mixed configuration
}
```

**After:**
```java
@Configuration
@EnableArchitectureCore // New auto-configuration
public class ArchitectureConfig {

    @Bean
    public DomainEventPublisher domainEventPublisher() {
        return new SpringApplicationEventPublisher();
    }

    @Bean
    public TransactionManager transactionManager() {
        return new SpringTransactionManager();
    }
}
```

## Testing Updates

### Update Unit Tests

**Before:**
```java
@Test
void saveAsync_shouldPersistAggregate() {
    // Given
    Customer customer = createValidCustomer();

    // When
    Result<Void> result = repository.saveAsync(customer).join();

    // Then
    assertTrue(result.isSuccess());
}
```

**After:**
```java
@Test
void addAsync_shouldPersistNewAggregate() {
    // Given
    Customer customer = createValidCustomer();

    // When
    Result<Void> result = repository.addAsync(customer).join();

    // Then
    assertTrue(result.isSuccess());
}

@Test
void updateAsync_shouldModifyExistingAggregate() {
    // Given
    Customer customer = existingCustomer();

    // When
    Result<Void> result = repository.updateAsync(customer).join();

    // Then
    assertTrue(result.isSuccess());
}
```

### Add Cross-Language Contract Tests

```java
@TestMethodOrder(OrderAnnotation.class)
class AggregateRootContractTests {

    @Test
    @Order(1)
    void should_IncrementVersion_When_IncrementVersionCalled() {
        // GIVEN
        var customer = Customer.create(email, name).getValue();
        var initialVersion = customer.getVersion();

        // WHEN
        customer.incrementVersion();

        // THEN
        assertEquals(initialVersion + 1, customer.getVersion());
    }
}
```

### Add Integration Tests

```java
@SpringBootTest
@Testcontainers
class CustomerRepositoryIntegrationTests {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15")
            .withDatabaseName("testdb")
            .withUsername("test")
            .withPassword("test");

    @Autowired
    private CustomerRepository repository;

    @Test
    void should_PersistAndRetrieveCustomer() {
        // Given
        var customer = Customer.create(email, name).getValue();

        // When
        var addResult = repository.addAsync(customer).join();
        var retrievedResult = repository.getByIdAsync(customer.getId()).join();

        // Then
        assertTrue(addResult.isSuccess());
        assertTrue(retrievedResult.hasValue());
        assertEquals(customer.getId(), retrievedResult.getValue().getId());
    }
}
```

## Performance Considerations

### v2.0 Performance Improvements

- **Optimized CompletableFuture chains** with reduced allocation overhead
- **Better JPA integration** with efficient mapping strategies
- **Improved serialization** with Jackson optimizations
- **Connection pooling** optimizations for Spring Boot

### JVM Optimization

```java
// v2.0 introduces JVM-optimized patterns
@Component
public class CustomerService {

    // Use record classes for better performance (Java 14+)
    public record CustomerCreationRequest(String email, String firstName, String lastName) {}

    // Optimized async processing
    @Async("customerProcessingExecutor")
    public CompletableFuture<Result<CustomerId>> createCustomerAsync(CustomerCreationRequest request) {
        return CompletableFuture
            .supplyAsync(() -> validateRequest(request))
            .thenCompose(validation -> validation.isSuccess()
                ? processCustomerCreation(validation.getValue())
                : CompletableFuture.completedFuture(Result.failure(validation.getError())))
            .exceptionally(throwable -> Result.failure(new InfrastructureError(throwable.getMessage())));
    }
}
```

### Memory Usage Optimization

```java
// Configure JPA for optimal memory usage
@Configuration
public class JpaConfig {

    @Bean
    public JpaVendorAdapter jpaVendorAdapter() {
        HibernateJpaVendorAdapter adapter = new HibernateJpaVendorAdapter();
        adapter.setGenerateDdl(false);
        adapter.setShowSql(false);
        return adapter;
    }

    @Bean
    public DataSource dataSource() {
        HikariConfig config = new HikariConfig();
        config.setMaximumPoolSize(20);
        config.setMinimumIdle(5);
        config.setConnectionTimeout(30000);
        config.setIdleTimeout(600000);
        config.setMaxLifetime(1800000);
        return new HikariDataSource(config);
    }
}
```

## Troubleshooting

### Common Migration Issues

1. **Compilation Errors with Repository.saveAsync()**
   - **Cause:** Method no longer exists
   - **Solution:** Use `addAsync()` for new aggregates, `updateAsync()` for existing

2. **Missing incrementVersion() Method**
   - **Cause:** Using old `updateVersion()` method
   - **Solution:** Replace with `incrementVersion()`

3. **Spring Boot Auto-Configuration Issues**
   - **Cause:** Missing `@EnableArchitectureCore` annotation
   - **Solution:** Add annotation to main configuration class

4. **JPA Integration Problems**
   - **Cause:** Using old direct JPA integration
   - **Solution:** Install `architecture-core-jpa` and use provided base classes

5. **CompletableFuture Exception Handling**
   - **Cause:** Changed exception handling patterns
   - **Solution:** Update to use Result<T> consistently in async chains

### Performance Troubleshooting

```java
// Monitor performance with Micrometer
@Component
public class PerformanceMonitor {

    private final MeterRegistry meterRegistry;

    @EventListener
    public void handleCustomerCreated(CustomerCreated event) {
        Timer.Sample sample = Timer.start(meterRegistry);
        sample.stop(Timer.builder("customer.creation.time")
            .description("Time taken to create customer")
            .register(meterRegistry));
    }
}
```

### Verification Steps

After migration, verify your implementation:

1. **Run all unit tests** - Ensure business logic still works
2. **Run contract tests** - Validate cross-language consistency
3. **Run integration tests** - Ensure database/messaging still works
4. **Run performance tests** - Verify performance improvements
5. **Check Spring Boot actuator endpoints** - Monitor health and metrics
6. **Validate JPA queries** - Ensure efficient database access

## Production Deployment

### Configuration Management

```yaml
# application.yml
spring:
  architecture:
    core:
      domain-events:
        enabled: true
        async-processing: true
      repositories:
        batch-size: 25
        fetch-size: 50
      performance:
        enable-metrics: true

management:
  endpoints:
    web:
      exposure:
        include: health,metrics,architecture
```

### Monitoring and Observability

```java
@Component
public class DomainEventMonitor {

    private final MeterRegistry meterRegistry;

    @EventListener
    public void onDomainEvent(DomainEvent event) {
        meterRegistry.counter("domain.events",
            "type", event.getClass().getSimpleName()).increment();
    }
}
```

## Support and Resources

- **Documentation:** [Java Architecture Documentation](../docs)
- **Examples:** [Spring Boot Examples](../examples)
- **Issues:** [GitHub Issues](https://github.com/architecture/core/issues)
- **Community:** [Discussion Forum](https://github.com/architecture/core/discussions)
- **Spring Boot Reference:** [Spring Boot Documentation](https://docs.spring.io/spring-boot/docs/current/reference/htmlsingle/)

## Conclusion

Universal DDD Architecture v2.0 provides significant improvements in consistency, Spring Boot integration, and performance while maintaining Java ecosystem best practices. The migration involves updating method names and dependency configurations, but the core domain modeling concepts remain unchanged.

The new Spring Boot integration provides seamless auto-configuration and better integration with the Spring ecosystem, making it easier to build production-ready applications with consistent cross-language patterns.