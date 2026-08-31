"""
Domain exceptions hierarchy for the e-commerce platform.

These exceptions represent business rule violations and domain-specific errors.
Services raise these exceptions; views catch them (e.g., via DomainErrorMixin)
and translate them into structured HTTP responses.
"""


class DomainError(Exception):
    """
    Base class for all business/domain errors.

    Attributes:
        message (str): Human-readable error explanation.
        code (str): Machine-readable error code.
        default_status (int): HTTP status code to map to in presentation layer.
    """

    default_code = "domain_error"
    default_status = 400

    def __init__(self, message: str = "", code: str = None, default_status: int = None):
        self.message = message or self.__class__.__name__
        self.code = code or self.default_code
        if default_status is not None:
            self.default_status = default_status
        super().__init__(self.message)


# ── Identity Domain ───────────────────────────────────────────────────────────


class EmailAlreadyRegisteredError(DomainError):
    """Raised when an account registration attempt uses an existing email."""

    default_code = "EMAIL_ALREADY_REGISTERED"
    default_status = 409


class InvalidGroupError(DomainError):
    """Raised when an invalid group name or role designation is requested."""

    default_code = "INVALID_GROUP"
    default_status = 400


class AlreadyEmployeeError(DomainError):
    """Raised when attempting to promote a user who already has an employee profile."""

    default_code = "ALREADY_EMPLOYEE"
    default_status = 400


# ── Catalog Domain ────────────────────────────────────────────────────────────


class ProductNotFoundError(DomainError):
    """Raised when a requested product or variant cannot be found."""

    default_code = "PRODUCT_NOT_FOUND"
    default_status = 404


class DuplicateSKUError(DomainError):
    """Raised when attempting to create or update a variant with an existing SKU."""

    default_code = "DUPLICATE_SKU"
    default_status = 409


# ── Inventory Domain ──────────────────────────────────────────────────────────


class WarehouseAccessDeniedError(DomainError):
    """Raised when an employee attempts an inventory operation outside their assigned warehouse."""

    default_code = "WAREHOUSE_ACCESS_DENIED"
    default_status = 403


# ── Commerce Domain ───────────────────────────────────────────────────────────



class CartEmptyError(DomainError):
    """Raised when attempting to checkout with an empty cart."""

    default_code = "CART_EMPTY"
    default_status = 400


class ProductOutOfStockError(DomainError):
    """Raised when attempting to purchase a variant with 0 available stock."""

    default_code = "PRODUCT_OUT_OF_STOCK"
    default_status = 400


class InsufficientStockError(DomainError):
    """Raised when requested quantity exceeds available stock."""

    default_code = "INSUFFICIENT_STOCK"
    default_status = 400


class OrderCancellationError(DomainError):
    """Raised when an order cannot be cancelled due to its current state."""

    default_code = "ORDER_CANCELLATION_ERROR"
    default_status = 400


class OrderLockedByOtherWarehouseError(DomainError):
    """Raised when an employee attempts to access or modify an order locked by another warehouse."""

    default_code = "ORDER_LOCKED_BY_OTHER_WAREHOUSE"
    default_status = 403


class OrderAlreadyLockedError(DomainError):
    """Raised when an employee attempts to lock an order that is already locked by another warehouse."""

    default_code = "ORDER_ALREADY_LOCKED"
    default_status = 409



# ── Fulfillment Domain ────────────────────────────────────────────────────────


class ShipmentAlreadyExistsError(DomainError):
    """Raised when attempting to dispatch an order that already has a shipment."""

    default_code = "SHIPMENT_ALREADY_EXISTS"
    default_status = 409


class InvalidStatusTransitionError(DomainError):
    """Raised when an entity attempts an illegal state transition."""

    default_code = "INVALID_STATUS_TRANSITION"
    default_status = 400


# ── Promotions & Coupon Domain ────────────────────────────────────────────────


class OverlappingOfferError(DomainError):
    """Raised when applying an offer that overlaps with an active offer."""

    default_code = "OVERLAPPING_OFFER"
    default_status = 409


class InvalidCouponError(DomainError):
    """Raised when a coupon is invalid or not found."""

    default_code = "INVALID_COUPON"
    default_status = 400


class CouponExpiredError(DomainError):
    """Raised when an applied coupon is past its expiration date or not yet active."""

    default_code = "COUPON_EXPIRED"
    default_status = 400


class CouponUsageLimitReachedError(DomainError):
    """Raised when a coupon has reached its maximum allowed uses."""

    default_code = "COUPON_LIMIT_REACHED"
    default_status = 400


class CouponMinOrderAmountError(DomainError):
    """Raised when order total is below the coupon's minimum threshold."""

    default_code = "COUPON_MIN_ORDER_AMOUNT"
    default_status = 400


# ── Reviews Domain ────────────────────────────────────────────────────────────


class NotPurchasedError(DomainError):
    """Raised when a user attempts to review a product they have not purchased/delivered."""

    default_code = "NOT_PURCHASED"
    default_status = 403


class AlreadyReviewedError(DomainError):
    """Raised when a customer tries to review the same product multiple times."""

    default_code = "ALREADY_REVIEWED"
    default_status = 409


class InvalidRatingError(DomainError):
    """Raised when a rating is out of allowed 1-5 range."""

    default_code = "INVALID_RATING"
    default_status = 400


# ── Finance Domain ────────────────────────────────────────────────────────────


class DueNotFoundError(DomainError):
    """Raised when a requested dues record cannot be found."""

    default_code = "DUE_NOT_FOUND"
    default_status = 404


class DueAlreadyPaidError(DomainError):
    """Raised when attempting to pay an already settled due."""

    default_code = "DUE_ALREADY_PAID"
    default_status = 400
