from .audit import AuditModel
from .soft_delete import SoftDeleteModel
from .timestamp import TimeStampedModel


class BaseModel(
    AuditModel,
    SoftDeleteModel,
    TimeStampedModel,
):
    class Meta:
        abstract = True
