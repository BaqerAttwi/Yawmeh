# Enable Google signup for yawmeh.me

Email signup works without Google credentials. The Google option becomes available only after the web OAuth client is configured.

1. In Google Cloud Console, open Google Auth Platform. Set the app name to **Yawmeh**, use your support email, and configure the audience for the people who will sign in. While the app is in Testing, add test users; publish the consent configuration when ready for public signup.
2. Create an OAuth client of type **Web application**. Add:
   - Authorized JavaScript origin: `https://yawmeh.me`
   - Authorized redirect URI: `https://yawmeh.me/api/auth/google/callback`
3. Privately edit `/etc/daywell/daywell.env` on the server:

   ```dotenv
   GOOGLE_CLIENT_ID=your-web-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-client-secret
   ```

   Keep `APP_ORIGIN=https://yawmeh.me`. These are separate from your Gemini API key. Do not put the client secret in frontend code or Git.
4. Restart: `systemctl restart daywell`. Test **Continue with Google** with a new account.

Both Google and email signups start **unpaid and inactive**. Email signup requires the greeting's verification link. Google identities are checked using Google's signed identity token. Addresses outside Gmail or a verified Google Workspace domain also receive an email verification link. Existing password accounts are never linked automatically; use password sign-in for those accounts.

After the member verifies their email, in **Users & access** choose **Edit access**, enable the account, and select ongoing access or an expiry in your local time. Unpaid members can receive an explicit owner grant. Setting payment status is a manual record and does not collect payment.

The database migration deactivates existing member accounts once when adding the new payment-status column. Owner accounts stay unchanged. Later migrations preserve grants.

Reference: https://developers.google.com/identity/openid-connect/openid-connect
