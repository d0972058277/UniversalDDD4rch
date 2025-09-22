package com.architecture.core.spring.configuration;

import com.architecture.core.spring.converters.FunctionalTypeConverters;

import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.core.convert.ConversionService;
import org.springframework.core.convert.support.DefaultConversionService;
import org.springframework.scheduling.annotation.AsyncConfigurer;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;

/**
 * Spring Boot auto-configuration for Architecture.Core integration.
 * Automatically configures components needed for DDD architecture support.
 */
@AutoConfiguration
@ConditionalOnClass({
    com.architecture.core.domain.AggregateRoot.class,
    com.architecture.core.functional.Result.class
})
@EnableConfigurationProperties(ArchitectureCoreProperties.class)
@EnableAsync
@Import({
    FunctionalTypeConverters.class
})
public class ArchitectureCoreAutoConfiguration implements AsyncConfigurer {

    private final ArchitectureCoreProperties properties;

    public ArchitectureCoreAutoConfiguration(ArchitectureCoreProperties properties) {
        this.properties = properties;
    }

    /**
     * Configures the async executor for repository operations.
     */
    @Bean("architectureCoreAsyncExecutor")
    @ConditionalOnMissingBean(name = "architectureCoreAsyncExecutor")
    public Executor architectureCoreAsyncExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();

        // Configure thread pool based on properties
        executor.setCorePoolSize(properties.getAsync().getCorePoolSize());
        executor.setMaxPoolSize(properties.getAsync().getMaxPoolSize());
        executor.setQueueCapacity(properties.getAsync().getQueueCapacity());
        executor.setThreadNamePrefix(properties.getAsync().getThreadNamePrefix());
        executor.setKeepAliveSeconds(properties.getAsync().getKeepAliveSeconds());

        // Configure rejection policy
        executor.setRejectedExecutionHandler(new java.util.concurrent.ThreadPoolExecutor.CallerRunsPolicy());

        // Graceful shutdown
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(properties.getAsync().getAwaitTerminationSeconds());

        executor.initialize();
        return executor;
    }

    /**
     * Configures the default async executor for @Async methods.
     */
    @Override
    public Executor getAsyncExecutor() {
        return architectureCoreAsyncExecutor();
    }

    /**
     * Configures conversion service with functional type converters.
     */
    @Bean
    @ConditionalOnMissingBean
    public ConversionService architectureCoreConversionService() {
        DefaultConversionService conversionService = new DefaultConversionService();

        // Register functional type converters
        FunctionalTypeConverters.registerConverters(conversionService);

        return conversionService;
    }

    /**
     * Configuration for repository-related beans.
     */
    @Configuration
    @ConditionalOnClass(org.springframework.data.jpa.repository.JpaRepository.class)
    static class RepositoryConfiguration {

        /**
         * Bean for managing repository transactions and events.
         */
        @Bean
        @ConditionalOnMissingBean
        public DomainEventPublisher domainEventPublisher() {
            return new DomainEventPublisher();
        }

        /**
         * Bean for handling aggregate lifecycle events.
         */
        @Bean
        @ConditionalOnMissingBean
        public AggregateLifecycleManager aggregateLifecycleManager(
                DomainEventPublisher eventPublisher) {
            return new AggregateLifecycleManager(eventPublisher);
        }
    }

    /**
     * Publisher for domain events from aggregates.
     */
    public static class DomainEventPublisher {
        private final org.springframework.context.ApplicationEventPublisher applicationEventPublisher;

        public DomainEventPublisher() {
            this.applicationEventPublisher = null; // Will be injected by Spring if available
        }

        public DomainEventPublisher(org.springframework.context.ApplicationEventPublisher applicationEventPublisher) {
            this.applicationEventPublisher = applicationEventPublisher;
        }

        /**
         * Publishes domain events from an aggregate.
         */
        public void publishEvents(com.architecture.core.domain.AggregateRoot<?> aggregate) {
            if (applicationEventPublisher != null && aggregate != null) {
                aggregate.getDomainEvents().forEach(event -> {
                    applicationEventPublisher.publishEvent(new DomainEventWrapper(event));
                });
            }
        }

        /**
         * Wrapper for domain events to integrate with Spring's event system.
         */
        public static class DomainEventWrapper {
            private final com.architecture.core.domain.DomainEvent domainEvent;

            public DomainEventWrapper(com.architecture.core.domain.DomainEvent domainEvent) {
                this.domainEvent = domainEvent;
            }

            public com.architecture.core.domain.DomainEvent getDomainEvent() {
                return domainEvent;
            }
        }
    }

    /**
     * Manager for aggregate lifecycle operations.
     */
    public static class AggregateLifecycleManager {
        private final DomainEventPublisher eventPublisher;

        public AggregateLifecycleManager(DomainEventPublisher eventPublisher) {
            this.eventPublisher = eventPublisher;
        }

        /**
         * Handles post-save operations for aggregates.
         */
        public void handlePostSave(com.architecture.core.domain.AggregateRoot<?> aggregate) {
            if (aggregate != null) {
                // Publish domain events
                eventPublisher.publishEvents(aggregate);

                // Clear events after publishing
                aggregate.clearDomainEvents();

                // Increment version
                aggregate.incrementVersion();
            }
        }

        /**
         * Handles pre-save operations for aggregates.
         */
        public void handlePreSave(com.architecture.core.domain.AggregateRoot<?> aggregate) {
            if (aggregate != null) {
                // Validate aggregate state before saving
                // Additional validation logic can be added here
            }
        }
    }
}