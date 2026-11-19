# Yawmeh Companion product research

19 November 2026

Build the Companion around a daily question: **What do I need to do, pay, or follow up on next?** Yawmeh can answer from tasks, the inbox, recorded spending, subscription renewals and savings goals. The distinctive experience is turning one ordinary message into a useful plan and a few reviewable actions across those records, even when the message mixes Lebanese Arabic, Arabizi, English and currencies.

This is a competitor and product review. Priorities are hypotheses informed by official product documentation and the current Yawmeh code. They need validation with users. Example amounts and conversations are fictional.

## What other apps make easier

| Product | Documented workflow | Implication for Yawmeh |
| --- | --- | --- |
| Monarch Money | Its assistant explains spending, cash flow and individual transactions. | Give an answer with the exact date range and filters, then let people open the contributing records. [Monarch help](https://help.monarch.com/hc/en-us/articles/37526856682260-AI-in-Monarch) |
| Cleo | Users start a budget in chat, set category limits and confirm bills. Its product also describes calculating spendable money around upcoming commitments. | Guide setup one question at a time and distinguish the recorded balance from money left after planned bills. [Cleo budget help](https://web.meetcleo.com/faqs/en/articles/12984131-how-do-i-set-up-a-budget-and-how-does-it-work-uk), [Cleo Autopilot](https://web.meetcleo.com/blog/introducing-autopilot) |
| YNAB | Targets, scheduled expenses and overspending contribute to underfunded amounts. | Answer which obligations still need money and show exactly what was included. [YNAB Underfunded](https://support.ynab.com/en_us/underfunded-a-guide-BJwPhQO09) |
| Rocket Money | Detects recurring costs from connected transactions and shows upcoming payments on a calendar. | Use saved renewals first. Once enough matching ledger entries exist, suggest possible recurring payments for the user to confirm. [Rocket Money help](https://help.rocketmoney.com/en/articles/2185531-managing-your-bills-and-subscriptions) |
| Todoist | Ramble extracts multiple tasks and details such as dates, priority and duration from natural speech. | Let people speak a whole thought and review each extracted item separately. [Todoist Ramble](https://www.todoist.com/ramble) |
| Sunsama and Motion | Sunsama drafts a plan from priorities and time constraints for review. Motion reschedules around deadlines, priorities and availability. | Start with an explainable plan and selected moves. Base free-time claims on the calendar data the user actually supplied. [Sunsama Daily Planning](https://help.sunsama.com/docs/usage-guides/daily-planning/), [Motion Auto-scheduling](https://www.usemotion.com/help/time-management/auto-scheduling) |
| tricount | Records the original currency of a shared expense and shows a converted trip total. | Preserve native amounts for each payment leg. Label any combined total with its conversion basis. [tricount multi-currency](https://www.tricount.com/en-us/features/multi-currency-support) |
| Expensify | Reads dates, merchants and totals from receipts and lets users correct extraction errors. | Add a receipt-to-draft flow later. A blurry total or unclear currency should stay editable and require review. [Expensify SmartScan](https://help.expensify.com/articles/new-expensify/reports-and-expenses/Troubleshoot-SmartScan-Issues) |

The World Bank documented the expansion of dollar cash transactions in Lebanon. That makes cash reconciliation and mixed-currency capture worth testing locally. The report covers the historical period and does not measure demand for Yawmeh features. The earlier Companion research also documents why one message can move between Arabic, English, French and Arabizi. [World Bank Lebanon Economic Monitor](https://www.worldbank.org/en/news/press-release/2023/05/16/lebanon-normalization-of-crisis-is-no-road-to-stabilization), [Yawmeh language research](companion-research.md)

## Where Yawmeh starts

Today the chat prepares single task and money drafts, answers balance and spending questions, reviews budgets, goals and subscriptions, and can propose supported changes to saved records. It accepts custom currency symbols and has voice input, English and Lebanese Arabic replies, and local understanding for known requests. Today and the planning pages already have an inbox, subtasks, task estimates, recurring work, and a day-close flow. These are useful primitives for richer chat. [Request library](../shared/companion-requests.js), [Supported changes](../shared/companion-changes.js), [Daily routes](../server/src/modules/daily/routes.js)

## Request inventory

**First** can use existing data or forms. **Next** needs more capable proposals or small additions to the data model. **Later** needs a new record type, external connection, or upload workflow.

| When | User could ask | What the assistant should produce |
| --- | --- | --- |
| First | “What needs my attention today?” | Up to three actionable items drawn from tasks, renewals and the inbox, with a short explanation and links. Show money and task details only when the account has each permission. |
| First | “How much did I spend on food since Monday, and why is it higher?” | Exact period, totals by native currency, matched comparison period, largest contributors and an **Open transactions** link. Make thin or missing records visible. |
| First | “Find the $25 I spent at the pharmacy last week.” | Matching records with date, amount and currency. Let the user select one if several fit. |
| First | “If I spend $65 before Friday, what’s left after renewals?” | A scenario card showing recorded spendable balance, matching upcoming renewals, proposed purchase and remaining amount. Show budget headroom separately and mark expected income as excluded unless explicitly included. |
| First | “Pay Netflix Friday” / “I paid Netflix today.” | The first offers a reminder or payment review, depending on the user’s meaning. The second opens the existing subscription payment review and checks for a possible duplicate. |
| First | “I have 45 minutes before my appointment.” | Tasks that fit the stated window, durations and why they were picked. Keep time estimates visibly approximate. |
| First | “I can’t finish today. Move the low-priority tasks to tomorrow.” | Preview the proposed moves. Keep overdue or hard-deadline items visible and let users select which changes to apply. |
| First | “Close my day” / “What did I finish this week?” | Summarize completed items, show unfinished ones, and open the existing day-close flow with user-selectable carryover. |
| First | “Show my savings goal. What if I put in $30 more each month?” | Current progress and a side-by-side projection with contribution assumptions. Offer a separate change preview. |
| First | “Help me set up my first budget” / “How do I add euros?” | Ask for the missing budget amount and period or open currency setup with the entered name and symbol ready for review. Explain how to enter a manual rate inside the form. |
| First | “Only LBP” / “What about last month?” | Refine the previous result with the requested currency or date range. Display the new filter and preserve all other filters. |
| First | “I meant 150,000 LBP, and it was yesterday.” | Update the relevant draft and show the changed fields. If the user is referring to a saved record, open a scoped correction or reversal review. |
| Next | “Sraft 12$ 3al ghada w 150,000 LBP taxi, w zakkerni ettasil b Mama bokra at 7.” | Two expense drafts and a reminder draft. Keep both expenses intact while asking whether 7 is morning or evening. |
| Next | “Record the same grocery trip as last Saturday.” | Copy suggested fields from a visible source record into a fresh draft. Highlight the date and amount for review and flag a likely duplicate. |
| Next | “I have $100 in cash. How much is missing from my records?” | Compare a user-entered count with the recorded USD cash balance after named cash wallets exist. Offer a correction with a reason after checking missing entries. |
| Next | “Every month on the 5th, remind me to check rent.” | A reviewable repeat rule with the next occurrences and timezone. If rescheduling a repeating task, ask whether this occurrence or the series should change. |
| Next | “I’m moving apartments next month. Help me plan it.” | A checklist with estimates, a list of expected costs and milestones, and separate action buttons to adopt selected items. |
| Next | “Remind me in two hours” / “Turn this inbox note into a task.” | Confirm the computed reminder time or show the selected note and draft task side by side. Preserve the note until conversion succeeds. |
| Next | “How many times have I paid for coffee this month? Export those entries.” | A filtered count, total and the matching entries. Generate an account-scoped CSV only when requested, using the same filters shown in chat. |
| Next | “I always put this supermarket under groceries.” | Offer to save a visible, editable rule. Show its match criteria and whether it applies to future entries or a reviewed historical selection. |
| Later | “Paid $10 and 400,000 LBP for the same groceries.” | One grouped purchase with two native payment amounts and the historical rate if known. It must count once as a purchase and once per payment in native balances. |
| Later | “I exchanged $50 and got 4,475,000 LBP.” | A linked exchange from one wallet to another, with the implied rate and optional fee. Exchange legs affect balances without inflating income or expense totals. |
| Later | “I lent Karim $40. He gave back $15 today.” | Show the outstanding $25 using dedicated debt and repayment records. Separate the balance effect from income and spending reports. |
| Later | “Split this $60 dinner three ways. I paid.” | User share, amounts owed, and a later settlement action. Never count repayments as new earned income. |
| Later | “Here’s the receipt. Add it to yesterday.” | Editable date, merchant, total and currency, with the conflicting dates visible if the receipt disagrees. Ask before retaining the original image. |
| Later | “Tell me if any subscription goes up,” / “Show open time around work meetings.” | Opt-in alerts based on compared payments and permissioned calendar access. Let users pause alerts and revoke connections. |

## The first release to build

1. **Today briefing and record links.** A short answer with **Open transactions**, **Review renewal** or **Plan my day** where applicable. Each figure should open the exact records behind it. If a user only has Tasks access, the briefing still works.
2. **Spend-before-Friday scenario.** Use a fixed horizon and the recorded renewals already in the app. Report confirmed ledger balances, commitments and hypothetical purchases as separate rows. Handle USD, LBP and configured currencies independently. When a renewal lacks comparable currency information, list it as excluded from the calculation.
3. **Multiple items from one message.** Extend the existing review flow with a batch of independent proposals. Keep explicit currencies attached to their own amounts, preserve names and dates, let users confirm complete items while correcting one unclear item, and record which item succeeded so a retry cannot duplicate existing writes.
4. **Daily repair and close.** Reuse task estimates, the inbox, and the existing day-close flow for “I only have 30 minutes” and “Move these two to tomorrow.” Suggest moves using actual constraints and display the resulting dates before confirmation.

The first two features use the current ledger and permissions. Batch actions need an explicit review state and retry behavior. Mixed payments, cash wallets, exchanges and debts need dedicated ledger semantics before conversational entry.

## Three conversations to prototype

**Today briefing**

> **User:** Shu lezim a3mol lyom?
>
> **Companion:** عندك اتصال بالدكتور الساعة 11، وتجديد Claude بـ$20 بكرا. إذا معك 15 دقيقة هلق، فيك تخلّص إرسال الفاتورة.
>
> **Open tasks** · **Review renewal**

**Money decision**

> **User:** I want to spend $65 before Friday. Will I have enough after Claude?
>
> **Companion:** Your recorded USD spending balance is $115. After the $20 Claude renewal and a $65 purchase, you’d have **$30 USD** left through Friday. Your LBP balance is separate.
>
> **See included records** · **Try a different amount**

**Mixed voice capture**

> **User:** Sraft 12$ 3al ghada w 150,000 LBP taxi, w zakkerni ettasil b Mama bokra at 7.
>
> **Companion:** I found three items. Lunch · **$12 USD**. Taxi · **150,000 LBP**. Call Mama · **tomorrow at 7**. Is that **7 AM** or **7 PM**?
>
> **Review 2 expenses** · **7 AM** · **7 PM**

## Implementation and validation

- Calculate balances, dates and scenarios with deterministic application logic. Use the model to interpret flexible wording and produce structured proposals. Resolve record IDs and permissions in the app. Verify permissions again at confirmation and keep record contents and calculations inside Yawmeh.
- Carry the referenced result, period, currency and pending items into short follow-ups such as “What about last week?”, “Only LBP”, or “Make the second one 140,000.” Clear the reference when a fresh request changes the subject or when permissions change.
- For capture, distinguish “no amount yet,” “unknown currency,” and “ambiguous time.” Ask one targeted question while preserving all other fields. Keep recorded facts, expected payments, what-if assumptions, and converted estimates visibly distinct.
- Show native amounts first and use saved historical rates where historical conversion is needed. Include amount-before-symbol, symbol-before-amount, mixed Arabic/Latin digits, decimal and thousands separators, multiple amounts, LBP shorthand, custom symbols, and repeated numbers inside names in the acceptance examples.
- Use small cards that work by touch, support RTL, and fit a narrow mobile viewport. Show only the next useful actions. Let people discover real, supported prompts through the Examples picker.
- Test with privacy-safe sample ledgers and interviews using fictional data. Ask users who log daily expenses, plan tasks, and handle multiple currencies to speak or type how they would naturally record a day, review upcoming bills, and fix a mistaken entry. Record which requests require clarification and which actions users can confirm on the first attempt.
- Measure first-pass field accuracy by field and language, live usability on mobile, task completion, and repeat use of the briefing. Track only minimal opt-in event data, such as intent family, clarification count and whether a draft was confirmed. Treat wrong amounts, wrong currencies, unauthorized results, and duplicate saves as release blockers.

## Second research pass

### Remember decisions the user can inspect

Copilot Money uses reviewed transactions to improve categorization. Actual Budget documents inspectable rules with explicit matching conditions and ordering. Claude gives users controls to review and edit memory or use a temporary conversation. Yawmeh can start with a small set of settings and rules users approve directly in chat. That fits a tracker with limited history and gives people a clear explanation when a suggestion changes. [Copilot Intelligence](https://help.copilot.money/en/articles/8182433-copilot-intelligence-for-spending), [Actual Budget rules](https://actualbudget.org/docs/budgeting/rules/), [Claude memory controls](https://support.claude.com/en/articles/11817273-use-claude-s-chat-search-and-memory-to-build-on-previous-context)

| User request | Proposed behavior |
| --- | --- |
| “When I say ‘the gym,’ I mean my monthly gym membership.” | Preview an alias for that specific saved subscription. If two subscriptions have similar names, let the user choose. |
| “Always put Spinneys under groceries.” | Preview an exact merchant rule and show an example of its next match. Apply it as a suggestion on future expense drafts. |
| “Why did you pick groceries?” | Show the rule or prior record that led to the suggestion. Offer **Change for this draft** and **Edit rule**. |
| “What do you remember about me?” / “Forget my gym shortcut.” | List editable preferences and rules, with their scope. Delete the selected one while keeping related ledger entries available in Money. |

Start with merchant aliases, category defaults, and planning preferences. Keep a pending conversation reference, a saved preference, and a ledger record distinct in storage. A saved preference should never override an explicit amount, currency, actor, date, or recurrence scope in the current message.

### Help with irregular income and noisy changes

The CFPB cash-flow toolkit organizes bills and income by when they happen, which is useful when pay varies. Copilot Money exposes separate notification categories and a toggle for proactive suggestions. Yawmeh already has task and renewal email reminders with quiet hours. Start with an in-app briefing and let users opt into individual alert rules once the underlying signals are reliable. [CFPB cash-flow toolkit](https://www.consumerfinance.gov/consumer-tools/educator-tool/your-money-your-goals/toolkit/), [Copilot alerts](https://help.copilot.money/en/articles/11062072-settings-overview), [Copilot proactive controls](https://help.copilot.money/en/articles/17678669-money-assistant-settings), [Yawmeh reminder service](../server/src/modules/reminders/reminders.js)

| User request | Proposed behavior |
| --- | --- |
| “My client might pay $300 Friday. Can I cover rent if it’s late?” | Show two timelines, using the same opening balance and bills. Include the $300 only in the on-time scenario and show the first day either scenario runs short. |
| “Claude charged $23 last time. Was that a price increase?” | Compare comparable recorded payments in the same currency. State the difference and let the user check for fees or one-off charges before classifying it as a price increase. |
| “Tell me when USD drops below $50 after bills.” | Preview which balance, which bills, which horizon, and what triggers an alert. Show when it would fire on the current example before enabling it. |
| “What changed since I checked on Monday?” | Show newly recorded transactions, changed due dates, and renewals in the selected period. Where change history is unavailable, state what records the view can compare. |

Avoid subtracting a renewal twice when it already has a matched payment. Suppress repeat alerts for the same unresolved condition and explain why each alert fired. Use generic notification previews by default, with details available after opening the app.

### Track where cash actually is

Whish supports USD and LBP top-ups and describes currency conversion in its app. myMonty documents separate LBP and USD wallet balances. In a public Lebanese budgeting discussion, people described tracking USD totals while using the exchange rate they actually paid. That discussion is anecdotal evidence for a prototype, not a frequency estimate. Actual Budget gives a precedent for reconciling a counted balance against ledger entries, and Splitwise settles debts separately by currency. [Whish Wallet](https://www.whish.money/whish-app), [myMonty wallet facts](https://www.mymonty.com.lb/KFS-Individual-eWallet-Account-16.7.25.pdf), [Lebanese budgeting discussion](https://www.reddit.com/r/lebanon/comments/11cqkdi), [Actual Budget reconciliation](https://actualbudget.org/docs/accounts/reconciliation/), [Splitwise settlement](https://kb.splitwise.com/balances-and-expenses/what-is-simplify-debts)

| User request | Proposed behavior |
| --- | --- |
| “I paid with $20 and got 450,000 LBP back.” | Preview the USD tendered and LBP change received. Ask what the purchase cost or which rate applied if needed to reconcile the purchase and both balances. |
| “I moved $50 from cash to my wallet.” | Preview two linked movements with one transfer receipt. Show any explicitly stated fee separately. |
| “I counted 1,500,000 LBP in cash. Yawmeh says more.” | Compare against the named cash wallet, surface likely unmatched entries, then preview an adjustment with a reason if the difference remains. |
| “Sam paid me $15 of the $40 dinner share.” | Record a partial settlement in the original currency; show the $25 remaining and keep the payment linked to the shared expense. |
| “The shop refunded $8.” | Find the original expense and preview a partial refund; preserve the original amount, remaining net expense and the refund date. |

Prototype one personal USD wallet and one personal LBP wallet before sharing accounts with other users. Purchase splits, change in another currency, wallet transfers, refunds, and what another person owes are different events with different effects on reports. A simple calculator can answer unrecorded split questions while dedicated ledger support is being built.

### Let people specify how a plan can flex

Reclaim documents distinct rules for move windows, minimum duration and priority. That suggests a practical set of inputs for Yawmeh planning. A person should be able to express how flexible a task is and see why a proposed plan leaves it where it is. [Reclaim planning rules](https://help.reclaim.ai/en/articles/15280604-reclaim-2-0-faq)

- “Protect 6–8 for family. Fit a 20-minute errand before then.” Ask about unknown commitments, and show travel or buffer time only if supplied.
- “Keep the dentist appointment. Move the rest if you need to.” Show proposed moves and explain which appointments or deadlines are protected.
- “Break my study session into two 25-minute blocks.” Preview both sections and keep them linked to one task when possible.
- “If I miss the gym today, fit it in next week.” Ask whether the user wants a one-time move or a standing rule for missed sessions.

### What the second pass changes

1. **Add explanations and record links to the first release.** A correct figure is more useful when the user can check which transactions and renewals produced it. Include **Why this category?** as soon as category suggestions are available.
2. **Prototype explicit memory with the capture flow.** Test one approval and one deletion of a merchant alias or category default before broader memory. Compare capture with and without the saved rule across a second session.
3. **Test mixed-currency cash handling before building a full wallet.** Use a clickable example with receiving change and a cash reconciliation. If users repeatedly need to distinguish the location of money, build the ledger primitives before exposing write actions in chat.
4. **Keep alerts and collaboration behind the underlying data.** A spending alert needs a clearly defined balance and reliable payment matching. Shared settlement needs its own permissions and lifecycle. Validate both before adding a toggle that implies they already work.

Run a short usability study with six to eight participants intentionally recruited across USD/LBP cash users, people with irregular income, and people who mainly use tasks. Give them the same fictional records and ask them to capture three items by voice, explain a spending result from its underlying records, fix a mistaken amount, and decide whether a proposed alert is useful. Observe where people tap, what they say without example prompts, and whether they can spot a wrong currency or duplicate item before saving. On mobile, include keyboard operation, screen-reader announcements for saved or failed drafts, focus return after review, and comfortable tap targets. The small study is for finding failure modes and ranking next prototypes. [WCAG 2.2](https://www.w3.org/TR/WCAG22/)
