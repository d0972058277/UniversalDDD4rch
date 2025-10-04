package com.architecture.core.domain;

import com.architecture.core.functional.Error;
import com.architecture.core.functional.Maybe;
import com.architecture.core.functional.Result;
import com.architecture.core.infrastructure.CancellationToken;
import com.architecture.core.infrastructure.OperationCancelledException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Timeout;
import org.junit.jupiter.api.parallel.Execution;
import org.junit.jupiter.api.parallel.ExecutionMode;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionException;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.*;

@DisplayName("Repository Contract Tests")
@Execution(ExecutionMode.CONCURRENT)
class RepositoryContractTest {

    @Nested
    @DisplayName("Async Operation Contracts")
    class AsyncOperationTests {

        @Test
        @DisplayName("Should return CompletableFuture for getByIdAsync")
        void Should_ReturnCompletableFuture_When_CallingGetByIdAsync() {
            // Given
            TestRepository repository = new TestRepository();
            TestEntityId id = new TestEntityId("TEST-001");

            // When
            CompletableFuture<Maybe<TestEntity>> future = repository.getByIdAsync(id, CancellationToken.none());

            // Then
            assertThat(future).isNotNull();
            assertThat(future).isInstanceOf(CompletableFuture.class);
        }

        @Test
        @DisplayName("Should return CompletableFuture for addAsync")
        void Should_ReturnCompletableFuture_When_CallingAddAsync() {
            // Given
            TestRepository repository = new TestRepository();
            TestEntity entity = new TestEntity(new TestEntityId("TEST-001"));

            // When
            CompletableFuture<Result<Void>> future = repository.addAsync(entity, CancellationToken.none());

            // Then
            assertThat(future).isNotNull();
            assertThat(future).isInstanceOf(CompletableFuture.class);
        }

        @Test
        @DisplayName("Should return CompletableFuture for updateAsync")
        void Should_ReturnCompletableFuture_When_CallingUpdateAsync() {
            // Given
            TestRepository repository = new TestRepository();
            TestEntity entity = new TestEntity(new TestEntityId("TEST-001"));

            // When
            CompletableFuture<Result<Void>> future = repository.updateAsync(entity, CancellationToken.none());

            // Then
            assertThat(future).isNotNull();
            assertThat(future).isInstanceOf(CompletableFuture.class);
        }

        @Test
        @DisplayName("Should return CompletableFuture for deleteAsync")
        void Should_ReturnCompletableFuture_When_CallingDeleteAsync() {
            // Given
            TestRepository repository = new TestRepository();
            TestEntityId id = new TestEntityId("TEST-001");

            // When
            CompletableFuture<Result<Void>> future = repository.deleteAsync(id, CancellationToken.none());

            // Then
            assertThat(future).isNotNull();
            assertThat(future).isInstanceOf(CompletableFuture.class);
        }

        @Test
        @DisplayName("Should return CompletableFuture for existsAsync")
        void Should_ReturnCompletableFuture_When_CallingExistsAsync() {
            // Given
            TestRepository repository = new TestRepository();
            TestEntityId id = new TestEntityId("TEST-001");

            // When
            CompletableFuture<Result<Boolean>> future = repository.existsAsync(id, CancellationToken.none());

            // Then
            assertThat(future).isNotNull();
            assertThat(future).isInstanceOf(CompletableFuture.class);
        }

        @Test
        @Timeout(value = 5, unit = TimeUnit.SECONDS)
        @DisplayName("Should complete async operations within reasonable time")
        void Should_CompleteAsyncOperations_When_WithinReasonableTime() {
            // Given
            TestRepository repository = new TestRepository();
            TestEntityId id = new TestEntityId("TEST-001");
            TestEntity entity = new TestEntity(id);

            // When & Then
            assertThatCode(() -> {
                repository.addAsync(entity, CancellationToken.none()).join();
                repository.getByIdAsync(id, CancellationToken.none()).join();
                repository.updateAsync(entity, CancellationToken.none()).join();
                repository.existsAsync(id, CancellationToken.none()).join();
                repository.deleteAsync(id, CancellationToken.none()).join();
            }).doesNotThrowAnyException();
        }
    }

    @Nested
    @DisplayName("Cancellation Support")
    class CancellationTests {

        @Test
        @DisplayName("Should accept cancellation token for all operations")
        void Should_AcceptCancellationToken_When_CallingAnyOperation() {
            // Given
            TestRepository repository = new TestRepository();
            TestEntityId id = new TestEntityId("TEST-001");
            TestEntity entity = new TestEntity(id);
            TestCancellationToken cancellationToken = new TestCancellationToken();

            // When & Then
            assertThatCode(() -> {
                repository.getByIdAsync(id, cancellationToken);
                repository.addAsync(entity, cancellationToken);
                repository.updateAsync(entity, cancellationToken);
                repository.deleteAsync(id, cancellationToken);
                repository.existsAsync(id, cancellationToken);
            }).doesNotThrowAnyException();
        }

        @Test
        @DisplayName("Should respect cancellation when token is cancelled")
        void Should_RespectCancellation_When_TokenIsCancelled() {
            // Given
            TestRepository repository = new TestRepository();
            TestEntityId id = new TestEntityId("TEST-001");
            TestCancellationToken cancellationToken = new TestCancellationToken();
            cancellationToken.cancel(); // Cancel the token

            // When
            CompletableFuture<Maybe<TestEntity>> future = repository.getByIdAsync(id, cancellationToken);

            // Then
            assertThatThrownBy(future::join)
                .isInstanceOf(CompletionException.class)
                .hasCauseInstanceOf(OperationCancelledException.class);
        }

        @Test
        @DisplayName("Should handle non-cancelling token gracefully")
        void Should_HandleNonCancellingToken_When_UsingNoneCancellationToken() {
            // Given
            TestRepository repository = new TestRepository();
            TestEntityId id = new TestEntityId("TEST-001");

            // When
            CompletableFuture<Maybe<TestEntity>> future = repository.getByIdAsync(id, CancellationToken.none());

            // Then
            assertThatCode(future::join).doesNotThrowAnyException();
            assertThat(future.join()).isEqualTo(Maybe.none());
        }
    }

    @Nested
    @DisplayName("Result Handling")
    class ResultHandlingTests {

        @Test
        @DisplayName("Should return Maybe for getByIdAsync")
        void Should_ReturnMaybe_When_CallingGetByIdAsync() {
            // Given
            TestRepository repository = new TestRepository();
            TestEntityId id = new TestEntityId("TEST-001");

            // When
            Maybe<TestEntity> result = repository.getByIdAsync(id, CancellationToken.none()).join();

            // Then
            assertThat(result).isNotNull();
            assertThat(result.isEmpty()).isTrue(); // Empty because entity doesn't exist
        }

        @Test
        @DisplayName("Should return Result for addAsync")
        void Should_ReturnResult_When_CallingAddAsync() {
            // Given
            TestRepository repository = new TestRepository();
            TestEntity entity = new TestEntity(new TestEntityId("TEST-001"));

            // When
            Result<Void> result = repository.addAsync(entity, CancellationToken.none()).join();

            // Then
            assertThat(result).isNotNull();
            assertThat(result.isSuccess()).isTrue();
        }

        @Test
        @DisplayName("Should return Result for updateAsync")
        void Should_ReturnResult_When_CallingUpdateAsync() {
            // Given
            TestRepository repository = new TestRepository();
            TestEntity entity = new TestEntity(new TestEntityId("TEST-001"));

            // When
            Result<Void> result = repository.updateAsync(entity, CancellationToken.none()).join();

            // Then
            assertThat(result).isNotNull();
            assertThat(result.isSuccess()).isTrue();
        }

        @Test
        @DisplayName("Should return Result for deleteAsync")
        void Should_ReturnResult_When_CallingDeleteAsync() {
            // Given
            TestRepository repository = new TestRepository();
            TestEntityId id = new TestEntityId("TEST-001");

            // When
            Result<Void> result = repository.deleteAsync(id, CancellationToken.none()).join();

            // Then
            assertThat(result).isNotNull();
            assertThat(result.isSuccess()).isTrue();
        }

        @Test
        @DisplayName("Should return Boolean for existsAsync")
        void Should_ReturnBoolean_When_CallingExistsAsync() {
            // Given
            TestRepository repository = new TestRepository();
            TestEntityId id = new TestEntityId("TEST-001");

            // When
            Result<Boolean> result = repository.existsAsync(id, CancellationToken.none()).join();

            // Then
            assertThat(result).isNotNull();
            assertThat(result.isSuccess()).isTrue();
            assertThat(result.getValue()).isFalse(); // False because entity doesn't exist
        }

        @ParameterizedTest(name = "Operation {0} should handle errors gracefully")
        @MethodSource("repositoryOperations")
        @DisplayName("Should handle repository errors gracefully")
        void Should_HandleRepositoryErrorsGracefully_When_ErrorsOccur(
            String operationName, RepositoryOperation operation) {
            // Given
            TestRepository repository = new TestRepository();
            repository.setFailureMode(true); // Enable failure mode

            // When & Then
            assertThatCode(() -> {
                CompletableFuture<?> future = operation.execute(repository);
                future.join();
            }).doesNotThrowAnyException();
        }

        static Stream<Arguments> repositoryOperations() {
            return Stream.of(
                Arguments.of("getByIdAsync", (RepositoryOperation) repo ->
                    repo.getByIdAsync(new TestEntityId("TEST-001"), CancellationToken.none())),
                Arguments.of("addAsync", (RepositoryOperation) repo ->
                    repo.addAsync(new TestEntity(new TestEntityId("TEST-001")), CancellationToken.none())),
                Arguments.of("updateAsync", (RepositoryOperation) repo ->
                    repo.updateAsync(new TestEntity(new TestEntityId("TEST-001")), CancellationToken.none())),
                Arguments.of("deleteAsync", (RepositoryOperation) repo ->
                    repo.deleteAsync(new TestEntityId("TEST-001"), CancellationToken.none())),
                Arguments.of("existsAsync", (RepositoryOperation) repo ->
                    repo.existsAsync(new TestEntityId("TEST-001"), CancellationToken.none()))
            );
        }

        @FunctionalInterface
        interface RepositoryOperation {
            CompletableFuture<?> execute(TestRepository repository);
        }
    }

    @Nested
    @DisplayName("Type Safety")
    class TypeSafetyTests {

        @Test
        @DisplayName("Should enforce aggregate root constraint")
        void Should_EnforceAggregateRootConstraint_When_UsingRepository() {
            // Given
            TestRepository repository = new TestRepository();

            // When & Then - This should compile because TestEntity extends AggregateRoot
            assertThatCode(() -> {
                TestEntity entity = new TestEntity(new TestEntityId("TEST-001"));
                repository.addAsync(entity, CancellationToken.none());
            }).doesNotThrowAnyException();
        }

        @Test
        @DisplayName("Should enforce entity ID constraint")
        void Should_EnforceEntityIdConstraint_When_UsingRepository() {
            // Given
            TestRepository repository = new TestRepository();

            // When & Then - This should compile because TestEntityId implements EntityId
            assertThatCode(() -> {
                TestEntityId id = new TestEntityId("TEST-001");
                repository.getByIdAsync(id, CancellationToken.none());
            }).doesNotThrowAnyException();
        }
    }

    // Test implementations
    private static class TestEntityId implements EntityId<TestEntityId> {
        private final String value;

        public TestEntityId(String value) {
            this.value = Objects.requireNonNull(value);
        }

        @Override
        public String getValue() {
            return value;
        }

        @Override
        public Result<Void> validate() {
            if (value.trim().isEmpty()) {
                return Result.failure(Error.validation("TestEntityId.Empty", "ID cannot be empty", Map.of()));
            }
            return Result.success(null);
        }

        @Override
        public int compareTo(TestEntityId other) {
            return this.value.compareTo(other.value);
        }

        @Override
        public boolean equals(Object obj) {
            if (this == obj) return true;
            if (obj == null || getClass() != obj.getClass()) return false;
            TestEntityId that = (TestEntityId) obj;
            return Objects.equals(value, that.value);
        }

        @Override
        public int hashCode() {
            return Objects.hash(value);
        }

        @Override
        public String toString() {
            return "TestEntityId{" + value + "}";
        }
    }

    private static class TestEntity extends AggregateRoot<TestEntityId> {
        public TestEntity(TestEntityId id) {
            super(id);
        }
    }

    private static class TestRepository implements Repository<TestEntity, TestEntityId> {
        private boolean failureMode = false;

        public void setFailureMode(boolean failureMode) {
            this.failureMode = failureMode;
        }

        @Override
        public CompletableFuture<Maybe<TestEntity>> getByIdAsync(TestEntityId id, CancellationToken cancellationToken) {
            return CompletableFuture.supplyAsync(() -> {
                cancellationToken.throwIfCancellationRequested();
                if (failureMode) {
                    // Return empty Maybe instead of throwing
                    return Maybe.none();
                }
                // Simulate entity not found
                return Maybe.none();
            });
        }

        @Override
        public CompletableFuture<Result<Void>> addAsync(TestEntity aggregate, CancellationToken cancellationToken) {
            return CompletableFuture.supplyAsync(() -> {
                cancellationToken.throwIfCancellationRequested();
                if (failureMode) {
                    return Result.failure(Error.infrastructure("Repository.AddFailed", "Failed to add entity", null));
                }
                return Result.success();
            });
        }

        @Override
        public CompletableFuture<Result<Void>> updateAsync(TestEntity aggregate, CancellationToken cancellationToken) {
            return CompletableFuture.supplyAsync(() -> {
                cancellationToken.throwIfCancellationRequested();
                if (failureMode) {
                    return Result.failure(Error.infrastructure("Repository.UpdateFailed", "Failed to update entity", null));
                }
                return Result.success();
            });
        }

        @Override
        public CompletableFuture<Result<Void>> deleteAsync(TestEntityId id, CancellationToken cancellationToken) {
            return CompletableFuture.supplyAsync(() -> {
                cancellationToken.throwIfCancellationRequested();
                if (failureMode) {
                    return Result.failure(Error.infrastructure("Repository.DeleteFailed", "Failed to delete entity", null));
                }
                return Result.success();
            });
        }

        @Override
        public CompletableFuture<Result<Boolean>> existsAsync(TestEntityId id, CancellationToken cancellationToken) {
            return CompletableFuture.supplyAsync(() -> {
                cancellationToken.throwIfCancellationRequested();
                if (failureMode) {
                    // In failure mode, return false instead of throwing
                    return Result.success(false);
                }
                // Simulate entity doesn't exist
                return Result.success(false);
            });
        }
    }

    private static class TestCancellationToken implements CancellationToken {
        private final AtomicBoolean cancelled = new AtomicBoolean(false);

        public void cancel() {
            cancelled.set(true);
        }

        @Override
        public boolean isCancellationRequested() {
            return cancelled.get();
        }

        @Override
        public void throwIfCancellationRequested() throws OperationCancelledException {
            if (cancelled.get()) {
                throw new OperationCancelledException("Operation was cancelled");
            }
        }
    }
}