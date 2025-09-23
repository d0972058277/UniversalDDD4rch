# Migration Guide: TypeScript Universal DDD Architecture v1.x to v2.0

## Overview

This guide helps you migrate your TypeScript Universal DDD Architecture implementation from v1.x to v2.0. The new version provides enhanced multi-language consistency, improved API alignment, better Node.js integration, and optimized Promise/async patterns.

## Breaking Changes Summary

### 1. Repository Interface Changes

**v1.x:**
```typescript
export interface Repository<TAggregate extends AggregateRoot<TId>, TId> {
    saveAsync(aggregate: TAggregate): Promise<Result<void>>;
    // ... other methods
}
```

**v2.0:**
```typescript
export interface Repository<TAggregate extends AggregateRoot<TId>, TId> {
    addAsync(aggregate: TAggregate): Promise<Result<void>>;
    updateAsync(aggregate: TAggregate): Promise<Result<void>>;
    // ... other methods
}
```

**Migration Action:**
- Replace `saveAsync()` calls with appropriate `addAsync()` or `updateAsync()` calls
- For new aggregates: Use `addAsync()`
- For existing aggregates: Use `updateAsync()`

### 2. AggregateRoot API Standardization

**v1.x:**
```typescript
export abstract class AggregateRoot<TId> extends Entity<TId> {
    protected updateVersion(): void { this._version++; } // Old method name, protected
}
```

**v2.0:**
```typescript
export abstract class AggregateRoot<TId> extends Entity<TId> {
    public incrementVersion(): void { this._version++; } // Standardized across languages, public
}
```

**Migration Action:**
- Replace `updateVersion()` calls with `incrementVersion()`
- Update visibility from protected to public if accessing externally

### 3. Result Monad Consistency

**v1.x:**
```typescript
// Mixed naming patterns
Result.success(value);  // Sometimes used
Result.ok(value);       // Sometimes used
```

**v2.0:**
```typescript
// Standardized naming
Result.ok(value);       // Always use this (TypeScript convention)
Result.fail(error);     // Always use this
```

**Migration Action:**
- Replace `Result.success()` with `Result.ok()`
- Ensure consistent use of `Result.fail()` for failures

### 4. Package Structure Changes

**v1.x:**
```
@architecture/core (monolithic package)
├── All functionality combined
└── Express/TypeORM dependencies included
```

**v2.0:**
```
@architecture/core (pure core package)
├── Core DDD abstractions only
├── No external dependencies
└── Integration packages separate:
    ├── @architecture/express
    ├── @architecture/typeorm
    └── @architecture/nestjs
```

**Migration Action:**
- Update package.json dependencies to separate core and integration packages
- Install only required integration packages
- Update import statements for integration features

## Step-by-Step Migration

### Step 1: Update Package Dependencies

**package.json Before:**
```json
{
  "dependencies": {
    "@architecture/core": "^1.0.0"
  }
}
```

**package.json After:**
```json
{
  "dependencies": {
    "@architecture/core": "^2.0.0",
    "@architecture/express": "^2.0.0",
    "@architecture/typeorm": "^2.0.0"
  }
}
```

### Step 2: Update Repository Implementations

**Before:**
```typescript
export class CustomerService {
    constructor(private readonly repository: CustomerRepository) {}

    async createCustomerAsync(customer: Customer): Promise<Result<CustomerId>> {
        const saveResult = await this.repository.saveAsync(customer);
        if (!saveResult.isSuccess) {
            return Result.fail(saveResult.error);
        }
        return Result.ok(customer.id);
    }

    async updateCustomerAsync(customer: Customer): Promise<Result<void>> {
        return this.repository.saveAsync(customer); // Same method for both
    }
}
```

**After:**
```typescript
export class CustomerService {
    constructor(private readonly repository: CustomerRepository) {}

    async createCustomerAsync(customer: Customer): Promise<Result<CustomerId>> {
        const addResult = await this.repository.addAsync(customer);
        if (!addResult.isSuccess) {
            return Result.fail(addResult.error);
        }
        return Result.ok(customer.id);
    }

    async updateCustomerAsync(customer: Customer): Promise<Result<void>> {
        return this.repository.updateAsync(customer);
    }
}
```

### Step 3: Update AggregateRoot Usage

**Before:**
```typescript
export class Order extends AggregateRoot<OrderId> {
    confirmOrder(): Result<void> {
        this.status = OrderStatus.Confirmed;
        this.addEvent(new OrderConfirmed(this.id, new Date()));
        this.updateVersion(); // Old method, protected
        return Result.ok(undefined);
    }
}
```

**After:**
```typescript
export class Order extends AggregateRoot<OrderId> {
    confirmOrder(): Result<void> {
        this.status = OrderStatus.Confirmed;
        this.addEvent(new OrderConfirmed(this.id, new Date()));
        this.incrementVersion(); // New standardized method, public
        return Result.ok(undefined);
    }
}
```

### Step 4: Update Result Usage

**Before:**
```typescript
// Inconsistent creation methods
export class EmailAddress extends ValueObject {
    static create(email: string): Result<EmailAddress> {
        if (!this.isValid(email)) {
            return Result.failure(new ValidationError("Invalid email")); // Old method
        }
        return Result.success(new EmailAddress(email)); // Old method
    }
}
```

**After:**
```typescript
// Consistent creation methods
export class EmailAddress extends ValueObject {
    static create(email: string): Result<EmailAddress> {
        if (!this.isValid(email)) {
            return Result.fail(new ValidationError("Invalid email")); // New method
        }
        return Result.ok(new EmailAddress(email)); // New method
    }
}
```

### Step 5: Update Express.js Integration

**Before:**
```typescript
// Direct Express usage in controllers
import express from 'express';

export class CustomerController {
    private readonly service: CustomerService;

    // Implementation mixed with Express concerns
    async createCustomer(req: express.Request, res: express.Response): Promise<void> {
        try {
            // Manual request/response handling
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}
```

**After:**
```typescript
// Use dedicated Express integration package
import { Controller, Post, Body } from '@architecture/express';
import { ApiResponse } from '@architecture/express/decorators';

@Controller('/customers')
export class CustomerController {
    constructor(private readonly service: CustomerService) {}

    @Post('/')
    @ApiResponse(201, 'Customer created successfully')
    @ApiResponse(400, 'Invalid customer data')
    async createCustomer(@Body() request: CreateCustomerRequest): Promise<Result<CustomerId>> {
        const emailResult = EmailAddress.create(request.email);
        if (!emailResult.isSuccess) {
            return Result.fail(emailResult.error);
        }

        const nameResult = CustomerName.create(request.firstName, request.lastName);
        if (!nameResult.isSuccess) {
            return Result.fail(nameResult.error);
        }

        const customer = Customer.create(emailResult.value, nameResult.value);
        if (!customer.isSuccess) {
            return Result.fail(customer.error);
        }

        return this.service.createCustomerAsync(customer.value);
    }
}
```

### Step 6: Update TypeORM Integration

**Before:**
```typescript
// Direct TypeORM usage in domain
import { Repository as TypeOrmRepository } from 'typeorm';

export class CustomerRepository {
    constructor(private readonly typeormRepo: TypeOrmRepository<CustomerEntity>) {}

    // Implementation mixed with TypeORM concerns
    async saveAsync(customer: Customer): Promise<Result<void>> {
        try {
            // Direct TypeORM operations
        } catch (error) {
            return Result.fail(new InfrastructureError(error.message));
        }
    }
}
```

**After:**
```typescript
// Use dedicated TypeORM integration package
import { TypeOrmRepository } from '@architecture/typeorm';
import { Repository } from 'typeorm';

export class CustomerRepository extends TypeOrmRepository<Customer, CustomerId> {
    constructor(
        @InjectRepository(CustomerEntity)
        typeormRepository: Repository<CustomerEntity>,
        mapper: CustomerMapper
    ) {
        super(typeormRepository, mapper);
    }

    // Additional custom methods if needed
    async getByEmailAsync(email: EmailAddress): Promise<Maybe<Customer>> {
        try {
            const entity = await this.typeormRepository.findOne({
                where: { email: email.value }
            });

            if (!entity) {
                return Maybe.none();
            }

            const customer = this.mapper.toDomain(entity);
            return Maybe.some(customer);
        } catch (error) {
            // Error handling through Result pattern
            throw new InfrastructureError(`Failed to get customer by email: ${error.message}`);
        }
    }
}
```

## Testing Updates

### Update Unit Tests

**Before:**
```typescript
describe('CustomerRepository', () => {
    it('saveAsync should persist aggregate', async () => {
        // Given
        const customer = createValidCustomer();

        // When
        const result = await repository.saveAsync(customer);

        // Then
        expect(result.isSuccess).toBe(true);
    });
});
```

**After:**
```typescript
describe('CustomerRepository', () => {
    it('addAsync should persist new aggregate', async () => {
        // Given
        const customer = createValidCustomer();

        // When
        const result = await repository.addAsync(customer);

        // Then
        expect(result.isSuccess).toBe(true);
    });

    it('updateAsync should modify existing aggregate', async () => {
        // Given
        const customer = existingCustomer();

        // When
        const result = await repository.updateAsync(customer);

        // Then
        expect(result.isSuccess).toBe(true);
    });
});
```

### Add Cross-Language Contract Tests

```typescript
describe('AggregateRootContract', () => {
    it('should increment version when incrementVersion called', () => {
        // GIVEN
        const customer = Customer.create(email, name).value;
        const initialVersion = customer.version;

        // WHEN
        customer.incrementVersion();

        // THEN
        expect(customer.version).toBe(initialVersion + 1);
    });
});
```

### Add Integration Tests

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';

describe('CustomerRepository Integration', () => {
    let repository: CustomerRepository;
    let module: TestingModule;

    beforeAll(async () => {
        module = await Test.createTestingModule({
            imports: [
                TypeOrmModule.forRoot({
                    type: 'sqlite',
                    database: ':memory:',
                    entities: [CustomerEntity],
                    synchronize: true,
                }),
                TypeOrmModule.forFeature([CustomerEntity]),
            ],
            providers: [CustomerRepository, CustomerMapper],
        }).compile();

        repository = module.get<CustomerRepository>(CustomerRepository);
    });

    afterAll(async () => {
        await module.close();
    });

    it('should persist and retrieve customer', async () => {
        // Given
        const customer = Customer.create(email, name).value;

        // When
        const addResult = await repository.addAsync(customer);
        const retrievedResult = await repository.getByIdAsync(customer.id);

        // Then
        expect(addResult.isSuccess).toBe(true);
        expect(retrievedResult.hasValue).toBe(true);
        expect(retrievedResult.value.id.equals(customer.id)).toBe(true);
    });
});
```

### Performance Testing

```typescript
describe('Performance Tests', () => {
    it('should create customer within performance target', () => {
        const iterations = 10000;
        const start = performance.now();

        for (let i = 0; i < iterations; i++) {
            const email = EmailAddress.create(`test${i}@example.com`).value;
            const name = CustomerName.create(`User${i}`).value;
            const customer = Customer.create(email, name).value;
        }

        const end = performance.now();
        const avgTime = (end - start) / iterations;

        expect(avgTime).toBeLessThan(0.1); // Less than 0.1ms per customer
    });

    it('should handle repository operations efficiently', async () => {
        const customers = Array.from({ length: 100 }, (_, i) =>
            Customer.create(
                EmailAddress.create(`test${i}@example.com`).value,
                CustomerName.create(`User${i}`).value
            ).value
        );

        const start = performance.now();

        await Promise.all(customers.map(customer =>
            repository.addAsync(customer)
        ));

        const end = performance.now();
        const avgTime = (end - start) / customers.length;

        expect(avgTime).toBeLessThan(10); // Less than 10ms per operation
    });
});
```

## Performance Considerations

### v2.0 Performance Improvements

- **Optimized Promise chains** with reduced allocation overhead
- **Better TypeORM integration** with efficient query patterns
- **Improved serialization** with JSON optimizations
- **Memory pooling** for frequently used objects

### Memory Usage Optimization

```typescript
// v2.0 introduces memory-efficient patterns
export class Customer extends AggregateRoot<CustomerId> {
    private static readonly EVENT_POOL = new Pool<DomainEvent>();
    private readonly _events: DomainEvent[] = [];

    protected addEvent(event: DomainEvent): void {
        // Use object pooling for better memory management
        this._events.push(event);
    }

    public clearEvents(): void {
        // Return events to pool for reuse
        this._events.forEach(event => Customer.EVENT_POOL.release(event));
        this._events.length = 0;
    }
}
```

### Promise Optimization

```typescript
// Optimized async patterns
export class CustomerService {
    async createMultipleCustomersAsync(requests: CreateCustomerRequest[]): Promise<Result<CustomerId[]>> {
        // Batch validation
        const validationResults = await Promise.all(
            requests.map(request => this.validateCreateRequest(request))
        );

        const errors = validationResults.filter(result => !result.isSuccess);
        if (errors.length > 0) {
            return Result.fail(new ValidationError('Validation failed for some customers'));
        }

        // Batch creation
        const customers = validationResults.map(result => result.value);
        const addResults = await Promise.allSettled(
            customers.map(customer => this.repository.addAsync(customer))
        );

        const successfulIds = addResults
            .filter((result, index): result is PromiseFulfilledResult<Result<void>> =>
                result.status === 'fulfilled' && result.value.isSuccess)
            .map((_, index) => customers[index].id);

        return Result.ok(successfulIds);
    }
}
```

## Troubleshooting

### Common Migration Issues

1. **TypeScript Compilation Errors with Repository.saveAsync()**
   - **Cause:** Method no longer exists in interface
   - **Solution:** Use `addAsync()` for new aggregates, `updateAsync()` for existing

2. **Property 'updateVersion' is protected and only accessible within class**
   - **Cause:** Using old protected `updateVersion()` method
   - **Solution:** Replace with public `incrementVersion()`

3. **Module Not Found: @architecture/express**
   - **Cause:** Missing integration package installation
   - **Solution:** Install `@architecture/express` and update imports

4. **Type Errors with Result.success()**
   - **Cause:** Method renamed to `Result.ok()`
   - **Solution:** Update to use consistent naming

5. **Promise Rejection Unhandled**
   - **Cause:** Changed error handling patterns in async chains
   - **Solution:** Update to use Result<T> consistently in Promise chains

### Performance Troubleshooting

```typescript
// Monitor performance with built-in Node.js tools
import { performance } from 'perf_hooks';

export class PerformanceMonitor {
    static async measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
        const start = performance.now();
        try {
            const result = await fn();
            const end = performance.now();
            console.log(`${name}: ${(end - start).toFixed(2)}ms`);
            return result;
        } catch (error) {
            const end = performance.now();
            console.log(`${name} (error): ${(end - start).toFixed(2)}ms`);
            throw error;
        }
    }
}

// Usage
const result = await PerformanceMonitor.measureAsync('CustomerCreation', () =>
    customerService.createCustomerAsync(customer)
);
```

### Verification Steps

After migration, verify your implementation:

1. **Run TypeScript compilation** - `npx tsc --noEmit`
2. **Run all unit tests** - `npm test`
3. **Run contract tests** - `npm run test:contract`
4. **Run integration tests** - `npm run test:integration`
5. **Run performance tests** - `npm run test:performance`
6. **Check bundle size** - `npm run build && npm run analyze`
7. **Validate ESLint rules** - `npm run lint`

## Production Deployment

### Build Configuration

```typescript
// webpack.config.js optimizations for v2.0
module.exports = {
    optimization: {
        splitChunks: {
            chunks: 'all',
            cacheGroups: {
                architecture: {
                    test: /[\\/]node_modules[\\/]@architecture[\\/]/,
                    name: 'architecture',
                    chunks: 'all',
                },
            },
        },
    },
    resolve: {
        alias: {
            '@architecture/core': '@architecture/core/dist/esm',
        },
    },
};
```

### Environment Configuration

```typescript
// config/production.ts
export const productionConfig = {
    architecture: {
        domainEvents: {
            enabled: true,
            asyncProcessing: true,
            queueProvider: 'redis',
        },
        repositories: {
            connectionPoolSize: 20,
            queryTimeout: 30000,
            retryAttempts: 3,
        },
        performance: {
            enableMetrics: true,
            cacheAggregates: true,
            cacheTtl: 300000,
        },
    },
    database: {
        type: 'postgres',
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT || '5432'),
        username: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_DATABASE,
        poolSize: 20,
        extra: {
            connectionLimit: 20,
        },
    },
};
```

### Monitoring and Observability

```typescript
// monitoring/metrics.ts
import { EventEmitter } from 'events';

export class MetricsCollector extends EventEmitter {
    private metrics: Map<string, number> = new Map();

    recordDomainEvent(eventType: string): void {
        const current = this.metrics.get(`domain.events.${eventType}`) || 0;
        this.metrics.set(`domain.events.${eventType}`, current + 1);
        this.emit('metric', { type: 'domain.event', name: eventType, value: current + 1 });
    }

    recordRepositoryOperation(operation: string, duration: number): void {
        const key = `repository.${operation}.duration`;
        this.metrics.set(key, duration);
        this.emit('metric', { type: 'repository.operation', name: operation, value: duration });
    }

    getMetrics(): Record<string, number> {
        return Object.fromEntries(this.metrics);
    }
}
```

## Support and Resources

- **Documentation:** [TypeScript Architecture Documentation](../docs)
- **Examples:** [Node.js Examples](../examples)
- **Issues:** [GitHub Issues](https://github.com/architecture/core/issues)
- **Community:** [Discussion Forum](https://github.com/architecture/core/discussions)
- **TypeScript Handbook:** [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- **Node.js Best Practices:** [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)

## Conclusion

Universal DDD Architecture v2.0 provides significant improvements in consistency, performance, and Node.js ecosystem integration while maintaining TypeScript's type safety and modern JavaScript patterns. The migration involves updating method names and package structure, but the core domain modeling concepts remain unchanged.

The new package separation and improved integration patterns make it easier to build scalable Node.js applications with consistent cross-language patterns and better performance characteristics.