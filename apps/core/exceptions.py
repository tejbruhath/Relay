from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status


def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)
    if response is not None:
        if isinstance(exc, dict) or hasattr(exc, 'get_codes'):
            codes = exc.get_codes()
            if isinstance(codes, dict):
                codes = list(codes.values())
            # flatten lists if necessary
            flat_codes = []
            for c in codes:
                if isinstance(c, list):
                    flat_codes.extend(c)
                else:
                    flat_codes.append(c)
                    
            if 'conflict' in flat_codes:
                response.status_code = status.HTTP_409_CONFLICT
            elif 'payment_required' in flat_codes:
                response.status_code = status.HTTP_402_PAYMENT_REQUIRED
            elif 'not_found' in flat_codes:
                response.status_code = status.HTTP_404_NOT_FOUND
                
        response.data['status_code'] = response.status_code
    return response
