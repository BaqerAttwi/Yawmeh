# AI change log

Whenever you edit this repository, append an entry to the root `ai INTEGRATION` file before finishing the task. Include the date, the model name available to you, and what changed. Create the file if it is missing. Keep it local and gitignored.

# Shared ideas board (Claude + Codex)

Claude and Codex both suggest ideas for this app in `docs/ideas/IDEAS.md`. Follow these rules:

1. When you have a new idea for a feature, a design change or a fix, add it to `docs/ideas/IDEAS.md` using the template there. Give it the next number, put your name (Codex or Claude) as the author, and set its status to `Waiting for Al-Baqer`.
2. When you open the file, read the ideas the other AI added. Under each one write a short `Review by <your name>` note: what is good, what you would change, and any risk. Don't rewrite the other AI's text.
3. Never build an idea, or change app code for it, until Al-Baqer has changed its status to `Approved`. Only Al-Baqer sets `Approved` or `Rejected`.
4. When you finish building an approved idea, set its status to `Done` and log the change in `ai INTEGRATION` as usual.
5. Keep ideas short and plain: what it is, why it helps the user, and what changes on screen. Link a preview image or page if you have one.
