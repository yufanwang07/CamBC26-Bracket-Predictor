# Cambridge Battlecode Tournament Projection

Static Netlify site for the tournament simulator output.

The simulator can publish here from the private parent checkout:

```bash
TOURNAMENT_PUBLISH_REPO=public_tournament_site python tools/tournament_simulator.py
```

Or run the parent checkout's Python watcher to publish immediately and then every
10 minutes:

```bash
python tools/watch_tournament_site.py
```

Netlify should use this repository with the publish directory set to the repo root.

## Axionite market

The prediction-market prototype uses Netlify Functions and Netlify Blobs.

Set these Netlify environment variables before enabling Discord login:

- `DISCORD_CLIENT_ID`
- `DISCORD_CLIENT_SECRET`
- `SESSION_SECRET`
- `DISCORD_REDIRECT_URI` if you do not want the default `https://<site>/api/auth-callback`

In the Discord developer portal, add the callback URL:

```text
https://<your-netlify-site>/api/auth-callback
```

New accounts start with 100 unlocked Axionite and 900 locked Axionite. The
locked balance unlocks after the required 100 AX bet on the user's affiliated
or assigned team.
