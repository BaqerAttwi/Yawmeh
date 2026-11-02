# Deploy Daywell on an Ubuntu/Debian VPS

This recipe uses one Node process, MySQL and Caddy on the same server. Only
Caddy is public. It does not deploy anything automatically or purchase a domain.

## Prepare the server

1. Install a currently supported Node.js release compatible with Node 22+,
   MySQL and Caddy from their official distributions. Confirm that Node is at
   `/usr/bin/node`, or adjust the supplied service paths. A MySQL dump client
   matching the database is also needed for `npm run db:backup`.
2. Create a dedicated Linux service account `daywell`, with its own group and
   no interactive login. Put the project in `/opt/daywell`. Keep `.env`, private
   credentials, local database exports, backups, `node_modules`, `test-results`
   and development media out of the uploaded source package. Install from the
   lockfile on the server.
3. Create the `daywell` MySQL database and a separate MySQL account restricted
   to that database. It needs schema changes for migrations; the running app
   can use a separate account with SELECT, INSERT, UPDATE and DELETE privileges.
   Never give the app global privileges or the MySQL root password. Bind MySQL
   to localhost and block public port 3306.
4. Create `/etc/daywell/` and copy `production.env.example` to
   `/etc/daywell/daywell.env`. Replace the domain, database/admin passwords,
   admin email and SMTP fields. Protect the file: owner root, group daywell,
   mode 0640; the directory can use mode 0750. Use quoted environment values
   when they contain spaces. Do not commit the completed file.
5. Make `/opt/daywell` readable by the service account, and create
   `/opt/daywell/backups` writable by it (mode 0700). Keep application source
   owned by a deployment user/root rather than writable by the running app.

## Build and initialize

Run `npm ci`, `npm test`, and `npm run build` in `/opt/daywell` as the deployment
user. Then initialize the database with the production environment. One way to
load the protected environment without exposing its secrets in command arguments:

```sh
sudo systemd-run --wait --pipe --collect --property=User=daywell --property=WorkingDirectory=/opt/daywell --property=EnvironmentFile=/etc/daywell/daywell.env /usr/bin/node server/scripts/migrate.js
sudo systemd-run --wait --pipe --collect --property=User=daywell --property=WorkingDirectory=/opt/daywell --property=EnvironmentFile=/etc/daywell/daywell.env /usr/bin/node server/scripts/check-production.js
```

For upgrades, stop the application and back up the existing database before
migration. Some migrations use DDL and are not transactionally reversible.
Remove `ADMIN_PASSWORD` from the production environment after initial creation.
If switching to a less privileged runtime MySQL account, do so after migrations.

The production check requires real HTTPS origin settings, secure cookies,
a non-placeholder database password, an active administrator, all schema fields,
a built frontend, and SMTP settings. It does not send email or verify DNS/TLS.
Natural voice is optional and can remain disabled.

## HTTPS and supervision

1. Point the domain's A record to the VPS. Add AAAA only if IPv6 actually works.
   Initially use direct DNS without another CDN/proxy in front of Caddy.
2. Allow inbound 80 and 443, plus SSH restricted as appropriate for your access.
   Keep 3001 and 3306 private. Keep `HOST=127.0.0.1` and `TRUST_PROXY=loopback`.
3. Replace `your-domain.example` in the supplied `Caddyfile`, copy it to
   `/etc/caddy/Caddyfile`, and run:

```sh
sudo caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
sudo systemctl reload caddy
sudo cp deploy/daywell.service /etc/systemd/system/daywell.service
sudo systemd-analyze verify /etc/systemd/system/daywell.service
sudo systemctl daemon-reload
sudo systemctl enable --now daywell
sudo systemctl status daywell
```

Caddy provisions and renews the public HTTPS certificate when domain validation
succeeds. Its supplied proxy configuration overwrites incoming forwarding headers
with the direct visitor's address. Do not expose the app port or set proxy trust
to `true`/a wildcard. A CDN or different proxy requires a separately reviewed
trusted-proxy chain. Run one app instance: rate counters are currently in memory.

The service runs without root, has a read-only application filesystem apart from
the backup directory, restarts after failure, and allows time for graceful shutdown.
Check `journalctl -u daywell` and `journalctl -u caddy` for operational errors.

## Verify before accepting real records

- Visit the actual HTTPS domain on a phone and desktop. Sign in, confirm the
  cookie has Secure/HttpOnly/SameSite flags, and sign out.
- Create a temporary member with Tasks-only access; confirm Money and user
  management remain blocked. Use separate test records for task and money flows.
- Check `/api/health` returns 200. A failed database should return 503. Monitor
  modestly (for example once per minute) rather than consuming the rate bucket.
- Send a password reset to a test account and verify the received link's hostname.
  Trigger a due task reminder and verify delivery. Set up the SMTP provider's
  domain verification, SPF and DKIM, and an appropriate DMARC policy. Confirm
  that the VPS permits access to the provider's SMTP submission port.
- Run a database backup under the protected production environment, copy it to
  encrypted off-server storage, and restore it into a separate test database.
  Schedule daily backups with your server's scheduler after a successful restore
  test. Keep retention appropriate to your data and capacity; no cleanup job is
  installed by this recipe. See `../docs/backups.md` for restoring safely.
- Restart the app and reboot the VPS to verify recovery. Confirm you have an
  alerting route for failed health checks and backup jobs.

## Updates and rollback

Keep the previous source release and its lockfile. Before changing schema,
stop the app and take a database backup. Build/test the new release, migrate,
run the production check, then restart. A source rollback is safe only when
compatible with the current schema. Otherwise restore a verified database backup
and matching application release during a maintenance window; that can discard
records created since the backup. Never restore a backup blindly over live data.

These templates have been prepared on Windows. Caddy/systemd validation and the
public TLS, SMTP and recovery smoke tests must be executed on your actual VPS.
