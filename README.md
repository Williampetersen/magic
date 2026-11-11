# Magic Portfolio

Magic Portfolio is a simple, clean, beginner-friendly portfolio template. It supports an MDX-based content system for projects and blog posts, an about / CV page and a gallery.

View the demo [here](https://demo.magic-portfolio.com).

![Magic Portfolio](public/images/og/home.jpg)

## Getting started

**1. Clone the repository**
```
git clone https://github.com/once-ui-system/magic-portfolio.git
```

**2. Install dependencies**
```
npm install
```

**3. Run dev server**
```
npm run dev
```

**4. Edit config**
```
src/resources/once-ui.config.js
```

**5. Edit content**
```
src/resources/content.js
```

**6. Create blog posts / projects**
```
Add a new .mdx file to src/app/blog/posts or src/app/work/projects
```

Magic Portfolio was built with [Once UI](https://once-ui.com) for [Next.js](https://nextjs.org). It requires Node.js v18.17+.

## Documentation

Docs available at: [docs.once-ui.com](https://docs.once-ui.com/docs/magic-portfolio/quick-start)

## Features

### Once UI
- All tokens, components & features of [Once UI](https://once-ui.com)

### SEO
- Automatic open-graph and X image generation with next/og
- Automatic schema and metadata generation based on the content file

### Design
- Responsive layout optimized for all screen sizes
- Timeless design without heavy animations and motion
- Endless customization options through [data attributes](https://once-ui.com/docs/theming)

### Content
- Render sections conditionally based on the content file
- Enable or disable pages for blog, work, gallery and about / CV
- Generate and display social links automatically
- Set up password protection for URLs

### Localization
- A localized, earlier version of Magic Portfolio is available with the next-intl library
- To use localization, switch to the 'i18n' branch

## Instagram visitor tracking

A private, first-party visitor tracker built into this site. It records every visitor, with a focus on people who come from Instagram (bio link, stories, posts, DMs), shows them in a password-protected dashboard at `/admin`, and emails alerts about Instagram visitors.

Instagram never tells a website who the visitor is. There is no username, age or gender, only what the browser and the Vercel request headers provide.

### 1. Set up the database (Neon, through Vercel)

1. In Vercel, open the project → **Storage** → **Create Database** → **Neon** (free plan) and connect it to all environments. Vercel adds `DATABASE_URL` for you.
2. Pull the variables to your machine and create the tables:

```
vercel env pull .env.local
npm run db:migrate
```

`npm run db:migrate` runs every file in `db/migrations` once, in order. It is safe to run again, and you run it again whenever a new migration file is added.

### 2. Environment variables

Add these in Vercel → Settings → Environment Variables (see `.env.example`), then redeploy.

| Variable | Needed | What it does |
|---|---|---|
| `DATABASE_URL` | Yes | Neon connection string (added by Vercel) |
| `ADMIN_PASSWORD` | Yes | Password for `/admin` |
| `ADMIN_SESSION_SECRET` | Recommended | Random text that signs the login cookie |
| `IP_HASH_SALT` | Yes | Random text for the IP fingerprint. Do not change it later |
| `CRON_SECRET` | Yes | Protects the scheduled jobs |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | Yes | Email sending, shared with the contact form |
| `ALERT_EMAIL_TO` | No | Where alerts go. Default `williampetersencop@gmail.com` |
| `SITE_URL` | No | Public address for links in emails. Detected automatically |
| `IPINFO_TOKEN` | No | Adds the visitor's internet provider (free token from ipinfo.io) |

Create random values with `openssl rand -base64 32`.

**Admin → Settings → System status** shows which of these are in place, and has a **Send test email** button.

### 3. Tagged Instagram links

Open **Admin → Link builder** and copy one link per place:

```
https://YOURDOMAIN/?utm_source=instagram&utm_medium=bio
https://YOURDOMAIN/?utm_source=instagram&utm_medium=story&utm_campaign=black-friday
https://YOURDOMAIN/?utm_source=instagram&utm_medium=post&utm_campaign=black-friday
https://YOURDOMAIN/?utm_source=instagram&utm_medium=dm
```

- `utm_medium` says where on Instagram the link was: `bio`, `story`, `post` or `dm`.
- `utm_campaign` is optional and lets you compare one story or post with another.
- Visitors without a tag are still recognised as Instagram visitors when they use the Instagram in-app browser or arrive with an Instagram referrer. Their placement shows as "Untagged".

The same page shows which link brought the most visitors and leads.

### 4. Emails

Only Instagram visitors cause emails. Each one can be switched off in **Admin → Settings**:

1. New Instagram visitor
2. Returning Instagram visitor
3. High interest (3+ pages, 2+ minutes, or a pricing page)
4. Contact form started but not sent
5. New lead, with the visitor's source and journey
6. Visit summary
7. Daily digest at 08:00 Copenhagen time

Limits that stop floods: one arrival email per visitor per 30 minutes, and at most 30 alert emails per hour in total. Both can be changed in Settings. Every email is logged under **Admin → Notifications**, with the reason it was sent.

**When the visit summary arrives.** A visit ends when the visitor closes the page (the summary follows about a minute later) or after 15 minutes without activity. On the Vercel Hobby plan a scheduled job can run only once a day, so the 15-minute check runs whenever anyone visits the site or you open the dashboard, plus once a day. A visit that was missed for more than 3 hours gets no separate email and appears in the daily digest instead.

For summaries that are always on time, let any free scheduler (for example cron-job.org) call this address every 5 minutes with the header `Authorization: Bearer <CRON_SECRET>`:

```
https://YOURDOMAIN/api/cron/session-summaries
```

### 5. Privacy (GDPR)

- A cookie banner asks first. Without consent only an anonymous visit is counted: no cookie, no IP address in any form, no details.
- After consent the tracker sets two first-party cookies (a visitor ID for a year, a visit ID for a few hours) and stores pages, clicks, device, approximate location, a shortened IP address (`85.191.xxx.xxx`) and a salted hash of the IP. The full IP address is never stored.
- Tracking data older than 90 days is deleted every day. The number of days is a setting.
- `/privacy` explains all of this to visitors and is linked in the footer.
- To delete one person's data on request, open the visitor in the dashboard and use **Delete all data**.

### 6. Good to know

- Your own visits are not recorded while you are logged in to `/admin` in the same browser. To test, use a private window or open a tagged link from the Instagram app.
- Bots and link previews are ignored.
- `/admin` is hidden from search engines (`noindex`, `robots.txt`) and is not in the sitemap.
- Scheduled jobs are defined in `vercel.json`. Functions run in Frankfurt (`fra1`), next to the database.

## Creators

Lorant One: [Threads](https://www.threads.net/@lorant.one) / [LinkedIn](https://www.linkedin.com/in/lorant-one/)

## Get involved

- Join the Design Engineers Club on [Discord](https://discord.com/invite/5EyAQ4eNdS) and share your project with us!
- Deployed your docs? Share it on the [Once UI Hub](https://once-ui.com/hub) too! We feature our favorite apps on our landing page.

## License

Distributed under the CC BY-NC 4.0 License.
- Attribution is required.
- Commercial usage is not allowed.
- You can extend the license to [Dopler CC](https://dopler.app/license) by purchasing a [Once UI Pro](https://once-ui.com/pricing) license.

See `LICENSE.txt` for more information.

## Deploy with Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fonce-ui-system%2Fmagic-portfolio&project-name=portfolio&repository-name=portfolio&redirect-url=https%3A%2F%2Fgithub.com%2Fonce-ui-system%2Fmagic-portfolio&demo-title=Magic%20Portfolio&demo-description=Showcase%20your%20designers%20or%20developer%20portfolio&demo-url=https%3A%2F%2Fdemo.magic-portfolio.com&demo-image=%2F%2Fraw.githubusercontent.com%2Fonce-ui-system%2Fmagic-portfolio%2Fmain%2Fpublic%2Fimages%2Fog%2Fhome.jpg)