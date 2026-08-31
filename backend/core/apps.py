from django.apps import AppConfig


class CoreConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "core"

    def ready(self):
        # Register signal handlers
        try:
            import core.signals  # noqa: F401
        except ImportError:
            pass
