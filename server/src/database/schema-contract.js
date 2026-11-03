// Required columns for the current Daywell application.
export const REQUIRED_SCHEMA = { signup_verifications:["token_hash","user_id","expires_at"], oauth_states:["state_hash","code_verifier","nonce","expires_at"], password_resets: ["token_hash","user_id","expires_at"],
  "companion_usage": ["scope","requests"],
  "settings": [
    "id",
    "name",
    "email"
  ],
  "users": [
    "id",
    "name",
    "email",
    "custom_currencies",
    "home_currency",
    "current_rate",
    "last_currency",
    "reminder_email",
    "password_hash",
    "role",
    "permissions",
    "active",
    "payment_status",
    "access_expires_at",
    "google_sub",
    "email_verified",
    "last_seen_at",
    "last_login_at",
    "login_count",
    "quiet_start",
    "quiet_end",
    "created_at"
  ],
  "sessions": [
    "token_hash",
    "user_id",
    "expires_at"
  ],
  "entries": [
    "id",
    "user_id",
    "currency",
    "exchange_rate",
    "rate_snapshot",
    "type",
    "title",
    "amount",
    "saved",
    "category",
    "date",
    "note",
    "voided_on",
    "void_reason",
    "created_at"
  ],
  "items": [
    "id",
    "user_id",
    "title",
    "amount",
    "category"
  ],
  "budgets": [
    "id",
    "user_id",
    "title",
    "amount",
    "start",
    "end"
  ],
  "subscriptions": [
    "id",
    "user_id",
    "title",
    "amount",
    "cycle",
    "renewal",
    "category",
    "active",
    "rarely_used"
  ],
  "tasks": [
    "id",
    "user_id",
    "title",
    "category",
    "due",
    "scheduled_time",
    "cancelled",
    "estimate_minutes",
    "priority",
    "note",
    "reminder",
    "completed",
    "completed_on",
    "recurrence",
    "previous_task_id"
  ],
  "subtasks": [
    "id",
    "user_id",
    "task_id",
    "title",
    "completed"
  ],
  "goals": [
    "id",
    "user_id",
    "title",
    "target_amount",
    "target_date",
    "monthly_amount"
  ],
  "goal_moves": [
    "id",
    "user_id",
    "goal_id",
    "kind",
    "amount",
    "note",
    "date"
  ],
  "day_plans": [
    "id",
    "user_id",
    "date",
    "energy",
    "top_ids",
    "went_well",
    "tomorrow_help",
    "closed_at"
  ],
  "inbox": [
    "id",
    "user_id",
    "text",
    "date",
    "archived",
    "task_id"
  ],
  "reminder_log": [
    "id",
    "reminder_key",
    "sent_at"
  ]
};

