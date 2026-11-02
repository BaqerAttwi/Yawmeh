# Import Daywell into XAMPP

This package creates a fresh `daywell` database with all 14 tables and the latest fields, plus one initial app administrator. It uses InnoDB, utf8mb4_unicode_ci and JSON columns compatible with MySQL 5.7+ / MariaDB 10.2.7+. It does not contain your browser's demo records.

1. In XAMPP Control Panel, start Apache and MySQL.
2. Open http://localhost/phpmyadmin/ in your browser.
3. Choose the server-level **Import** tab, select `daywell.sql` from this folder, keep format **SQL**, and click **Import / Go**. The file creates and selects the `daywell` database itself.
4. Open the project's `.env` and set the MySQL connection to your actual XAMPP account. A default local XAMPP installation commonly uses the following; if you set a password, enter it instead of leaving the password blank:

   ```env
   MYSQL_HOST=127.0.0.1
   MYSQL_PORT=3306
   MYSQL_USER=root
   MYSQL_PASSWORD=
   MYSQL_DATABASE=daywell
   ```

5. Restart Daywell with `node server/src/index.js` from the project folder. Apache serves phpMyAdmin; Daywell still runs through Node on http://127.0.0.1:3001/.
6. Choose normal **Sign in**, not a demo. The initial application email and randomly generated password are in `ADMIN-CREDENTIALS.local.txt` in this folder. These are separate from the MySQL connection credentials.
7. Use **Users & access** to create member accounts. Set your reminder email in Settings if you will use email reminders.

The import contains only a salted password hash; its plaintext password is kept in the separate local credentials file, excluded from Git. The seed will not reset an existing administrator. ADMIN_EMAIL / ADMIN_PASSWORD environment variables are not needed to use this imported administrator.

## Existing databases

This is a fresh-install schema, not an upgrade script. CREATE TABLE IF NOT EXISTS leaves existing tables and rows intact but does not add missing columns to older tables. For an older Daywell database, export a backup in phpMyAdmin, configure `.env`, and use `node server/scripts/migrate.js` instead. Do not delete an existing database to make room for this file.

## Verification

The table and field definitions were checked against the application migration, and the supplied admin hash was verified with Daywell's password checker. No live SQL import was performed in this environment. After importing, phpMyAdmin should show 14 tables and one administrator in `users` on a fresh installation. Run `node server/scripts/migrate.js` with the same connection settings to reconcile any later app schema updates.
