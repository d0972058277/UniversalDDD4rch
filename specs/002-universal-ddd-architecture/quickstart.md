# Quickstart: Universal DDD Architecture Multi-Language Consistency v2.0

## Overview
This quickstart demonstrates the consistent APIs and patterns across all five language implementations of Universal DDD Architecture v2.0. Each example uses identical domain logic but language-appropriate syntax and conventions.

## Domain Example: Customer Order System

All language implementations use this shared domain model to demonstrate consistency:

### Core Entities
- **Customer**: Aggregate root with email, name, and order history
- **Order**: Aggregate root with items, status, and customer reference
- **OrderItem**: Value object with product reference, quantity, and price

### Domain Events
- **CustomerRegistered**: When a new customer is created
- **CustomerEmailChanged**: When customer updates email
- **OrderPlaced**: When customer places an order
- **OrderConfirmed**: When order status changes to confirmed

## Language Implementations

### C# (.NET 8) Implementation

#### Core Setup
```csharp
// Package: Architecture.Core v2.0
using Architecture.Core.Domain.Entities;
using Architecture.Core.Domain.Events;
using Architecture.Core.Domain.Repositories;
using Architecture.Core.Functional;

// Domain entities
public sealed class CustomerId : ValueObject
{
    public Guid Value { get; }
    public CustomerId(Guid value) => Value = value;
    protected override IEnumerable<object> GetEqualityComponents() { yield return Value; }
}

public sealed class Customer : AggregateRoot<CustomerId>
{
    public EmailAddress Email { get; private set; }
    public CustomerName Name { get; private set; }

    private Customer(CustomerId id, EmailAddress email, CustomerName name) : base(id)
    {
        Email = email;
        Name = name;
        AddEvent(new CustomerRegistered(id, email, name, DateTime.UtcNow));
    }

    public static Result<Customer> Create(EmailAddress email, CustomerName name)
    {
        var id = new CustomerId(Guid.NewGuid());
        return Result.Ok(new Customer(id, email, name));
    }

    public Result ChangeEmail(EmailAddress newEmail)
    {
        if (Email.Equals(newEmail))
            return Result.Fail(new DomainError("Email is already set to this value"));

        var oldEmail = Email;
        Email = newEmail;
        AddEvent(new CustomerEmailChanged(Id, oldEmail, newEmail, DateTime.UtcNow));
        IncrementVersion();

        return Result.Ok();
    }
}

// Repository interface
public interface ICustomerRepository : IRepository<Customer, CustomerId>
{
    Task<Maybe<Customer>> GetByEmailAsync(EmailAddress email, CancellationToken cancellationToken = default);
}
```

#### Usage Example
```csharp
public class CustomerService
{
    private readonly ICustomerRepository _repository;

    public CustomerService(ICustomerRepository repository)
    {
        _repository = repository;
    }

    public async Task<Result<CustomerId>> RegisterCustomerAsync(
        string email,
        string firstName,
        string lastName,
        CancellationToken cancellationToken = default)
    {
        // Validate input
        var emailResult = EmailAddress.Create(email);
        if (!emailResult.IsSuccess)
            return Result.Fail<CustomerId>(emailResult.Error);

        var nameResult = CustomerName.Create(firstName, lastName);
        if (!nameResult.IsSuccess)
            return Result.Fail<CustomerId>(nameResult.Error);

        // Check if customer already exists
        var existingCustomer = await _repository.GetByEmailAsync(emailResult.Value, cancellationToken);
        if (existingCustomer.HasValue)
            return Result.Fail<CustomerId>(new DomainError("Customer with this email already exists"));

        // Create new customer
        var customerResult = Customer.Create(emailResult.Value, nameResult.Value);
        if (!customerResult.IsSuccess)
            return Result.Fail<CustomerId>(customerResult.Error);

        // Save to repository
        var saveResult = await _repository.AddAsync(customerResult.Value, cancellationToken);
        if (!saveResult.IsSuccess)
            return Result.Fail<CustomerId>(saveResult.Error);

        return Result.Ok(customerResult.Value.Id);
    }
}
```

### Go (1.21+) Implementation

#### Core Setup
```go
// Package: architecture-core v2.0
package core

import (
    "context"
    "time"
    "github.com/google/uuid"
)

// Domain entities
type CustomerId struct {
    value uuid.UUID
}

func NewCustomerId() CustomerId {
    return CustomerId{value: uuid.New()}
}

func (id CustomerId) Value() uuid.UUID {
    return id.value
}

type Customer struct {
    id           CustomerId
    email        EmailAddress
    name         CustomerName
    domainEvents []DomainEvent
    version      int64
}

func CreateCustomer(email EmailAddress, name CustomerName) Result[*Customer] {
    id := NewCustomerId()
    customer := &Customer{
        id:           id,
        email:        email,
        name:         name,
        domainEvents: make([]DomainEvent, 0),
        version:      0,
    }

    event := NewCustomerRegistered(id, email, name, time.Now())
    customer.AddDomainEvent(event)

    return Ok(customer)
}

func (c *Customer) Id() CustomerId { return c.id }
func (c *Customer) Email() EmailAddress { return c.email }
func (c *Customer) Name() CustomerName { return c.name }
func (c *Customer) DomainEvents() []DomainEvent { return append([]DomainEvent{}, c.domainEvents...) }
func (c *Customer) Version() int64 { return c.version }

func (c *Customer) AddDomainEvent(event DomainEvent) {
    c.domainEvents = append(c.domainEvents, event)
}

func (c *Customer) ClearDomainEvents() {
    c.domainEvents = c.domainEvents[:0]
}

func (c *Customer) IncrementVersion() {
    c.version++
}

func (c *Customer) ChangeEmail(newEmail EmailAddress) Result[struct{}] {
    if c.email.Equals(newEmail) {
        return Fail[struct{}](NewDomainError("Email is already set to this value"))
    }

    oldEmail := c.email
    c.email = newEmail

    event := NewCustomerEmailChanged(c.id, oldEmail, newEmail, time.Now())
    c.AddDomainEvent(event)
    c.IncrementVersion()

    return Ok(struct{}{})
}

// Repository interface
type CustomerRepository interface {
    Repository[*Customer, CustomerId]
    GetByEmail(ctx context.Context, email EmailAddress) (Maybe[*Customer], error)
}
```

#### Usage Example
```go
type CustomerService struct {
    repository CustomerRepository
}

func NewCustomerService(repository CustomerRepository) *CustomerService {
    return &CustomerService{repository: repository}
}

func (s *CustomerService) RegisterCustomer(
    ctx context.Context,
    email string,
    firstName string,
    lastName string,
) Result[CustomerId] {
    // Validate input
    emailAddr, err := CreateEmailAddress(email)
    if err != nil {
        return Fail[CustomerId](err)
    }

    customerName, err := CreateCustomerName(firstName, lastName)
    if err != nil {
        return Fail[CustomerId](err)
    }

    // Check if customer already exists
    existingCustomer, err := s.repository.GetByEmail(ctx, emailAddr)
    if err != nil {
        return Fail[CustomerId](err)
    }
    if existingCustomer.HasValue() {
        return Fail[CustomerId](NewDomainError("Customer with this email already exists"))
    }

    // Create new customer
    customerResult := CreateCustomer(emailAddr, customerName)
    if !customerResult.IsSuccess() {
        return Fail[CustomerId](customerResult.Error())
    }

    // Save to repository
    err = s.repository.Add(ctx, customerResult.Value())
    if err != nil {
        return Fail[CustomerId](err)
    }

    return Ok(customerResult.Value().Id())
}
```

### Java (21 LTS) Implementation

#### Core Setup
```java
// Package: architecture-core v2.0
package com.architecture.core.domain;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;

// Domain entities
public record CustomerId(UUID value) implements EntityId {
    public static CustomerId generate() {
        return new CustomerId(UUID.randomUUID());
    }
}

public final class Customer extends AggregateRoot<CustomerId> {
    private EmailAddress email;
    private CustomerName name;

    private Customer(CustomerId id, EmailAddress email, CustomerName name) {
        super(id);
        this.email = email;
        this.name = name;
        addDomainEvent(new CustomerRegistered(id, email, name, Instant.now()));
    }

    public static Result<Customer> create(EmailAddress email, CustomerName name) {
        var id = CustomerId.generate();
        return Result.success(new Customer(id, email, name));
    }

    public EmailAddress getEmail() { return email; }
    public CustomerName getName() { return name; }

    public Result<Void> changeEmail(EmailAddress newEmail) {
        if (email.equals(newEmail)) {
            return Result.failure(new DomainError("Email is already set to this value"));
        }

        var oldEmail = this.email;
        this.email = newEmail;
        addDomainEvent(new CustomerEmailChanged(getId(), oldEmail, newEmail, Instant.now()));
        incrementVersion();

        return Result.success(null);
    }
}

// Repository interface
public interface CustomerRepository extends Repository<Customer, CustomerId> {
    CompletableFuture<Maybe<Customer>> getByEmailAsync(EmailAddress email);
}
```

#### Usage Example
```java
public class CustomerService {
    private final CustomerRepository repository;

    public CustomerService(CustomerRepository repository) {
        this.repository = repository;
    }

    public CompletableFuture<Result<CustomerId>> registerCustomerAsync(
            String email,
            String firstName,
            String lastName) {

        return CompletableFuture.supplyAsync(() -> {
            // Validate input
            var emailResult = EmailAddress.create(email);
            if (!emailResult.isSuccess()) {
                return Result.failure(emailResult.getError());
            }

            var nameResult = CustomerName.create(firstName, lastName);
            if (!nameResult.isSuccess()) {
                return Result.failure(nameResult.getError());
            }

            return Result.success(new ValidatedInput(emailResult.getValue(), nameResult.getValue()));
        })
        .thenCompose(validationResult -> {
            if (!validationResult.isSuccess()) {
                return CompletableFuture.completedFuture(Result.failure(validationResult.getError()));
            }

            var input = validationResult.getValue();

            // Check if customer already exists
            return repository.getByEmailAsync(input.email())
                .thenCompose(existingCustomer -> {
                    if (existingCustomer.hasValue()) {
                        return CompletableFuture.completedFuture(
                            Result.<CustomerId>failure(new DomainError("Customer with this email already exists"))
                        );
                    }

                    // Create new customer
                    var customerResult = Customer.create(input.email(), input.name());
                    if (!customerResult.isSuccess()) {
                        return CompletableFuture.completedFuture(
                            Result.<CustomerId>failure(customerResult.getError())
                        );
                    }

                    // Save to repository
                    return repository.addAsync(customerResult.getValue())
                        .thenApply(saveResult -> {
                            if (!saveResult.isSuccess()) {
                                return Result.<CustomerId>failure(saveResult.getError());
                            }
                            return Result.success(customerResult.getValue().getId());
                        });
                });
        });
    }

    private record ValidatedInput(EmailAddress email, CustomerName name) {}
}
```

### Python (3.12+) Implementation

#### Core Setup
```python
# Package: architecture_core v2.0
from __future__ import annotations
from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime
from typing import List, Optional
from uuid import UUID, uuid4

# Domain entities
@dataclass(frozen=True)
class CustomerId:
    value: UUID

    @classmethod
    def generate(cls) -> CustomerId:
        return cls(uuid4())

class Customer(AggregateRoot[CustomerId]):
    def __init__(self, id: CustomerId, email: EmailAddress, name: CustomerName):
        super().__init__(id)
        self._email = email
        self._name = name
        self.add_event(CustomerRegistered(id, email, name, datetime.utcnow()))

    @property
    def email(self) -> EmailAddress:
        return self._email

    @property
    def name(self) -> CustomerName:
        return self._name

    @classmethod
    def create(cls, email: EmailAddress, name: CustomerName) -> Result[Customer]:
        id = CustomerId.generate()
        return Result.success(cls(id, email, name))

    def change_email(self, new_email: EmailAddress) -> Result[None]:
        if self._email == new_email:
            return Result.failure(DomainError("Email is already set to this value"))

        old_email = self._email
        self._email = new_email
        self.add_event(CustomerEmailChanged(self.id, old_email, new_email, datetime.utcnow()))
        self.increment_version()

        return Result.success(None)

# Repository interface
class CustomerRepository(Repository[Customer, CustomerId], ABC):
    @abstractmethod
    async def get_by_email_async(self, email: EmailAddress) -> Maybe[Customer]:
        pass
```

#### Usage Example
```python
class CustomerService:
    def __init__(self, repository: CustomerRepository):
        self._repository = repository

    async def register_customer_async(
        self,
        email: str,
        first_name: str,
        last_name: str,
    ) -> Result[CustomerId]:
        # Validate input
        email_result = EmailAddress.create(email)
        if not email_result.is_success:
            return Result.failure(email_result.error)

        name_result = CustomerName.create(first_name, last_name)
        if not name_result.is_success:
            return Result.failure(name_result.error)

        # Check if customer already exists
        existing_customer = await self._repository.get_by_email_async(email_result.value)
        if existing_customer.has_value:
            return Result.failure(DomainError("Customer with this email already exists"))

        # Create new customer
        customer_result = Customer.create(email_result.value, name_result.value)
        if not customer_result.is_success:
            return Result.failure(customer_result.error)

        # Save to repository
        save_result = await self._repository.add_async(customer_result.value)
        if not save_result.is_success:
            return Result.failure(save_result.error)

        return Result.success(customer_result.value.id)
```

### TypeScript (5.9+) Implementation

#### Core Setup
```typescript
// Package: @architecture/core v2.0
import { v4 as uuidv4 } from 'uuid';

// Domain entities
export class CustomerId implements EntityId {
    constructor(public readonly value: string) {}

    static generate(): CustomerId {
        return new CustomerId(uuidv4());
    }

    equals(other: CustomerId): boolean {
        return this.value === other.value;
    }
}

export class Customer extends AggregateRoot<CustomerId> {
    private _email: EmailAddress;
    private _name: CustomerName;

    private constructor(id: CustomerId, email: EmailAddress, name: CustomerName) {
        super(id);
        this._email = email;
        this._name = name;
        this.addEvent(new CustomerRegistered(id, email, name, new Date()));
    }

    get email(): EmailAddress { return this._email; }
    get name(): CustomerName { return this._name; }

    static create(email: EmailAddress, name: CustomerName): Result<Customer> {
        const id = CustomerId.generate();
        return Result.ok(new Customer(id, email, name));
    }

    changeEmail(newEmail: EmailAddress): Result<void> {
        if (this._email.equals(newEmail)) {
            return Result.fail(new DomainError("Email is already set to this value"));
        }

        const oldEmail = this._email;
        this._email = newEmail;
        this.addEvent(new CustomerEmailChanged(this.id, oldEmail, newEmail, new Date()));
        this.incrementVersion();

        return Result.ok(undefined);
    }
}

// Repository interface
export interface CustomerRepository extends Repository<Customer, CustomerId> {
    getByEmailAsync(email: EmailAddress): Promise<Maybe<Customer>>;
}
```

#### Usage Example
```typescript
export class CustomerService {
    constructor(private readonly repository: CustomerRepository) {}

    async registerCustomerAsync(
        email: string,
        firstName: string,
        lastName: string,
    ): Promise<Result<CustomerId>> {
        // Validate input
        const emailResult = EmailAddress.create(email);
        if (!emailResult.isSuccess) {
            return Result.fail(emailResult.error);
        }

        const nameResult = CustomerName.create(firstName, lastName);
        if (!nameResult.isSuccess) {
            return Result.fail(nameResult.error);
        }

        // Check if customer already exists
        const existingCustomer = await this.repository.getByEmailAsync(emailResult.value);
        if (existingCustomer.hasValue) {
            return Result.fail(new DomainError("Customer with this email already exists"));
        }

        // Create new customer
        const customerResult = Customer.create(emailResult.value, nameResult.value);
        if (!customerResult.isSuccess) {
            return Result.fail(customerResult.error);
        }

        // Save to repository
        const saveResult = await this.repository.addAsync(customerResult.value);
        if (!saveResult.isSuccess) {
            return Result.fail(saveResult.error);
        }

        return Result.ok(customerResult.value.id);
    }
}
```

## Cross-Language Consistency Validation

### Contract Test Scenarios

All implementations must pass these identical test scenarios:

#### 1. Customer Creation Test
```gherkin
GIVEN valid email and name
WHEN creating a customer
THEN should return success result with customer ID
AND customer should have one CustomerRegistered event
AND customer version should be 0
```

#### 2. Email Change Test
```gherkin
GIVEN an existing customer
WHEN changing email to a different valid email
THEN should return success result
AND customer should have CustomerEmailChanged event
AND customer version should be incremented
```

#### 3. Repository Add Test
```gherkin
GIVEN a new customer
WHEN adding to repository
THEN should return success result
AND customer should be retrievable by ID
AND customer should be retrievable by email
```

#### 4. Repository Duplicate Test
```gherkin
GIVEN an existing customer in repository
WHEN adding another customer with same email
THEN should return failure result
AND original customer should remain unchanged
```

### Performance Benchmarks

Each implementation should meet these performance targets:

| Operation | Target | Measurement |
|-----------|---------|-------------|
| Customer creation | < 1ms | Average time to create Customer instance |
| Repository add | < 10ms | Average time to persist customer |
| Repository get by ID | < 5ms | Average time to retrieve by ID |
| Repository get by email | < 10ms | Average time to retrieve by email (indexed) |
| Event collection | < 0.1ms | Time to access domain events |

### Memory Usage Targets

| Language | Customer Instance | Event Collection | Repository Operation |
|----------|------------------|------------------|-------------------|
| C# | < 500 bytes | < 200 bytes per event | < 2KB working set |
| Go | < 300 bytes | < 150 bytes per event | < 1KB working set |
| Java | < 600 bytes | < 250 bytes per event | < 3KB working set |
| Python | < 800 bytes | < 300 bytes per event | < 4KB working set |
| TypeScript | < 400 bytes | < 200 bytes per event | < 2KB working set |

## Migration from v1.x

### Breaking Changes Summary

1. **Repository Interface**: `Save()` method split into `Add()` and `Update()`
2. **Result Creation**: Consistent naming across languages
3. **Event Access**: Language-appropriate property/method patterns
4. **Package Structure**: Core/integration separation

### Migration Steps

1. **Update package references** to v2.0
2. **Replace Repository.Save()** calls with appropriate Add/Update
3. **Update Result creation** to use new naming conventions
4. **Separate core and integration** dependencies
5. **Update event access** patterns to language-appropriate style
6. **Run contract tests** to validate consistency

Each language provides deprecated API shims for smooth migration with compiler warnings pointing to replacement APIs.

## Getting Started

### Installation

#### C#
```bash
dotnet add package Architecture.Core --version 2.0.0
# Optional integrations
dotnet add package Architecture.Core.EntityFramework --version 2.0.0
```

#### Go
```bash
go get github.com/architecture/core/v2@v2.0.0
```

#### Java
```xml
<dependency>
    <groupId>com.architecture</groupId>
    <artifactId>architecture-core</artifactId>
    <version>2.0.0</version>
</dependency>
<!-- Optional Spring integration -->
<dependency>
    <groupId>com.architecture</groupId>
    <artifactId>architecture-core-spring</artifactId>
    <version>2.0.0</version>
</dependency>
```

#### Python
```bash
pip install architecture-core==2.0.0
# Optional Django integration
pip install django-architecture-core==2.0.0
```

#### TypeScript
```bash
npm install @architecture/core@2.0.0
# Optional Express integration
npm install @architecture/express@2.0.0
```

This quickstart demonstrates how Universal DDD Architecture v2.0 provides truly consistent patterns across all supported languages while respecting language-specific conventions and idioms.