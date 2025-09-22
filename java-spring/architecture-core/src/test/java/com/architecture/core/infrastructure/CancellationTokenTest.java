package com.architecture.core.infrastructure;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.parallel.Execution;
import org.junit.jupiter.api.parallel.ExecutionMode;

import java.util.concurrent.atomic.AtomicBoolean;

import static org.assertj.core.api.Assertions.*;

@DisplayName("CancellationToken Unit Tests")
@Execution(ExecutionMode.CONCURRENT)
class CancellationTokenTest {

    @Nested
    @DisplayName("NonCancellationToken Behavior")
    class NonCancellationTokenTests {

        @Test
        @DisplayName("Should never signal cancellation")
        void Should_NeverSignalCancellation_When_UsingNoneCancellationToken() {
            // Given
            CancellationToken token = CancellationToken.none();

            // When & Then
            assertThat(token.isCancellationRequested()).isFalse();
        }

        @Test
        @DisplayName("Should never throw when checking cancellation")
        void Should_NeverThrow_When_CheckingCancellationOnNoneToken() {
            // Given
            CancellationToken token = CancellationToken.none();

            // When & Then
            assertThatCode(token::throwIfCancellationRequested)
                .doesNotThrowAnyException();
        }

        @Test
        @DisplayName("Should return same instance for multiple calls")
        void Should_ReturnSameInstance_When_CallingNoneMultipleTimes() {
            // Given & When
            CancellationToken token1 = CancellationToken.none();
            CancellationToken token2 = CancellationToken.none();

            // Then
            assertThat(token1).isSameAs(token2);
        }

        @Test
        @DisplayName("Should provide meaningful string representation")
        void Should_ProvideMeaningfulStringRepresentation_When_ConvertingToString() {
            // Given
            CancellationToken token = CancellationToken.none();

            // When
            String stringRepresentation = token.toString();

            // Then
            assertThat(stringRepresentation).contains("NonCancellationToken");
        }
    }

    @Nested
    @DisplayName("Custom CancellationToken Implementation")
    class CustomCancellationTokenTests {

        @Test
        @DisplayName("Should signal cancellation when requested")
        void Should_SignalCancellation_When_CancellationIsRequested() {
            // Given
            TestCancellationToken token = new TestCancellationToken();

            // When
            token.cancel();

            // Then
            assertThat(token.isCancellationRequested()).isTrue();
        }

        @Test
        @DisplayName("Should not signal cancellation initially")
        void Should_NotSignalCancellation_When_InitiallyCreated() {
            // Given
            TestCancellationToken token = new TestCancellationToken();

            // When & Then
            assertThat(token.isCancellationRequested()).isFalse();
        }

        @Test
        @DisplayName("Should throw when cancellation is requested")
        void Should_Throw_When_CancellationIsRequestedAndChecking() {
            // Given
            TestCancellationToken token = new TestCancellationToken();
            token.cancel();

            // When & Then
            assertThatThrownBy(token::throwIfCancellationRequested)
                .isInstanceOf(OperationCancelledException.class)
                .hasMessageContaining("Operation was cancelled");
        }

        @Test
        @DisplayName("Should not throw when cancellation is not requested")
        void Should_NotThrow_When_CancellationIsNotRequestedAndChecking() {
            // Given
            TestCancellationToken token = new TestCancellationToken();

            // When & Then
            assertThatCode(token::throwIfCancellationRequested)
                .doesNotThrowAnyException();
        }

        @Test
        @DisplayName("Should remain cancelled once cancelled")
        void Should_RemainCancelled_When_CancelledOnce() {
            // Given
            TestCancellationToken token = new TestCancellationToken();

            // When
            token.cancel();

            // Then
            assertThat(token.isCancellationRequested()).isTrue();
            assertThat(token.isCancellationRequested()).isTrue(); // Call again
            assertThat(token.isCancellationRequested()).isTrue(); // Call again
        }

        @Test
        @DisplayName("Should handle concurrent cancellation requests")
        void Should_HandleConcurrentCancellationRequests_When_CalledFromMultipleThreads() throws InterruptedException {
            // Given
            TestCancellationToken token = new TestCancellationToken();
            int threadCount = 10;
            Thread[] threads = new Thread[threadCount];

            // When
            for (int i = 0; i < threadCount; i++) {
                threads[i] = new Thread(token::cancel);
                threads[i].start();
            }

            for (Thread thread : threads) {
                thread.join();
            }

            // Then
            assertThat(token.isCancellationRequested()).isTrue();
        }
    }

    @Nested
    @DisplayName("Interface Contract")
    class InterfaceContractTests {

        @Test
        @DisplayName("Should implement CancellationToken interface")
        void Should_ImplementCancellationTokenInterface_When_UsingNoneToken() {
            // Given
            CancellationToken token = CancellationToken.none();

            // When & Then
            assertThat(token).isInstanceOf(CancellationToken.class);
        }

        @Test
        @DisplayName("Should provide consistent behavior across calls")
        void Should_ProvideConsistentBehavior_When_CalledMultipleTimes() {
            // Given
            CancellationToken token = CancellationToken.none();

            // When
            boolean result1 = token.isCancellationRequested();
            boolean result2 = token.isCancellationRequested();
            boolean result3 = token.isCancellationRequested();

            // Then
            assertThat(result1).isEqualTo(result2).isEqualTo(result3).isFalse();
        }

        @Test
        @DisplayName("Should handle multiple throwIfCancellationRequested calls")
        void Should_HandleMultipleThrowCalls_When_NotCancelled() {
            // Given
            CancellationToken token = CancellationToken.none();

            // When & Then
            assertThatCode(() -> {
                token.throwIfCancellationRequested();
                token.throwIfCancellationRequested();
                token.throwIfCancellationRequested();
            }).doesNotThrowAnyException();
        }
    }

    // Test implementation of CancellationToken
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