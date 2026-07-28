from .audit import AuditModel
from .soft_delete import SoftDeleteModel
from .timestamp import TimesStampedModel


class BaseModel(
    AuditModel,
    SoftDeleteModel,
    TimesStampedModel,
):
    class Meta:
        abstract = True
