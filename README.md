# CRFFL Newsroom (Times-Herald)

The automated journalism engine and editorial desk for the **Columbia River Fantasy Football League (CRFFL)**.

## The Columnists

| Columnist | Beat & Focus | Schedule | Publishing Channel |
| :--- | :--- | :--- | :--- |
| **Marty Sullivan** | Tuesday Post-Game Recap, Grit & Weekly Contests | Tuesdays @ 12:00 PM | WordPress (*The Tuesday Recap*) |
| **Chloe Carmichael** | Wednesday Spin Room, Waiver Wire & Panic Trades | Wednesdays @ 12:00 PM | WordPress (*The Spin Room*) |
| **Dr. Marcus Vance** | Weekly Power Rankings & MIT Empirical Models | Wednesdays @ 2:00 PM | Vercel `/power-rankings` & WordPress |
| **Buck Callahan** | Thursday Look-Ahead, Matchup Previews & Trench Warfare | Thursdays @ 12:00 PM | WordPress (*The Grit Desk*) |

## Key Features

- **Live Sleeper Stats**: Roster standings, matchups, points, and transaction feeds.
- **PFF Real-World Intelligence**: Automatically ingests and references up-to-date NFL news from PFF.
- **Dynamic Rival Snipes**: Real-time contextual rebuttals targeting the most recent takes of fellow columnists.
- **Narrative Continuity**: Persistent memory via Supabase to preserve running storylines, grudges, and past columns without repetitive jokes.
- **Dr. Vance's Power Rankings Board**: Interactive glassmorphic board with glowing top-seed cards, manager logos, records, and trend badges (`▲ / ▼ / ▬`).
- **Commissioner Baseline Portal**: Submit custom rankings before Wednesday at 2:00 PM, with an automatic algorithmic fallback based on Sleeper standings.
- **Admin Test Bench**: Trigger any columnist on demand in preview or live-publish mode.
- **Vercel Cron Automation**: Scheduled serverless dispatch protected by `CRON_SECRET`.

## Tech Stack

- **Framework**: Next.js 16 (Turbopack, App Router) & Tailwind CSS
- **AI**: Google Gemini (`@google/genai` with `gemini-3.6-flash`)
- **Database**: Supabase (`newsroom_articles`, `power_rankings`, `weekly_contests`, `rankings_submissions`)
- **CMS**: WordPress REST API (`crffl.org`)
- **Hosting**: Vercel & GitHub

