# Local database backups

From the project folder, run `npm run db:backup` with XAMPP MySQL running.

The command creates a timestamped `backups/daywell-….sql.gz` file. It includes database tables and records, including users and password hashes. It does not include your `.env` or SMTP/API credentials. These archives contain private financial information; keep them private. Compression is not encryption.

The command uses XAMPP's mysqldump when available. Else install your database's matching dump utility and set MYSQLDUMP_PATH in `.env`. The password is passed through the child process environment, not command-line arguments. Failed dumps are not published as completed backups. Existing backups are never overwritten or automatically deleted.

## Restore

Restore into a NEW empty database first. In phpMyAdmin create a test database, select it, then Import the `.sql.gz` file (or decompress to `.sql` if your upload limit requires it). Verify tables and record counts before using a restored database. Do not import over your live database: a dump may replace existing tables.

After a real recovery, clear the restored `sessions` and `password_resets` tables to invalidate restored login sessions and reset links. Update MYSQL_DATABASE only when you intend to switch databases, then run `npm run db:init` and restart the app.

Keep an additional protected copy on another device or backup service. A backup stored only on the same laptop cannot protect against laptop loss. This initial setup is manual; it does not install a scheduled job.
