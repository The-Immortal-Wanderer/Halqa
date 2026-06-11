"""Rate limiting configuration using slowapi.

Applied to specific endpoints via the ``@limiter.limit()`` decorator.
For the prototype, only post creation and verification document upload
are rate-limited to prevent spam during the demo.
"""

from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
