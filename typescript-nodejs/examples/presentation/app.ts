import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { OrderController, OrderValidation } from './controllers/order-controller';
import { OrderCommandHandler } from '../application/handlers/order-command-handler';
import { IOrderRepository } from '../application/interfaces/order-repository';
import { InMemoryOrderRepository } from '../infrastructure/repositories/in-memory-order-repository';
import { OrderService, StandardPricingStrategy } from '../domain/services/order-service';
import {
    requestIdMiddleware,
    domainErrorHandler,
    validateBody,
    validateQuery,
    resultHandler
} from './middleware/result-middleware';
import { Result, Error as DomainError } from '../../src/functional';

/**
 * Express.js application setup demonstrating Architecture.Core integration
 * Shows how to wire up DDD architecture with Express.js using functional error handling
 */
export class OrderApp {
    private readonly app: express.Application;
    private readonly orderRepository: IOrderRepository;
    private readonly orderService: OrderService;
    private readonly commandHandler: OrderCommandHandler;
    private readonly orderController: OrderController;

    constructor() {
        this.app = express();

        // Initialize dependencies
        this.orderRepository = new InMemoryOrderRepository();
        this.orderService = new OrderService(new StandardPricingStrategy());
        this.commandHandler = new OrderCommandHandler(this.orderRepository, this.orderService);
        this.orderController = new OrderController(this.commandHandler, this.orderRepository);

        this.setupMiddleware();
        this.setupRoutes();
        this.setupErrorHandling();
    }

    /**
     * Setup application middleware
     */
    private setupMiddleware(): void {
        // Security middleware
        this.app.use(helmet({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    styleSrc: ["'self'", "'unsafe-inline'"],
                    scriptSrc: ["'self'"],
                    imgSrc: ["'self'", "data:", "https:"]
                }
            }
        }));

        // CORS configuration
        this.app.use(cors({
            origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-ID', 'X-Request-ID']
        }));

        // Compression
        this.app.use(compression());

        // Request parsing
        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

        // Request ID middleware for tracing
        this.app.use(requestIdMiddleware);

        // Request logging
        this.app.use((req, res, next) => {
            const start = Date.now();
            console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - ${req.ip}`);

            res.on('finish', () => {
                const duration = Date.now() - start;
                console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
            });

            next();
        });
    }

    /**
     * Setup application routes
     */
    private setupRoutes(): void {
        // Health check
        this.app.get('/health', this.healthCheck);

        // API documentation
        this.app.get('/api', this.apiDocumentation);

        // Order routes
        this.app.post('/api/orders',
            validateBody(OrderValidation.validateCreateOrderBody),
            this.orderController.createOrder
        );

        this.app.get('/api/orders/:id',
            this.orderController.getOrder
        );

        this.app.get('/api/orders',
            this.orderController.searchOrders
        );

        this.app.get('/api/orders/recent',
            this.orderController.getRecentOrders
        );

        this.app.post('/api/orders/:id/confirm',
            validateBody(OrderValidation.validateConfirmOrderBody),
            this.orderController.confirmOrder
        );

        this.app.post('/api/orders/:id/cancel',
            validateBody(OrderValidation.validateCancelOrderBody),
            this.orderController.cancelOrder
        );

        this.app.post('/api/orders/:id/items',
            this.orderController.addOrderItem
        );

        this.app.delete('/api/orders/:id/items/:itemId',
            this.orderController.removeOrderItem
        );

        this.app.patch('/api/orders/:id/items/:itemId/quantity',
            this.orderController.updateItemQuantity
        );

        // Customer routes
        this.app.get('/api/customers/:customerId/orders',
            this.orderController.getOrdersByCustomer
        );

        this.app.get('/api/customers/:customerId/statistics',
            this.orderController.getCustomerStatistics
        );

        // Admin routes
        this.app.get('/api/admin/orders/status/:status',
            this.orderController.getOrdersByStatus
        );

        // 404 handler
        this.app.use('*', (req, res) => {
            res.status(404).json({
                success: false,
                error: {
                    code: 'NOT_FOUND',
                    message: `Route ${req.method} ${req.originalUrl} not found`,
                    category: 'Infrastructure'
                },
                timestamp: new Date().toISOString()
            });
        });
    }

    /**
     * Setup error handling middleware
     */
    private setupErrorHandling(): void {
        // Domain error handler (must be last)
        this.app.use(domainErrorHandler);
    }

    /**
     * Health check endpoint
     */
    private healthCheck = resultHandler(async (req, res): Promise<Result<any>> => {
        const health = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            version: process.env.npm_package_version || '1.0.0',
            uptime: process.uptime(),
            environment: process.env.NODE_ENV || 'development',
            memoryUsage: process.memoryUsage(),
            dependencies: {
                database: 'in-memory', // In real app, check actual database
                cache: 'none'
            }
        };

        // Perform health checks
        try {
            // Check repository health
            const testResult = await this.orderRepository.existsAsync(
                { value: 'health-check-id' } as any
            );

            if (testResult.isFailure) {
                health.dependencies.database = 'unhealthy';
                health.status = 'degraded';
            }

            return Result.ok(health);
        } catch (error) {
            health.status = 'unhealthy';
            health.dependencies.database = 'error';

            return Result.ok(health);
        }
    });

    /**
     * API documentation endpoint
     */
    private apiDocumentation = resultHandler(async (req, res): Promise<Result<any>> => {
        const documentation = {
            title: 'Order Management API',
            version: '1.0.0',
            description: 'RESTful API for order management using Architecture.Core patterns',
            baseUrl: `${req.protocol}://${req.get('host')}/api`,
            endpoints: {
                orders: {
                    'POST /orders': {
                        description: 'Create a new order',
                        body: {
                            customerId: 'string',
                            items: [{
                                productName: 'string',
                                unitPrice: 'number',
                                currency: 'string (3-letter ISO code)',
                                quantity: 'integer'
                            }]
                        }
                    },
                    'GET /orders/:id': {
                        description: 'Get order by ID',
                        parameters: {
                            id: 'Order ID'
                        }
                    },
                    'GET /orders': {
                        description: 'Search orders with filters',
                        queryParameters: {
                            customerId: 'Filter by customer ID',
                            status: 'Filter by status (pending, confirmed, shipped, delivered, cancelled)',
                            minAmount: 'Minimum order amount',
                            maxAmount: 'Maximum order amount',
                            currency: 'Filter by currency',
                            startDate: 'Filter orders created after this date',
                            endDate: 'Filter orders created before this date',
                            limit: 'Number of results (max 100, default 50)',
                            offset: 'Number of results to skip (default 0)'
                        }
                    },
                    'GET /orders/recent': {
                        description: 'Get recent orders',
                        queryParameters: {
                            limit: 'Number of results (max 100, default 10)'
                        }
                    },
                    'POST /orders/:id/confirm': {
                        description: 'Confirm an order',
                        body: {
                            expectedVersion: 'number (for optimistic concurrency)'
                        }
                    },
                    'POST /orders/:id/cancel': {
                        description: 'Cancel an order',
                        body: {
                            expectedVersion: 'number',
                            reason: 'string (cancellation reason)'
                        }
                    },
                    'POST /orders/:id/items': {
                        description: 'Add item to order',
                        body: {
                            expectedVersion: 'number',
                            productName: 'string',
                            unitPrice: 'number',
                            currency: 'string',
                            quantity: 'integer'
                        }
                    },
                    'DELETE /orders/:id/items/:itemId': {
                        description: 'Remove item from order',
                        body: {
                            expectedVersion: 'number'
                        }
                    },
                    'PATCH /orders/:id/items/:itemId/quantity': {
                        description: 'Update item quantity',
                        body: {
                            expectedVersion: 'number',
                            newQuantity: 'integer'
                        }
                    }
                },
                customers: {
                    'GET /customers/:customerId/orders': {
                        description: 'Get all orders for a customer'
                    },
                    'GET /customers/:customerId/statistics': {
                        description: 'Get order statistics for a customer'
                    }
                },
                admin: {
                    'GET /admin/orders/status/:status': {
                        description: 'Get all orders with specific status (admin only)'
                    }
                }
            },
            responseFormat: {
                success: {
                    success: true,
                    data: 'any',
                    timestamp: 'ISO string'
                },
                error: {
                    success: false,
                    error: {
                        code: 'string',
                        message: 'string',
                        category: 'Domain | Validation | Infrastructure | Concurrency | Security'
                    },
                    timestamp: 'ISO string'
                }
            },
            headers: {
                'X-Correlation-ID': 'Optional correlation ID for request tracing',
                'X-Request-ID': 'Automatically added request ID for tracking'
            }
        };

        return Result.ok(documentation);
    });

    /**
     * Get the Express application instance
     */
    public getApp(): express.Application {
        return this.app;
    }

    /**
     * Start the server
     */
    public start(port: number = 3000): void {
        this.app.listen(port, () => {
            console.log(`🚀 Order Management API started on port ${port}`);
            console.log(`📖 API Documentation: http://localhost:${port}/api`);
            console.log(`❤️  Health Check: http://localhost:${port}/health`);
            console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
        });
    }

    /**
     * Graceful shutdown
     */
    public async shutdown(): Promise<void> {
        console.log('🛑 Shutting down gracefully...');

        // In a real application, you would:
        // - Close database connections
        // - Finish processing ongoing requests
        // - Clean up resources

        console.log('✅ Shutdown complete');
    }
}

/**
 * Application factory for different environments
 */
export class AppFactory {
    public static createDevelopmentApp(): OrderApp {
        // Development-specific configuration
        process.env.NODE_ENV = 'development';
        return new OrderApp();
    }

    public static createProductionApp(): OrderApp {
        // Production-specific configuration
        process.env.NODE_ENV = 'production';
        return new OrderApp();
    }

    public static createTestApp(): OrderApp {
        // Test-specific configuration
        process.env.NODE_ENV = 'test';
        return new OrderApp();
    }
}

/**
 * Main entry point for standalone execution
 */
if (require.main === module) {
    const port = parseInt(process.env.PORT || '3000', 10);
    const app = process.env.NODE_ENV === 'production'
        ? AppFactory.createProductionApp()
        : AppFactory.createDevelopmentApp();

    // Handle process signals for graceful shutdown
    process.on('SIGINT', async () => {
        console.log('\n📨 Received SIGINT signal');
        await app.shutdown();
        process.exit(0);
    });

    process.on('SIGTERM', async () => {
        console.log('\n📨 Received SIGTERM signal');
        await app.shutdown();
        process.exit(0);
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
        console.error('❌ Uncaught Exception:', error);
        process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
        console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
        process.exit(1);
    });

    app.start(port);
}

// Export for use in other modules
export default OrderApp;