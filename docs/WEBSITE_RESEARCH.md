# AETHERFALL 1.0.0 — Professional Game Website Research

Research conducted November 2026 by direct inspection of ten major game
publisher/developer websites. Findings below informed the redesign of the
official Aetherfall web portal. All Aetherfall design work is original; no
logos, artwork, copy, or code were taken from these sources.

## Sites Inspected

| # | Publisher | URL | Key Observations |
|---|-----------|-----|------------------|
| 1 | Riot Games | riotgames.com | Global slim "riotbar" above the site nav; accessibility jump-links ("Jump to Main Content"); bold condensed typography; character-forward key art; dedicated account bar. |
| 2 | Blizzard Entertainment | blizzard.com | Cinematic hero carousel (1600×720 banners) pairing each game logo lockup with 1–2 CTAs ("Play Now" / "Learn More"); Featured Games grid (card art + logo + genre + platform icons); clean dark theme with strong contrast. |
| 3 | Electronic Arts | ea.com | Media-gallery hero with key art + white logo + one-line description + single CTA; 1×1 pack-art game grid with genre tags; "Latest Updates" news rail with ISO dates. |
| 4 | Ubisoft | ubisoft.com | News-first carousel with relative time stamps ("2 weeks ago"); deep store catalog with discount badges; strong seasonal promotional banners; persistent Ubisoft Connect account entry. |
| 5 | Rockstar Games | rockstargames.com | Full-bleed cinematic hero, minimal chrome, subtle logo; "Newswire" dated article grid (one large feature + small cards); media downloads section; platform logos per game. |
| 6 | Epic Games | epicgames.com | Responsive carousel (separate desktop/mobile art); price + discount display; "Discover Something New" editorial grid; restrained dark palette. |
| 7 | Bungie | bungie.net | Extremely minimal, product-forward hero; ESRB rating badges adjacent to CTAs; careers section; explicit cookie/privacy consent bar. |
| 8 | CD PROJEKT RED | cdprojektred.com | Statement headline ("Passionate Creators of Story-Driven Role-Playing Games"); "Meet Us / Join Us" tiles; studio blog with dated, tagged posts and large thumbnails. |
| 9 | Bandai Namco | bandainamcoent.com | Featured games with punchy taglines and dual CTAs; Featured News rail with thumbnails; newsletter signup with explicit privacy consent; store cross-promotion. |
| 10 | Square Enix | square-enix-games.com | News-first homepage; editorial guides ("Which FINAL FANTASY game should I play first?"); behind-the-scenes interviews; consistent card-based article layout with cover images. |

## Cross-Industry Patterns Adopted for Aetherfall

1. **Navigation** — slim sticky top bar; brand lockup left; primary sections
   center; account + high-contrast Play Now CTA right. Every nav item resolves
   to a functional page. (Riot, Blizzard, EA)
2. **Cinematic hero** — full-viewport hero with game logo lockup, one-sentence
   promise, and no more than two primary CTAs. (Blizzard, Rockstar)
3. **Live service honesty** — server status shown from the real `/health`
   endpoint; the site never claims the realm is online when it is not.
   (Bungie/Blizzard status-page conventions)
4. **Featured content grid** — card grid with icon/art, tag, title, short
   description for features, classes, and world regions. (EA, Ubisoft)
5. **News & patch notes** — dated, versioned, most-recent-first; deep-linkable
   release cards. (Square Enix, Rockstar Newswire)
6. **Account experience** — register/login directly on the site; credentials
   flow straight into the global-realm client session. (Riot account bar,
   Ubisoft Connect)
7. **Support hub** — new-player guide, FAQ, system requirements, and a real
   bug-report path (GitHub Issues). (Blizzard Support conventions)
8. **Community page** — guilds, events calendar, social systems, live realm
   population. (FFXIV/Square Enix community conventions)
9. **Accessibility** — jump links, focus-visible outlines, reduced-motion
   support, contrast-safe text. (Riot, Ubisoft)
10. **Footer** — complete sitemap, legal/copyright, repository and deployment
    links. (All ten)
