# Django Admin 403 Fix

## Root Cause
The admin was likely blocked by:
1. CSRF settings behind HTTPS proxy not properly configured
2. Missing SECURE_PROXY_SSL_HEADER and USE_X_FORWARDED_HOST
3. Cookie secure settings

## Fix Applied
- Added proper SECURE_PROXY_SSL_HEADER, USE_X_FORWARDED_HOST
- Set SESSION_COOKIE_SECURE and CSRF_COOKIE_SECURE
- Kept existing security protections
- Nginx already passes X-Forwarded-Proto correctly

## Verification
1. Check CSRF_TRUSTED_ORIGINS includes https://physiquegym.ir
2. Ensure superuser exists
3. Test /admin/ login
