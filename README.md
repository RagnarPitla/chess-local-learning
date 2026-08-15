# chess-local-learning

An adaptive chess trainer that turns **your own games** into **your own lessons**.

Runs entirely on your machine. Stockfish 18 analyses every position in the browser via
WebAssembly, a pattern engine works out *why* each mistake happened, and a coach explains it in
plain English. No account, no upload, no build step.

---

## The problem this solves

Chess lessons teach **trees**: if they play X, you play Y. Opponents play **graphs**: anything.

The moment someone deviates from the line you memorised, the script breaks and you have no model
of the position left. Memorising deeper does not fix this, because the tree is infinite and your
opponent is not reading from it.

What actually transfers is:

- **Positional understanding** - why a move is good, not just which move it is
- **Pattern recognition** - pawn structures, loose pieces, overloaded defenders
- **Feedback on your specific mistakes**, not a generic curriculum

So this app never asks you to memorise a line. When theory ends, it tells you what changed and
which principle applies. When you blunder, it names the pattern and schedules it for review.

---

## The learning loop

```
   play a game (or import a PGN)
              |
              v
   Stockfish scores every position
              |
              v
   each mistake is tagged with a named pattern
   (hanging piece, allowed fork, overloaded defender, bad bishop, ...)
              |
              v
   the coach explains what you missed, in words
              |
              v
   drills are generated from your own blunders
              |
              v
   a weakness profile ranks what keeps costing you
   and Leitner spacing decides what comes back, and when
              |
              +--> repeat
```

The drills are positions **from your games**, not a generic puzzle set. You get the exact
position where you went wrong, and you have to find what you did not find at the time.

---

## Quick start

```bash
npm install
npm start
# open http://127.0.0.1:5173
```

That is the whole setup. No API key needed, no bundler, no database.

The first load pulls a roughly 7 MB WASM engine from your own server and caches it.

### Optional: an LLM coach

Everything works offline out of the box - the coach falls back to a rule based explainer built on
the same pattern library. If you want the explanations written by an LLM instead:

```bash
cp .env.example .env
# add ANTHROPIC_API_KEY=sk-ant-... (or an OpenAI compatible key)
npm start
```

The key stays server side. The browser only ever sends structured JSON (FEN, evaluations, pattern
tags) to your local `/api/coach` endpoint, which owns the prompts. The header pill tells you which
coach is live: `coach: llm` or `coach: offline rules`.

---

## What is in the app

| Tab | What it does |
| --- | --- |
| **Play** | Play Stockfish at a chosen Elo (1320-2850). Two stage hints: principles first, then the move. Live evaluation bar. |
| **Review** | Analyse the finished game, or paste a PGN from Lichess or Chess.com. Accuracy, average centipawn loss, every mistake with the reason and the better move. |
| **Drills** | Puzzles built from your own mistakes, ordered by what is due and what is costing you most. Optional themed puzzles from the Lichess API. |
| **Profile** | Your ranked weaknesses, how they trend over time, and a lesson generator for any pattern. |

### Deviation handling

When your opponent leaves the book, a panel appears that does **not** quote theory. It tells you
which opening you were in, what your side's plan was, what the position looks like now (material,
development, centre control, open files) and which principles to apply. That is the whole point:
when the tree ends, you fall back on understanding.

The panel is deliberately conservative - it only fires when the **opponent** leaves a reasonably
deep line, otherwise it would cry wolf every third move and you would stop reading it.

---

## Architecture

Zero build step. The server maps `node_modules` into the page and the browser loads ES modules
directly through an import map.

```
server.js              Node HTTP server. Static files, vendor mounts,
                       the coach proxy (prompts live here), profile and game storage.

public/js/
  engine.js            Stockfish UCI over a Web Worker, promise based, serialised queue
  analysis.js          evaluation maths: win %, accuracy, centipawn loss, classification
  patterns.js          the differentiator: SEE, hanging pieces, forks, pins, skewers,
                       overloaded defenders, pawn structure, bad bishops, king safety
  openings.js          plan based opening book: names, structures, plans, pawn breaks
  profile.js           weakness profile, EWMA severity, Leitner spaced repetition
  puzzles.js           drills from your games, queue ordering, answer grading
  coach.js             LLM coach with a full offline fallback
  board.js             cm-chessboard wrapper: markers, arrows, promotion
  app.js               the controller that wires it all together
```

**Why this shape**

- The logic modules take the engine as an **injected callback**, so the entire review pipeline is
  unit testable in Node without ever loading Stockfish.
- The same ES modules run in the browser and under `node --test` - the import map resolves bare
  specifiers in the browser, Node resolves them from `node_modules`.
- Analysis costs **N+1** engine calls for N moves, not 2N: the evaluation of a position already
  assumes best play, so the loss for a move is the difference between consecutive evaluations from
  the mover's point of view.
- Mistake severity uses **both** centipawn loss and win probability drop. A 120cp slip near
  equality is a blunder; the same 120cp in a won endgame is not.

### Pattern detection

Each mistake is explained by a real chess reason, not "the engine prefers". The core primitive is
a **static exchange evaluation** (SEE) that plays out the full capture sequence on a square, so a
defended knight is correctly seen as safe while a loose one is seen as lost.

On top of that: forks, pins and skewers along slider rays, defenders that are the sole defender of
two attacked pieces, isolated and doubled pawns, pawn islands, IQP structures, bishops buried
behind their own pawn chain, king shield and attacker counts, and opening principle checks
(development, centre, early queen, moving the same piece twice).

Every blunder is guaranteed to receive at least one tag, so nothing is left unexplained.

---

## Testing

```bash
npm test          # 50 unit tests over the pure logic, no browser, no engine
npm run test:e2e  # 25 end to end checks in real headless Chrome
npm run test:all
```

The end to end suite drives Chrome over the DevTools protocol with no automation dependency and
walks the whole loop: engine loads, board renders, play a move, get a reply, import a PGN, review
it, confirm the mistake is found and tagged, drills are generated, the coach explains, the profile
persists to the server, and the console is clean.

`npm run test:e2e -- --headful` to watch it happen.

The app exposes a small handle on `window.chessCoach` (`newGame`, `playSan`, `loadPgnGame`,
`runReview`, `state`) so you can drive it from the browser console. The end to end suite uses the
same handle rather than faking mouse drags.

---

## Data and privacy

Everything is local. Your profile lives in `localStorage` and mirrors to `data/profile.json`;
analysed games go to `data/games.json`. Both are gitignored. Delete the folder to reset, or use
**Export** and **Reset** on the Profile tab.

The only outbound calls are the ones you opt into: the LLM coach if you set a key, and the Lichess
puzzle API if you press "Fetch a themed puzzle".

---

## Engine builds

Ships with `stockfish-18-lite-single` (about 7 MB), which is single threaded and needs no
cross-origin isolation headers - so it just works on plain HTTP.

To use the multi threaded lite build, set `ENGINE_BUILD=stockfish-18-lite` in `.env`. The server
then sends the COOP and COEP headers that `SharedArrayBuffer` requires. The full 113 MB builds are
in `node_modules` if you want them, but they are not served by default.

---

## Licence

MIT for this project. Stockfish is GPL v3 and is used here as an unmodified runtime dependency
loaded from `node_modules`; see its own licence in `node_modules/stockfish`. chess.js is BSD-2,
cm-chessboard is MIT.
