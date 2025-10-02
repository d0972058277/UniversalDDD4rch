using Architecture.Core.Functional;
using Architecture.Shell.Cqrs;
using Architecture.Shell.Cqrs.Behaviors;
using Moq;

namespace Architecture.Shell.Cqrs.Tests;

/// <summary>
/// UT-005: UnitOfWork Transaction Behavior - Isolated
/// UT-006: Nested Command Transaction Reuse
/// IT-009: Transaction Provider Failure
/// </summary>
public class UnitOfWorkBehaviorTests
{
    // UT-005: T052
    [Fact]
    public async Task Should_CallBeginTransaction_When_CommandExecutes()
    {
        // Given: Mock UnitOfWork with no active transaction
        var unitOfWorkMock = new Mock<IUnitOfWork>();
        unitOfWorkMock.Setup(uow => uow.HasActiveTransaction).Returns(false);
        unitOfWorkMock.Setup(uow => uow.BeginTransactionAsync(It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        var behavior = new UnitOfWorkBehavior<TestCommand, Result>(unitOfWorkMock.Object);
        var command = new TestCommand();
        var nextCalled = false;

        RequestHandlerDelegate<Result> next = () =>
        {
            nextCalled = true;
            return Task.FromResult(Result.Ok());
        };

        // When: Command is executed through UnitOfWork behavior
        await behavior.HandleAsync(command, next, CancellationToken.None);

        // Then: BeginTransactionAsync should be called
        unitOfWorkMock.Verify(uow => uow.BeginTransactionAsync(It.IsAny<CancellationToken>()), Times.Once);
        nextCalled.Should().BeTrue();
    }

    // UT-006: T057
    [Fact]
    public async Task Should_ReuseTransaction_When_NestedCommandExecuted()
    {
        // Given: UnitOfWork with active transaction
        var unitOfWorkMock = new Mock<IUnitOfWork>();
        unitOfWorkMock.Setup(uow => uow.HasActiveTransaction).Returns(true);

        var behavior = new UnitOfWorkBehavior<TestCommand, Result>(unitOfWorkMock.Object);
        var command = new TestCommand();
        var nextCalled = false;

        RequestHandlerDelegate<Result> next = () =>
        {
            nextCalled = true;
            return Task.FromResult(Result.Ok());
        };

        // When: Nested command is executed (active transaction already exists)
        await behavior.HandleAsync(command, next, CancellationToken.None);

        // Then: Should NOT call BeginTransactionAsync (reuse existing)
        unitOfWorkMock.Verify(uow => uow.BeginTransactionAsync(It.IsAny<CancellationToken>()), Times.Never);
        nextCalled.Should().BeTrue();
    }

    // IT-009: T216
    [Fact]
    public async Task Should_ThrowException_When_TransactionProviderFails()
    {
        // Given: UnitOfWork that fails to begin transaction (DB unavailable, connection pool exhausted)
        var unitOfWorkMock = new Mock<IUnitOfWork>();
        unitOfWorkMock.Setup(uow => uow.HasActiveTransaction).Returns(false);
        unitOfWorkMock
            .Setup(uow => uow.BeginTransactionAsync(It.IsAny<CancellationToken>()))
            .ThrowsAsync(new InvalidOperationException("Connection pool exhausted"));

        var behavior = new UnitOfWorkBehavior<TestCommand, Result>(unitOfWorkMock.Object);
        var command = new TestCommand();

        RequestHandlerDelegate<Result> next = () => Task.FromResult(Result.Ok());

        // When: Command attempts to execute with failing transaction provider
        var exception = await Record.ExceptionAsync(async () =>
            await behavior.HandleAsync(command, next, CancellationToken.None)
        );

        // Then: Exception should propagate (fail-fast per BR-006)
        exception.Should().NotBeNull();
        exception.Should().BeOfType<InvalidOperationException>();
        exception.Message.Should().Contain("Connection pool exhausted");
    }
}
