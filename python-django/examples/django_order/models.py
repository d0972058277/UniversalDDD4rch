"""
Django models for the Order domain example.
Demonstrates integration between domain aggregates and Django ORM.
"""

from decimal import Decimal
from django.db import models
from django.core.validators import MinValueValidator
from django.utils import timezone
from django.contrib.postgres.fields import JSONField
from typing import Optional

from django_architecture_core.models import AggregateRootModelMixin


class OrderModel(AggregateRootModelMixin, models.Model):
    """Django model for Order aggregate."""

    # Order identification
    order_id = models.CharField(
        max_length=20,
        unique=True,
        db_index=True,
        help_text="Business identifier for the order (e.g., ORD-123456)"
    )

    # Customer information
    customer_id = models.CharField(
        max_length=20,
        db_index=True,
        help_text="Customer identifier (e.g., CUST-ABC123)"
    )
    customer_first_name = models.CharField(max_length=100)
    customer_last_name = models.CharField(max_length=100)
    customer_middle_name = models.CharField(max_length=100, blank=True, null=True)

    # Order status
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('confirmed', 'Confirmed'),
        ('paid', 'Paid'),
        ('shipped', 'Shipped'),
        ('delivered', 'Delivered'),
        ('cancelled', 'Cancelled'),
    ]
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='draft',
        db_index=True
    )

    # Financial information
    total_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    currency = models.CharField(
        max_length=3,
        default='USD',
        help_text="3-letter ISO currency code"
    )

    # Addresses (stored as JSON for flexibility)
    billing_address = JSONField(
        help_text="Billing address as JSON object"
    )
    shipping_address = JSONField(
        help_text="Shipping address as JSON object"
    )

    # Order metadata
    notes = models.TextField(blank=True, null=True)
    line_count = models.PositiveIntegerField(default=0)

    # Timestamps are inherited from AggregateRootModelMixin
    # (created_at, updated_at, version)

    class Meta:
        db_table = 'orders'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['customer_id', 'status']),
            models.Index(fields=['status', 'created_at']),
            models.Index(fields=['total_amount', 'currency']),
        ]

    def __str__(self) -> str:
        return f"Order {self.order_id} - {self.status} - {self.total_amount} {self.currency}"


class OrderLineModel(models.Model):
    """Django model for Order Line."""

    order = models.ForeignKey(
        OrderModel,
        on_delete=models.CASCADE,
        related_name='lines'
    )

    # Product information
    product_id = models.CharField(
        max_length=20,
        help_text="Product identifier (e.g., PROD-ABC123)"
    )

    # Quantity information
    quantity_value = models.PositiveIntegerField(
        validators=[MinValueValidator(1)]
    )
    quantity_unit = models.CharField(
        max_length=20,
        default='pieces',
        help_text="Unit of measurement (e.g., pieces, kg, L)"
    )

    # Pricing information
    unit_price_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))]
    )
    unit_price_currency = models.CharField(
        max_length=3,
        help_text="3-letter ISO currency code"
    )

    line_total_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))]
    )
    line_total_currency = models.CharField(
        max_length=3,
        help_text="3-letter ISO currency code"
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'order_lines'
        ordering = ['id']
        indexes = [
            models.Index(fields=['order', 'product_id']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['order', 'product_id'],
                name='unique_product_per_order'
            )
        ]

    def __str__(self) -> str:
        return f"Line {self.product_id}: {self.quantity_value} x {self.unit_price_amount}"


class OrderEventModel(models.Model):
    """Django model for Order Domain Events."""

    # Event identification
    event_id = models.UUIDField(unique=True, db_index=True)
    event_type = models.CharField(max_length=100)

    # Related order
    order = models.ForeignKey(
        OrderModel,
        on_delete=models.CASCADE,
        related_name='events'
    )

    # Event data
    event_data = JSONField(
        help_text="Event payload as JSON"
    )

    # Event metadata
    occurred_at = models.DateTimeField()
    correlation_id = models.CharField(max_length=100, blank=True, null=True)
    causation_id = models.CharField(max_length=100, blank=True, null=True)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'order_events'
        ordering = ['occurred_at']
        indexes = [
            models.Index(fields=['order', 'occurred_at']),
            models.Index(fields=['event_type', 'occurred_at']),
            models.Index(fields=['correlation_id']),
            models.Index(fields=['causation_id']),
        ]

    def __str__(self) -> str:
        return f"{self.event_type} for Order {self.order.order_id} at {self.occurred_at}"


class CustomerModel(models.Model):
    """Django model for Customer (simplified for example)."""

    customer_id = models.CharField(
        max_length=20,
        unique=True,
        db_index=True,
        help_text="Customer identifier (e.g., CUST-ABC123)"
    )

    # Personal information
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    middle_name = models.CharField(max_length=100, blank=True, null=True)

    # Contact information
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=20, blank=True, null=True)

    # Default addresses
    default_billing_address = JSONField(blank=True, null=True)
    default_shipping_address = JSONField(blank=True, null=True)

    # Customer status
    is_active = models.BooleanField(default=True)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'customers'
        ordering = ['last_name', 'first_name']
        indexes = [
            models.Index(fields=['email']),
            models.Index(fields=['is_active', 'created_at']),
        ]

    def __str__(self) -> str:
        return f"Customer {self.customer_id}: {self.first_name} {self.last_name}"

    @property
    def full_name(self) -> str:
        """Get full customer name."""
        if self.middle_name:
            return f"{self.first_name} {self.middle_name} {self.last_name}"
        return f"{self.first_name} {self.last_name}"


class ProductModel(models.Model):
    """Django model for Product (simplified for example)."""

    product_id = models.CharField(
        max_length=20,
        unique=True,
        db_index=True,
        help_text="Product identifier (e.g., PROD-ABC123)"
    )

    # Product information
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True, null=True)
    sku = models.CharField(max_length=50, unique=True)

    # Pricing information
    price_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))]
    )
    price_currency = models.CharField(
        max_length=3,
        default='USD'
    )

    # Product status
    is_active = models.BooleanField(default=True)
    is_in_stock = models.BooleanField(default=True)

    # Inventory
    stock_quantity = models.PositiveIntegerField(default=0)
    stock_unit = models.CharField(max_length=20, default='pieces')

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'products'
        ordering = ['name']
        indexes = [
            models.Index(fields=['sku']),
            models.Index(fields=['is_active', 'is_in_stock']),
            models.Index(fields=['price_amount', 'price_currency']),
        ]

    def __str__(self) -> str:
        return f"Product {self.product_id}: {self.name}"

    @property
    def price_display(self) -> str:
        """Get formatted price display."""
        return f"{self.price_amount} {self.price_currency}"

    def is_available(self) -> bool:
        """Check if product is available for purchase."""
        return self.is_active and self.is_in_stock and self.stock_quantity > 0


# Django model managers for complex queries
class OrderQuerySet(models.QuerySet):
    """Custom QuerySet for OrderModel with domain-specific queries."""

    def by_customer(self, customer_id: str):
        """Filter orders by customer ID."""
        return self.filter(customer_id=customer_id)

    def by_status(self, status: str):
        """Filter orders by status."""
        return self.filter(status=status)

    def confirmed_orders(self):
        """Get confirmed orders only."""
        return self.filter(status='confirmed')

    def active_orders(self):
        """Get orders that are not cancelled."""
        return self.exclude(status='cancelled')

    def above_amount(self, amount: Decimal, currency: str = 'USD'):
        """Filter orders above specified amount."""
        return self.filter(
            total_amount__gte=amount,
            currency=currency
        )

    def in_date_range(self, start_date, end_date):
        """Filter orders in date range."""
        return self.filter(
            created_at__gte=start_date,
            created_at__lte=end_date
        )

    def with_lines(self):
        """Include order lines in query."""
        return self.prefetch_related('lines')

    def with_events(self):
        """Include order events in query."""
        return self.prefetch_related('events')


class OrderManager(models.Manager):
    """Custom manager for OrderModel."""

    def get_queryset(self):
        return OrderQuerySet(self.model, using=self._db)

    def by_customer(self, customer_id: str):
        return self.get_queryset().by_customer(customer_id)

    def by_status(self, status: str):
        return self.get_queryset().by_status(status)

    def confirmed_orders(self):
        return self.get_queryset().confirmed_orders()

    def active_orders(self):
        return self.get_queryset().active_orders()

    def above_amount(self, amount: Decimal, currency: str = 'USD'):
        return self.get_queryset().above_amount(amount, currency)


# Add custom manager to OrderModel
OrderModel.add_to_class('objects', OrderManager())