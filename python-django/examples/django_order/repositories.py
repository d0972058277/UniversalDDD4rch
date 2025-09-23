"""
Django ORM repository implementations for the Order domain.
Demonstrates mapping between domain aggregates and Django models.
"""

import json
from decimal import Decimal
from datetime import datetime
from typing import List

from django.core.exceptions import ObjectDoesNotExist
from django.db import transaction, IntegrityError
from asgiref.sync import sync_to_async

from architecture_core.functional.result import Result
from architecture_core.functional.maybe import Maybe
from architecture_core.functional.error import Error

from ..order_domain.identifiers import OrderId, CustomerId, ProductId
from ..order_domain.value_objects import Money, Address, PersonName, Quantity
from ..order_domain.aggregates import Order, OrderStatus, OrderLine
from ..order_domain.repositories import OrderRepository

from .models import OrderModel, OrderLineModel, OrderEventModel


class DjangoOrderRepository(OrderRepository):
    """Django ORM implementation of OrderRepository."""

    async def get_by_id_async(self, id: OrderId) -> Maybe[Order]:
        """Get order by ID using Django ORM."""
        try:
            order_model = await sync_to_async(
                OrderModel.objects.select_related().prefetch_related('lines').get
            )(order_id=str(id))

            order = self._map_to_domain(order_model)
            return Maybe.some(order)

        except ObjectDoesNotExist:
            return Maybe.none()
        except Exception:
            return Maybe.none()

    async def add_async(self, aggregate: Order) -> Result[None]:
        """Add new order using Django ORM."""
        try:
            async with transaction.aatomic():
                # Map and save order
                order_model = self._map_to_model(aggregate)
                await sync_to_async(order_model.save)()

                # Save order lines
                for line in aggregate.order_lines:
                    line_model = self._map_line_to_model(line, order_model)
                    await sync_to_async(line_model.save)()

                # Save domain events
                for event in aggregate.domain_events:
                    event_model = self._map_event_to_model(event, order_model)
                    await sync_to_async(event_model.save)()

                return Result.success(None)

        except IntegrityError as e:
            return Result.failure(Error.infrastructure(
                "OrderRepository.DuplicateOrder",
                f"Order {aggregate.id} already exists: {str(e)}"
            ))
        except Exception as e:
            return Result.failure(Error.infrastructure(
                "OrderRepository.AddFailed",
                f"Failed to add order: {str(e)}"
            ))

    async def update_async(self, aggregate: Order) -> Result[None]:
        """Update existing order using Django ORM with optimistic concurrency."""
        try:
            async with transaction.aatomic():
                # Check version for optimistic concurrency
                try:
                    order_model = await sync_to_async(OrderModel.objects.get)(
                        order_id=str(aggregate.id),
                        version=aggregate.version - 1
                    )
                except ObjectDoesNotExist:
                    return Result.failure(Error.concurrency(
                        "OrderRepository.ConcurrencyConflict",
                        f"Order {aggregate.id} has been modified by another process"
                    ))

                # Update order model
                self._update_model_from_domain(order_model, aggregate)
                await sync_to_async(order_model.save)()

                # Update order lines (simple approach: delete and recreate)
                await sync_to_async(
                    OrderLineModel.objects.filter(order=order_model).delete
                )()

                for line in aggregate.order_lines:
                    line_model = self._map_line_to_model(line, order_model)
                    await sync_to_async(line_model.save)()

                # Save new domain events
                for event in aggregate.domain_events:
                    # Check if event already exists
                    exists = await sync_to_async(
                        OrderEventModel.objects.filter(event_id=event.id).exists
                    )()
                    if not exists:
                        event_model = self._map_event_to_model(event, order_model)
                        await sync_to_async(event_model.save)()

                return Result.success(None)

        except Exception as e:
            return Result.failure(Error.infrastructure(
                "OrderRepository.UpdateFailed",
                f"Failed to update order: {str(e)}"
            ))

    async def delete_async(self, id: OrderId) -> Result[None]:
        """Delete order using Django ORM."""
        try:
            deleted_count, _ = await sync_to_async(
                OrderModel.objects.filter(order_id=str(id)).delete
            )()

            if deleted_count == 0:
                return Result.failure(Error.domain(
                    "OrderRepository.OrderNotFound",
                    f"Order {id} not found"
                ))

            return Result.success(None)

        except Exception as e:
            return Result.failure(Error.infrastructure(
                "OrderRepository.DeleteFailed",
                f"Failed to delete order: {str(e)}"
            ))

    async def exists_async(self, id: OrderId) -> bool:
        """Check if order exists using Django ORM."""
        try:
            return await sync_to_async(
                OrderModel.objects.filter(order_id=str(id)).exists
            )()
        except Exception:
            return False

    async def find_by_customer_async(self, customer_id: CustomerId) -> List[Order]:
        """Find orders by customer using Django ORM."""
        try:
            order_models = await sync_to_async(list)(
                OrderModel.objects.filter(customer_id=str(customer_id))
                .prefetch_related('lines')
                .order_by('-created_at')
            )

            orders = []
            for order_model in order_models:
                order = self._map_to_domain(order_model)
                orders.append(order)

            return orders

        except Exception:
            return []

    async def find_by_status_async(self, status: OrderStatus) -> List[Order]:
        """Find orders by status using Django ORM."""
        try:
            order_models = await sync_to_async(list)(
                OrderModel.objects.filter(status=status.value)
                .prefetch_related('lines')
                .order_by('-created_at')
            )

            orders = []
            for order_model in order_models:
                order = self._map_to_domain(order_model)
                orders.append(order)

            return orders

        except Exception:
            return []

    async def find_by_date_range_async(
        self,
        start_date: datetime,
        end_date: datetime
    ) -> List[Order]:
        """Find orders by date range using Django ORM."""
        try:
            order_models = await sync_to_async(list)(
                OrderModel.objects.filter(
                    created_at__gte=start_date,
                    created_at__lte=end_date
                ).prefetch_related('lines')
                .order_by('-created_at')
            )

            orders = []
            for order_model in order_models:
                order = self._map_to_domain(order_model)
                orders.append(order)

            return orders

        except Exception:
            return []

    async def find_orders_above_amount_async(self, min_amount: Money) -> List[Order]:
        """Find orders above amount using Django ORM."""
        try:
            order_models = await sync_to_async(list)(
                OrderModel.objects.filter(
                    total_amount__gte=min_amount.amount,
                    currency=min_amount.currency
                ).prefetch_related('lines')
                .order_by('-total_amount')
            )

            orders = []
            for order_model in order_models:
                order = self._map_to_domain(order_model)
                orders.append(order)

            return orders

        except Exception:
            return []

    async def count_by_customer_async(self, customer_id: CustomerId) -> int:
        """Count orders by customer using Django ORM."""
        try:
            return await sync_to_async(
                OrderModel.objects.filter(customer_id=str(customer_id)).count
            )()
        except Exception:
            return 0

    async def get_customer_total_spent_async(self, customer_id: CustomerId) -> Money:
        """Get customer total spent using Django ORM."""
        try:
            from django.db.models import Sum

            result = await sync_to_async(
                lambda: OrderModel.objects.filter(
                    customer_id=str(customer_id),
                    status__in=['confirmed', 'paid', 'shipped', 'delivered']
                ).aggregate(total=Sum('total_amount'))
            )()

            if result['total'] is None:
                return Money.zero('USD')

            return Money(result['total'], 'USD')  # Assume USD for simplicity

        except Exception:
            return Money.zero('USD')

    def _map_to_domain(self, order_model: OrderModel) -> Order:
        """Map Django model to domain aggregate."""
        # Create identifiers
        order_id = OrderId.from_string(order_model.order_id)
        customer_id = CustomerId.from_string(order_model.customer_id)

        # Create value objects
        customer_name = PersonName(
            first_name=order_model.customer_first_name,
            last_name=order_model.customer_last_name,
            middle_name=order_model.customer_middle_name
        )

        billing_address = self._map_to_address(order_model.billing_address)

        # Create order aggregate
        order = Order(
            order_id=order_id,
            customer_id=customer_id,
            customer_name=customer_name,
            billing_address=billing_address
        )

        # Set properties that can't be set in constructor
        order._status = OrderStatus(order_model.status)
        order._total_amount = Money(order_model.total_amount, order_model.currency)
        order._version = order_model.version

        # Set shipping address if different
        if order_model.shipping_address != order_model.billing_address:
            shipping_address = self._map_to_address(order_model.shipping_address)
            order._shipping_address = shipping_address

        # Set notes
        if order_model.notes:
            order._notes = order_model.notes

        # Map order lines
        order._order_lines = []
        for line_model in order_model.lines.all():
            order_line = self._map_line_to_domain(line_model)
            order._order_lines.append(order_line)

        # Clear events (they're already persisted)
        order.clear_events()

        return order

    def _map_to_model(self, aggregate: Order) -> OrderModel:
        """Map domain aggregate to Django model."""
        return OrderModel(
            order_id=str(aggregate.id),
            customer_id=str(aggregate.customer_id),
            customer_first_name=aggregate.customer_name.first_name,
            customer_last_name=aggregate.customer_name.last_name,
            customer_middle_name=aggregate.customer_name.middle_name,
            status=aggregate.status.value,
            total_amount=aggregate.total_amount.amount,
            currency=aggregate.total_amount.currency,
            billing_address=self._map_address_to_dict(aggregate.billing_address),
            shipping_address=self._map_address_to_dict(aggregate.shipping_address),
            notes=aggregate.notes,
            line_count=aggregate.line_count,
            version=aggregate.version
        )

    def _update_model_from_domain(self, order_model: OrderModel, aggregate: Order) -> None:
        """Update existing model from domain aggregate."""
        order_model.status = aggregate.status.value
        order_model.total_amount = aggregate.total_amount.amount
        order_model.currency = aggregate.total_amount.currency
        order_model.billing_address = self._map_address_to_dict(aggregate.billing_address)
        order_model.shipping_address = self._map_address_to_dict(aggregate.shipping_address)
        order_model.notes = aggregate.notes
        order_model.line_count = aggregate.line_count
        order_model.version = aggregate.version

    def _map_line_to_domain(self, line_model: OrderLineModel) -> OrderLine:
        """Map order line model to domain object."""
        product_id = ProductId.from_string(line_model.product_id)
        quantity = Quantity(line_model.quantity_value, line_model.quantity_unit)
        unit_price = Money(line_model.unit_price_amount, line_model.unit_price_currency)
        line_total = Money(line_model.line_total_amount, line_model.line_total_currency)

        return OrderLine(
            product_id=product_id,
            quantity=quantity,
            unit_price=unit_price,
            line_total=line_total
        )

    def _map_line_to_model(self, line: OrderLine, order_model: OrderModel) -> OrderLineModel:
        """Map domain order line to model."""
        return OrderLineModel(
            order=order_model,
            product_id=str(line.product_id),
            quantity_value=line.quantity.value,
            quantity_unit=line.quantity.unit,
            unit_price_amount=line.unit_price.amount,
            unit_price_currency=line.unit_price.currency,
            line_total_amount=line.line_total.amount,
            line_total_currency=line.line_total.currency
        )

    def _map_event_to_model(self, event, order_model: OrderModel) -> OrderEventModel:
        """Map domain event to model."""
        # Convert event to JSON-serializable format
        event_data = {
            'id': event.id,
            'occurred_at': event.occurred_at.isoformat(),
            'correlation_id': event.correlation_id,
            'causation_id': event.causation_id
        }

        # Add event-specific data
        if hasattr(event, 'order_id'):
            event_data['order_id'] = event.order_id
        if hasattr(event, 'customer_id'):
            event_data['customer_id'] = event.customer_id
        if hasattr(event, 'customer_name'):
            event_data['customer_name'] = event.customer_name
        if hasattr(event, 'product_id'):
            event_data['product_id'] = event.product_id
        if hasattr(event, 'quantity'):
            event_data['quantity'] = event.quantity
        if hasattr(event, 'total_amount'):
            event_data['total_amount'] = event.total_amount
        if hasattr(event, 'reason'):
            event_data['reason'] = event.reason

        return OrderEventModel(
            event_id=event.id,
            event_type=event.__class__.__name__,
            order=order_model,
            event_data=event_data,
            occurred_at=event.occurred_at,
            correlation_id=event.correlation_id,
            causation_id=event.causation_id
        )

    def _map_to_address(self, address_dict: dict) -> Address:
        """Map dictionary to Address value object."""
        return Address(
            street=address_dict['street'],
            city=address_dict['city'],
            state=address_dict['state'],
            postal_code=address_dict['postal_code'],
            country=address_dict['country']
        )

    def _map_address_to_dict(self, address: Address) -> dict:
        """Map Address value object to dictionary."""
        return {
            'street': address.street,
            'city': address.city,
            'state': address.state,
            'postal_code': address.postal_code,
            'country': address.country
        }