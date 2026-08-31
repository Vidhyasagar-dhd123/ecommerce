from django.db import models
from core.models import BaseModel


class Shipment(BaseModel):
    """
    Shipment dispatch and carrier tracking record for an order.
    """

    order = models.OneToOneField(
        "orders.Order",
        on_delete=models.PROTECT,
        related_name="shipment",
    )
    warehouse = models.ForeignKey(
        "inventory.Warehouse",
        on_delete=models.PROTECT,
        related_name="shipments",
    )
    tracking_number = models.CharField(max_length=100, blank=True, default="")
    carrier = models.CharField(max_length=100, blank=True, default="")
    ship_date = models.DateField(null=True, blank=True)
    delivery_date = models.DateField(null=True, blank=True)

    class Meta(BaseModel.Meta):
        verbose_name = "Shipment"
        verbose_name_plural = "Shipments"

    def __str__(self) -> str:
        return f"Shipment for Order #{self.order_id} — {self.tracking_number or 'No tracking'}"
