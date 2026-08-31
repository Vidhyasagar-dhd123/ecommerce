"""
Standard JSON Response Renderer for standardizing API envelopes.
"""

from rest_framework.renderers import JSONRenderer


class StandardJsonRenderer(JSONRenderer):
    """
    Wraps all API responses in a standard envelope:

    Success (HTTP < 400):
        { "success": true, "data": { ... }, "errors": null }

    Error (HTTP >= 400):
        { "success": false, "data": null, "errors": { ... } }
    """

    def render(self, data, accepted_media_type=None, renderer_context=None):
        response = renderer_context.get("response") if renderer_context else None
        status_code = response.status_code if response else 200
        success = status_code < 400

        # If data is already an envelope (e.g. nested or already wrapped), prevent double-wrapping
        if isinstance(data, dict) and "success" in data and ("data" in data or "errors" in data):
            envelope = data
        else:
            envelope = {
                "success": success,
                "data": data if success else None,
                "errors": data if not success else None,
            }

        return super().render(envelope, accepted_media_type, renderer_context)
