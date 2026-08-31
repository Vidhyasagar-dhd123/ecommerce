"""
Core DRF mixins for API views.
"""

import logging
from rest_framework import status
from rest_framework.response import Response

from .exceptions import DomainError

logger = logging.getLogger(__name__)


class DomainErrorMixin:
    """
    Mixin for DRF API views and ViewSets that intercepts DomainErrors
    and returns formatted error responses matching the standardized API contract.
    """

    def handle_exception(self, exc):
        """
        Handle DomainError instances by mapping them to their default HTTP status
        and standard error structure.
        """
        if isinstance(exc, DomainError):
            logger.warning("DomainError encountered: [%s] %s", exc.code, exc.message)
            return Response(
                {
                    "message": exc.message,
                    "code": exc.code,
                },
                status=getattr(exc, "default_status", status.HTTP_400_BAD_REQUEST),
            )
        return super().handle_exception(exc)
