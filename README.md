# Cambridge Battlecode Tournament Projection

Static Netlify site for the tournament simulator output.

The simulator can publish here from the private parent checkout:

```bash
TOURNAMENT_PUBLISH_REPO=public_tournament_site python tools/tournament_simulator.py
```

Netlify should use this repository with the publish directory set to the repo root.
