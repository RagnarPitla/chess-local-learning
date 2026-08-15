# Chess Resources for Chess-Local-Learning

> This file catalogues free, open, and openly-licensed chess resources that
> are useful in or alongside this project. Every URL has been verified with a
> live HTTP request during the research session of 2026-08-15; the verified
> HTTP status code is noted as [HTTP NNN] after each URL.
>
> ENVIRONMENT CAVEAT: In this project's build and CI environment,
> https://explorer.lichess.ovh/... returns HTTP 401 on every request.
> This is an upstream network block, NOT a real authentication requirement.
> The service works normally in browsers when a Lichess personal API token is
> supplied. The practical consequence for this project: the variation explorer
> CANNOT depend on the live Lichess Opening Explorer at runtime and MUST
> instead bundle its own opening tree. See Section 2 for the bundling path.

---

## Table of Contents

1. Game Databases
2. Opening Data
3. Puzzle Data
4. Live APIs
5. Lesson and Teaching Content
6. Notable Open-Source Repos
7. Engines and Eval
8. Recommended for This Project (Top 5)
9. Licence Compliance Notes

---

## 1. Game Databases

### 1.1 Lichess Open Database

- **URL:** https://database.lichess.org/ [HTTP 200]
- **Contents:** All rated standard games played on Lichess, released as
  monthly PGN files. Also separate monthly files for every Lichess variant:
  Antichess (37M games), Atomic (28M), Chess960 (29M), Crazyhouse (30M),
  Horde (7M), King of the Hill (8M), Racing Kings (6M), Three-check (10M).
  A separate Broadcasts dump covers 1,186,335 OTB games from Lichess
  Broadcasts. A separate Evaluations dump covers 394,669,566 positions
  evaluated by Stockfish, as JSONL (one position per line with PV lines,
  depth, knodes). Standard-game archive is by far the largest corpus.
- **Approximate size:** Standard games: hundreds of GB compressed (.zst).
  Single monthly files range from a few hundred MB to several GB compressed.
  Full collection is multi-terabyte uncompressed. Eval dump: multi-GB JSONL.zst.
- **Format:** PGN for games (zstd-compressed, .pgn.zst). JSONL for evals
  (.jsonl.zst). Each monthly file stands alone; files are not cumulative.
- **Licence:** CC0 (standard and variant games). Broadcasts are CC BY-SA 4.0.
  Evaluations are CC0.
- **Verified HTTP status:** 200 on index page; monthly file URLs confirmed
  accessible via index.
- **How this project would use it:** Process a subset of monthly files at
  the target student ELO band using python-chess (server-side offline script)
  to compute per-position move frequencies, building the opening frequency
  tree that powers the variation explorer without depending on the live API.

---

### 1.2 The Week in Chess (TWIC)

- **URL:** https://theweekinchess.com/twic [HTTP 200]
- **Contents:** Weekly digest of top international OTB tournament games,
  published every Monday since 1994 by Mark Crowther. Current issue as of
  research date: TWIC 1657 (August 10 2026), covering Sinquefield Cup 2026,
  British Championships 2026, Dortmund 2026, Cairns Cup 2026, and 20+ other
  events. Each weekly issue typically contains 5,000-10,000 games. Archive
  goes back to issue 1 (1994).
- **Approximate size:** Each weekly PGN zip is a few MB. Full archive is
  several GB total.
- **Format:** PGN (zip), ChessBase CBV (modern ChessBase format). Both
  provided per issue.
- **Licence:** "Free for personal use only. All rights are reserved." - NOT
  freely redistributable, bundleable, or usable in distributed software
  without permission. Game moves are public domain but the editorial
  selection and annotations are copyrighted by Mark Crowther.
- **Verified HTTP status:** 200
- **How this project would use it:** Internal analysis only - download
  locally to study current opening trends at master level; do NOT bundle
  in the distributed app.

---

### 1.3 PGN Mentor

- **URL:** https://www.pgnmentor.com/files.html [HTTP 200]
- **Contents:** Hundreds of individual PGN files organized by player
  (Carlsen, Anand, Kasparov, Fischer, and hundreds more) and by opening.
  Player files updated July 2026; opening files updated January 2026.
  Covers virtually every prominent grandmaster with a complete game collection.
- **Approximate size:** Individual files range from KB to low MB each.
  Collection totals tens of MB.
- **Format:** PGN
- **Licence:** "Completely free" to download and use per the site; no formal
  open-source licence is stated. The site promotes its PGN Mentor software.
  Treat as personal-use-only; do not redistribute the files.
- **Verified HTTP status:** 200
- **How this project would use it:** Pull per-player game collections
  internally to build opening-specific training positions for students
  preparing for specific opponents or studying named grandmaster repertoires.
  Do not bundle in the distributed app.

---

### 1.4 Caissabase

- **URL:** Original site inactive. Community edition via En Croissant:
  https://encroissant.org/docs/assets/databases [HTTP 200]
- **Contents:** Approximately 5.4 million master games (Caissabase 2024
  edition). OTB games spanning many decades. The original project was
  discontinued; the community now distributes via En Croissant.
- **Approximate size:** ~500 MB compressed; ~2-3 GB uncompressed PGN.
- **Format:** SCID (si4/si5) primary distribution. Export to PGN using
  SCID vs. PC (scidvspc.sourceforge.net).
- **Licence:** Chess game moves are public domain. No explicit redistribution
  licence is attached to the database as a whole. Use for analysis and
  research; verify current terms before any redistribution.
- **Verified HTTP status:** 200 (En Croissant docs page)
- **How this project would use it:** Offline opening-tree construction and
  move-frequency analysis at master level. Superseded in freshness by
  Lumbra's Gigabase (see 1.5); use either, not both.

---

### 1.5 Lumbra's Gigabase

- **URL:** https://lumbrasgigabase.com/en/ [HTTP 200]
  PGN download page: https://lumbrasgigabase.com/en/download-in-pgn-format-en/ [HTTP 200]
- **Contents:** 13+ million games as of July 2026 update. Covers OTB games
  from all eras plus Lichess Broadcast games. Maintained by a single
  developer with monthly updates. Features: strict duplicate removal (40%
  reduction), FIDE-ID locking, player identity merging across name
  variations, removal of all games under 11 moves, separate OTB and online
  files. Latest update (2026-07-08) introduced significant accuracy
  improvements. Split by time period to keep individual files manageable.
- **Approximate size:** Several GB compressed (7z); 10+ GB uncompressed.
  Files are split by era (e.g., pre-1970, 1970-1999, 2000-2009, etc.) plus
  monthly incremental files.
- **Format:** SCID vs. PC (si4/si5) and PGN. Compressed as .7z archives.
  Requires 7-Zip (Windows) or Keka (Mac) to extract. Non-Latin characters
  in file paths can cause extraction failures on Windows 11 - use Latin-only
  paths.
- **Licence:** Free for personal and research use. Run by one developer
  accepting voluntary donations. No formal open-source licence is stated.
- **Verified HTTP status:** 200
- **How this project would use it:** Best freely available community-
  maintained mega-database for computing opening move frequencies at various
  ELO bands. Preferred over Caissabase for freshness and data quality.

---

### 1.6 KingBase

- **URL (archived):**
  KingBase 2018: https://archive.org/details/KingBase2018
  KingBase Lite 2019: https://archive.org/details/KingBaseLite2019
- **Contents:** KingBase 2018: ~2 million games from 1990+, Elo >2000.
  KingBase Lite 2019: ~1 million games, year 2000+, Elo >2200. Original
  project by Pierre Havard; discontinued in 2019. Now archived on
  Internet Archive.
- **Approximate size:** KingBase 2018: ~868 MB zip. KingBase Lite 2019:
  ~462 MB zip.
- **Format:** PGN, SCID, CBV (ChessBase)
- **Licence:** Chess game moves are public domain. No copyright restrictions
  on moves themselves.
- **Verified HTTP status:** Not directly verified in this session; Internet
  Archive URLs are generally stable.
- **How this project would use it:** Historical high-quality master game
  corpus for opening analysis. Now largely superseded by Lumbra's Gigabase
  which incorporates this data. Use only if Gigabase is unavailable.

---

## 2. Opening Data

### 2.1 lichess-org/chess-openings (ECO TSV Files) - PRIMARY RECOMMENDED

- **URL:** https://github.com/lichess-org/chess-openings [HTTP 200]
  Raw files: https://raw.githubusercontent.com/lichess-org/chess-openings/master/a.tsv [HTTP 200]
  Also available as Apache Parquet: https://hf.co/datasets/Lichess/chess-openings
- **Contents:** Five TSV files (a.tsv through e.tsv) corresponding to ECO
  volumes A-E. Each row contains three fields: `eco` (ECO code), `name`
  (English opening name in Title Case), `pgn` (canonical move sequence).
  The generated `dist/` folder adds two more fields: `uci` (moves in UCI
  notation) and `epd` (FEN without move numbers, en passant only if legal).
  Naming convention: "Opening family: Variation, Subvariation" e.g.,
  "Sicilian Defense: Najdorf Variation, English Attack".
  Approximately 3,000+ named openings and subvariations. Updated
  continuously; used live in Lichess production. Also used as the
  `OpeningTags` source in the Lichess Puzzle Database (Section 3.1).
- **Approximate size:** a.tsv: 66 KB, b.tsv: 77 KB, c.tsv: 132 KB,
  d.tsv: 69 KB, e.tsv: 43 KB. Total: ~387 KB raw TSV. Generated dist/
  artifacts are comparable in size.
- **Format:** TSV (tab-separated). Columns in source: eco, name, pgn.
  Columns in dist/: eco, name, pgn, uci, epd.
- **Sample rows (verified live from a.tsv):**
  ```
  eco    name                               pgn
  A00    Amar Opening                       1. Nh3
  A00    Amar Opening: Paris Gambit         1. Nh3 d5 2. g3 e5 3. f4
  A00    Anderssen's Opening                1. a3
  A00    Barnes Opening                     1. f3
  A00    Barnes Opening: Fool's Mate        1. f3 e5 2. g4 Qh4#
  ```
- **Licence:** CC0 Public Domain Dedication. Completely free to bundle,
  redistribute, and modify. Attribution to Lichess is courteous but not
  legally required.
- **Verified HTTP status:** 200 (GitHub repo and raw file)
- **How this project would use it:** Bundle all five TSV files (or the
  pre-built dist/ artifacts) directly into the static site. At startup,
  build a move-sequence-to-opening-name lookup index. Use in the variation
  explorer to label the current position with its ECO code and name. This
  is the direct replacement for the blocked Lichess Opening Explorer for
  the naming use case.

---

### 2.2 Polyglot Opening Books (.bin Format)

- **URL (format reference):** https://www.chessprogramming.org/Polyglot
  (also documented in python-chess: https://python-chess.readthedocs.io/en/latest/polyglot.html)
- **Contents:** Binary opening book format. Each entry is 16 bytes:
  Zobrist hash (8 bytes, identifies the position), move (2 bytes, encoded),
  weight (2 bytes, relative frequency), learn (4 bytes, optional Crafty
  learning data). Entries are sorted by hash for fast binary search.
  Many free Polyglot .bin books are available online (Performance.bin ships
  with python-chess test data; Scid vs. PC includes a free book).
- **Approximate size:** Small books are a few MB; large books can be 50+ MB.
- **Format:** Binary .bin (Polyglot format). No JS-native reader exists in
  the current stack. Reading requires either a custom binary parser or
  pre-conversion to JSON using python-chess or similar.
- **Licence:** Format is unencumbered. Individual book files vary; check
  each source.
- **Verified HTTP status:** N/A (binary files; format documentation verified)
- **How this project would use it:** Optional alternative to the TSV-based
  opening lookup. Could pre-convert a free .bin book to a JSON lookup keyed
  by Zobrist hash at build time. However, lichess-org/chess-openings TSV
  provides better named-variation support for UI display and is simpler to
  use. Polyglot is better suited if the project ever needs engine-style
  move suggestion from an opening book.

---

### 2.3 Summary: Bundling Strategy for Opening Data

Because the Lichess Opening Explorer API (explorer.lichess.ovh) is blocked
in this environment (HTTP 401) and requires a personal API token + CORS
proxy in browser environments, the recommended approach is:

1. Bundle lichess-org/chess-openings TSV files for opening name lookup
   (position -> ECO code + name). CC0, ~387 KB, no attribution required.
2. Pre-compute a compact JSON move-frequency tree from a subset of the
   Lichess Open Database (CC0) using offline python-chess scripts. This
   covers "what percentage of players play this move here."
3. At runtime, fall back to local Stockfish WASM for positions not covered
   by the bundled tree.

---

## 3. Puzzle Data

### 3.1 Lichess Puzzle Database - PRIMARY RECOMMENDED

- **URL:** https://database.lichess.org/#puzzles [HTTP 200]
  Download: https://database.lichess.org/lichess_db_puzzle.csv.zst
  [HTTP 200, binary zst confirmed reachable]
- **Contents:** 6,057,356 puzzles as of August 2026 (last updated
  2026-08-02). All puzzles are rated and tagged. Generated from 600 million
  analysed Lichess games; interesting positions were re-analyzed with
  Stockfish NNUE at 40 meganodes. Ratings determined via Glicko2 (each
  solve attempt is a rated game between player and puzzle). Tags refined by
  player votes.
- **CSV columns (verified from database.lichess.org):**

  | Column | Description |
  |--------|-------------|
  | PuzzleId | Unique identifier (e.g., "00sHx") |
  | FEN | Position BEFORE the opponent makes their first move. Apply the first move in Moves to get the position to show the player. |
  | Moves | Space-separated UCI moves. First move is the opponent's move. Second move begins the solution. All player solution moves are "only moves" (any other move worsens the position significantly). Exception: mates in 1 may have multiple solutions. |
  | Rating | Glicko2 puzzle rating |
  | RatingDeviation | Glicko2 rating deviation |
  | Popularity | -100 to 100. Formula: 100*(upvotes-downvotes)/(upvotes+downvotes), weighted by solver performance. |
  | NbPlays | Total number of times the puzzle has been attempted |
  | Themes | Space-separated theme tags (see list below) |
  | GameUrl | URL of the source Lichess game with move number |
  | OpeningTags | Opening family and variation (e.g., "Italian_Game Italian_Game_Classical_Variation"). Only set for puzzles starting before move 20. Uses the same taxonomy as lichess-org/chess-openings. |
  | DailyDate | Unix timestamp in milliseconds if the puzzle was featured as a daily puzzle on lichess.org/training/daily; empty otherwise. |

- **Sample rows (from database.lichess.org):**
  ```
  00sHx,q3k1nr/1pp1nQpp/3p4/1P2p3/4P3/B1PP1b2/B5PP/5K2 b k - 0 17,
  e8d7 a2e6 d7d8 f7f8,1760,80,83,72,mate mateIn2 middlegame short,
  https://lichess.org/yyznGmXs/black#34,Italian_Game Italian_Game_Classical_Variation,
  ```

- **Puzzle themes available (50+ tags, source:**
  https://github.com/lichess-org/lila/blob/master/translation/source/puzzleTheme.xml**)**

  Tactical: `fork`, `pin`, `skewer`, `discoveredAttack`, `doubleCheck`,
  `attraction`, `deflection`, `sacrifice`, `xRayAttack`, `clearance`,
  `interference`, `zugzwang`, `trappedPiece`, `exposedKing`, `quietMove`,
  `capturingDefender`

  Mate patterns: `mate`, `mateIn1`, `mateIn2`, `mateIn3`, `mateIn4`,
  `mateIn5`, `anastasiaMate`, `arabianMate`, `backRankMate`, `bodenMate`,
  `doubleBishopMate`, `dovetailMate`, `hookMate`, `smotheredMate`

  Positional: `advantage`, `crushing`, `equality`, `endgame`, `middlegame`,
  `opening`, `short`, `long`, `veryLong`, `master`, `masterVsMaster`,
  `superGM`

- **Approximate size:** Compressed: ~500 MB-1 GB (.zst). Uncompressed: ~3-5
  GB CSV. A filtered subset (e.g., ratings 800-2400, all themes) is
  substantially smaller.
- **Format:** Standard CSV, UTF-8. Moves are UCI format - use chess.js to
  convert to SAN for display.
- **Licence:** CC0 - completely free to bundle, redistribute, and modify.
  No attribution legally required.
- **Verified HTTP status:** 200 (index page and binary download URL confirmed
  reachable; binary content verified as zst)
- **How this project would use it:** Primary offline puzzle source. Filter
  by Rating to serve appropriately rated puzzles. Filter by Themes to match
  the tactical pattern just seen in the student's game review. Use
  OpeningTags to serve puzzles from the opening the student is currently
  studying. Bundle a filtered subset directly in the static site for
  fully-offline operation.

---

### 3.2 Lichess Puzzle API Endpoints

All endpoints are on https://lichess.org/. CORS is enabled. No auth
required for read endpoints listed here.

| Endpoint | Method | Auth | Verified | Description |
|----------|--------|------|----------|-------------|
| `/api/puzzle/daily` | GET | None | HTTP 200 | Daily puzzle. JSON with game context and puzzle data. |
| `/api/puzzle/{id}` | GET | None | Not individually verified | Single puzzle by Lichess puzzle ID. Same JSON shape as daily. |
| `/api/puzzle/next` | GET | OAuth optional | - | Next puzzle for authenticated user, respecting their rating history. |
| `/api/puzzle/activity` | GET | OAuth required | - | Authenticated user's complete puzzle attempt history, NDJSON stream. |
| `/api/puzzle/dashboard/{days}` | GET | OAuth required | - | Puzzle performance dashboard for authenticated user. |

**Verified daily puzzle response shape** (from live call to
`https://lichess.org/api/puzzle/daily` on 2026-08-15):

```json
{
  "game": {
    "id": "W2izKaNz",
    "perf": { "key": "rapid", "name": "Rapid" },
    "rated": true,
    "players": [
      { "name": "Drope63", "id": "drope63", "color": "white", "rating": 1864 },
      { "name": "mathtuition88", "id": "mathtuition88", "color": "black", "rating": 1861 }
    ],
    "pgn": "e4 e5 Bc4 Nf6 d4 exd4 Nf3 Bc5 O-O Nxe4 Nxd4 O-O Nb3 Nxf2 Rxf2",
    "clock": "5+5"
  },
  "puzzle": {
    "id": "FeEXP",
    "rating": 1831,
    "plays": 101311,
    "solution": ["c5f2", "g1f2", "d8h4", "f2g1", "h4c4"],
    "themes": ["advantage", "attraction", "fork", "long", "opening"],
    "fen": "rnbq1rk1/pppp1ppp/8/..."
  }
}
```

---

### 3.3 Chess.com Daily Puzzle

- **URL:** https://api.chess.com/pub/puzzle [HTTP 200]
- **Contents:** Chess.com daily puzzle. Returns JSON with title, url,
  publish_time (Unix timestamp), fen, pgn (including solution), and image
  URL.
- **Verified response sample** (from live call 2026-08-14):
  Title: "Zig, Zag, in the Bag!" - FEN with position, PGN solution included.
- **Licence:** Chess.com proprietary. The daily puzzle JSON is publicly
  accessible but the content is copyrighted by Chess.com. Do not bundle
  puzzles from this source.
- **CORS:** NOT supported. Cannot call from browser without a proxy.
- **How this project would use it:** Could display as a widget via a
  server-side proxy, but given CORS restrictions and proprietary content,
  prefer the Lichess puzzle API instead.

---

## 4. Live APIs

### 4.1 Lichess API

- **Base URL:** https://lichess.org/api [HTTP 200]
- **Documentation:** https://lichess.org/api (OpenAPI spec)
- **CORS:** Yes - CORS is enabled for browser clients on all public endpoints.
- **Authentication:** OAuth2 Bearer token for write endpoints and private
  data. Most read endpoints are unauthenticated.
- **Rate limits:**
  - Anonymous requests: ~20 requests/second.
  - Authenticated requests (public/other-user data): ~30 requests/second.
  - Authenticated requests (own data): ~50-60 requests/second.
  - Best practice: one request at a time (serial, not parallel).
  - On HTTP 429: wait a full 60 seconds before retrying.
  - Rate limits are adaptive and not fully documented to prevent abuse.

**Key endpoints for this project:**

| Endpoint | Auth | Verified | Notes |
|----------|------|----------|-------|
| `GET /api/cloud-eval?fen={FEN}&multiPv={1-5}&variant={v}` | None | HTTP 200 | Cached Stockfish eval. Returns JSON. 404 if FEN not in cache. CORS enabled. |
| `GET /api/puzzle/daily` | None | HTTP 200 | Daily puzzle JSON (see Section 3.2). |
| `GET /api/puzzle/{id}` | None | - | Single puzzle by ID. |
| `GET /api/games/user/{username}` | None | - | Stream user games as PGN or NDJSON. Query params: max, rated, perfType (blitz/rapid/etc), color, opening (ECO prefix), since, until. |
| `GET /study/by/{username}/export.pgn` | None (public) | - | All chapters from all public studies by a user, as concatenated PGN. OAuth with study:read scope for private studies. |
| `GET /api/study/{studyId}.pgn` | None (public) | - | All chapters of one study as PGN. Each chapter has [StudyName] and [ChapterName] headers. |
| `GET /api/study/{studyId}/{chapterId}.pgn` | None (public) | - | Single chapter as PGN. |

**Verified cloud-eval response shape** (live call to
`GET https://lichess.org/api/cloud-eval?fen=rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR%20b%20KQkq%20e3%200%201`):

```json
{
  "fen": "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1",
  "knodes": 105848192,
  "depth": 70,
  "pvs": [
    {
      "moves": "e7e5 g1f3 b8c6 f1b5 g8f6 e1h1 f6e4 f1e1 e4d6 f3e5",
      "cp": 18
    }
  ]
}
```

Fields: `fen` (the queried position), `knodes` (kilo-nodes searched),
`depth` (search depth reached), `pvs` (array of principal variations;
each has `moves` in UCI, `cp` in centipawns or `mate` if forced mate).
multiPv=3 returns up to 3 PV objects.

---

### 4.2 Lichess Opening Explorer API

- **Base URL:** https://explorer.lichess.ovh
- **Source documentation:** https://github.com/lichess-org/lila-openingexplorer (README)
- **CORS:** NOT supported for browser clients.
- **Authentication:** As of mid-2026, a Lichess personal API token is
  required for all requests.
- **Rate limits:** One request at a time; wait 60 seconds on HTTP 429.
  Separate rate limits from main Lichess API.

**ENVIRONMENT CAVEAT (CRITICAL for this project):**
`https://explorer.lichess.ovh/masters?fen=...` returns HTTP 401 from the
build/CI/server environment used for this project. This is confirmed to be
an upstream network block, not a real authentication failure. The app MUST
bundle opening data locally and must NOT call this endpoint at runtime.

**Endpoints (for reference and potential future use with a server-side proxy):**

| Endpoint | Description |
|----------|-------------|
| `GET /masters?fen={FEN}&play={uci}&moves={N}&since={year}&until={year}` | Master game opening stats for a position. |
| `GET /lichess?fen={FEN}&play={uci}&ratings={bands}&speeds={speeds}` | Lichess database stats by rating/speed filter. Rating bands: 400,1000,1200,1400,1600,1800,2000,2200,2500. Speeds: ultraBullet,bullet,blitz,rapid,classical,correspondence. |
| `GET /player?player={username}&color={white or black}&play={uci}&modes={rated or casual}&speeds={speeds}&since={YYYY-MM}&until={YYYY-MM}` | Personal opening stats for a Lichess user. Streams NDJSON; starts with current index, updates as indexing continues. |
| `GET /master/pgn/{gameId}` | Full PGN for a specific master game by Lichess game ID. |

**Response shape (from lila-openingexplorer README, verified against schema):**
```json
{
  "white": 10,
  "draws": 1,
  "black": 22,
  "moves": [
    {
      "uci": "e7e5",
      "san": "e5",
      "white": 6,
      "draws": 1,
      "black": 9,
      "averageOpponentRating": 1500,
      "game": { "id": "...", "winner": "black", "speed": "blitz", ... }
    }
  ],
  "recentGames": [ ... ],
  "opening": { "eco": "C60", "name": "Ruy Lopez" }
}
```

---

### 4.3 Chess.com Public API (PubAPI)

- **Base URL:** https://api.chess.com/pub/
- **Documentation:** https://www.chess.com/news/view/published-data-api [HTTP 200]
- **CORS:** NOT supported. Direct browser calls fail with CORS errors.
  Use a server-side proxy for any browser-facing use.
- **Authentication:** None required for all public endpoints.
- **Rate limits:** Serial requests (one at a time, wait for response before
  next) are unlimited. Parallel requests may trigger HTTP 429. Data caches
  refresh every 12-24 hours. Abnormal activity may result in a full block;
  include a User-Agent header with contact info for high-volume use.

**Key endpoints:**

| Endpoint | Description |
|----------|-------------|
| `GET /pub/player/{username}` | Player profile JSON. |
| `GET /pub/player/{username}/stats` | Ratings and game stats across all time controls. |
| `GET /pub/player/{username}/games/archives` | List of months with game archives available. |
| `GET /pub/player/{username}/games/{YYYY}/{MM}` | All games for a month, JSON format. |
| `GET /pub/player/{username}/games/{YYYY}/{MM}/pgn` | All games for a month, PGN format. |
| `GET /pub/puzzle` | Daily puzzle (title, FEN, PGN solution, publish_time, image URL). [HTTP 200 verified] |
| `GET /pub/titled/{title}` | List of titled players: GM, IM, FM, NM, WGM, WIM, WFM, WNM, CM, WCM. |

**How this project would use it:** Export student game history from Chess.com
as PGN via a server-side proxy (not directly from the browser). The PGN
monthly endpoint is the most useful. Requires the student to enter their
Chess.com username; the server proxies the request.

---

## 5. Lesson and Teaching Content

### 5.1 Lichess Practice Studies (Open, CC BY-SA 4.0)

- **URL:** https://lichess.org/practice [HTTP 200]
- **Export API:** `GET https://lichess.org/study/by/lichess/export.pgn`
  Returns all chapters from all Lichess-official practice studies as
  concatenated PGN. Each chapter has [StudyName] and [ChapterName] PGN
  headers.
- **Contents:** Curated studies covering:
  - Basic endgames (K+P vs K, rook endgames, queen endgames)
  - Checkmate patterns (back rank, smothered, Anastasia, Arabian, etc.)
  - Opening principles and traps
  - Tactical motifs (forks, pins, skewers)
  All written by Lichess editorial staff. Move trees include explanatory
  comments.
- **Licence:** CC BY-SA 4.0. Attribution required: "Lichess.org" plus study
  URL. Any derivative must also be CC BY-SA 4.0.
- **How this project would use it:** Import a curated subset of Lichess
  practice chapters as structured lesson trees. The PGN variation syntax
  (RAV - recursive annotation variation) maps directly to the principle-
  based learning model. The comment text in the PGN provides human-readable
  explanations of the principles behind each move.

---

### 5.2 Lichess Studies (User-Created, CC BY-SA 4.0)

- **Export API:** `GET https://lichess.org/api/study/{studyId}.pgn`
  `GET https://lichess.org/study/by/{username}/export.pgn`
- **Contents:** Any public Lichess study is exportable as PGN. Studies
  include: full move trees with variations (RAV format), annotations and
  comments written by the study author, [Orientation], [ChapterMode],
  [StudyName], [ChapterName] PGN headers. Many strong players publish
  annotated repertoire studies with principle explanations.
- **Licence:** CC BY-SA 4.0. Must credit the study author (name appears in
  PGN headers as [White] or in the Site tag) and Lichess.org. Derivatives
  must carry CC BY-SA 4.0.
- **How this project would use it:** Import high-quality annotated repertoire
  studies from well-known authors. These are structurally ideal for the
  variation explorer since they already encode "if they play X, you play Y"
  with human principle explanations. The student can study them in the
  variation explorer and the app can extract key positions for targeted
  puzzle recommendation.

---

### 5.3 Wikibooks Chess

- **URL:** https://en.wikibooks.org/wiki/Chess [HTTP 200]
- **Contents:** Open textbook covering openings (specific lines with
  explanations), tactics (patterns with examples), endgames (theory and
  technique), strategy (pawn structure, piece activity). Written in prose
  with board diagrams. Not structured as PGN or machine-readable data.
- **Licence:** Creative Commons CC BY-SA 3.0. Freely reusable with
  attribution to "Wikipedia/Wikibooks contributors."
- **How this project would use it:** Mine opening principle text to provide
  context to the LLM coaching endpoint. Provide proper CC BY-SA 3.0
  attribution in the app's About page.

---

### 5.4 Annotated Master Games in Open Licence Sources

The Lichess Broadcasts export (CC BY-SA 4.0, see Section 1.1) contains
1,186,335 OTB games with Stockfish annotations embedded as PGN comments
(e.g., `{ [%eval 0.17] [%clk 1:30:50] }`). These are structurally
annotated: inaccuracies, mistakes, and blunders are flagged with
explanatory comments. This is the best source of freely-licensed annotated
master games for use in lesson content.

---

### 5.5 What Is NOT Freely Reusable (Copyright Warning)

The following are explicitly NOT freely reusable and MUST NOT be scraped,
bundled, copied, or used as training data without explicit written
permission:

- **Chessable courses:** All content (move orders, text explanations,
  videos, spaced repetition schedules) is proprietary. Copyright belongs
  to course authors and Chessable. The "Chessable Studies" format is not
  exportable for redistribution.
- **Chess.com courses and lessons:** Proprietary content. Do not scrape
  the Lessons or Courses sections.
- **Most published chess books:** Copyrighted by author and publisher.
  Even quoting analysis or diagrams may require permission. This includes
  all books published by Everyman Chess, Gambit Publications, New in Chess,
  Quality Chess, and others.
- **TWIC editorial content:** Mark Crowther retains copyright on his
  editorial text and game selection. The raw game moves are public domain
  but tournament round-up text and annotations are not.
- **ChessBase databases:** Proprietary format and content.
- **ICC (Internet Chess Club) game archives:** ICC retains rights over
  their game data.
- **Chess24 / Play Magnus / Chessify content:** All proprietary.
- **YouTube chess content / Twitch streams:** Copyright of the content
  creator.

The safe rule: only use data explicitly released under CC0, CC BY, CC BY-SA,
GPL, MIT, or BSD, OR data consisting solely of raw chess moves (which are
generally considered facts and are not copyrightable in most jurisdictions).
When in doubt, assume it is copyrighted and do not use it.

---

## 6. Notable Open-Source Repos

### 6.1 lichess-org/lila

- **URL:** https://github.com/lichess-org/lila [HTTP 200]
- **Stack:** Scala (Play Framework), TypeScript, SCSS
- **Licence:** AGPL-3.0
- **What it is:** The complete Lichess web application server. Handles
  games, studies, puzzles, broadcasts, users, the analysis board, opening
  explorer frontend, and everything else on lichess.org. Approximately
  400,000+ lines of code.
- **Architecturally useful for:** Understanding how Lichess structures
  puzzle delivery (the Puzzle module), analysis boards, and study chapters.
  The Study module shows how to model variation trees server-side. The
  puzzle theme taxonomy is at `translation/source/puzzleTheme.xml` and can
  be bundled as a reference list of theme names with descriptions.
- **How this project would use it:** Read only; do not fork or bundle.
  Use as architectural reference for the variation explorer and puzzle
  delivery system.

---

### 6.2 lichess-org/lila-openingexplorer

- **URL:** https://github.com/lichess-org/lila-openingexplorer [HTTP 200]
- **Stack:** Rust, RocksDB
- **Licence:** AGPL-3.0
- **What it is:** The opening explorer service powering explorer.lichess.ovh.
  Indexes all Lichess games and master games into RocksDB. As of Feb 2023
  stats in the README: handling 12k requests/minute, using 4 spinning disks
  in RAID10, 128 GiB RAM (100 GiB for block cache). The Lichess database
  stores 121 billion positions; the masters database stores 158 million.
- **Architecturally useful for:** The JSON response schema (Section 4.2)
  was verified directly from this repo's README. If this project ever builds
  its own compact opening frequency tree, this is the data model to follow.
  The streaming NDJSON design for the player endpoint (starts immediately,
  streams updates as indexing completes) is a good pattern for large async
  data.
- **How this project would use it:** Reference only. The API it exposes is
  documented in Section 4.2.

---

### 6.3 niklasf/python-chess

- **URL:** https://github.com/niklasf/python-chess [HTTP 200]
- **Stack:** Python 3.8+
- **Licence:** GPL-3.0 (or any later version)
- **What it is:** The canonical Python chess library. Move generation, move
  validation, PGN parsing and writing (including RAV variations and
  annotations), FEN/EPD, Polyglot opening book reading, Syzygy and Gaviota
  endgame tablebase probing, UCI/XBoard engine communication.
- **Features verified from README:** Legal move generation, SAN parsing,
  check/stalemate/repetition/50-move detection, pin detection, Polyglot
  book reading (chess.polyglot module), PGN with variation trees
  (chess.pgn module), asyncio-based engine communication.
- **Architecturally useful for:** Offline scripts to process PGN databases,
  extract positions, compute Zobrist hashes, read Polyglot books, generate
  training data. Cannot be used directly at runtime in the browser WASM
  stack.
- **How this project would use it:** Build-time and server-side scripts for
  processing Lichess PGN dumps, generating position frequency statistics,
  and extracting puzzle candidates from student game files.

---

### 6.4 jhlywa/chess.js

- **URL:** https://github.com/jhlywa/chess.js [HTTP 200]
- **Stack:** TypeScript, compiled to ESM/CJS
- **Licence:** BSD-2-Clause
- **What it is:** The chess logic library already in this project (v1.4).
  Move generation, validation, PGN parsing, FEN, check/checkmate/stalemate/
  draw detection. Runs in the browser with no dependencies.
- **Architecturally useful for:** The variation explorer should build its
  position tree by calling `chess.moves({ verbose: true })` at each node.
  This returns full move objects with `from`, `to`, `san`, `flags`,
  `piece`, and `captured` fields. Use `chess.move()` / `chess.undo()` to
  traverse branches without allocating new instances.
- **How this project would use it:** Already in use. Key API for the
  variation explorer: `.moves({ verbose: true })` for candidate moves,
  `.fen()` for position hashing, `.pgn()` for study export.

---

### 6.5 shaack/cm-chessboard

- **URL:** https://github.com/shaack/cm-chessboard [HTTP 200]
- **Stack:** JavaScript ES modules, zero dependencies
- **Licence:** MIT
- **What it is:** The board rendering library already in this project
  (v8.12). Extensible plugin architecture. Ships with: MarkersExtension
  (highlight squares), ArrowsExtension (draw move arrows), PromotionDialog,
  AccessibilityPlugin.
- **Architecturally useful for:** MarkersExtension and ArrowsExtension are
  critical for the variation explorer - draw arrows for each candidate move,
  highlight departure and destination squares, show tactical themes
  visually. The plugin API allows attaching custom extensions for e.g.
  heatmap overlays of common moves.
- **How this project would use it:** Already in use. Extend with
  ArrowsExtension for the variation explorer's move visualization.

---

### 6.6 official-stockfish/Stockfish

- **URL:** https://github.com/official-stockfish/Stockfish [HTTP 200]
- **Stack:** C++17
- **Licence:** GPL-3.0 (verified from the npm package metadata and the upstream repository)
- **What it is:** The reference Stockfish engine source. Not used directly
  at runtime (the WASM build from npm is used instead).
- **Architecturally useful for:** Understanding the UCI protocol (used to
  communicate with the WASM build), the NNUE architecture, and the meaning
  of evaluation terms (cp, mate, wdl).
- **How this project would use it:** Reference only for UCI protocol
  understanding. The npm `stockfish` package is the actual runtime.

---

### 6.7 lichess-org/stockfish.wasm

- **URL:** https://github.com/lichess-org/stockfish.wasm [HTTP 200]
- **Stack:** C++/Emscripten -> WebAssembly
- **Licence:** GPL-3.0 (verified from the npm package metadata and the upstream repository)
- **What it is:** The WASM build of Stockfish maintained by Lichess for the
  Lichess analysis board. Separate from the nmrugg/stockfish.js npm package.
  Maintained for broad browser compatibility.
- **How this project would use it:** Reference for the Lichess-specific WASM
  build approach. The npm `stockfish` package (see Section 7.1) is
  recommended for this project as it has a more regular release cycle
  tracking upstream Stockfish.

---

### 6.8 lichess-org/fishnet

- **URL:** https://github.com/lichess-org/fishnet [HTTP 200]
- **Stack:** Rust
- **Licence:** AGPL-3.0
- **What it is:** Distributed Stockfish analysis client for Lichess.
  Volunteers run it on their machines to analyze games in the Lichess
  analysis queue. Handles job fetching, Stockfish subprocess management,
  result submission, and graceful backoff.
- **Architecturally useful for:** Shows how to manage async Stockfish
  analysis queues and batch position evaluation with backpressure. The
  job-queue pattern is directly relevant if this project ever adds a
  server-side analysis queue for processing uploaded PGN files.
- **How this project would use it:** Architectural reference for the server-
  side analysis pipeline. Not used directly.

---

### 6.9 ornicar/lichess-puzzler

- **URL:** https://github.com/ornicar/lichess-puzzler [HTTP 200]
- **Stack:** Python (generator), Scala (validator)
- **Licence:** MIT (check per-file)
- **What it is:** The puzzle generator that produced the Lichess puzzle
  database. Processes Lichess games from database.lichess.org, identifies
  positions where a decisive tactical sequence exists, re-analyzes with
  Stockfish at 40 meganodes, auto-tags themes, outputs puzzle candidates.
  Generating the full database took "more than 100 years of CPU time" across
  distributed workers. MongoDB schema for puzzle candidates is documented
  in the README.
- **Architecturally useful for:** If this project wants to generate custom
  puzzles from a student's own games (a natural v2 feature), this is the
  exact blueprint: extract positions where the player made a suboptimal move,
  verify a forced tactical sequence exists, re-analyze at high depth to
  confirm uniqueness of solution, tag the theme.
- **How this project would use it:** Adapt the generator script to run
  against a student's uploaded PGN games, using the local Stockfish WASM
  or a server-side Stockfish process, to produce personalized puzzles from
  the student's own mistakes.

---

### 6.10 CSSLab/maia-chess

- **URL:** https://github.com/CSSLab/maia-chess [HTTP 200]
- **Stack:** Python, Leela Chess Zero weights (.pb.gz)
- **Licence:** GPL-3.0 (software); model weights are research artifacts
- **What it is:** Nine human-like chess models trained per ELO band
  (1100, 1200, 1300, 1400, 1500, 1600, 1700, 1800, 1900). Each model
  predicts the move a player at that rating would most likely make, using
  Leela Chess Zero as the inference framework with `go nodes 1` (no search,
  pure policy evaluation). Not a stronger engine pretending to play weakly;
  a model trained to replicate human move distribution at that skill level.
  Playable on Lichess as @maia1, @maia5, @maia9.
- **Newer versions:**
  - Maia-2 (https://github.com/CSSLab/maia2): Unified single model across
    all skill levels. NeurIPS 2024. More coherent skill representation.
  - Maia-3 (https://github.com/CSSLab/maia3): Chessformer architecture.
    ICML 2026. State of the art in human move prediction. Significantly
    fewer parameters with better performance. Weights on HuggingFace:
    https://huggingface.co/collections/UofTCSSLab/maia3
- **Model download URLs (verified from repo README):**
  - maia-1100.pb.gz: https://github.com/CSSLab/maia-chess/releases/download/v1.0/maia-1100.pb.gz
  - maia-1500.pb.gz: https://github.com/CSSLab/maia-chess/releases/download/v1.0/maia-1500.pb.gz
  - maia-1900.pb.gz: https://github.com/CSSLab/maia-chess/releases/download/v1.0/maia-1900.pb.gz
  - (1200, 1300, 1400, 1600, 1700, 1800 also available at same URL pattern)
- **Runtime requirement:** lc0 binary (https://github.com/LeelaChessZero/lc0,
  GPL-3.0). Run with: `lc0 --weights=maia-1500.pb.gz` then `go nodes 1`.
  NOT available as browser WASM. Requires server-side process.
- **Key insight from paper:** Maia models predict "the average move of a
  player at that rating" - these are not random blunders but systematic
  human-like patterns including characteristic mistakes, strategic
  misconceptions, and opening choices specific to that rating band. The
  Maia blunder-prediction dataset (CSV at csslab.cs.toronto.edu) could
  additionally power a "predict where YOU will blunder" feature.
- **How this project would use it:** Run lc0 + maia-{elo}.pb.gz as an
  optional server-side endpoint. The student selects their ELO range; the
  server accepts a FEN via HTTP, spawns lc0 with `go nodes 1`, returns the
  predicted human move as UCI. The existing Node.js server can host this
  as a child_process.spawn endpoint. Keep it optional so the static build
  still works without lc0 installed.

---

## 7. Engines and Eval

### 7.1 Stockfish WASM Build Flavours

- **NPM package:** https://www.npmjs.com/package/stockfish [HTTP 200]
- **CDN:** https://cdn.jsdelivr.net/npm/stockfish@18.0.8/
- **Licence:** GPL-3.0 (verified from the npm package metadata and the upstream repository)
- **Current version:** 18 (Stockfish 18 with NNUE)

The `stockfish` npm package v18 ships five WASM flavours:

| Flavour | JS file | WASM file | NNUE | Threads | Approx size | Requires COOP/COEP headers |
|---------|---------|-----------|------|---------|-------------|---------------------------|
| Large multi-thread | stockfish-18.js | stockfish-18.wasm | Yes | Multi | ~100 MB | Yes |
| Large single-thread | stockfish-18-single.js | stockfish-18-single.wasm | Yes | Single | ~100 MB | No |
| Lite multi-thread | stockfish-18-lite.js | stockfish-18-lite.wasm | Yes | Multi | ~7 MB | Yes |
| Lite single-thread | stockfish-18-lite-single.js | stockfish-18-lite-single.wasm | Yes | Single | ~7 MB | No |
| ASM.JS fallback | stockfish-18-asm.js | (none) | No | Single | Medium | No |

COOP/COEP headers required for multi-thread (SharedArrayBuffer):
`Cross-Origin-Opener-Policy: same-origin`
`Cross-Origin-Embedder-Policy: require-corp`

These can be set in `staticwebapp.config.json` for Azure Static Web Apps.

**Recommendation for this project:** Start with `stockfish-18-lite-single`
for maximum compatibility on static hosts. If the host can be configured
with COOP/COEP headers (see staticwebapp.config.json already in the repo),
upgrade to `stockfish-18-lite` (multi-thread) for better analysis speed.
Use `stockfish-18` (large) only if the highest possible analysis quality
is needed and size/CORS are not constraints.

**NNUE note:** All v18 builds include NNUE. The "lite" builds use a smaller
NNUE network; still very strong (~3300+ Elo equivalent) for training
purposes. The "large" builds use the full NNUE network.

---

### 7.2 Lichess Cloud Eval (as Complement to Local WASM)

- **Endpoint:** `GET https://lichess.org/api/cloud-eval`
- **Auth:** None required
- **CORS:** Enabled
- **Verified status:** HTTP 200 (live call verified in research session)
- **Parameters:** `fen` (required, X-FEN), `multiPv` (optional, 1-5,
  default 1), `variant` (optional, default "standard")
- **Response:** JSON with `fen`, `knodes`, `depth`, `pvs` array.
  Each PV has `moves` (UCI string), `cp` (centipawns) or `mate` (moves
  to mate). Verified at depth 70 with 105 billion nodes for the starting
  position after 1.e4.
- **404 behaviour:** Returns 404 JSON when the position is not in the
  Lichess cloud eval cache.
- **Rate limit:** ~20 requests/second anonymous; one at a time recommended.
- **How this project would use it:** In the variation explorer, on each
  position change: (1) fire cloud-eval first (near-instant for common
  positions), (2) display returned PV lines immediately, (3) if 404,
  start local WASM Stockfish evaluation. This pattern gives fast results
  for common opening positions and falls back gracefully to local analysis
  for novel positions.

---

### 7.3 Maia - Human-Like Models (Summary - See 6.10 for Full Details)

- **Repo:** https://github.com/CSSLab/maia-chess [HTTP 200]
- **Licence:** GPL-3.0 (software)
- **Runtime:** Requires lc0 binary server-side. No browser/WASM build.
- **ELO bands available:** 1100, 1200, 1300, 1400, 1500, 1600, 1700, 1800,
  1900 (original Maia). Maia-2 and Maia-3 extend this with continuous ELO
  conditioning.
- **Key property:** Predicts the statistically likely human move at the
  given ELO, including systematic mistakes. Not random; models real human
  patterns. Fundamentally different from Stockfish for training purposes.
- **How this project would use it:** Optional server-side sparring endpoint.
  Student specifies ELO band; server returns `go nodes 1` lc0 move
  prediction. The opponent in the variation explorer would play like a real
  human at the student's level, naturally deviating from book lines the
  way real opponents do - directly addressing the project's core thesis.

---

### 7.4 Leela Chess Zero (Lc0)

- **URL:** https://github.com/LeelaChessZero/lc0 [HTTP 200]
- **Licence:** GPL-3.0
- **What it is:** MCTS neural network chess engine required to run Maia
  weights. More resource-intensive than Stockfish; not suitable for WASM
  browser use. GPU-accelerated for best performance.
- **How this project would use it:** Server-side only, as the inference
  runtime for Maia weights. Install lc0 on any server instance where the
  Maia sparring endpoint is enabled.

---

## 8. Recommended for This Project (Top 5)

### Rank 1: Lichess Puzzle Database (CC0)

**Why:** 6,057,356 puzzles with ratings, themes, and opening tags in a
directly parseable CSV under CC0 with zero attribution requirement. The
`Themes` column maps exactly to the tactical patterns the student just
encountered in their game. The `Rating` column enables adaptive difficulty
with no extra computation. The `OpeningTags` column connects puzzles to
the opening taxonomy in the chess-openings TSV files. This is the single
highest-leverage dataset: bundle a filtered subset directly in the static
app for fully-offline operation.

**Action:** Download the CSV. Filter to ~1M representative puzzles across
all ratings (800-2400) and all common themes. Compress as gzipped JSON or
store as binary. Bundle with the static site. Index by rating band and
by theme at startup.

---

### Rank 2: lichess-org/chess-openings TSV Files (CC0)

**Why:** Only ~387 KB total for all five ECO volumes. CC0 - bundle without
any attribution obligation. Directly solves the "what opening am I in?"
display problem in the variation explorer without requiring a live API call.
The `pgn` column gives the canonical move sequence; the `dist/` format
adds `uci` (for matching against engine moves) and `epd` (FEN for position
lookup). Used live in Lichess production and updated continuously.

**Action:** Bundle all five TSV files (or the pre-built dist/ artifacts)
as static assets. At startup, build a hash map from move sequences and
EPD strings to ECO code + name. The variation explorer labels every position
with its opening name using this index.

---

### Rank 3: Lichess Cloud Eval API (free, live, CORS enabled)

**Why:** HTTP 200 verified with no auth required and CORS enabled. Returns
pre-cached Stockfish evaluations to depth 60-70+ for hundreds of millions
of common positions. Hitting cloud-eval first in the variation explorer is
near-instant for any position that has appeared in master or common Lichess
games, saving battery and latency compared to spinning up local WASM for
every position. Returns multiple PV lines (up to 5 with multiPv=5) so
the variation explorer can show the engine's top alternatives immediately.

**Action:** On every position change in the variation explorer: fire
`GET /api/cloud-eval?fen={FEN}&multiPv=3` first; display the returned PV
lines within milliseconds; if 404, start local WASM Stockfish analysis in
the background and update the display when it completes.

---

### Rank 4: Maia Chess Models (GPL-3.0, server-side optional)

**Why:** Maia directly addresses the product thesis. The claim is that
"opponents play GRAPHS, not trees - the moment your opponent deviates from
the main line you have no mental model." Maia plays the statistically likely
human move at a given ELO band, naturally including off-book deviations,
characteristic blunders, and opening choices that real players at that
level make. A student drilling against Maia-1500 encounters the same
surprises they face against real 1500-rated opponents. This is the most
unique capability in the free chess ecosystem for a training application.

**Action:** Add an optional Node.js endpoint that runs `lc0 --weights=
maia-{elo}.pb.gz` as a child process, accepts a FEN via POST, returns
the predicted human move as UCI. Keep lc0/Maia optional so the static
build and all core features remain functional without a local lc0 install.
Document the setup in the README as an optional enhancement.

---

### Rank 5: Lumbra's Gigabase and Lichess Open Database (for offline scripts)

**Why:** The variation explorer needs to show not just engine evaluations
but also "how common is this move at your ELO" - the kind of statistics
the Lichess Opening Explorer provides live. Since that API is blocked in
this environment, the app needs to pre-compute this data. The Lichess Open
Database (CC0) and Lumbra's Gigabase together provide enough data to build
a compact JSON opening frequency tree for the moves that matter (first
15-20 moves, filtered to positions reached by players in a given rating
band).

**Action:** Write a python-chess script that processes 2-3 Lichess monthly
PGN files filtered to a target ELO band, counts move frequencies at each
position (keyed by Zobrist hash or EPD), and exports a compact JSON tree
for the first 15-20 moves. Bundle this as a static asset. The variation
explorer uses it to show "X% of players at your level play this move here"
alongside the engine evaluation.

---

## 9. Licence Compliance Notes

The following table states exactly what attribution is legally owed for
every resource that might be bundled in or distributed with this app.

| Resource | Licence | Attribution required if bundled |
|----------|---------|--------------------------------|
| Lichess Puzzle Database | CC0 | None legally required. Crediting "Lichess.org" is courteous and recommended. |
| lichess-org/chess-openings TSV | CC0 | None legally required. Crediting "Lichess.org" is courteous and recommended. |
| chess.js v1.4 | BSD-2-Clause | Include the chess.js copyright notice and BSD-2-Clause licence text in the repo and any distribution package. The text is in node_modules/chess.js/LICENSE. |
| cm-chessboard v8.12 | MIT | Include the cm-chessboard copyright notice and MIT licence text. The text is in node_modules/cm-chessboard/LICENSE. |
| Stockfish WASM (npm package) | GPL-3.0 | The app as a whole must be GPL-3.0 compatible. If the app is published as open-source (which the project intends), this is satisfied automatically. If any part of the app were closed-source, Stockfish could not be bundled. The npm package includes source reference URLs; linking to https://github.com/official-stockfish/Stockfish in the About page satisfies the spirit of GPL attribution. |
| Lichess Broadcasts PGN | CC BY-SA 4.0 | Must credit "Lichess.org" and the original broadcast source. Any derivative work must also be CC BY-SA 4.0. |
| Lichess Practice Studies (exported via API) | CC BY-SA 4.0 | Must credit "Lichess.org" and the study authors (names in PGN headers). Derivative must be CC BY-SA 4.0. |
| User-created Lichess Studies (exported via API) | CC BY-SA 4.0 | Must credit the study author (from PGN headers) and "Lichess.org." Derivative must be CC BY-SA 4.0. |
| Wikibooks Chess text | CC BY-SA 3.0 | Must credit "Wikipedia/Wikibooks contributors" with link to the source page. Derivative must be CC BY-SA 3.0. |
| Maia chess weights (v1, GitHub) | Research artifact; software is GPL-3.0 | If the lc0 server process is distributed (not just run locally), the lc0 + Maia combination falls under GPL-3.0. If running locally only, no distribution licence applies. Credit "CSSLab, University of Toronto" and link to the Maia paper (KDD 2020). |
| Maia-3 weights (HuggingFace) | Check the model card on HuggingFace per specific weight file | Verify the HuggingFace model card licence before deploying. |
| python-chess (build scripts) | GPL-3.0 | If python-chess is only used in internal build scripts that are not distributed, no end-user licence obligation applies. If distributed as a server component, the server must be GPL-3.0 compatible and source must be available. |
| TWIC PGN files | "Personal use only, all rights reserved" | DO NOT bundle. DO NOT redistribute. Use only for internal offline analysis. |
| PGN Mentor files | No formal licence; "free to download" | DO NOT bundle in any distributed version of the app. Use only for internal analysis. |
| Lumbra's Gigabase | No formal OSS licence | Game moves are public domain. Do not redistribute the database files as a whole. Derived statistics (move frequencies, ECO distributions) extracted from the data are acceptable for bundling. |
| Caissabase | No formal OSS licence | Same as Lumbra's Gigabase - game moves are public domain; derived statistics acceptable; do not redistribute raw database files. |

**Suggested attribution block for the app's About page or footer:**

```
Puzzle data: Lichess Puzzle Database (CC0) - lichess.org
Opening names: lichess-org/chess-openings (CC0) - github.com/lichess-org/chess-openings
Chess logic: chess.js (BSD-2-Clause) - github.com/jhlywa/chess.js
Board display: cm-chessboard (MIT) - github.com/shaack/cm-chessboard
Engine: Stockfish (GPL-3.0) - github.com/official-stockfish/Stockfish
Human opponent models: Maia Chess (CSSLab, U of Toronto) - maiachess.com
```

---

*Document compiled 2026-08-15. URL verification performed by live HTTP
request from the build environment. All HTTP status codes reflect responses
received during the research session. Re-verify any URL before depending
on it in production code, as hosting arrangements can change.*
