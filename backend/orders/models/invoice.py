from django.db import models
from core.models import BaseModel


class Invoice(BaseModel):
    """
    Formal tax invoice for a placed order.
    """

    order = models.OneToOneField(
        "orders.Order",
        on_delete=models.PROTECT,
        related_name="invoice",
    )
    invoice_number = models.CharField(max_length=50, unique=True)
    invoice_date = models.DateField(auto_now_add=True)
    sub_total = models.DecimalField(max_digits=14, decimal_places=2)
    discount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    tax_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    shipping_charge = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    grand_total = models.DecimalField(max_digits=14, decimal_places=2)

    class Meta(BaseModel.Meta):
        verbose_name = "Invoice"
        verbose_name_plural = "Invoices"

    def __str__(self) -> str:
        return f"{self.invoice_number} (Order #{self.order_id})"
