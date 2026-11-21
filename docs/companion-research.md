# Companion requests and Lebanese writing

Research checked 5 November 2026. This is a design brief for Yawmeh, not an analysis of private user conversations or a claim about the most frequent requests in this app. Examples in the application and tests were written for this project; no research dataset or social-media messages were imported for training.

This brief describes the original Companion design. The current [AI settings](../README.md) limit Gemini to recommendations for supported reports.

## Everyday wording checks

Conversational expense trackers expose short capture, statements, and questions about a specific merchant or category in the same chat. The CFPB toolkit distinguishes income, spending, bills, savings, and debt. Todoist documents natural-language task dates. These sources describe product workflows, and the examples below are test phrases for Yawmeh. They do not measure how often Yawmeh users ask for each action. [ExpenseTracker](https://expensetracker.io/about), [Dora](https://www.doraai.money/), [CFPB toolkit](https://www.consumerfinance.gov/consumer-tools/educator-tool/your-money-your-goals/toolkit/), [Todoist dates](https://www.todoist.com/help/todoist/features/introduction-to-recurring-dates-YUYVJJAV)

| What the user means | Example | Expected response |
| --- | --- | --- |
| Start recording an expense | “I spend”, “I spent”, “صرفت”, “sarfet” | Start a draft and ask what it was for. Accept a combined reply such as “Lunch $15”. |
| Describe a purchase | “I spend 15$ on lunch”, “I paid $20 for gas yesterday”, “I bought an iPhone 16 for $400” | Draft one expense. Preserve the recorded date, title, and amount. An explicit currency amount takes precedence over model numbers in names. |
| Enter a quick expense | “Coffee $8”, “$8 coffee”, “دفعت ٨$ على القهوة” | Draft the expense in the stated currency. |
| Speak a dollar amount | “I spent twenty dollars on groceries” or reply “twenty dollars” to an amount prompt | Accept common English dollar amounts through nine hundred ninety-nine. Cents can be entered as decimals. |
| Log mixed-language spending | “ana sraft 150,000 LBP 3al taxi” | Draft the expense with the stated native currency. Mixed-script input is expected in Arabizi. [Arabizi code-switching research](https://aclanthology.org/2022.wanlp-1.18/) |
| Record income | “I got paid $250 from Freelance” | Draft income under the stated source. |
| Ask about spending | “How much did I spend on coffee this week?” | Total recorded expenses whose name or category matches the search, grouped by original currency. |
| Plan a task | “Set a reminder to call Mom tomorrow at 7 pm” | Draft the task with its due date and scheduled time. |
| Clarify recurring or ambiguous money | “I spend $20 every week”, “I received a $20 refund”, “I spent $12 on lunch and $4 on coffee” | Explain the ambiguity and request a specific supported action before producing a draft. |
| Review or correct | “Change the amount to 25”, “Cancel”, “Monthly report” | Use the open draft or report context as appropriate. |

The next research priorities are split purchases, refunds linked to original transactions, expense batches, and distinctive wording captured during consented usability sessions. Recurring task language should be tested alongside the existing recurrence controls before expanding reminders in chat.

## What the research supports

- [Identifying Code-switching in Arabizi, WANLP 2022](https://aclanthology.org/2022.wanlp-1.18/) treats language identification at word level because Latin-script Arabic can occur alongside English, French and Arabic script in one message. Design implication: combine lexical evidence and conversation context; do not equate Latin letters with English.
- [Romanized Arabic Across Dialects, 2026](https://arxiv.org/abs/2608.02555) includes Lebanese speakers and documents variation across dialects and spelling choices. Design implication: accept several common spellings and keep the original message available to AI rather than applying a universal character substitution.
- [Arabic and Latin Keyboard Choice in Lebanese Students’ Discussions on WhatsApp, 2021](https://lsj.cnrs.edu.lb/wp-content/uploads/2022/02/Ayman-Halawi.pdf) studies Lebanese multilingual messaging, Arabizi and keyboard choice. Design implication: support mixed writing and numerals inside words, while protecting standalone amounts, dates and product codes.
- [Analyzing and Predicting Task Reminders, Microsoft Research, 2016](https://www.microsoft.com/en-us/research/publication/analyzing-predicting-task-reminders/) analyzes time-based reminders and their relationship to task content. [MASSIVE, ACL 2023](https://aclanthology.org/2023.acl-long.235/) provides multilingual assistant intent and slot-filling research. Design implication: separate what the user wants to do from details such as title, date, time, amount and currency; ask for missing details instead of guessing.
- [Your Money, Your Goals, CFPB](https://www.consumerfinance.gov/consumer-tools/educator-tool/your-money-your-goals/toolkit/) provides tools for tracking spending, income, bills, savings and cash flow. This is evidence for useful tracker request categories, not financial advice or Lebanese-specific usage statistics.
- [Information Needs and Practices Supported by ChatGPT, 2025](https://arxiv.org/abs/2507.05537) examines writing, learning, decision support and idea generation across life contexts. Design implication: offer useful general coaching and writing examples when AI is available, alongside record-based tracker actions.

## Requests added to the examples library

| Need | Example in English | Lebanese / Arabizi example | Behavior |
| --- | --- | --- | --- |
| Priorities | What should I focus on today? | shou awal shi lezem a3mol lyom | Uses recorded tasks |
| A short break | I have 15 minutes | 3ande 15 da2aye2 | Suggests recorded tasks that fit |
| Remember a task | Add task call the dentist tomorrow at 9 am | bdi zakkerni call dentist bokra se3a 9 sobe7 | Draft; review before save |
| Record spending | I spent 15 USD for lunch | sraft 15 dollar 3al ghada | Draft with amount and currency |
| Record income | I received 500 USD from work | 2ebedet 500 dollar mn work | Draft |
| Existing savings | Add to savings 500 USD | bade zid savings 500 dollar | Existing-savings draft, not an automatic transfer |
| Subscription | Add subscription 20 USD for Claude | bdi zid subscription Claude b 20 dollar | Subscription draft |
| Available money | How much money do I have left? | adde ba2e ma3e masare | Recorded balances |
| Bills | What bills are coming up? | شو الاشتراكات الجاية؟ | Recorded subscriptions; no external bill access |
| Compare spending | Am I spending more than last month? | 2aren masarife halshaher | Recorded comparison |
| Save more | Where does my money go? | wein 3am trou7 masriyeti | Recorded categories and saving suggestions |
| Fix a draft | Change that to tomorrow | khalliha bokra | Changes only the pending draft |
| Think or write | Break this project into small steps | sa3edne 2assem project la small steps | AI advice; does not create tasks automatically |

The complete library contains English, Lebanese Arabic and Arabizi examples. The picker filters account permissions, labels AI-only examples and fills the composer without sending automatically. Exact query aliases work without AI; flexible actions continue through validated draft parsing.

## Language behavior and limits

Auto uses word evidence, mixed-script evidence and the last conversation language. Short amounts, dates, currencies, acknowledgements and names retain context. English or Arabic manually chosen by the user remains authoritative. Recognized Arabizi in Auto also guides the browser microphone toward Lebanese Arabic.

In Auto, the AI can correct the preliminary language choice using the original message and recent dialogue. Its corrected language becomes the context for the next short reply. The writing hint is deliberately fallible, and is not a trained classifier. No general accuracy or dialect-fluency claim is made from the hand-authored regression tests.

Local normalization only handles known command words and values; it does not transliterate every name or infer a currency from a numeral in a word. Ambiguous time or money details still need clarification. Replies use Lebanese Arabic script; Arabizi input does not create a separate UI language. This change improves text detection and request handling. It does not make browser speech recognition automatically multilingual: browser-only speech still uses a selected locale, while enhanced server transcription has its own automatic audio-language handling.
