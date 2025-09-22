package com.architecture.core.spring.configuration;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Configuration properties for Architecture.Core Spring integration.
 */
@ConfigurationProperties(prefix = "architecture.core")
public class ArchitectureCoreProperties {

    private final Async async = new Async();
    private final Events events = new Events();
    private final Repository repository = new Repository();

    public Async getAsync() {
        return async;
    }

    public Events getEvents() {
        return events;
    }

    public Repository getRepository() {
        return repository;
    }

    /**
     * Async operation configuration.
     */
    public static class Async {
        /**
         * Core pool size for async operations.
         */
        private int corePoolSize = 2;

        /**
         * Maximum pool size for async operations.
         */
        private int maxPoolSize = 10;

        /**
         * Queue capacity for async operations.
         */
        private int queueCapacity = 100;

        /**
         * Thread name prefix for async operations.
         */
        private String threadNamePrefix = "architecture-core-async-";

        /**
         * Keep alive seconds for async threads.
         */
        private int keepAliveSeconds = 60;

        /**
         * Await termination seconds during shutdown.
         */
        private int awaitTerminationSeconds = 30;

        public int getCorePoolSize() {
            return corePoolSize;
        }

        public void setCorePoolSize(int corePoolSize) {
            this.corePoolSize = corePoolSize;
        }

        public int getMaxPoolSize() {
            return maxPoolSize;
        }

        public void setMaxPoolSize(int maxPoolSize) {
            this.maxPoolSize = maxPoolSize;
        }

        public int getQueueCapacity() {
            return queueCapacity;
        }

        public void setQueueCapacity(int queueCapacity) {
            this.queueCapacity = queueCapacity;
        }

        public String getThreadNamePrefix() {
            return threadNamePrefix;
        }

        public void setThreadNamePrefix(String threadNamePrefix) {
            this.threadNamePrefix = threadNamePrefix;
        }

        public int getKeepAliveSeconds() {
            return keepAliveSeconds;
        }

        public void setKeepAliveSeconds(int keepAliveSeconds) {
            this.keepAliveSeconds = keepAliveSeconds;
        }

        public int getAwaitTerminationSeconds() {
            return awaitTerminationSeconds;
        }

        public void setAwaitTerminationSeconds(int awaitTerminationSeconds) {
            this.awaitTerminationSeconds = awaitTerminationSeconds;
        }
    }

    /**
     * Domain events configuration.
     */
    public static class Events {
        /**
         * Whether to automatically publish domain events.
         */
        private boolean autoPublish = true;

        /**
         * Whether to clear events after publishing.
         */
        private boolean clearAfterPublish = true;

        /**
         * Whether to enable asynchronous event publishing.
         */
        private boolean asyncPublishing = false;

        public boolean isAutoPublish() {
            return autoPublish;
        }

        public void setAutoPublish(boolean autoPublish) {
            this.autoPublish = autoPublish;
        }

        public boolean isClearAfterPublish() {
            return clearAfterPublish;
        }

        public void setClearAfterPublish(boolean clearAfterPublish) {
            this.clearAfterPublish = clearAfterPublish;
        }

        public boolean isAsyncPublishing() {
            return asyncPublishing;
        }

        public void setAsyncPublishing(boolean asyncPublishing) {
            this.asyncPublishing = asyncPublishing;
        }
    }

    /**
     * Repository configuration.
     */
    public static class Repository {
        /**
         * Default timeout for repository operations in milliseconds.
         */
        private long defaultTimeoutMs = 30000; // 30 seconds

        /**
         * Whether to enable repository operation metrics.
         */
        private boolean enableMetrics = false;

        /**
         * Whether to enable repository operation logging.
         */
        private boolean enableLogging = true;

        /**
         * Maximum retry attempts for failed repository operations.
         */
        private int maxRetryAttempts = 3;

        /**
         * Base delay for retry operations in milliseconds.
         */
        private long retryBaseDelayMs = 1000; // 1 second

        public long getDefaultTimeoutMs() {
            return defaultTimeoutMs;
        }

        public void setDefaultTimeoutMs(long defaultTimeoutMs) {
            this.defaultTimeoutMs = defaultTimeoutMs;
        }

        public boolean isEnableMetrics() {
            return enableMetrics;
        }

        public void setEnableMetrics(boolean enableMetrics) {
            this.enableMetrics = enableMetrics;
        }

        public boolean isEnableLogging() {
            return enableLogging;
        }

        public void setEnableLogging(boolean enableLogging) {
            this.enableLogging = enableLogging;
        }

        public int getMaxRetryAttempts() {
            return maxRetryAttempts;
        }

        public void setMaxRetryAttempts(int maxRetryAttempts) {
            this.maxRetryAttempts = maxRetryAttempts;
        }

        public long getRetryBaseDelayMs() {
            return retryBaseDelayMs;
        }

        public void setRetryBaseDelayMs(long retryBaseDelayMs) {
            this.retryBaseDelayMs = retryBaseDelayMs;
        }
    }
}