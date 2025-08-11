from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.middleware.csrf import get_token

@require_http_methods(["GET"])
def get_csrf_token(request):
    """
    View to get CSRF token for the current session
    """
    return JsonResponse({"csrfToken": get_token(request)})
