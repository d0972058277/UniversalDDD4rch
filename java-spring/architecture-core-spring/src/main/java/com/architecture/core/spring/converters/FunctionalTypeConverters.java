package com.architecture.core.spring.converters;

import com.architecture.core.functional.Error;
import com.architecture.core.functional.Maybe;
import com.architecture.core.functional.Result;

import org.springframework.core.convert.ConversionService;
import org.springframework.core.convert.TypeDescriptor;
import org.springframework.core.convert.converter.Converter;
import org.springframework.core.convert.converter.GenericConverter;
import org.springframework.core.convert.support.ConfigurableConversionService;
import org.springframework.lang.NonNull;
import org.springframework.lang.Nullable;

import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.CompletableFuture;

/**
 * Spring type converters for Architecture.Core functional types.
 * Provides seamless integration between Result/Maybe types and Java/Spring standard types.
 */
public class FunctionalTypeConverters {

    /**
     * Registers all functional type converters with the provided conversion service.
     */
    public static void registerConverters(ConfigurableConversionService conversionService) {
        // Maybe converters
        conversionService.addConverter(new MaybeToOptionalConverter());
        conversionService.addConverter(new OptionalToMaybeConverter());

        // Result converters
        conversionService.addConverter(new ResultToOptionalConverter());
        conversionService.addConverter(new ResultToCompletableFutureConverter());

        // Generic converters - commented out due to compilation issues
        // conversionService.addGenericConverter(new MaybeGenericConverter());
        // conversionService.addGenericConverter(new ResultGenericConverter());
    }

    /**
     * Converts Maybe<T> to Optional<T>.
     */
    public static class MaybeToOptionalConverter implements Converter<Maybe<?>, Optional<?>> {
        @Override
        @NonNull
        public Optional<?> convert(@NonNull Maybe<?> source) {
            return source.toOptional();
        }
    }

    /**
     * Converts Optional<T> to Maybe<T>.
     */
    public static class OptionalToMaybeConverter implements Converter<Optional<?>, Maybe<?>> {
        @Override
        @NonNull
        public Maybe<?> convert(@NonNull Optional<?> source) {
            return source.map(Maybe::some).orElse(Maybe.none());
        }
    }

    /**
     * Converts Result<T> to Optional<T> (success values only).
     */
    public static class ResultToOptionalConverter implements Converter<Result<?>, Optional<?>> {
        @Override
        @NonNull
        public Optional<?> convert(@NonNull Result<?> source) {
            return source.isSuccess() ? Optional.of(source.getValue()) : Optional.empty();
        }
    }

    /**
     * Converts Result<T> to CompletableFuture<T>.
     */
    public static class ResultToCompletableFutureConverter implements Converter<Result<?>, CompletableFuture<?>> {
        @Override
        @NonNull
        public CompletableFuture<?> convert(@NonNull Result<?> source) {
            if (source.isSuccess()) {
                return CompletableFuture.completedFuture(source.getValue());
            } else {
                return CompletableFuture.failedFuture(
                    new ResultConversionException(source.getError())
                );
            }
        }
    }

    /**
     * Generic converter for Maybe types with parameterized type support.
     */
    public static class MaybeGenericConverter implements GenericConverter {
        @Override
        public Set<ConvertiblePair> getConvertibleTypes() {
            return Set.of(
                new ConvertiblePair(Maybe.class, Optional.class),
                new ConvertiblePair(Optional.class, Maybe.class),
                new ConvertiblePair(Maybe.class, Object.class)
            );
        }

        @Override
        @Nullable
        public Object convert(@Nullable Object source, TypeDescriptor sourceType, TypeDescriptor targetType) {
            if (source == null) {
                return null;
            }

            if (source instanceof Maybe) {
                Maybe<?> maybe = (Maybe<?>) source;

                if (targetType.getType() == Optional.class) {
                    return maybe.toOptional();
                } else if (targetType.getType() != Maybe.class) {
                    // Extract value for direct type conversion
                    return maybe.hasValue() ? maybe.getValue() : null;
                }
            } else if (source instanceof Optional && targetType.getType() == Maybe.class) {
                Optional<?> optional = (Optional<?>) source;
                return optional.map(Maybe::some).orElse(Maybe.none());
            }

            return source;
        }
    }

    /**
     * Generic converter for Result types with parameterized type support.
     */
    public static class ResultGenericConverter implements GenericConverter {
        @Override
        public Set<ConvertiblePair> getConvertibleTypes() {
            return Set.of(
                new ConvertiblePair(Result.class, Optional.class),
                new ConvertiblePair(Result.class, CompletableFuture.class),
                new ConvertiblePair(Result.class, Maybe.class),
                new ConvertiblePair(Result.class, Object.class)
            );
        }

        @Override
        @Nullable
        public Object convert(@Nullable Object source, TypeDescriptor sourceType, TypeDescriptor targetType) {
            if (source == null) {
                return null;
            }

            if (source instanceof Result) {
                Result<?> result = (Result<?>) source;

                if (targetType.getType() == Optional.class) {
                    return result.isSuccess() ? Optional.of(result.getValue()) : Optional.empty();
                } else if (targetType.getType() == CompletableFuture.class) {
                    return result.isSuccess()
                        ? CompletableFuture.completedFuture(result.getValue())
                        : CompletableFuture.failedFuture(new ResultConversionException(result.getError()));
                } else if (targetType.getType() == Maybe.class) {
                    return result.isSuccess() ? Maybe.some(result.getValue()) : Maybe.none();
                } else if (targetType.getType() != Result.class) {
                    // Extract value for direct type conversion
                    if (result.isSuccess()) {
                        return result.getValue();
                    } else {
                        throw new ResultConversionException(result.getError());
                    }
                }
            }

            return source;
        }
    }

    /**
     * Exception thrown when Result conversion fails.
     */
    public static class ResultConversionException extends RuntimeException {
        private final Error error;

        public ResultConversionException(Error error) {
            super(error.getMessage(), error.getCause().orElse(null));
            this.error = error;
        }

        public Error getError() {
            return error;
        }
    }

    /**
     * Utility methods for manual conversion operations.
     */
    public static class ConversionUtils {

        /**
         * Converts Maybe to Optional safely.
         */
        public static <T> Optional<T> maybeToOptional(Maybe<T> maybe) {
            return maybe != null ? maybe.toOptional() : Optional.empty();
        }

        /**
         * Converts Optional to Maybe safely.
         */
        public static <T> Maybe<T> optionalToMaybe(Optional<T> optional) {
            return optional != null ? optional.map(Maybe::some).orElse(Maybe.none()) : Maybe.none();
        }

        /**
         * Converts Result to Optional safely (success values only).
         */
        public static <T> Optional<T> resultToOptional(Result<T> result) {
            return result != null && result.isSuccess() ? Optional.of(result.getValue()) : Optional.empty();
        }

        /**
         * Converts Result to Maybe safely.
         */
        public static <T> Maybe<T> resultToMaybe(Result<T> result) {
            return result != null && result.isSuccess() ? Maybe.some(result.getValue()) : Maybe.none();
        }

        /**
         * Converts Result to CompletableFuture.
         */
        public static <T> CompletableFuture<T> resultToCompletableFuture(Result<T> result) {
            if (result == null) {
                return CompletableFuture.failedFuture(new IllegalArgumentException("Result cannot be null"));
            }

            if (result.isSuccess()) {
                return CompletableFuture.completedFuture(result.getValue());
            } else {
                return CompletableFuture.failedFuture(new ResultConversionException(result.getError()));
            }
        }

        /**
         * Safely extracts value from Maybe with default.
         */
        public static <T> T extractMaybeValue(Maybe<T> maybe, T defaultValue) {
            return maybe != null ? maybe.orElse(defaultValue) : defaultValue;
        }

        /**
         * Safely extracts value from Result with default.
         */
        public static <T> T extractResultValue(Result<T> result, T defaultValue) {
            return result != null && result.isSuccess() ? result.getValue() : defaultValue;
        }

        /**
         * Converts exception to Result.
         */
        public static <T> Result<T> exceptionToResult(Throwable throwable) {
            if (throwable instanceof ResultConversionException) {
                return Result.failure(((ResultConversionException) throwable).getError());
            } else {
                return Result.failure(Error.infrastructure(
                    "Conversion.Failed",
                    "Failed to convert value: " + throwable.getMessage(),
                    throwable
                ));
            }
        }

        /**
         * Converts CompletableFuture to Result.
         */
        public static <T> Result<T> completableFutureToResult(CompletableFuture<T> future) {
            try {
                if (future == null) {
                    return Result.failure(Error.validation("Future.Null", "CompletableFuture cannot be null", Map.of()));
                }

                if (future.isCompletedExceptionally()) {
                    return Result.failure(Error.infrastructure(
                        "Future.CompletedExceptionally",
                        "CompletableFuture completed exceptionally",
                        null
                    ));
                }

                if (future.isDone()) {
                    T value = future.get();
                    return Result.success(value);
                } else {
                    return Result.failure(Error.infrastructure(
                        "Future.NotCompleted",
                        "CompletableFuture is not yet completed",
                        null
                    ));
                }
            } catch (Exception e) {
                return exceptionToResult(e);
            }
        }
    }
}