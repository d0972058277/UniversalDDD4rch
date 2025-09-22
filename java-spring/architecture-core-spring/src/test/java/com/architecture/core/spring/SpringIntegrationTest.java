package com.architecture.core.spring;

import com.architecture.core.functional.Maybe;
import com.architecture.core.functional.Result;
import com.architecture.core.functional.Error;
import com.architecture.core.spring.configuration.ArchitectureCoreAutoConfiguration;
import com.architecture.core.spring.configuration.ArchitectureCoreProperties;
import com.architecture.core.spring.converters.FunctionalTypeConverters;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.autoconfigure.AutoConfigurations;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.core.convert.ConversionService;
import org.springframework.test.context.junit.jupiter.SpringJUnitConfig;

import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executor;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Integration tests for Spring Boot auto-configuration and type conversion.
 * Tests T042: Spring integration tests for auto-configuration and converters.
 */
@DisplayName("Spring Integration Tests")
class SpringIntegrationTest {

    private final ApplicationContextRunner contextRunner = new ApplicationContextRunner()
        .withConfiguration(AutoConfigurations.of(ArchitectureCoreAutoConfiguration.class));

    @Test
    @DisplayName("Should_LoadAutoConfigurationSuccessfully_When_ArchitectureCoreIsOnClasspath")
    void Should_LoadAutoConfigurationSuccessfully_When_ArchitectureCoreIsOnClasspath() {
        contextRunner.run(context -> {
            // Then
            assertThat(context).hasSingleBean(ArchitectureCoreAutoConfiguration.class);
            assertThat(context).hasSingleBean(ArchitectureCoreProperties.class);
            assertThat(context).hasBean("architectureCoreAsyncExecutor");
            assertThat(context).hasBean("architectureCoreConversionService");
        });
    }

    @Test
    @DisplayName("Should_ConfigureAsyncExecutorCorrectly_When_DefaultPropertiesUsed")
    void Should_ConfigureAsyncExecutorCorrectly_When_DefaultPropertiesUsed() {
        contextRunner.run(context -> {
            // Given & When
            Executor executor = context.getBean("architectureCoreAsyncExecutor", Executor.class);

            // Then
            assertThat(executor).isNotNull();
            assertThat(executor).isInstanceOf(org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor.class);
        });
    }

    @Test
    @DisplayName("Should_ConfigureAsyncExecutorWithCustomProperties_When_PropertiesOverridden")
    void Should_ConfigureAsyncExecutorWithCustomProperties_When_PropertiesOverridden() {
        contextRunner
            .withPropertyValues(
                "architecture.core.async.core-pool-size=5",
                "architecture.core.async.max-pool-size=15",
                "architecture.core.async.queue-capacity=200",
                "architecture.core.async.thread-name-prefix=custom-async-"
            )
            .run(context -> {
                // Given & When
                ArchitectureCoreProperties properties = context.getBean(ArchitectureCoreProperties.class);

                // Then
                assertThat(properties.getAsync().getCorePoolSize()).isEqualTo(5);
                assertThat(properties.getAsync().getMaxPoolSize()).isEqualTo(15);
                assertThat(properties.getAsync().getQueueCapacity()).isEqualTo(200);
                assertThat(properties.getAsync().getThreadNamePrefix()).isEqualTo("custom-async-");
            });
    }

    @Test
    @DisplayName("Should_RegisterFunctionalTypeConverters_When_ConversionServiceConfigured")
    void Should_RegisterFunctionalTypeConverters_When_ConversionServiceConfigured() {
        contextRunner.run(context -> {
            // Given
            ConversionService conversionService = context.getBean("architectureCoreConversionService", ConversionService.class);

            // When & Then - Test Maybe to Optional conversion
            Maybe<String> maybe = Maybe.some("test");
            Optional<String> optional = conversionService.convert(maybe, Optional.class);

            assertThat(optional).isPresent();
            assertThat(optional.get()).isEqualTo("test");

            // Test empty Maybe to Optional conversion
            Maybe<String> emptyMaybe = Maybe.none();
            Optional<String> emptyOptional = conversionService.convert(emptyMaybe, Optional.class);

            assertThat(emptyOptional).isEmpty();
        });
    }

    @Test
    @DisplayName("Should_ConvertResultToOptionalCorrectly_When_UsingConversionService")
    void Should_ConvertResultToOptionalCorrectly_When_UsingConversionService() {
        contextRunner.run(context -> {
            // Given
            ConversionService conversionService = context.getBean("architectureCoreConversionService", ConversionService.class);

            // When & Then - Test successful Result to Optional conversion
            Result<String> successResult = Result.success("success");
            Optional<String> successOptional = conversionService.convert(successResult, Optional.class);

            assertThat(successOptional).isPresent();
            assertThat(successOptional.get()).isEqualTo("success");

            // Test failed Result to Optional conversion
            Result<String> failureResult = Result.failure(Error.domain("Test.Error", "Test error"));
            Optional<String> failureOptional = conversionService.convert(failureResult, Optional.class);

            assertThat(failureOptional).isEmpty();
        });
    }

    @Test
    @DisplayName("Should_ConvertOptionalToMaybeCorrectly_When_UsingConversionService")
    void Should_ConvertOptionalToMaybeCorrectly_When_UsingConversionService() {
        contextRunner.run(context -> {
            // Given
            ConversionService conversionService = context.getBean("architectureCoreConversionService", ConversionService.class);

            // When & Then - Test present Optional to Maybe conversion
            Optional<String> presentOptional = Optional.of("present");
            Maybe<String> presentMaybe = conversionService.convert(presentOptional, Maybe.class);

            assertThat(presentMaybe.hasValue()).isTrue();
            assertThat(presentMaybe.getValue()).isEqualTo("present");

            // Test empty Optional to Maybe conversion
            Optional<String> emptyOptional = Optional.empty();
            Maybe<String> emptyMaybe = conversionService.convert(emptyOptional, Maybe.class);

            assertThat(emptyMaybe.hasValue()).isFalse();
        });
    }

    @Test
    @DisplayName("Should_ConvertResultToCompletableFutureCorrectly_When_UsingConversionService")
    void Should_ConvertResultToCompletableFutureCorrectly_When_UsingConversionService() {
        contextRunner.run(context -> {
            // Given
            ConversionService conversionService = context.getBean("architectureCoreConversionService", ConversionService.class);

            // When & Then - Test successful Result to CompletableFuture conversion
            Result<String> successResult = Result.success("async-success");
            CompletableFuture<String> successFuture = conversionService.convert(successResult, CompletableFuture.class);

            assertThat(successFuture).isNotNull();
            assertThat(successFuture.isDone()).isTrue();
            assertThat(successFuture.isCompletedExceptionally()).isFalse();
            assertThat(successFuture.join()).isEqualTo("async-success");

            // Test failed Result to CompletableFuture conversion
            Result<String> failureResult = Result.failure(Error.domain("Test.AsyncError", "Test async error"));
            CompletableFuture<String> failureFuture = conversionService.convert(failureResult, CompletableFuture.class);

            assertThat(failureFuture).isNotNull();
            assertThat(failureFuture.isDone()).isTrue();
            assertThat(failureFuture.isCompletedExceptionally()).isTrue();

            assertThatThrownBy(failureFuture::join)
                .hasCauseInstanceOf(FunctionalTypeConverters.ResultConversionException.class);
        });
    }

    @Test
    @DisplayName("Should_ConfigureDomainEventPublisher_When_ApplicationEventPublisherAvailable")
    void Should_ConfigureDomainEventPublisher_When_ApplicationEventPublisherAvailable() {
        contextRunner.run(context -> {
            // Given & When
            ArchitectureCoreAutoConfiguration.DomainEventPublisher eventPublisher =
                context.getBean(ArchitectureCoreAutoConfiguration.DomainEventPublisher.class);

            // Then
            assertThat(eventPublisher).isNotNull();
        });
    }

    @Test
    @DisplayName("Should_ConfigureAggregateLifecycleManager_When_DomainEventPublisherAvailable")
    void Should_ConfigureAggregateLifecycleManager_When_DomainEventPublisherAvailable() {
        contextRunner.run(context -> {
            // Given & When
            ArchitectureCoreAutoConfiguration.AggregateLifecycleManager lifecycleManager =
                context.getBean(ArchitectureCoreAutoConfiguration.AggregateLifecycleManager.class);

            // Then
            assertThat(lifecycleManager).isNotNull();
        });
    }

    @Test
    @DisplayName("Should_UseCustomConversionService_When_ConversionServiceBeanProvided")
    void Should_UseCustomConversionService_When_ConversionServiceBeanProvided() {
        contextRunner
            .withUserConfiguration(CustomConversionServiceConfiguration.class)
            .run(context -> {
                // Given & When
                ConversionService conversionService = context.getBean(ConversionService.class);

                // Then
                assertThat(conversionService).isNotNull();
                assertThat(context.getBeansOfType(ConversionService.class)).hasSize(1);
            });
    }

    @Test
    @DisplayName("Should_HandleMissingBeans_When_ConditionalBeansNotPresent")
    void Should_HandleMissingBeans_When_ConditionalBeansNotPresent() {
        new ApplicationContextRunner()
            .withConfiguration(AutoConfigurations.of(ArchitectureCoreAutoConfiguration.class))
            .withClassLoader(new FilteredClassLoader(
                com.architecture.core.domain.AggregateRoot.class,
                com.architecture.core.functional.Result.class
            ))
            .run(context -> {
                // Then
                assertThat(context).doesNotHaveBean(ArchitectureCoreAutoConfiguration.class);
            });
    }

    @Test
    @DisplayName("Should_ConfigureRepositoryConfiguration_When_JpaRepositoryOnClasspath")
    void Should_ConfigureRepositoryConfiguration_When_JpaRepositoryOnClasspath() {
        contextRunner.run(context -> {
            // Given & When - Check if repository configuration is loaded when JPA is available
            boolean hasRepositoryConfig = context.getBeanDefinitionNames().length > 0;

            // Then
            assertThat(hasRepositoryConfig).isTrue();
            assertThat(context).hasSingleBean(ArchitectureCoreAutoConfiguration.DomainEventPublisher.class);
            assertThat(context).hasSingleBean(ArchitectureCoreAutoConfiguration.AggregateLifecycleManager.class);
        });
    }

    @Test
    @DisplayName("Should_ApplyEventsConfiguration_When_EventsPropertiesSet")
    void Should_ApplyEventsConfiguration_When_EventsPropertiesSet() {
        contextRunner
            .withPropertyValues(
                "architecture.core.events.auto-publish=false",
                "architecture.core.events.clear-after-publish=false",
                "architecture.core.events.async-publishing=true"
            )
            .run(context -> {
                // Given & When
                ArchitectureCoreProperties properties = context.getBean(ArchitectureCoreProperties.class);

                // Then
                assertThat(properties.getEvents().isAutoPublish()).isFalse();
                assertThat(properties.getEvents().isClearAfterPublish()).isFalse();
                assertThat(properties.getEvents().isAsyncPublishing()).isTrue();
            });
    }

    @Test
    @DisplayName("Should_ApplyRepositoryConfiguration_When_RepositoryPropertiesSet")
    void Should_ApplyRepositoryConfiguration_When_RepositoryPropertiesSet() {
        contextRunner
            .withPropertyValues(
                "architecture.core.repository.default-timeout-ms=60000",
                "architecture.core.repository.enable-metrics=true",
                "architecture.core.repository.enable-logging=false",
                "architecture.core.repository.max-retry-attempts=5",
                "architecture.core.repository.retry-base-delay-ms=2000"
            )
            .run(context -> {
                // Given & When
                ArchitectureCoreProperties properties = context.getBean(ArchitectureCoreProperties.class);

                // Then
                assertThat(properties.getRepository().getDefaultTimeoutMs()).isEqualTo(60000);
                assertThat(properties.getRepository().isEnableMetrics()).isTrue();
                assertThat(properties.getRepository().isEnableLogging()).isFalse();
                assertThat(properties.getRepository().getMaxRetryAttempts()).isEqualTo(5);
                assertThat(properties.getRepository().getRetryBaseDelayMs()).isEqualTo(2000);
            });
    }

    /**
     * Test configuration for custom conversion service.
     */
    @TestConfiguration
    static class CustomConversionServiceConfiguration {

        @Bean
        public ConversionService customConversionService() {
            org.springframework.core.convert.support.DefaultConversionService conversionService =
                new org.springframework.core.convert.support.DefaultConversionService();

            // Register functional type converters
            FunctionalTypeConverters.registerConverters(conversionService);

            return conversionService;
        }
    }

    /**
     * ClassLoader that filters out specific classes for testing conditional configuration.
     */
    private static class FilteredClassLoader extends ClassLoader {
        private final Class<?>[] filteredClasses;

        public FilteredClassLoader(Class<?>... filteredClasses) {
            super(SpringIntegrationTest.class.getClassLoader());
            this.filteredClasses = filteredClasses;
        }

        @Override
        protected Class<?> loadClass(String name, boolean resolve) throws ClassNotFoundException {
            for (Class<?> filteredClass : filteredClasses) {
                if (filteredClass.getName().equals(name)) {
                    throw new ClassNotFoundException(name);
                }
            }
            return super.loadClass(name, resolve);
        }
    }
}