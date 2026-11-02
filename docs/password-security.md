# Password management

Settings → Your account & access → Change password requires the current password. Login → Forgot password sends a link to the account email (not the editable reminder address). New passwords must contain 12–128 characters.

Passwords use salted scrypt hashes, never reversible encryption or plaintext. Reset tokens use 32 random bytes, are stored only as SHA-256 hashes, expire after 30 minutes, and are consumed transactionally. A successful change/reset revokes all sessions and pending reset links. Administrator account updates also invalidate pending links. Recovery endpoints are rate limited and unknown emails receive the same response as active accounts.

Run `npm run db:init` when upgrading. The fresh XAMPP import includes `password_resets` too. Restart the Node server after updating backend code.

Email recovery requires SMTP_HOST, SMTP_FROM, SMTP_PORT, SMTP_SECURE, and SMTP_USER / SMTP_PASSWORD when the mail provider requires authentication. Set APP_ORIGIN to the trusted public application origin (for local testing, http://127.0.0.1:3001). Production requires HTTPS and COOKIE_SECURE=true. Links use APP_ORIGIN, never the request Host header. Tokens travel in the link fragment and are removed from browser history when the reset screen opens. Do not log or share reset links.

Without email configuration, the form explains that an administrator must reset the password through Users & access. No reset token is returned by the API or written to application logs. Email delivery has not been tested without an SMTP provider.
