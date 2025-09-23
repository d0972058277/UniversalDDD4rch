"""
Django application services for the Order domain example.
Demonstrates integration between domain aggregates and Django application layer.
"""

import uuid
from decimal import Decimal
from typing import List, Optional
from datetime import datetime
from dataclasses import dataclass

from django.db import transaction
from django.core.exceptions import ObjectDoesNotExist
from asgiref.sync import sync_to_async

from architecture_core.functional.result import Result
from architecture_core.functional.maybe import Maybe
from architecture_core.functional.error import Error

from ..order_domain.identifiers import OrderId, CustomerId, ProductId
from ..order_domain.value_objects import Money, Address, PersonName, Quantity
from ..order_domain.aggregates import Order, OrderStatus
from ..order_domain.repositories import OrderRepository

from .models import OrderModel, OrderLineModel, CustomerModel, ProductModel
from .repositories import DjangoOrderRepository


@dataclass
class CreateOrderRequest:
    """Request DTO for creating an order."""
    customer_id: str
    billing_address: dict
    shipping_address: Optional[dict] = None
    notes: Optional[str] = None


@dataclass
class AddOrderLineRequest:
    """Request DTO for adding an order line."""
    product_id: str
    quantity: int
    quantity_unit: str = "pieces"


@dataclass
class OrderResponse:
    """Response DTO for order operations."""
    order_id: str
    customer_id: str
    customer_name: str
    status: str
    total_amount: str
    currency: str
    line_count: int
    created_at: datetime
    version: int


@dataclass
class OrderLineResponse:
    """Response DTO for order line."""
    product_id: str
    quantity: int
    quantity_unit: str
    unit_price: str
    currency: str
    line_total: str


class OrderApplicationService:
    """Application service for Order domain operations."""

    def __init__(self, order_repository: OrderRepository):
        """Initialize service with repository."""
        self._order_repository = order_repository

    async def create_order_async(self, request: CreateOrderRequest) -> Result[OrderResponse]:
        """Create a new order."""
        try:
            # Validate customer exists
            customer_result = await self._get_customer_async(request.customer_id)
            if customer_result.is_failure:
                return Result.failure(customer_result.error)

            customer = customer_result.value

            # Create domain objects
            order_id = OrderId.generate()
            customer_id = CustomerId.from_string(request.customer_id)
            customer_name = PersonName(
                first_name=customer.first_name,
                last_name=customer.last_name,
                middle_name=customer.middle_name
            )
            billing_address = self._map_to_address(request.billing_address)

            # Create order aggregate
            order = Order(
                order_id=order_id,
                customer_id=customer_id,
                customer_name=customer_name,
                billing_address=billing_address
            )

            # Set shipping address if different
            if request.shipping_address:
                shipping_address = self._map_to_address(request.shipping_address)
                update_result = order.update_shipping_address(shipping_address)
                if update_result.is_failure:
                    return Result.failure(update_result.error)

            # Add notes if provided
            if request.notes:
                notes_result = order.add_notes(request.notes)
                if notes_result.is_failure:
                    return Result.failure(notes_result.error)

            # Save to repository
            add_result = await self._order_repository.add_async(order)
            if add_result.is_failure:
                return Result.failure(add_result.error)

            # Return response
            response = self._map_to_response(order)
            return Result.success(response)

        except Exception as e:
            return Result.failure(Error.infrastructure(
                "OrderService.CreateOrderFailed",
                f"Failed to create order: {str(e)}"
            ))

    async def add_order_line_async(
        self,
        order_id: str,
        request: AddOrderLineRequest
    ) -> Result[OrderResponse]:
        """Add a line to an existing order."""
        try:
            # Get order
            order_id_obj = OrderId.from_string(order_id)
            order_maybe = await self._order_repository.get_by_id_async(order_id_obj)

            if not order_maybe.has_value:
                return Result.failure(Error.domain(
                    "OrderService.OrderNotFound",
                    f"Order {order_id} not found"
                ))

            order = order_maybe.value

            # Get product information
            product_result = await self._get_product_async(request.product_id)
            if product_result.is_failure:
                return Result.failure(product_result.error)

            product = product_result.value

            # Create domain objects
            product_id = ProductId.from_string(request.product_id)
            quantity = Quantity(request.quantity, request.quantity_unit)
            unit_price = Money(product.price_amount, product.price_currency)

            # Add order line
            add_line_result = order.add_order_line(product_id, quantity, unit_price)
            if add_line_result.is_failure:
                return Result.failure(add_line_result.error)

            # Update in repository
            update_result = await self._order_repository.update_async(order)
            if update_result.is_failure:
                return Result.failure(update_result.error)

            # Return response
            response = self._map_to_response(order)
            return Result.success(response)

        except Exception as e:
            return Result.failure(Error.infrastructure(
                "OrderService.AddOrderLineFailed",
                f"Failed to add order line: {str(e)}"
            ))

    async def confirm_order_async(self, order_id: str) -> Result[OrderResponse]:
        """Confirm an order."""
        try:
            # Get order
            order_id_obj = OrderId.from_string(order_id)
            order_maybe = await self._order_repository.get_by_id_async(order_id_obj)

            if not order_maybe.has_value:
                return Result.failure(Error.domain(
                    "OrderService.OrderNotFound",
                    f"Order {order_id} not found"
                ))

            order = order_maybe.value

            # Confirm order
            confirm_result = order.confirm()
            if confirm_result.is_failure:
                return Result.failure(confirm_result.error)

            # Update in repository
            update_result = await self._order_repository.update_async(order)
            if update_result.is_failure:
                return Result.failure(update_result.error)

            # Return response
            response = self._map_to_response(order)
            return Result.success(response)

        except Exception as e:
            return Result.failure(Error.infrastructure(
                "OrderService.ConfirmOrderFailed",
                f"Failed to confirm order: {str(e)}"
            ))

    async def cancel_order_async(
        self,
        order_id: str,
        reason: str,
        cancelled_by: str
    ) -> Result[OrderResponse]:
        """Cancel an order."""
        try:
            # Get order
            order_id_obj = OrderId.from_string(order_id)
            order_maybe = await self._order_repository.get_by_id_async(order_id_obj)

            if not order_maybe.has_value:
                return Result.failure(Error.domain(
                    "OrderService.OrderNotFound",
                    f"Order {order_id} not found"
                ))

            order = order_maybe.value

            # Cancel order
            cancel_result = order.cancel(reason, cancelled_by)
            if cancel_result.is_failure:
                return Result.failure(cancel_result.error)

            # Update in repository
            update_result = await self._order_repository.update_async(order)
            if update_result.is_failure:
                return Result.failure(update_result.error)

            # Return response
            response = self._map_to_response(order)
            return Result.success(response)

        except Exception as e:
            return Result.failure(Error.infrastructure(
                "OrderService.CancelOrderFailed",
                f"Failed to cancel order: {str(e)}"
            ))

    async def get_order_async(self, order_id: str) -> Result[OrderResponse]:
        """Get order by ID."""
        try:
            order_id_obj = OrderId.from_string(order_id)
            order_maybe = await self._order_repository.get_by_id_async(order_id_obj)

            if not order_maybe.has_value:
                return Result.failure(Error.domain(
                    "OrderService.OrderNotFound",
                    f"Order {order_id} not found"
                ))

            order = order_maybe.value
            response = self._map_to_response(order)
            return Result.success(response)

        except Exception as e:
            return Result.failure(Error.infrastructure(
                "OrderService.GetOrderFailed",
                f"Failed to get order: {str(e)}"
            ))

    async def get_customer_orders_async(self, customer_id: str) -> Result[List[OrderResponse]]:
        """Get all orders for a customer."""
        try:
            customer_id_obj = CustomerId.from_string(customer_id)
            orders = await self._order_repository.find_by_customer_async(customer_id_obj)

            responses = [self._map_to_response(order) for order in orders]
            return Result.success(responses)

        except Exception as e:
            return Result.failure(Error.infrastructure(
                "OrderService.GetCustomerOrdersFailed",
                f"Failed to get customer orders: {str(e)}"
            ))

    async def get_orders_by_status_async(self, status: str) -> Result[List[OrderResponse]]:
        """Get all orders with specific status."""
        try:
            order_status = OrderStatus(status)
            orders = await self._order_repository.find_by_status_async(order_status)

            responses = [self._map_to_response(order) for order in orders]
            return Result.success(responses)

        except ValueError:
            return Result.failure(Error.validation(
                "OrderService.InvalidStatus",
                f"Invalid order status: {status}",
                {"valid_statuses": [s.value for s in OrderStatus]}
            ))
        except Exception as e:
            return Result.failure(Error.infrastructure(
                "OrderService.GetOrdersByStatusFailed",
                f"Failed to get orders by status: {str(e)}"
            ))

    async def _get_customer_async(self, customer_id: str) -> Result[CustomerModel]:
        """Get customer from database."""
        try:
            customer = await sync_to_async(CustomerModel.objects.get)(customer_id=customer_id)
            return Result.success(customer)
        except ObjectDoesNotExist:
            return Result.failure(Error.domain(
                "OrderService.CustomerNotFound",
                f"Customer {customer_id} not found"
            ))

    async def _get_product_async(self, product_id: str) -> Result[ProductModel]:
        """Get product from database."""
        try:
            product = await sync_to_async(ProductModel.objects.get)(product_id=product_id)
            if not product.is_available():
                return Result.failure(Error.domain(
                    "OrderService.ProductNotAvailable",
                    f"Product {product_id} is not available"
                ))
            return Result.success(product)
        except ObjectDoesNotExist:
            return Result.failure(Error.domain(
                "OrderService.ProductNotFound",
                f"Product {product_id} not found"
            ))

    def _map_to_address(self, address_dict: dict) -> Address:
        """Map dictionary to Address value object."""
        return Address(
            street=address_dict['street'],
            city=address_dict['city'],
            state=address_dict['state'],
            postal_code=address_dict['postal_code'],
            country=address_dict['country']
        )

    def _map_to_response(self, order: Order) -> OrderResponse:
        """Map Order aggregate to response DTO."""
        return OrderResponse(
            order_id=str(order.id),
            customer_id=str(order.customer_id),
            customer_name=order.customer_name.get_full_name(),
            status=order.status.value,
            total_amount=str(order.total_amount.amount),
            currency=order.total_amount.currency,
            line_count=order.line_count,
            created_at=datetime.utcnow(),  # Would be actual created_at in real implementation
            version=order.version
        )


class OrderQueryService:
    """Query service for Order domain read operations."""

    def __init__(self):
        """Initialize query service."""
        pass

    async def get_order_summary_async(self, order_id: str) -> Result[dict]:
        """Get order summary with minimal data."""
        try:
            order = await sync_to_async(OrderModel.objects.get)(order_id=order_id)

            summary = {
                'order_id': order.order_id,
                'customer_id': order.customer_id,
                'status': order.status,
                'total_amount': float(order.total_amount),
                'currency': order.currency,
                'line_count': order.line_count,
                'created_at': order.created_at.isoformat()
            }

            return Result.success(summary)

        except ObjectDoesNotExist:
            return Result.failure(Error.domain(
                "OrderQuery.OrderNotFound",
                f"Order {order_id} not found"
            ))
        except Exception as e:
            return Result.failure(Error.infrastructure(
                "OrderQuery.GetSummaryFailed",
                f"Failed to get order summary: {str(e)}"
            ))

    async def get_customer_order_history_async(
        self,
        customer_id: str,
        limit: int = 10
    ) -> Result[List[dict]]:
        """Get customer order history."""
        try:
            orders = await sync_to_async(list)(
                OrderModel.objects.by_customer(customer_id)
                .order_by('-created_at')[:limit]
            )

            history = []
            for order in orders:
                history.append({
                    'order_id': order.order_id,
                    'status': order.status,
                    'total_amount': float(order.total_amount),
                    'currency': order.currency,
                    'created_at': order.created_at.isoformat()
                })

            return Result.success(history)

        except Exception as e:
            return Result.failure(Error.infrastructure(
                "OrderQuery.GetHistoryFailed",
                f"Failed to get order history: {str(e)}"
            ))

    async def get_order_statistics_async(self) -> Result[dict]:
        """Get order statistics."""
        try:
            from django.db.models import Count, Sum, Avg

            stats = await sync_to_async(
                lambda: OrderModel.objects.aggregate(
                    total_orders=Count('id'),
                    total_revenue=Sum('total_amount'),
                    average_order_value=Avg('total_amount'),
                    confirmed_orders=Count('id', filter=models.Q(status='confirmed')),
                    cancelled_orders=Count('id', filter=models.Q(status='cancelled'))
                )
            )()

            # Convert Decimal to float for JSON serialization
            if stats['total_revenue']:
                stats['total_revenue'] = float(stats['total_revenue'])
            if stats['average_order_value']:
                stats['average_order_value'] = float(stats['average_order_value'])

            return Result.success(stats)

        except Exception as e:
            return Result.failure(Error.infrastructure(
                "OrderQuery.GetStatisticsFailed",
                f"Failed to get order statistics: {str(e)}"
            ))


# Example Django view integration
class OrderServiceFactory:
    """Factory for creating order services."""

    @staticmethod
    def create_application_service() -> OrderApplicationService:
        """Create order application service with Django repository."""
        repository = DjangoOrderRepository()
        return OrderApplicationService(repository)

    @staticmethod
    def create_query_service() -> OrderQueryService:
        """Create order query service."""
        return OrderQueryService()


# Example usage patterns
async def example_service_usage():
    """Demonstrate service usage patterns."""
    # Create services
    app_service = OrderServiceFactory.create_application_service()
    query_service = OrderServiceFactory.create_query_service()

    # Example: Create order
    create_request = CreateOrderRequest(
        customer_id="CUST-ABC123",
        billing_address={
            'street': '123 Main St',
            'city': 'Anytown',
            'state': 'CA',
            'postal_code': '12345',
            'country': 'US'
        },
        notes="Rush order"
    )

    create_result = await app_service.create_order_async(create_request)
    if create_result.is_success:
        order_response = create_result.value
        print(f"Order created: {order_response.order_id}")

        # Example: Add order line
        line_request = AddOrderLineRequest(
            product_id="PROD-XYZ789",
            quantity=2
        )

        line_result = await app_service.add_order_line_async(
            order_response.order_id,
            line_request
        )

        if line_result.is_success:
            print("Order line added successfully")

            # Example: Confirm order
            confirm_result = await app_service.confirm_order_async(order_response.order_id)
            if confirm_result.is_success:
                print("Order confirmed successfully")
    else:
        print(f"Failed to create order: {create_result.error.message}")

    # Example: Query operations
    summary_result = await query_service.get_order_summary_async("ORD-123456")
    if summary_result.is_success:
        print(f"Order summary: {summary_result.value}")

    stats_result = await query_service.get_order_statistics_async()
    if stats_result.is_success:
        print(f"Order statistics: {stats_result.value}")