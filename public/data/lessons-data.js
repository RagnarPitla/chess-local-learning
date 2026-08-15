// AUTO-GENERATED curriculum content for the adaptive chess trainer.
// Every FEN and answer move was constructed and verified with chess.js
// (legality, reachability, and, where a detector exists, agreement with
// public/js/patterns.js) by a one-off build script. Plain data, no logic.
export const LESSONS = [
  {
    "id": "fund-centre-control",
    "track": "fundamentals",
    "title": "Control the centre before anything else",
    "level": "beginner",
    "summary": "The four central squares decide how much space every piece gets. Occupy the centre with pawns when you can hold it, and challenge it with a pawn break when you cannot, because a piece with no influence on the centre is a piece playing on a smaller board.",
    "ideas": [
      "Aim to place a pawn on d4 or e4 (d5 or e5 as Black) in the first few moves, or plan a break that removes the opponent central pawn.",
      "A big pawn centre is only strong if it can be held; an unchallenged centre becomes commanding, so contest it before it grows.",
      "Pieces developed behind your own centre pawns usually get more squares than pieces developed on the wing."
    ],
    "patterns": [
      "centre-neglect"
    ],
    "openings": [],
    "positions": [
      {
        "fen": "rnbqk2r/pppp1ppp/4pn2/8/1bPPP3/2N5/PP3PPP/R1BQKBNR b KQkq - 0 4",
        "sideToMove": "b",
        "prompt": "White now has pawns on c4, d4 and e4, a full classical centre, while Black spent a move pinning a knight instead of staking a claim in the middle. Find the move that fights back in the centre right now.",
        "answer": "d5",
        "explanation": "d5 challenges the centre immediately, hitting both the c4 and e4 pawns at once. Waiting another move lets White simply finish developing behind a pawn wall that nobody has ever questioned."
      }
    ],
    "pitfalls": [
      "Developing pieces to good-looking squares while ignoring what is happening in the centre.",
      "Letting the opponent build a full pawn centre and only reacting once it is already supported by pieces.",
      "Pushing a wing pawn (a3, h3) instead of contesting the centre when nothing forces the wing move."
    ],
    "nextIds": [
      "fund-development",
      "open-italian"
    ]
  },
  {
    "id": "fund-development",
    "track": "fundamentals",
    "title": "Develop every minor piece before you attack",
    "level": "beginner",
    "summary": "Games are usually won by the side with more usable pieces in the fight. Bring knights and bishops toward the centre before starting any operation, because an attack backed by one piece is not really an attack, it is a gift of tempo to the opponent.",
    "ideas": [
      "Move a different piece every move in the opening unless a capture or a genuine threat forces otherwise.",
      "A lone attacking piece gets kicked around and loses time; do not start a piece attack until at least two or three pieces support it.",
      "Every move your queen or a lone piece spends chasing nothing is a move your opponent gets to develop for free."
    ],
    "patterns": [
      "undeveloped"
    ],
    "openings": [
      "Italian Game"
    ],
    "positions": [
      {
        "fen": "r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 3 3",
        "sideToMove": "b",
        "prompt": "White brought out a bishop and the queen and nothing else, aiming the queen at f7. Find the move that attacks the queen and permanently shuts the diagonal it is using.",
        "answer": "g6",
        "explanation": "g6 hits the queen on h5 and blocks the h5-f7 diagonal for good, so the queen has to retreat with nothing to show for three moves while Black is ready to develop the bishop to g7 next with a spare tempo in hand."
      }
    ],
    "pitfalls": [
      "Bringing the queen out early to create threats a fully developed opponent brushes aside for free tempo.",
      "Chasing a flashy attack with two pieces while the rest of the army stays on the back rank.",
      "Assuming a scary-looking threat is real without checking whether it is actually defended against."
    ],
    "nextIds": [
      "fund-king-safety",
      "fund-piece-twice"
    ]
  },
  {
    "id": "fund-king-safety",
    "track": "fundamentals",
    "title": "Get the king to safety before the position opens",
    "level": "beginner",
    "summary": "An uncastled king in an open position is a standing target even before any piece is actually attacking it. Castle as soon as it is safe, and once castled, keep the pawn shield in front of the king intact unless there is a concrete reason to move it.",
    "ideas": [
      "Castle once the king path is clear and no immediate tactic punishes it, usually by move 6 to 10 in an open game.",
      "An open central file or diagonal pointing at your king is a standing danger even if no piece is using it yet.",
      "Do not advance the pawns in front of a castled king to attack; that shield is exactly what keeps the king safe."
    ],
    "patterns": [
      "king-safety",
      "uncastled"
    ],
    "openings": [
      "Italian Game",
      "Ruy Lopez"
    ],
    "positions": [
      {
        "fen": "r1bqk2r/ppp2ppp/2n5/3n4/2BP4/5N2/PP1N1PPP/R2QK2R w KQkq - 0 10",
        "sideToMove": "w",
        "prompt": "The centre is completely open and both kings are still at home. It is White to move. Before looking for anything sharp, make the king safe.",
        "answer": "O-O",
        "explanation": "With every central pawn gone, a king still on e1 is one open file away from real trouble. Castling tucks it away on g1 and connects the rooks, and only after that does it make sense to look for something more ambitious."
      }
    ],
    "pitfalls": [
      "Delaying castling to \"keep options open\" while the position opens up around an exposed king.",
      "Castling into an attack that is already loaded up on that side, when the king would have been safer staying home a move longer.",
      "Weakening the pawn shield with moves like g4 or h4 to attack, without first checking what that costs in king safety."
    ],
    "nextIds": [
      "fund-piece-twice",
      "tac-back-rank"
    ]
  },
  {
    "id": "fund-piece-twice",
    "track": "fundamentals",
    "title": "Do not move the same piece twice in the opening",
    "level": "beginner",
    "summary": "Every extra move by a piece that has already developed is a tempo the opponent gets to develop for free. Only move a developed piece again if it wins material, meets a real threat, or completes a plan already in motion.",
    "ideas": [
      "Count tempi: if a piece has moved twice and the opponent has an extra piece out, that side is already behind in the race to develop.",
      "A piece that retreats or wanders without being attacked is simply losing time.",
      "If a developed piece has to move again, prefer a move that also creates a threat, so the tempo is not wasted twice over."
    ],
    "patterns": [
      "moved-piece-twice"
    ],
    "openings": [],
    "positions": [
      {
        "fen": "rnbqkb1r/pppppppp/5n2/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 3 2",
        "sideToMove": "b",
        "prompt": "White has spent two moves putting a knight back on its starting square. Take the free tempo and stake a claim in the centre.",
        "answer": "d5",
        "explanation": "White is down two whole tempi for nothing, so this is the moment to grab space and a development lead with a central pawn rather than anything fancy. That two-move gap will show up later as an extra developed piece for Black."
      }
    ],
    "pitfalls": [
      "Retreating a piece \"to be safe\" when it was never actually attacked.",
      "Chasing an opponent piece around the board with pawns and pieces, spending three moves to win a tempo worth one.",
      "Not noticing how far behind in development a few wasted moves have left you until it is already costly."
    ],
    "nextIds": [
      "fund-queen-early"
    ]
  },
  {
    "id": "fund-queen-early",
    "track": "fundamentals",
    "title": "Keep the queen home until the minor pieces are out",
    "level": "beginner",
    "summary": "A queen that comes out in the first few moves gets chased by pawns and minor pieces, and every chasing move is free development for the opponent. Bring the knights and bishops out first, then decide where the queen belongs.",
    "ideas": [
      "If the queen has moved once and the opponent has developed two pieces attacking it, that is not a strong attack, it is a costly detour.",
      "A queen sortie is fine when it wins something concrete right now; it is a mistake when it is only \"getting a piece into play\".",
      "Before moving the queen out, ask what happens if the opponent simply develops a piece with tempo against it."
    ],
    "patterns": [
      "early-queen"
    ],
    "openings": [
      "Petrov Defence"
    ],
    "positions": [
      {
        "fen": "r1bqkbnr/pppp1ppp/2n5/8/3QP3/5N2/PPP2PPP/RNB1KB1R b KQkq - 0 4",
        "sideToMove": "b",
        "prompt": "White has just recaptured the pawn on d4 with the queen. Before copying that instinct in your own games, find the reply.",
        "answer": "Nxd4",
        "explanation": "The knight on c6 was already attacking d4 before the queen ever went there, so recapturing with the queen simply hangs it. This is the everyday cost of bringing the queen out early: it lands on a square other pieces already contest, and it is the most expensive piece on the board to lose."
      }
    ],
    "pitfalls": [
      "Recapturing automatically with the queen without checking what else already attacks that square.",
      "Treating an early queen move as a threat when the opponent can simply develop a piece that attacks it back.",
      "Forgetting that a queen has no safe square to hide on if two minor pieces are already aiming at the centre."
    ],
    "nextIds": [
      "fund-out-of-book"
    ]
  },
  {
    "id": "fund-out-of-book",
    "track": "fundamentals",
    "title": "When the opponent leaves the book, stop memorising and start thinking",
    "level": "intermediate",
    "summary": "The moment a game leaves known theory is exactly where memorised lines run out and principles take over. Do not panic and do not guess a \"refutation\": run through centre, development, king safety and structure, then pick the most natural move that fits.",
    "ideas": [
      "An unfamiliar move is not automatically a strong one; most deviations from known theory are simply worse moves, not secret refutations.",
      "React to a surprising move with the same four questions every time: does it hang something, does it threaten something, does it help the centre, does it help development.",
      "If nothing forces a reply, keep developing and improving the position rather than reacting to a move that created no real threat."
    ],
    "patterns": [
      "panic-out-of-book"
    ],
    "openings": [
      "Italian Game"
    ],
    "positions": [
      {
        "fen": "rnbqkbnr/pppp1pp1/7p/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 3",
        "sideToMove": "w",
        "prompt": "Black second move threatens nothing and is not a line worth trying to recall. Answer the position on its own merits: what is the most principled move here?",
        "answer": "d4",
        "explanation": "h6 stops nothing that was actually happening and creates no threat, so there is no reason to react to it specifically. d4 fights for the centre exactly the way opening principles say to, and it already questions the undefended e5 pawn."
      }
    ],
    "pitfalls": [
      "Spending a long time trying to remember a \"punishment\" for a harmless move instead of just playing a good move.",
      "Assuming any move you have not seen before must be bad, and playing carelessly to \"punish\" it.",
      "Abandoning your own plan and development just because the opponent went quiet or unusual."
    ],
    "nextIds": [
      "fund-candidate-moves",
      "tac-hanging-pieces"
    ]
  },
  {
    "id": "fund-candidate-moves",
    "track": "fundamentals",
    "title": "Before you move, list every capture, check and threat",
    "level": "beginner",
    "summary": "Most missed wins and missed disasters share one root cause: only one move was considered. Before committing to a move, scan every capture, every check and every threat available to both sides, then choose from that short list rather than the first idea that came to mind.",
    "ideas": [
      "Checks, captures and threats are the first things to scan on every move, for both colours, because they change the position fastest.",
      "A quiet-looking position can still hide a forcing sequence; run the scan even when nothing looks urgent.",
      "If your first idea survives the scan, meaning it hangs nothing and meets the opponent threats, it is probably fine; without the scan you cannot know that."
    ],
    "patterns": [
      "missed-material"
    ],
    "openings": [
      "Petrov Defence"
    ],
    "positions": [
      {
        "fen": "4k3/ppp2ppp/8/8/7q/5N2/PPPP1PPP/4K3 w - - 0 1",
        "sideToMove": "w",
        "prompt": "It is White to move. Before playing whatever developing move you already had in mind, run the scan: check every capture on the board first.",
        "answer": "Nxh4",
        "explanation": "The queen wandered to h4, a square the knight already attacks, and nothing defends it. A quick scan of every check and capture finds this before any other plan; skipping that scan is exactly how free queens get missed."
      }
    ],
    "pitfalls": [
      "Playing the first reasonable-looking move without comparing it to the alternatives.",
      "Only scanning for threats against yourself and forgetting to scan for opportunities against the opponent.",
      "Missing a capture because it was not the piece you were already planning to move."
    ],
    "nextIds": [
      "tac-hanging-pieces",
      "tac-forks"
    ]
  },
  {
    "id": "tac-hanging-pieces",
    "track": "tactics",
    "title": "Take the piece nobody is watching",
    "level": "beginner",
    "summary": "A hanging piece is simply one attacked more times than it is defended. This is the single most common way games are decided below master level, in both directions, so scanning for it is worth more than any opening line.",
    "ideas": [
      "Count attackers and defenders on every piece, yours and theirs, whenever the position changes.",
      "A piece that just moved to a new square is exactly the piece most likely to have wandered into an attack, so check it first.",
      "If one of your own pieces is hanging, the fix is almost always to defend it or move it, not to counterattack and hope."
    ],
    "patterns": [
      "hanging-piece"
    ],
    "openings": [],
    "positions": [
      {
        "fen": "4k3/p7/5q2/8/8/5N2/P7/4K3 b - - 0 1",
        "sideToMove": "b",
        "prompt": "It is Black to move. White has a knight sitting on f3 with nothing behind it. What do you take?",
        "answer": "Qxf3",
        "explanation": "The knight on f3 is attacked by the queen and defended by nobody, so Qxf3 simply wins it. Nothing about this needs calculation, only the habit of counting attackers and defenders before moving on."
      },
      {
        "fen": "6k1/5ppp/p2p4/1B6/4P3/8/8/4K3 w - - 0 1",
        "sideToMove": "w",
        "prompt": "It is White to move. The bishop on b5 is attacked by the pawn on a6 and defended by nothing. Save it.",
        "answer": "Ba4",
        "explanation": "Ba4 is the only retreat that is not itself attacked by another black pawn. Losing a whole tempo to save a piece is completely normal once you notice it is hanging; the real lesson is noticing it before the pawn takes it, not after."
      }
    ],
    "pitfalls": [
      "Assuming a piece is safe because it was safe a few moves ago, without recounting after every exchange.",
      "Only scanning for the opponent hanging a piece and forgetting to check your own pieces just as often.",
      "Missing a hanging piece because it is a pawn or a minor piece rather than something more dramatic."
    ],
    "nextIds": [
      "tac-forks",
      "tac-pins"
    ]
  },
  {
    "id": "tac-forks",
    "track": "tactics",
    "title": "Hit two things at once",
    "level": "beginner",
    "summary": "A fork is one piece attacking two or more valuable targets at the same time, so the defender can only save one of them. Knights are the classic forking piece because their attack pattern is so different from a line piece, but pawns, bishops and queens fork too.",
    "ideas": [
      "Look for enemy pieces that share a knight jump, a diagonal or a rank or file, since those are the geometries a fork exploits.",
      "A forking square is worth reaching even with a quiet move; it does not have to be a capture or a check to be devastating.",
      "Before every move, ask whether it puts two of your own pieces on a shared knight-jump or line where the opponent has a piece that can land there."
    ],
    "patterns": [
      "allowed-fork",
      "missed-fork"
    ],
    "openings": [],
    "positions": [
      {
        "fen": "6k1/pq3rpp/8/5N2/8/8/PPP2PPP/6K1 w - - 0 1",
        "sideToMove": "w",
        "prompt": "It is White to move. Find the knight jump that hits the queen and the rook at the same time.",
        "answer": "Nd6",
        "explanation": "Nd6 attacks the queen on b7 and the rook on f7 in one move, and neither black piece can defend the other or capture the knight. Whichever one moves, the knight collects the other."
      },
      {
        "fen": "r3k3/pp3ppp/8/1N6/8/8/PPP2PPP/6K1 w - - 0 1",
        "sideToMove": "w",
        "prompt": "It is White to move. The king is still on e8 and a rook sits on a8. Find the knight move that forks both.",
        "answer": "Nc7+",
        "explanation": "Nc7+ forks the king and the rook on a8 with check, so Black has to deal with the check first and the rook is lost next move. A fork that comes with check is especially strong because the opponent has no choice about what to answer first."
      }
    ],
    "pitfalls": [
      "Spotting the fork but missing that the forking square is itself defended, so the combination loses material instead of winning it.",
      "Forking two pieces of low value while ignoring a bigger target that was also available.",
      "Walking two valuable pieces onto the same knight-jump or diagonal without checking whether the opponent has a piece that can reach it."
    ],
    "nextIds": [
      "tac-pins",
      "tac-skewers"
    ]
  },
  {
    "id": "tac-pins",
    "track": "tactics",
    "title": "Pin it, then win it",
    "level": "intermediate",
    "summary": "A pin means a piece cannot safely move because a more valuable piece, usually the king, stands behind it on the same line. A pinned piece is often as good as undefended, since capturing it cannot be answered normally.",
    "ideas": [
      "A piece pinned against its own king cannot legally move off the pinning line at all, so it defends nothing that requires it to move.",
      "Before relying on a piece to defend or block something, check whether it is pinned and therefore unable to do that job.",
      "Adding a second attacker onto a pinned piece is one of the most reliable ways to win material in the whole game."
    ],
    "patterns": [
      "allowed-pin",
      "missed-pin"
    ],
    "openings": [],
    "positions": [
      {
        "fen": "4k3/p4ppp/1pn5/1B1P4/8/8/P1P2PPP/4K3 w - - 0 1",
        "sideToMove": "w",
        "prompt": "It is White to move. The knight on c6 is pinned to the king on e8 by the bishop on b5. Take it.",
        "answer": "dxc6",
        "explanation": "The knight cannot capture back along the b5-e8 line without exposing its own king to check, and nothing else defends it, so dxc6 simply wins the piece. A pinned defender is not really defending anything."
      },
      {
        "fen": "4k3/ppp1rppp/8/3N4/8/8/PPP2PPP/4R1K1 w - - 0 1",
        "sideToMove": "w",
        "prompt": "It is White to move. The rook on e7 is pinned to the king by your own rook on e1. Cash in.",
        "answer": "Nxe7",
        "explanation": "The rook on e7 cannot capture the knight because that would leave the king in check along the e-file, so Nxe7 simply wins the exchange for nothing. Always check what a piece is pinned against before assuming it can recapture."
      }
    ],
    "pitfalls": [
      "Forgetting that a pinned piece still defends squares along the pinning line itself, even if it cannot move off it.",
      "Pinning a piece and then not following up with a second attacker, letting the opponent untangle for free.",
      "Confusing a pin against the king (absolute, the piece truly cannot move) with a pin against a piece of lesser value (relative, moving is legal but costly)."
    ],
    "nextIds": [
      "tac-skewers",
      "tac-removing-the-defender"
    ]
  },
  {
    "id": "tac-skewers",
    "track": "tactics",
    "title": "Skewer the valuable piece into the cheaper one",
    "level": "intermediate",
    "summary": "A skewer is a pin in reverse: the more valuable piece is in front and has to move, exposing a less valuable piece behind it on the same line. Checks make the best skewers because the front piece has no choice about moving.",
    "ideas": [
      "Look for the enemy king or queen lined up with a lesser piece behind it on a rank, file or diagonal.",
      "A checking skewer is close to forced, since the front piece has to get out of check right now.",
      "Even without check, attacking a valuable piece that has nowhere useful to go except off the line still wins the piece behind it."
    ],
    "patterns": [
      "allowed-pin",
      "missed-pin"
    ],
    "openings": [],
    "positions": [
      {
        "fen": "8/5ppp/8/4k2q/8/8/5PPP/R5K1 w - - 0 1",
        "sideToMove": "w",
        "prompt": "It is White to move. The king and queen share the fifth rank. Line the rook up behind them.",
        "answer": "Ra5+",
        "explanation": "Ra5+ forces the king to step off the rank, and once it moves the queen behind it on h5 has nothing shielding it any more, so the rook wins the queen next move. The check is what makes this forced rather than just annoying."
      },
      {
        "fen": "8/pp3ppp/8/4r3/8/2k5/P4PPP/2B3K1 w - - 0 1",
        "sideToMove": "w",
        "prompt": "It is White to move. The black king and rook sit on the same diagonal. Find the check that lines them up.",
        "answer": "Bb2+",
        "explanation": "Bb2+ checks the king on c3 along the same diagonal as the rook on e5. The king must move off the diagonal, and the rook behind it is then undefended on that line, so it falls next."
      }
    ],
    "pitfalls": [
      "Mixing up a pin and a skewer and therefore expecting the front piece to be stuck when it is actually forced to move.",
      "Delivering the skewering check without checking that your own attacking piece is not itself hanging on that square.",
      "Missing a skewer because the shared line is a diagonal rather than the more obvious rank or file."
    ],
    "nextIds": [
      "tac-discovered-attacks",
      "tac-removing-the-defender"
    ]
  },
  {
    "id": "tac-discovered-attacks",
    "track": "tactics",
    "title": "Move one piece, unleash another",
    "level": "intermediate",
    "summary": "A discovered attack happens when a piece moves out of the way of a friendly slider, so two things happen at once: whatever the moving piece does, plus whatever the unmasked line now hits. Discovered check is the sharpest version, since the king must answer it before anything else.",
    "ideas": [
      "Whenever one of your sliders is blocked by your own piece, check what that slider would hit if the blocker moved away.",
      "The piece that moves in a discovered attack is completely free to do its own business, capture, threaten or even do nothing at all, because the real blow comes from the unmasked piece.",
      "Discovered check is the most dangerous version, because the opponent must deal with the check before anything else, no matter what the moving piece just did."
    ],
    "patterns": [
      "missed-material"
    ],
    "openings": [],
    "positions": [
      {
        "fen": "3k4/pn3ppp/8/3B4/8/8/P4PPP/3R2K1 w - - 0 1",
        "sideToMove": "w",
        "prompt": "It is White to move. The bishop on d5 is standing in front of your own rook on the open d-file. Move it so it also wins something.",
        "answer": "Bxb7+",
        "explanation": "Bxb7+ grabs the knight for free, and moving the bishop off d5 also opens the d-file so the rook on d1 gives check to the king on d8 at the same time. The bishop was never the only piece doing something on that move."
      },
      {
        "fen": "7k/pp3p2/8/4R3/8/2B5/PP3PPP/6K1 w - - 0 1",
        "sideToMove": "w",
        "prompt": "It is White to move. The rook on e5 is blocking your own bishop on the long diagonal to h8. Move the rook so it also checks.",
        "answer": "Rh5+",
        "explanation": "Rh5+ checks the king along the h-file by itself, and stepping off e5 also opens the c3-h8 diagonal so the bishop checks the same king at the same time. Two different pieces, two different lines, one move: the king has no square that escapes both."
      }
    ],
    "pitfalls": [
      "Only looking at what the moving piece attacks and missing the bigger threat the move uncovers.",
      "Moving the blocking piece to a square where it gets captured, forgetting the whole point was the discovery, not that particular square.",
      "Failing to notice your own piece is blocking a friendly slider in the first place, since a blocked line looks like it is doing nothing."
    ],
    "nextIds": [
      "tac-overloaded-defenders",
      "tac-back-rank"
    ]
  },
  {
    "id": "tac-overloaded-defenders",
    "track": "tactics",
    "title": "Find the piece doing two jobs",
    "level": "intermediate",
    "summary": "An overloaded defender is the sole guard of two different things at once. Attack either one, and the defender cannot do both jobs: if it deals with the first, the second falls.",
    "ideas": [
      "Before relying on a piece for defence, ask what else it is already defending, since one piece guarding two things is a standing weakness.",
      "You do not have to win material on the very first capture; forcing the overloaded piece to choose is the whole point.",
      "Overloaded defenders are common on the back rank, where a single rook or queen is often asked to guard the king and a file at the same time."
    ],
    "patterns": [
      "overloaded-defender"
    ],
    "openings": [],
    "positions": [
      {
        "fen": "3q2k1/6pp/8/b2n4/8/8/5PPP/R2R2K1 w - - 0 1",
        "sideToMove": "w",
        "prompt": "It is White to move. The queen on d8 is the only piece guarding both the bishop on a5 and the knight on d5. Take one of them.",
        "answer": "Rxd5",
        "explanation": "Rxd5 wins the knight outright: recapturing with the queen costs more than it saves, since it abandons the bishop on a5 to the other rook next move. Either way the overloaded queen cannot save both pieces."
      },
      {
        "fen": "6k1/5ppp/2p5/1n1b4/8/8/5PPP/1R1R2K1 w - - 0 1",
        "sideToMove": "w",
        "prompt": "It is White to move. A single pawn on c6 is guarding both the knight on b5 and the bishop on d5. Take one.",
        "answer": "Rxb5",
        "explanation": "Rxb5 wins the knight, since the c6 pawn cannot recapture and also keep guarding the bishop on d5; the other rook collects that next. A single pawn can be just as overloaded as a piece."
      }
    ],
    "pitfalls": [
      "Capturing the wrong one of the two overloaded targets first and letting the defender save the more valuable piece.",
      "Missing that a pawn, not just a piece, can be an overloaded defender.",
      "Assuming a defended piece is safe without checking whether that defender is also needed somewhere else."
    ],
    "nextIds": [
      "tac-back-rank",
      "tac-deflection"
    ]
  },
  {
    "id": "tac-back-rank",
    "track": "tactics",
    "title": "Respect the back rank",
    "level": "beginner",
    "summary": "A king boxed in by its own pawns with no escape square is one open file away from being mated on the back rank. This is one of the few tactics that can decide a game in a single move even in a fairly quiet position.",
    "ideas": [
      "Once the queens and rooks are on the board, a king with no escape square is a standing danger even if nothing threatens it yet.",
      "A single rook pawn move (h3 for White, h6 for Black) buys a permanent escape square and is rarely a wasted tempo.",
      "A piece that looks like it guards the back rank is not really guarding it if it is undefended or can be removed for a good price."
    ],
    "patterns": [
      "back-rank"
    ],
    "openings": [],
    "positions": [
      {
        "fen": "6k1/5ppp/8/8/8/8/P7/K2R4 w - - 0 1",
        "sideToMove": "w",
        "prompt": "It is White to move. The black king has three pawns in front of it and no rook to help. Find the mate.",
        "answer": "Rd8#",
        "explanation": "Rd8 is checkmate: the king cannot step to f8 or h8 because both squares are covered by the rook once g8 is no longer in the way, and the pawns block every other square. This is the whole back rank pattern in its purest form."
      },
      {
        "fen": "4r1k1/5ppp/8/8/8/8/5PPP/R3R1K1 w - - 0 1",
        "sideToMove": "w",
        "prompt": "It is White to move. Black has a rook on e8 that looks like it guards the back rank. Check whether it actually does.",
        "answer": "Rxe8#",
        "explanation": "Rxe8 is mate: the rook on e8 was undefended, so simply taking it delivers the same fatal check as before. A piece sitting on the back rank is only a real guard if something protects it too."
      }
    ],
    "pitfalls": [
      "Delaying luft for one move too long because nothing looks urgent yet.",
      "Trading away the last rook that was covering an escape square without checking what that leaves behind.",
      "Assuming a rook or queen on the back rank is safely guarding it without checking if that piece is itself defended."
    ],
    "nextIds": [
      "tac-removing-the-defender",
      "tac-deflection"
    ]
  },
  {
    "id": "tac-removing-the-defender",
    "track": "tactics",
    "title": "Remove the piece that is in the way",
    "level": "intermediate",
    "summary": "Sometimes the only thing stopping you from winning a piece is a single defender. Trade that defender off, even for what looks like a fair price, and the piece it was guarding falls for nothing right after.",
    "ideas": [
      "Ask what would happen to a target if its only defender were simply gone, before looking for a way to attack the target directly.",
      "A defender does not have to be captured for free to be worth removing; an even trade that opens up a bigger prize is still a good deal.",
      "Check whether the defender itself is the sole guard of the target; if two pieces defend it, removing only one usually does not work."
    ],
    "patterns": [
      "missed-material",
      "hanging-piece"
    ],
    "openings": [],
    "positions": [
      {
        "fen": "6k1/1p3ppp/2n5/N3r3/6N1/8/8/6K1 w - - 0 1",
        "sideToMove": "w",
        "prompt": "It is White to move. The knight on c6 is the only thing guarding the rook on e5. Remove it.",
        "answer": "Nxc6",
        "explanation": "Nxc6 trades knights, and after the forced bxc6 the rook on e5 has lost its only defender, so the other knight collects it next move with Nxe5. An even trade up front pays for a whole rook a moment later."
      },
      {
        "fen": "6k1/p1q2ppp/4n3/8/6B1/8/P4PPP/2R3K1 w - - 0 1",
        "sideToMove": "w",
        "prompt": "It is White to move. The knight on e6 is the only thing guarding the queen on c7. Remove it.",
        "answer": "Bxe6",
        "explanation": "Bxe6 trades a bishop for the knight, and after the forced fxe6 the queen on c7 is no longer defended by anything, so Rxc7 wins it outright. Giving up a minor piece to win a queen is one of the best trades in the game."
      }
    ],
    "pitfalls": [
      "Removing a defender that turns out to be one of two, so the target is still protected afterward.",
      "Forgetting that the trade itself must be sound; giving up too much just to remove a cheap defender is not a good deal.",
      "Stopping calculation after the first capture and not following through on the piece that was actually the point."
    ],
    "nextIds": [
      "tac-deflection",
      "tac-trapped-pieces"
    ]
  },
  {
    "id": "tac-deflection",
    "track": "tactics",
    "title": "Lure the guard away from its post",
    "level": "advanced",
    "summary": "Deflection forces a defending piece off the square, file or diagonal it needs to guard, usually with a check or a bigger threat it cannot ignore. Once it is pulled away, whatever it was protecting is no longer protected.",
    "ideas": [
      "A check the defender is forced to answer is the most reliable deflection, since the reply is not optional.",
      "Look for a square the defender must move to that a second piece already covers, so capturing there loses the defender as well.",
      "Even a small, unglamorous attack like a pawn push can deflect a piece if every square it could go to stops defending something important."
    ],
    "patterns": [
      "missed-material",
      "overloaded-defender"
    ],
    "openings": [],
    "positions": [
      {
        "fen": "3q2k1/5ppp/8/8/B7/8/5PPP/4R1K1 w - - 0 1",
        "sideToMove": "w",
        "prompt": "It is White to move. The queen is the only piece that can deal with a rook landing on e8. Force it there.",
        "answer": "Re8+",
        "explanation": "Re8+ can only be answered by Qxe8, since the king has no escape square and nothing else reaches e8. That capture drags the queen onto a square the bishop on a4 already covers, so Bxe8 wins the queen for a rook."
      },
      {
        "fen": "6k1/5ppp/1r6/3n4/8/2P5/6PP/1R4K1 w - - 0 1",
        "sideToMove": "w",
        "prompt": "It is White to move. The knight on d5 is the only thing guarding the rook on b6. Attack the knight so it has to leave.",
        "answer": "c4",
        "explanation": "c4 attacks the knight with a pawn, and the knight cannot capture back and has no square that keeps an eye on b6. Wherever it goes, Rxb6 wins the rook next move. A cheap pawn move can deflect a piece just as well as a sacrifice."
      }
    ],
    "pitfalls": [
      "Deflecting a defender onto a square that turns out to be safe, so nothing is actually won.",
      "Sacrificing more material to force the deflection than the resulting combination wins back.",
      "Forgetting that the defender might have a third option, blocking rather than moving or capturing, that keeps the defence intact."
    ],
    "nextIds": [
      "tac-trapped-pieces",
      "pos-outposts"
    ]
  },
  {
    "id": "tac-trapped-pieces",
    "track": "tactics",
    "title": "Hunt down the piece with nowhere to go",
    "level": "intermediate",
    "summary": "A trapped piece is not necessarily attacked yet, but every square it could retreat to is covered, so it is only a matter of time before it is won for little or nothing. Wandering pieces, especially bishops and knights near the edge of the board, are the usual victims.",
    "ideas": [
      "Before sending a piece deep into enemy territory, count its retreat squares and check whether the opponent can cover all of them.",
      "A trapped piece does not have to be captured immediately; restricting its squares over a couple of moves is just as effective.",
      "Knights and bishops on the rim have fewer squares to begin with, which is exactly why they get trapped more often than central pieces."
    ],
    "patterns": [
      "trapped-piece"
    ],
    "openings": [],
    "positions": [
      {
        "fen": "6k1/6pp/p1p4p/1B6/8/8/5PPP/6K1 b - - 0 1",
        "sideToMove": "b",
        "prompt": "It is Black to move. The bishop on b5 wandered forward and every retreat square is covered by a pawn. Collect it.",
        "answer": "axb5",
        "explanation": "axb5 simply wins the bishop, which never had a safe way home once pawns on a6 and c6 boxed it in on both sides. This is what a trapped piece looks like at the end: by the time you can take it, the hard work of restricting it is already done."
      },
      {
        "fen": "6k1/1p3ppp/8/n7/8/2B5/5PPP/6K1 w - - 0 1",
        "sideToMove": "w",
        "prompt": "It is White to move. The knight on a5 has wandered to the edge of the board with no pawn cover. Take it.",
        "answer": "Bxa5",
        "explanation": "Bxa5 wins the knight outright: stuck on the rim with no square that both escapes and stays useful, it was only ever going to be a matter of time. Pieces on a-file and h-file squares have half the normal escape routes, which is why the corner is where wanderers get caught."
      }
    ],
    "pitfalls": [
      "Sending a piece on an adventure without first checking how it gets back if the position changes.",
      "Missing that a piece is trapped because it can still technically move somewhere, even though every square loses material.",
      "Rescuing a trapped piece with moves that cost more material than the piece is worth in the first place."
    ],
    "nextIds": [
      "pos-outposts",
      "pos-open-files"
    ]
  },
  {
    "id": "pos-iqp",
    "track": "positional",
    "title": "Play the isolated queen pawn from both sides",
    "level": "intermediate",
    "summary": "An isolated queen pawn (a d-pawn with no c-pawn or e-pawn to defend it) is a two-faced structure. The side who has it gets open lines, a half-open c-file or e-file and outposts in front of the pawn to develop with tempo. The side facing it wants to trade pieces, especially the pieces that could attack down the board, and blockade the pawn with a knight so it never gets to advance.",
    "ideas": [
      "With the IQP, keep queens and minor pieces on the board and aim your rooks at the half-open files either side of the pawn.",
      "Against the IQP, offer trades whenever you can, because every pair of pieces removed makes the pawn weaker and your blockade safer.",
      "A knight parked right in front of the isolated pawn is worth more than it looks, since the pawn can never push it away."
    ],
    "patterns": [
      "iqp"
    ],
    "openings": [
      "Queen's Gambit Declined",
      "Queen's Gambit Accepted"
    ],
    "positions": [
      {
        "fen": "6k1/pp2bppp/4pn2/8/3P4/3B1N2/PP3PPP/R5K1 w - - 0 1",
        "sideToMove": "w",
        "prompt": "It is White to move with an isolated pawn on d4. There is no plan yet for the pawn itself, so improve a piece. Which file belongs to White here?",
        "answer": "Rc1",
        "explanation": "Rc1 claims the c-file, the file next to the isolani that Black has no pawn left to contest. Because there is no c-pawn or e-pawn for White, the rook has nothing to do on the d-file directly, but the neighbouring open file is exactly where the extra activity that compensates for the IQP comes from."
      }
    ],
    "pitfalls": [
      "Trading down into an endgame with the IQP still on the board, since an isolated pawn that survives to an endgame is usually just a weakness with no compensation left.",
      "Forgetting to blockade the pawn when playing against it, and instead attacking it with pieces that a well-timed pawn push can chase away.",
      "Trading off your own good minor pieces while defending the IQP, leaving only the ones that cannot help it advance."
    ],
    "nextIds": [
      "pos-open-files",
      "open-qgd"
    ]
  },
  {
    "id": "pos-doubled-pawns",
    "track": "positional",
    "title": "Judge doubled pawns by what you get in return",
    "level": "beginner",
    "summary": "Doubled pawns cannot defend each other the way healthy pawns do, and they leave a permanent hole on the file next to them. That does not make them automatically bad. Accepting doubled pawns is a fair trade when it comes with the bishop pair, a half-open file for a rook, or faster development, but doubled pawns picked up for nothing are just a long-term weakness.",
    "ideas": [
      "Before a capture that doubles your own pawns, ask what you get for it: an open file, the bishop pair, or extra central control.",
      "Doubled pawns on a central file can still be useful for controlling squares, even though they are weak as targets.",
      "The file next to doubled pawns is usually half-open for the side with the doubled pawns, so put a rook there rather than leaving it passive."
    ],
    "patterns": [
      "doubled-pawns"
    ],
    "openings": [
      "Nimzo-Indian Defence"
    ],
    "positions": [
      {
        "fen": "6k1/pp3ppp/8/8/2P5/2P5/P4PPP/R5K1 w - - 0 1",
        "sideToMove": "w",
        "prompt": "It is White to move with doubled c-pawns. The a-file is not the one that matters here. Find the rook move that uses the structure.",
        "answer": "Rb1",
        "explanation": "Rb1 heads for the half-open b-file, the file that opened up next to the doubled c-pawns. This is the standard trade for doubled pawns: they look ugly, but the file behind them gives a rook a route into the game that would not otherwise exist."
      }
    ],
    "pitfalls": [
      "Taking with the wrong pawn out of habit and doubling your own structure for no compensation at all.",
      "Leaving the rook passive on its start square instead of using the half-open file the doubled pawns created.",
      "Panicking about doubled pawns that are actually useful, for example a doubled pawn that controls an important central square."
    ],
    "nextIds": [
      "pos-open-files",
      "open-nimzo-indian"
    ]
  },
  {
    "id": "pos-backward-pawns",
    "track": "positional",
    "title": "Spot the backward pawn and the hole in front of it",
    "level": "intermediate",
    "summary": "A pawn is backward when it has fallen behind the pawns next to it, cannot be defended by them any more, and cannot safely advance because the square in front of it is controlled by the opponent. The real damage is not the pawn itself, it is the square right in front of it, which becomes a permanent home for an enemy knight or rook that nothing can ever chase away with a pawn.",
    "ideas": [
      "A backward pawn is a long-term target, not something you have to win this move; keep pressure on it and it restricts the whole position.",
      "The square directly in front of a backward pawn is the real prize; a piece parked there cannot be evicted by a pawn advance ever again.",
      "Before letting your own pawn fall behind its neighbours, check whether the opponent already controls the square it would need to advance to."
    ],
    "patterns": [
      "isolated-pawn"
    ],
    "openings": [
      "Sicilian Defence",
      "Sicilian Najdorf"
    ],
    "positions": [
      {
        "fen": "6k1/pp3ppp/8/2p1pn2/4P3/2PP4/PP3PPP/6K1 b - - 0 1",
        "sideToMove": "b",
        "prompt": "It is Black to move. White's d-pawn is backward and can never safely reach d4 again. Plant a piece on the hole in front of it.",
        "answer": "Nd4",
        "explanation": "Nd4 takes the square that White can never contest with a pawn again, since the d-pawn is stuck behind its neighbours and c3 or e4 advancing would only create new weaknesses. Once a knight sits on the hole in front of a backward pawn, it is effectively immune to pawns for the rest of the game."
      }
    ],
    "pitfalls": [
      "Fixating on winning the backward pawn immediately instead of using the permanent outpost square it leaves behind.",
      "Advancing a pawn into a backward structure without first checking who controls the square in front of it.",
      "Trading off the pieces that were doing the restricting, letting the backward pawn finally get the support it needed to advance."
    ],
    "nextIds": [
      "pos-outposts",
      "open-sicilian-open"
    ]
  },
  {
    "id": "pos-passed-pawns",
    "track": "positional",
    "title": "Passed pawns decide endgames, so treat them like it",
    "level": "beginner",
    "summary": "A passed pawn has no enemy pawn on its own file or the two files next to it standing between it and promotion. That single fact makes it one of the most important features on the board, especially once queens and minor pieces start coming off. The classic rule for handling a passed pawn, yours or the opponent's, is to get a rook behind it: behind your own passed pawn to help it push, behind the opponent's to hold it back.",
    "ideas": [
      "A rook belongs behind a passed pawn, not in front of it, whichever side the pawn belongs to.",
      "A passed pawn does not have to run immediately; sometimes its biggest job is tying down enemy pieces to stop it.",
      "The further a passed pawn is advanced, the more it is worth, so race it forward once support pieces are in place."
    ],
    "patterns": [
      "passed-pawn"
    ],
    "openings": [],
    "positions": [
      {
        "fen": "r5k1/2pp1ppp/8/P7/8/8/5PPP/3R2K1 w - - 0 1",
        "sideToMove": "w",
        "prompt": "It is White to move with a passed a-pawn. The rook is doing nothing useful on the d-file. Put it where a passed pawn wants it.",
        "answer": "Ra1",
        "explanation": "Ra1 swings the rook behind its own passed pawn, the single most useful square for a rook when a passed pawn is on the board. From behind, the rook supports every step the pawn takes; from in front, it would only be in the way."
      }
    ],
    "pitfalls": [
      "Putting a rook in front of a passed pawn, where it blocks its own pawn instead of pushing it.",
      "Racing a passed pawn forward without checking that the enemy king or a piece can catch it first.",
      "Ignoring an opponent's passed pawn until it is several squares advanced instead of blockading it early."
    ],
    "nextIds": [
      "end-rook-behind-passed-pawn",
      "end-lucena-philidor"
    ]
  },
  {
    "id": "pos-bishops",
    "track": "positional",
    "title": "Tell a good bishop from a bad one",
    "level": "intermediate",
    "summary": "A bishop is only as good as the squares it can actually reach. When most of your own pawns sit on the same colour of square as your bishop, the bishop has nothing to bite on and spends the game watching its own pawns rather than attacking anything. The fix is either to put pawns on the opposite colour to the bishop you are keeping, or to trade the bad bishop off before it becomes a permanent passenger.",
    "ideas": [
      "Count how many of your own pawns sit on your bishop's colour; four or more and that bishop is in trouble.",
      "When you have a choice of which minor piece to trade, offer the bad bishop first and keep the piece that still has open diagonals.",
      "A bad bishop can become a good one later in the game if the pawns that block it get traded off, so it is not always a permanent problem."
    ],
    "patterns": [
      "bad-bishop"
    ],
    "openings": [
      "French Defence",
      "French Advance"
    ],
    "positions": [
      {
        "fen": "6k1/pp3ppp/8/8/8/P1P1P1P1/1P3P1P/2B3K1 w - - 0 1",
        "sideToMove": "w",
        "prompt": "It is White to move. Every single pawn sits on the same colour as the bishop on c1. Give it at least one useful square.",
        "answer": "Bd2",
        "explanation": "Bd2 is a modest move, but it is the honest one: with every pawn on its own colour, this bishop has no diagonal worth having yet, so the practical plan is to look for a trade or wait for pawns to move off that colour rather than pretending the bishop is doing real work where it stands."
      }
    ],
    "pitfalls": [
      "Keeping the bad bishop and trading the good one just because the good one looks more valuable in the moment.",
      "Blocking your own bishop further by pushing more pawns onto its colour later in the game.",
      "Assuming any bishop behind its own pawns is automatically bad, without checking how many pawns and which colour."
    ],
    "nextIds": [
      "pos-weak-squares",
      "open-french"
    ]
  },
  {
    "id": "pos-outposts",
    "track": "positional",
    "title": "Plant a knight where no pawn can ever kick it",
    "level": "intermediate",
    "summary": "An outpost is a square, usually in or near the centre, that the opponent can never attack with a pawn because the pawns that would do it are gone or can never get there safely. A knight parked on a real outpost is one of the strongest pieces on the board, because unlike almost every other piece it cannot be chased away by a pawn advance and the opponent must spend a piece just to trade it off.",
    "ideas": [
      "Before jumping a knight forward, check whether either enemy pawn that could ever attack that square still exists.",
      "A knight on an outpost supported by your own pawn is even stronger, since the opponent cannot remove the support either.",
      "Trading off the enemy piece that could challenge your outpost knight, for example the one minor piece that could reach that colour or file, makes the outpost permanent."
    ],
    "patterns": [],
    "openings": [
      "Nimzo-Indian Defence",
      "Sicilian Defence"
    ],
    "positions": [
      {
        "fen": "6k1/pp3ppp/3p4/8/5N2/8/PP3PPP/6K1 w - - 0 1",
        "sideToMove": "w",
        "prompt": "It is White to move. Black has no c-pawn or e-pawn left to ever challenge d5. Send the knight to its permanent home.",
        "answer": "Nd5",
        "explanation": "Nd5 lands on a square that Black can never attack with a pawn again, since both the pawns that would normally do that job, on c- and e-files, are gone. This is what makes an outpost different from an ordinary strong square: it is permanent, not just true for the moment."
      }
    ],
    "pitfalls": [
      "Calling any advanced knight an outpost, even when an enemy pawn can still advance and attack it later.",
      "Occupying the outpost square with the wrong piece, for example a bishop that a pawn could still block out with tempo.",
      "Forgetting to keep the pawn support behind an outpost knight, letting the opponent remove it with a piece trade instead."
    ],
    "nextIds": [
      "pos-open-files",
      "open-nimzo-indian"
    ]
  },
  {
    "id": "pos-open-files",
    "track": "positional",
    "title": "Own the open file, then use it",
    "level": "beginner",
    "summary": "An open file has no pawns of either colour on it; a half-open file has a pawn of only one side. Rooks and queens are the pieces that profit from files, so controlling one, especially the only open file on the board, is a real and lasting advantage. Owning the file is only step one though; the file is worthless until a rook uses it to invade the seventh or eighth rank or to double up for an attack.",
    "ideas": [
      "Identify the open and half-open files before deciding where your rooks belong; a rook on a closed file is doing very little.",
      "The seventh rank is the natural destination once you control a file, since rooks there attack pawns and cut off the enemy king.",
      "Doubling both rooks on the one open file is often stronger than splitting them across two files that are only half as useful."
    ],
    "patterns": [
      "doubled-pawns"
    ],
    "openings": [],
    "positions": [
      {
        "fen": "6k1/ppp1p1pp/8/8/8/8/PP3PPP/3R2K1 w - - 0 1",
        "sideToMove": "w",
        "prompt": "It is White to move. The d-file is completely open and the seventh rank is undefended. Use the file.",
        "answer": "Rd7",
        "explanation": "Rd7 is the reward for owning the only open file on the board: the rook marches straight down to the seventh rank, where it will attack pawns and box in the enemy king, all without a single piece able to stop it getting there."
      }
    ],
    "pitfalls": [
      "Controlling an open file but never actually advancing a rook down it, letting the advantage go to waste.",
      "Trading away the rook that was contesting an open file, handing the file over for nothing.",
      "Opening a file for the opponent by an unnecessary pawn trade when no rook is ready to use it."
    ],
    "nextIds": [
      "pos-space",
      "pos-outposts"
    ]
  },
  {
    "id": "pos-space",
    "track": "positional",
    "title": "Use extra space to cramp the opponent's pieces",
    "level": "intermediate",
    "summary": "Space is measured by how far your pawns have advanced and how many squares that takes away from the opponent. Extra space is not automatically winning, but it restricts where the opponent's pieces can go, especially their knights, and it usually means you have more room to manoeuvre while they are short of good squares. The natural follow-up to a space advantage is to keep expanding rather than to trade it away.",
    "ideas": [
      "A pawn chain further up the board takes squares away from the opponent on both sides of it, not just the one file it sits on.",
      "When you have more space, avoid piece trades that relieve the opponent's cramped position; when you are cramped, look to trade pieces off.",
      "Extra space is most useful when you also have the pieces to use the extra room; space with nothing to do with it can just become overextension."
    ],
    "patterns": [],
    "openings": [
      "French Advance",
      "King's Indian Defence"
    ],
    "positions": [
      {
        "fen": "6k1/p1p2ppp/8/4P3/2PP4/8/P5PP/6K1 w - - 0 1",
        "sideToMove": "w",
        "prompt": "It is White to move with a big pawn centre already cramping Black. Keep expanding rather than standing still.",
        "answer": "c5",
        "explanation": "c5 grabs even more space on the side of the board where Black has the least room to breathe. The pawns on d4 and e5 already take away central squares from Black's pieces; pushing again on the queenside keeps the whole position cramped rather than giving Black time to free it up with a pawn break."
      }
    ],
    "pitfalls": [
      "Sitting still with a space advantage instead of continuing to expand while the opponent is cramped.",
      "Trading off the pieces that benefit most from extra space, leaving only the ones that do not need the room.",
      "Overextending pawns so far that they become weak and easy to attack instead of just restricting the opponent."
    ],
    "nextIds": [
      "pos-outposts",
      "open-french"
    ]
  },
  {
    "id": "pos-weak-squares",
    "track": "positional",
    "title": "Recognise a permanent hole in the pawn cover",
    "level": "advanced",
    "summary": "A weak square complex happens when one side's pawns all sit on one colour, leaving every square of the other colour permanently short of pawn cover, especially near the king. Unlike most weaknesses, this one cannot be fixed by a single good move, since pawns cannot move sideways to cover a square of the wrong colour; the only real defence is keeping the matching bishop on the board.",
    "ideas": [
      "When a fianchetto pawn moves or its bishop is traded, check which squares around the king lost their only defender.",
      "A weak colour complex is permanent, so a piece that lands on one of those squares cannot be kicked out by a pawn, ever.",
      "The way to fight a weak square complex is to keep the bishop that covers those squares on the board for as long as possible."
    ],
    "patterns": [
      "bad-bishop"
    ],
    "openings": [
      "Sicilian Dragon",
      "King's Indian Defence"
    ],
    "positions": [
      {
        "fen": "6k1/5p1p/6p1/8/4N3/8/PP3PPP/6K1 w - - 0 1",
        "sideToMove": "w",
        "prompt": "It is White to move. Black's g-pawn has advanced and there is no dark-squared bishop left to cover the dark squares near the king. Exploit the hole.",
        "answer": "Nf6+",
        "explanation": "Nf6+ lands on a permanently weak dark square right next to the king, a hole that no black pawn can ever cover because the g-pawn has already moved and the dark-squared bishop is gone. This is what a weak square complex costs: not one lost pawn, but a permanent invitation for enemy pieces."
      }
    ],
    "pitfalls": [
      "Trading off the bishop that covers a colour complex without a clear plan for defending those squares some other way.",
      "Moving fianchetto pawns forward for a quick attack without weighing the permanent holes it leaves behind.",
      "Treating a weak square complex as fixable with a single move, when the real fix is long-term piece placement."
    ],
    "nextIds": [
      "pos-bishops",
      "open-sicilian-open"
    ]
  },
  {
    "id": "open-italian",
    "track": "openings",
    "title": "The Italian Game: aim the bishop, then break in the centre",
    "level": "beginner",
    "summary": "The Italian starts by pointing a bishop straight at the weakest square in Black's camp, f7, while claiming the centre with a pawn on e4. The actual plan behind the opening moves is simple: finish development, castle, then support d4 with c3 so the centre opens with your pieces already aimed at the kingside. None of that depends on Black replying with any particular move.",
    "ideas": [
      "Play c3 before d4 so that a later cxd4 keeps a pawn in the centre instead of trading it off for nothing.",
      "The bishop on c4 is not just development, it is aimed at f7, the square with only the king defending it.",
      "If Black's reply is unfamiliar, keep following the same plan: centre, development, king safety. The opening does not need a special answer for every sidestep."
    ],
    "patterns": [
      "panic-out-of-book"
    ],
    "openings": [
      "Italian Game"
    ],
    "positions": [
      {
        "fen": "r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4",
        "sideToMove": "w",
        "prompt": "Both sides have played the natural Italian moves. Prepare the central break that this whole setup exists for.",
        "answer": "c3",
        "explanation": "c3 supports a future d4, so that when the centre opens, White keeps a pawn there rather than just trading it away. This is the entire point of the Italian bishop development: get ready to open the centre with everything already pointed at the king."
      },
      {
        "fen": "r1bqkbnr/pppp1pp1/2n4p/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 4",
        "sideToMove": "w",
        "prompt": "Black played an unfamiliar move instead of developing. Do not look for a special punishment, just continue your own plan.",
        "answer": "c3",
        "explanation": "c3 is still the right move. Black's h6 did not contest the centre or develop a piece, so White simply continues preparing d4 exactly as planned. The Italian's plan was never conditional on Black cooperating with known theory."
      }
    ],
    "pitfalls": [
      "Rushing Ng5 and other tricks against f7 before finishing development, which usually just loses time if Black defends accurately.",
      "Forgetting to prepare d4 with c3 and instead drifting with random developing moves that give up the central idea.",
      "Freezing when the opponent's second or third move is unfamiliar, instead of just continuing with centre, development and king safety."
    ],
    "nextIds": [
      "open-ruy-lopez",
      "fund-out-of-book"
    ]
  },
  {
    "id": "open-ruy-lopez",
    "track": "openings",
    "title": "The Ruy Lopez: keep the pressure on e5 and c6",
    "level": "intermediate",
    "summary": "The Ruy Lopez pins the knight that defends e5 and quietly prepares to build a big centre with c3 and d4. The bishop on b5 does not have to capture on c6 right away, and often it retreats to a4 to keep the pin and the option of taking later. The plan survives whatever Black tries on move three, because the pressure on e5 and the central plan do not depend on Black's exact reply.",
    "ideas": [
      "Retreating the bishop to a4 after a6 keeps the pin on the knight alive instead of giving it up for nothing.",
      "The long-term plan is c3 and d4, building a full centre while the pin keeps e5 under pressure the whole time.",
      "Do not rush Bxc6; giving up the bishop pair for nothing more than doubled pawns is not automatically good, only take when it actually helps."
    ],
    "patterns": [
      "panic-out-of-book"
    ],
    "openings": [
      "Ruy Lopez"
    ],
    "positions": [
      {
        "fen": "r1bqkbnr/1ppp1ppp/p1n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 4",
        "sideToMove": "w",
        "prompt": "Black asked the question with a6. Keep the pin alive rather than resolving it immediately.",
        "answer": "Ba4",
        "explanation": "Ba4 keeps pinning the knight on c6 to the e5 pawn while staying safe from further harassment. The bishop is not trapped and not obligated to take on c6; it simply waits for the moment when capturing or retreating further actually helps the plan."
      },
      {
        "fen": "r1bqkbnr/pppp1pp1/2n4p/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 4",
        "sideToMove": "w",
        "prompt": "Black played h6 instead of the usual a6. The bishop still wants the same square.",
        "answer": "Ba4",
        "explanation": "Ba4 again. Whether Black plays a6, h6 or almost anything else on move three, the bishop still wants to keep the pin from a4 and White still wants c3 and d4 behind it. The plan was never about predicting Black's exact move."
      }
    ],
    "pitfalls": [
      "Trading the bishop on c6 automatically without checking whether the resulting structure and open file actually favour White.",
      "Forgetting to prepare c3 and d4, so the pin on the knight never turns into anything concrete.",
      "Treating an unfamiliar third move from Black as a crisis instead of just continuing with the same pin-and-centre plan."
    ],
    "nextIds": [
      "open-italian",
      "pos-doubled-pawns"
    ]
  },
  {
    "id": "open-sicilian-open",
    "track": "openings",
    "title": "The Open Sicilian: trade the d-pawn for time and centre",
    "level": "intermediate",
    "summary": "In the Open Sicilian, White trades the d-pawn for a full tempo and a knight planted in the centre on d4. From there the plan is simply to finish development quickly and use the extra activity while Black is still working out a plan on the queenside. The specific move order Black uses to get to a similar structure barely matters; the White side's job is the same regardless: develop fast and keep the extra central influence.",
    "ideas": [
      "The point of cxd4 followed by Nxd4 is not the pawn, it is time and a knight that dominates the centre from d4.",
      "Develop quickly and naturally after Nxd4; the side that finishes development first usually calls the tune in the middlegame.",
      "Black's exact move order into a Sicilian structure changes little for White's plan: get developed, keep the centralised knight, and look for the moment to expand."
    ],
    "patterns": [
      "panic-out-of-book"
    ],
    "openings": [
      "Sicilian Defence",
      "Sicilian Najdorf"
    ],
    "positions": [
      {
        "fen": "rnbqkb1r/pp2pppp/3p1n2/8/3NP3/8/PPP2PPP/RNBQKB1R w KQkq - 1 5",
        "sideToMove": "w",
        "prompt": "The Open Sicilian structure is on the board. Bring out the last undeveloped minor piece.",
        "answer": "Nc3",
        "explanation": "Nc3 completes development and adds a second piece toward the centre, exactly the follow-up the trade on d4 was played for. There is no special trick needed here, just the ordinary job of getting every piece into the game."
      },
      {
        "fen": "rnbqkbnr/pp2ppp1/3p3p/8/3NP3/8/PPP2PPP/RNBQKB1R w KQkq - 0 5",
        "sideToMove": "w",
        "prompt": "Black played an unusual move instead of the normal continuation. Keep developing as if nothing changed.",
        "answer": "Nc3",
        "explanation": "Nc3 again. Whatever Black's seventh move looks like, White's job is unchanged: finish development and keep the extra central activity that the whole line was designed to create."
      }
    ],
    "pitfalls": [
      "Chasing the extra central pawn back immediately with awkward moves instead of accepting the trade and developing.",
      "Delaying Nc3 or Be2/Be3 to try something fancy before the pieces are actually out.",
      "Treating any Black move that is not from a memorised line as a reason to abandon fast development."
    ],
    "nextIds": [
      "open-sicilian-closed",
      "pos-outposts"
    ]
  },
  {
    "id": "open-sicilian-closed",
    "track": "openings",
    "title": "The Closed Sicilian: fianchetto, then storm the kingside",
    "level": "intermediate",
    "summary": "The Closed Sicilian avoids the early trade on d4 altogether. Instead White fianchettoes the king bishop, keeps the centre flexible with d3, and prepares a slow kingside pawn storm with f4 and later g4/f5. The setup does not depend on Black's exact reply either, because the fianchetto and eventual f4 push are useful against almost any normal Black setup.",
    "ideas": [
      "The bishop on g2 supports the centre and the long diagonal no matter what Black is doing on the other side of the board.",
      "f4 is the key freeing and attacking move, opening lines toward Black's king once development is complete.",
      "Keep d3 flexible for a while rather than committing the centre early; the pawn storm on the other wing is the real plan."
    ],
    "patterns": [
      "panic-out-of-book"
    ],
    "openings": [
      "Closed Sicilian"
    ],
    "positions": [
      {
        "fen": "r1bqk1nr/pp2ppbp/2np2p1/2p5/4P3/2NP2P1/PPP2PBP/R1BQK1NR w KQkq - 0 6",
        "sideToMove": "w",
        "prompt": "The Closed Sicilian setup is complete on both sides. Start the plan the fianchetto was built for.",
        "answer": "f4",
        "explanation": "f4 begins the kingside expansion that is the whole point of the Closed Sicilian. The bishop on g2 and the flexible centre on d3 were preparation; this pawn is where the actual plan starts."
      },
      {
        "fen": "rnbqkbnr/pp1p1ppp/4p3/2p5/4P3/2N5/PPPP1PPP/R1BQKBNR w KQkq - 0 3",
        "sideToMove": "w",
        "prompt": "Black chose a different Sicilian setup instead of the usual Nc6/g6 plan. Continue with the same fianchetto scheme regardless.",
        "answer": "g3",
        "explanation": "g3 still prepares the same bishop development. The Closed Sicilian plan, fianchetto followed by a kingside pawn storm, works against most ordinary Black setups, not just the specific one shown in a single memorised line."
      }
    ],
    "pitfalls": [
      "Rushing f4 before the king is safely castled and the bishop is developed, leaving the king exposed on the same wing as the attack.",
      "Committing the centre early with d4 and accidentally transposing into a structure the Closed Sicilian was chosen to avoid.",
      "Abandoning the fianchetto plan just because Black's setup looks a little different from the most common version."
    ],
    "nextIds": [
      "open-sicilian-alapin",
      "pos-space"
    ]
  },
  {
    "id": "open-sicilian-alapin",
    "track": "openings",
    "title": "The Alapin Sicilian: meet 2.c3 by hitting the centre",
    "level": "beginner",
    "summary": "Against 2.c3, White is preparing d4 to build a full classical centre, and the pawn on c3 has taken away the c3 square from White's own knight. Black's cleanest reply is simply to strike the centre immediately with d5 before White gets to build it unopposed. This single principle, hit the centre while it is still just one pawn, answers almost every way White might try to set the position up.",
    "ideas": [
      "d5 right away is the most direct answer to c3, contesting the centre before White's extra pawn move pays off.",
      "Because c3 blocks White's own knight from its natural square, White's development is a little slower than usual, which is exactly when a central strike works best.",
      "If White meets the central strike with e5, remember the space gained is temporary if Black keeps developing and prepares a later break of the pawn chain."
    ],
    "patterns": [
      "panic-out-of-book"
    ],
    "openings": [
      "Alapin Sicilian"
    ],
    "positions": [
      {
        "fen": "rnbqkbnr/pp1ppppp/8/2p5/4P3/2P5/PP1P1PPP/RNBQKBNR b KQkq - 0 2",
        "sideToMove": "b",
        "prompt": "White played the Alapin move c3, preparing d4. Hit the centre before that plan is finished.",
        "answer": "d5",
        "explanation": "d5 challenges the centre immediately, while White has only made pawn moves and the knight cannot use c3. This is the entire idea behind meeting the Alapin: do not let White complete the plan unopposed."
      },
      {
        "fen": "rnbqkb1r/pp1ppppp/5n2/2p5/4P3/2P5/PP1P1PPP/RNBQKBNR w KQkq - 1 3",
        "sideToMove": "w",
        "prompt": "Black tried a piece move instead of the immediate central strike. Take the natural space-gaining reply.",
        "answer": "e5",
        "explanation": "e5 gains space and kicks the knight, the standard reply once Black allows it. This still fits the same underlying idea from White's side: build the centre while it is available, rather than needing a special response to every Black try."
      }
    ],
    "pitfalls": [
      "Playing a slow developing move instead of striking the centre, letting White finish the plan that c3 and d4 were building toward.",
      "Forgetting that c3 costs White's knight its best square, and failing to take advantage of the resulting slower development.",
      "Panicking about the space White gains after e5 instead of continuing to develop and preparing a later pawn break."
    ],
    "nextIds": [
      "open-sicilian-open",
      "open-caro-kann"
    ]
  },
  {
    "id": "open-french",
    "track": "openings",
    "title": "The French Defence: solid now, break out later",
    "level": "intermediate",
    "summary": "The French gives Black a solid pawn chain and a safe king in exchange for a bishop, the one on c8, that is temporarily short of good squares. The plan for White is usually to grab space with e5 and attack the resulting cramped position, while Black's plan is to strike back at the base of White's chain with c5 or f6 once development allows it. The exact move Black uses to develop before that break barely changes White's plan.",
    "ideas": [
      "e5 is the natural response to a pin or extra development from Black, claiming space and fixing the structure White wants.",
      "The pawn chain d4-e5 restricts Black, but it also gives Black a clear target: undermine it with c5 and f6 rather than trying to go around it.",
      "Black's light-squared bishop is the long-term problem piece in most French structures; either free it with a well-timed trade or accept it will do less work for a while."
    ],
    "patterns": [
      "panic-out-of-book"
    ],
    "openings": [
      "French Defence",
      "French Advance"
    ],
    "positions": [
      {
        "fen": "rnbqk1nr/ppp2ppp/4p3/3p4/1b1PP3/2N5/PPP2PPP/R1BQKBNR w KQkq - 2 4",
        "sideToMove": "w",
        "prompt": "Black pinned the knight instead of developing normally. Grab the space the French structure is built around.",
        "answer": "e5",
        "explanation": "e5 locks the centre and gains space regardless of the pin, since the knight was not going anywhere important this move anyway. This is the standard response to most Black tries here: claim the space now and deal with the pin later."
      },
      {
        "fen": "rnbqkb1r/ppp2ppp/4pn2/3p4/3PP3/2N5/PPP2PPP/R1BQKBNR w KQkq - 2 4",
        "sideToMove": "w",
        "prompt": "Black developed the other knight instead. The same space-gaining plan still applies.",
        "answer": "e5",
        "explanation": "e5 again, kicking the knight and gaining the same space as before. Whether Black pins with Bb4 or develops with Nf6, White's central plan barely changes: claim the space while it is available."
      }
    ],
    "pitfalls": [
      "Leaving the light-squared bishop shut in for the whole game instead of looking for a moment to trade it or free it.",
      "Advancing the pawn chain further than it can be supported, turning a space advantage into overextension.",
      "Forgetting that Black's whole plan is to break with c5 or f6, and failing to prepare for the centre opening up later."
    ],
    "nextIds": [
      "pos-bishops",
      "pos-space"
    ]
  },
  {
    "id": "open-caro-kann",
    "track": "openings",
    "title": "The Caro-Kann: a solid centre without a bad bishop",
    "level": "beginner",
    "summary": "The Caro-Kann answers 1.e4 by preparing d5 without blocking in the light-squared bishop the way the French does, since the bishop gets to develop to f5 or g4 before the pawn structure closes in on it. White's plan is straightforward development and central control; Black's plan is to finish developing safely and use the sound structure in an endgame if the position simplifies.",
    "ideas": [
      "Develop the light-squared bishop outside the pawn chain before playing e6, the whole point of choosing this move order.",
      "The structure is solid rather than sharp; Black is usually happy to reach a simplified position or an endgame from this opening.",
      "Whatever White's exact second move, the reply is almost always the same: support or prepare d5 and get the bishop out early."
    ],
    "patterns": [
      "panic-out-of-book"
    ],
    "openings": [
      "Caro-Kann Defence"
    ],
    "positions": [
      {
        "fen": "rnbqkbnr/pp2pppp/2p5/3p4/3PP3/8/PPP2PPP/RNBQKBNR w KQkq - 0 3",
        "sideToMove": "w",
        "prompt": "Black has built the solid Caro-Kann centre. Develop naturally and keep the option of meeting a later capture on e4.",
        "answer": "Nc3",
        "explanation": "Nc3 develops a piece and prepares to recapture on e4 if Black trades there. There is no need for anything sharper yet; the Caro-Kann centre rewards calm, natural development from White just as much as it does from Black."
      },
      {
        "fen": "rnbqkbnr/pp2pppp/2pp4/8/3PP3/8/PPP2PPP/RNBQKBNR w KQkq - 0 3",
        "sideToMove": "w",
        "prompt": "Black played a slightly passive move instead of the immediate central strike. Continue the same natural development.",
        "answer": "Nc3",
        "explanation": "Nc3 again. The move order Black uses barely changes White's job here: develop naturally, keep the centre solid, and be ready to meet whatever central break Black eventually chooses."
      }
    ],
    "pitfalls": [
      "Delaying the light-squared bishop's development until after e6 is played, recreating the exact problem the Caro-Kann move order avoids.",
      "Playing for complications the position does not support instead of accepting a slightly quieter game with a sound structure.",
      "Trading pieces automatically just because the structure is solid, without checking whether the resulting endgame actually favours you."
    ],
    "nextIds": [
      "open-french",
      "pos-bishops"
    ]
  },
  {
    "id": "open-qgd",
    "track": "openings",
    "title": "The Queen's Gambit Declined: pressure d5, develop with a plan",
    "level": "intermediate",
    "summary": "Declining the gambit with e6 keeps the extra centre pawn firmly held, at the cost of shutting in the light-squared bishop for a while, much like the French. White's usual plan is to develop naturally, pin the knight on f6, and later decide between a minority attack on the queenside or a central break with e4. None of that depends on the precise order Black brings the minor pieces out.",
    "ideas": [
      "Pin the knight on f6 with Bg5 once it is on the board; the pin restricts Black's options and prepares to double Black's pawns if the bishop is ever taken.",
      "Decide between a minority attack (b4-b5) and a central break (e4) based on how the position develops, rather than committing to one plan too early.",
      "The light-squared bishop is Black's long-term problem piece here too; watch for a chance to trade it off with a well-timed dxc4 and Bxc4, or free it with an early b6."
    ],
    "patterns": [
      "panic-out-of-book"
    ],
    "openings": [
      "Queen's Gambit Declined"
    ],
    "positions": [
      {
        "fen": "rnbqkb1r/ppp2ppp/4pn2/3p4/2PP4/2N5/PP2PPPP/R1BQKBNR w KQkq - 2 4",
        "sideToMove": "w",
        "prompt": "Black declined the gambit and developed the king knight. Pin it while you have the chance.",
        "answer": "Bg5",
        "explanation": "Bg5 pins the knight to the queen and prepares the standard middlegame plans, minority attack or a central break, once the rest of the pieces are out. This single developing move sets up most of White's long-term ideas in the position."
      },
      {
        "fen": "rnbqk1nr/ppp1bppp/4p3/3p4/2PP4/2N5/PP2PPPP/R1BQKBNR w KQkq - 2 4",
        "sideToMove": "w",
        "prompt": "Black brought the bishop out before the knight this time. Just continue developing.",
        "answer": "Nf3",
        "explanation": "Nf3 keeps developing naturally; the pin with Bg5 can wait until the knight actually lands on f6. Black's exact move order changes very little about White's plan of steady development followed by a central or queenside plan."
      }
    ],
    "pitfalls": [
      "Playing Bg5 before there is a knight on f6 to pin, wasting the move's purpose.",
      "Choosing between the minority attack and the central break too early, before the position shows which one actually fits.",
      "Ignoring Black's light-squared bishop problem when it is White playing this side against the QGD from the other colour."
    ],
    "nextIds": [
      "open-qga",
      "pos-iqp"
    ]
  },
  {
    "id": "open-qga",
    "track": "openings",
    "title": "The Queen's Gambit Accepted: do not rush to win the pawn back",
    "level": "intermediate",
    "summary": "Taking the c-pawn with dxc4 gives Black a temporary extra pawn that is very hard to hold onto for long. White does not need to recapture it immediately; developing naturally and following up with e3 or e4 usually wins the pawn back with a good position anyway. If Black tries to hold onto the extra pawn with b5, the standard answer is to undermine that pawn chain with a4.",
    "ideas": [
      "There is no rush to recapture the c4 pawn; development first almost always wins it back under good conditions.",
      "If Black defends the extra pawn with b5, a4 attacks the pawn chain that is holding it and usually forces weaknesses.",
      "A big centre with e4 is often better compensation than simply restoring material equality straight away."
    ],
    "patterns": [
      "panic-out-of-book"
    ],
    "openings": [
      "Queen's Gambit Accepted"
    ],
    "positions": [
      {
        "fen": "rnbqkbnr/ppp1pppp/8/8/2pP4/8/PP2PPPP/RNBQKBNR w KQkq - 0 3",
        "sideToMove": "w",
        "prompt": "Black grabbed the gambit pawn. There is no need to win it back this instant; develop first.",
        "answer": "Nf3",
        "explanation": "Nf3 simply develops. The pawn on c4 is not going anywhere useful for Black in the long run, and rushing to recapture it right away is not necessary when normal development already sets up e3 or e4 next."
      },
      {
        "fen": "rnbqkbnr/p1p1pppp/8/1p6/2pP4/5N2/PP2PPPP/RNBQKB1R w KQkq - 0 4",
        "sideToMove": "w",
        "prompt": "Black is trying to hold onto the extra pawn with b5. Undermine the chain that is defending it.",
        "answer": "a4",
        "explanation": "a4 attacks the b5 pawn and starts breaking up the structure Black needs to keep the extra material. Whenever Black commits to defending the gambit pawn with more pawn moves rather than pieces, attacking that chain is the standard reply."
      }
    ],
    "pitfalls": [
      "Playing e3 and Bxc4 immediately without finishing development, giving Black extra time to consolidate the extra pawn.",
      "Forgetting the a4 break when Black tries to hold the pawn with b5, letting the queenside structure stand unchallenged.",
      "Treating the accepted gambit as just being a pawn down for White, rather than recognising the lead in development it usually buys."
    ],
    "nextIds": [
      "open-qgd",
      "open-slav"
    ]
  },
  {
    "id": "open-slav",
    "track": "openings",
    "title": "The Slav Defence: hold the centre without blocking the bishop",
    "level": "beginner",
    "summary": "The Slav supports d5 with c6 instead of e6, which keeps the light-squared bishop free to develop outside the pawn chain, the structural problem the Queen's Gambit Declined often has. White's plan is ordinary development, and if Black grabs the c4 pawn and tries to hold it with b5, the same a4 undermining idea from the accepted gambit applies here too.",
    "ideas": [
      "Develop the light-squared bishop before committing to e6, keeping the structural advantage the Slav move order is chosen for.",
      "If Black takes on c4 and defends it with b5, a4 is the standard way to challenge that pawn chain.",
      "Because the centre is well supported, White's development can be unhurried; there is no immediate tactical problem to solve."
    ],
    "patterns": [
      "panic-out-of-book"
    ],
    "openings": [
      "Slav Defence"
    ],
    "positions": [
      {
        "fen": "rnbqkbnr/pp2pppp/2p5/3p4/2PP4/8/PP2PPPP/RNBQKBNR w KQkq - 0 3",
        "sideToMove": "w",
        "prompt": "The Slav structure is on the board. Develop naturally; there is nothing urgent yet.",
        "answer": "Nf3",
        "explanation": "Nf3 develops and keeps options open. The Slav does not force any immediate central decision from White, so ordinary development is the right response while watching for Black's plan to unfold."
      },
      {
        "fen": "rnbqkbnr/pp2pppp/2p5/8/2pP4/2N5/PP2PPPP/R1BQKBNR w KQkq - 0 4",
        "sideToMove": "w",
        "prompt": "Black grabbed the c4 pawn from the Slav structure. Stop the pawn chain that would defend it.",
        "answer": "a4",
        "explanation": "a4 prevents Black from comfortably holding the extra pawn with b5, since that square is now covered. This is the same undermining idea used against the Queen's Gambit Accepted, applied here because the position transposed into a similar structure."
      }
    ],
    "pitfalls": [
      "Forgetting that the whole point of c6 instead of e6 was to free the light-squared bishop, then blocking it in again anyway.",
      "Ignoring the a4 idea when Black tries to hold the extra pawn, giving up a free way to create weaknesses.",
      "Rushing an early central break before development is complete, when the solid structure does not actually demand urgency."
    ],
    "nextIds": [
      "open-qga",
      "pos-open-files"
    ]
  },
  {
    "id": "open-kings-indian",
    "track": "openings",
    "title": "The King's Indian: let them have the centre, then attack it",
    "level": "advanced",
    "summary": "The King's Indian lets White build a full classical pawn centre on purpose. Black fianchettoes, castles quickly, and only then strikes back at the centre with c5 or e5, using pieces where pawns cannot reach. White's job is to finish development, decide whether to hold the centre or push it forward, and be ready for the moment Black's central break arrives, whichever flank it comes from.",
    "ideas": [
      "A big classical centre is not automatically winning; it has to be maintained, and Black's whole opening plan is built around eventually challenging it.",
      "When Black strikes the centre, decide between holding firm (often the safer choice with a lead in development) and pushing forward for more space.",
      "Castling quickly and finishing development matters more than reacting to Black's specific move order into the fianchetto setup."
    ],
    "patterns": [
      "panic-out-of-book"
    ],
    "openings": [
      "King's Indian Defence"
    ],
    "positions": [
      {
        "fen": "rnbqk2r/ppp1ppbp/3p1np1/8/2PPP3/2N5/PP3PPP/R1BQKBNR w KQkq - 0 5",
        "sideToMove": "w",
        "prompt": "The classical King's Indian setup is complete on both sides. Finish development before deciding what to do with the centre.",
        "answer": "Nf3",
        "explanation": "Nf3 completes development, supporting the centre and preparing to castle. The King's Indian plan does not ask White to do anything special here, just to get every piece into play before Black's central break arrives."
      },
      {
        "fen": "rnbqk2r/ppp1ppbp/5np1/3p4/2PPP3/2N5/PP3PPP/R1BQKBNR w KQkq - 0 5",
        "sideToMove": "w",
        "prompt": "Instead of the normal setup move, Black struck the centre immediately. Push forward and take the space.",
        "answer": "e5",
        "explanation": "e5 meets the immediate central challenge by gaining even more space rather than simply trading it off. This is the same underlying decision White always faces in this opening, hold or push the centre, just arriving earlier than usual."
      }
    ],
    "pitfalls": [
      "Assuming the big centre wins on its own and neglecting development while Black prepares the thematic break.",
      "Reacting to Black's central break by panicking rather than calmly choosing between holding and advancing the centre.",
      "Forgetting to finish castling before committing to a central pawn storm, leaving the king stuck on unsafe squares."
    ],
    "nextIds": [
      "open-nimzo-indian",
      "pos-space"
    ]
  },
  {
    "id": "open-nimzo-indian",
    "track": "openings",
    "title": "The Nimzo-Indian: pin first, decide about the structure later",
    "level": "advanced",
    "summary": "The Nimzo-Indian pins the knight on c3 before White's centre grows too big, keeping options open about whether to trade the bishop for doubled pawns, retreat it, or simply maintain the pin. White's side of the plan is calm development, usually e3 followed by Bd3 and Nf3, deciding on the exact central structure once Black's intentions with the bishop are clearer.",
    "ideas": [
      "The pin on c3 is not just annoying, it threatens to double White's pawns if the bishop ever takes on c3, so treat it as a real structural threat.",
      "e3 is a flexible, solid response that prepares normal development without committing the centre too early.",
      "If Black changes plan and transposes toward a different structure, for example a Queen's Gambit style centre, just keep developing naturally rather than forcing the original idea."
    ],
    "patterns": [
      "panic-out-of-book"
    ],
    "openings": [
      "Nimzo-Indian Defence"
    ],
    "positions": [
      {
        "fen": "rnbqk2r/pppp1ppp/4pn2/8/1bPP4/2N5/PP2PPPP/R1BQKBNR w KQkq - 2 4",
        "sideToMove": "w",
        "prompt": "Black pinned the knight with the Nimzo-Indian bishop. Develop solidly and keep the structure flexible.",
        "answer": "e3",
        "explanation": "e3 is the calm, flexible answer, preparing Bd3 and Nf3 without deciding the whole structure immediately. This keeps White's options open for how to meet the pin, whether that means eventually accepting doubled pawns for the bishop pair or persuading Black to resolve the pin first."
      },
      {
        "fen": "rnbqkb1r/ppp2ppp/4pn2/3p4/2PP4/2N5/PP2PPPP/R1BQKBNR w KQkq - 0 4",
        "sideToMove": "w",
        "prompt": "Black transposed toward a different structure instead of pinning with Bb4. Just continue developing naturally.",
        "answer": "Nf3",
        "explanation": "Nf3 keeps developing without any special adjustment. When Black's move order slides toward a different well-known structure, the right response is usually still calm development rather than trying to force the original plan through."
      }
    ],
    "pitfalls": [
      "Ignoring the threat to double the pawns on c3 and playing as though the pin does not matter.",
      "Committing to a rigid central structure before seeing whether Black will trade on c3, retreat the bishop, or maintain the pin.",
      "Forcing the original plan through when Black's actual move order has quietly transposed into a different, better-known structure."
    ],
    "nextIds": [
      "pos-doubled-pawns",
      "open-kings-indian"
    ]
  },
  {
    "id": "open-english",
    "track": "openings",
    "title": "The English Opening: a reversed centre with an extra tempo",
    "level": "intermediate",
    "summary": "Starting with the c-pawn keeps options flexible: White can transpose into a reversed Sicilian, a reversed King's Indian style setup, or a straightforward classical centre with an extra tempo compared to the normal versions of these structures. The plan is to develop naturally, often via a kingside fianchetto, and use the flexibility rather than committing to one structure before seeing how Black reacts.",
    "ideas": [
      "An extra tempo compared to the equivalent Black structures is a real, lasting asset; use it to get a move ahead in a race for the centre.",
      "Nc3 keeps multiple central plans open, including a later d4 or a fianchetto setup with g3.",
      "Do not force one specific structure; the whole appeal of the English is deciding the plan after seeing what Black commits to first."
    ],
    "patterns": [
      "panic-out-of-book"
    ],
    "openings": [
      "English Opening"
    ],
    "positions": [
      {
        "fen": "rnbqkbnr/pppp1ppp/8/4p3/2P5/8/PP1PPPPP/RNBQKBNR w KQkq - 0 2",
        "sideToMove": "w",
        "prompt": "Black met the English with a central pawn, mirroring a Sicilian one tempo down for White. Develop naturally.",
        "answer": "Nc3",
        "explanation": "Nc3 develops while keeping every central option open, treating the position like a reversed Sicilian where White effectively has an extra move compared to the normal version. There is no need to commit the centre yet."
      },
      {
        "fen": "rnbqkb1r/pppppppp/5n2/8/2P5/8/PP1PPPPP/RNBQKBNR w KQkq - 1 2",
        "sideToMove": "w",
        "prompt": "Black developed a piece instead of grabbing the centre. The same flexible development still applies.",
        "answer": "Nc3",
        "explanation": "Nc3 again. Whether Black meets the English with a central pawn or a piece, White's first job is the same: develop flexibly and decide on the exact structure once Black's plan becomes clearer."
      }
    ],
    "pitfalls": [
      "Committing to a rigid central structure on move two or three and giving up the flexibility that is the entire point of 1.c4.",
      "Forgetting the extra tempo compared to a normal Sicilian or King's Indian and playing too passively to make use of it.",
      "Treating every English move order the same way instead of noticing which reversed structure the position is actually heading toward."
    ],
    "nextIds": [
      "open-sicilian-open",
      "open-kings-indian"
    ]
  },
  {
    "id": "open-london",
    "track": "openings",
    "title": "The London System: the same setup against almost anything",
    "level": "beginner",
    "summary": "The London System's entire appeal is that White develops the same way regardless of what Black plays: pawn to d4, bishop to f4 before the knight blocks it in, then e3, Nf3, Bd3 or Be2, and castle. Because the plan barely changes from game to game, it is an excellent opening for a student who wants to practise principles, development, king safety, a reasonable centre, without memorising separate replies to every Black system.",
    "ideas": [
      "Develop the bishop to f4 before playing e3, since once the pawn is on e3 the bishop can no longer get outside the pawn chain that way.",
      "The setup, Bf4, e3, Nf3, Bd3 or Be2 and castling, is close to the same regardless of whether Black plays a kingside fianchetto, a classical setup, or almost anything else.",
      "Because the plan does not depend on Black's reply, spend your thinking time on understanding the resulting middlegame rather than on memorising extra lines."
    ],
    "patterns": [
      "panic-out-of-book"
    ],
    "openings": [
      "London System"
    ],
    "positions": [
      {
        "fen": "rnbqkbnr/ppp1pppp/8/3p4/3P4/8/PPP1PPPP/RNBQKBNR w KQkq - 0 2",
        "sideToMove": "w",
        "prompt": "Black met 1.d4 with the most natural central reply. Play the move that defines this system.",
        "answer": "Bf4",
        "explanation": "Bf4 develops the bishop to its active diagonal before it gets shut in by e3, the defining move of the London System. From here White will follow up with e3, Nf3, and normal development almost regardless of what Black does next."
      },
      {
        "fen": "rnbqkb1r/pppppppp/5n2/8/3P4/8/PPP1PPPP/RNBQKBNR w KQkq - 1 2",
        "sideToMove": "w",
        "prompt": "Black developed a knight instead of matching the centre with a pawn. Play the exact same setup move.",
        "answer": "Bf4",
        "explanation": "Bf4 again, the same move as against almost any other Black reply. This is the entire point of the London System: the choice of setup does not depend on guessing what Black is planning."
      }
    ],
    "pitfalls": [
      "Playing e3 before the bishop gets out, permanently shutting the bishop in behind its own pawn chain.",
      "Treating the London as requiring no thought at all, when the resulting middlegame plans still need real understanding to play well.",
      "Forcing the exact same piece placement even when a specific Black setup makes a small adjustment clearly more effective."
    ],
    "nextIds": [
      "pos-bishops",
      "fund-out-of-book"
    ]
  },
  {
    "id": "end-opposition",
    "track": "endgames",
    "title": "Win the opposition to make progress with kings",
    "level": "beginner",
    "summary": "When two kings face each other on the same file, rank or diagonal with exactly one square between them, the side who does not have to move next holds the opposition. That sounds abstract, but it decides whether a king can force its way past the enemy king or is stuck marking time forever. Learning to recognise and grab the opposition is the single most useful skill in king and pawn endgames.",
    "ideas": [
      "Facing kings two squares apart is opposition; whoever is forced to move next has to give ground.",
      "If the kings are further apart on the same file or rank with an odd number of squares between them, advancing one square straight ahead seizes the opposition on your own turn.",
      "Do not just shuffle the king randomly in a pawn ending; count the squares to the enemy king before every move."
    ],
    "patterns": [
      "endgame-technique"
    ],
    "openings": [],
    "positions": [
      {
        "fen": "8/4k3/8/4K3/4P3/8/8/8 b - - 0 1",
        "sideToMove": "b",
        "prompt": "It is Black to move and the kings are in direct opposition. There is no way to hold the current square forever; step aside.",
        "answer": "Kd7",
        "explanation": "Kd7 is forced in spirit: staying on e7 is not an option, and stepping to either side lets White's king advance one square through e6 next, gaining ground toward the pawn's path. This is exactly what it means to lose the opposition: every king move gives the opponent something."
      },
      {
        "fen": "8/2k5/8/8/2K5/8/2P5/8 w - - 0 1",
        "sideToMove": "w",
        "prompt": "The kings are three squares apart on the c-file and it is White to move. Advance directly to seize the opposition.",
        "answer": "Kc5",
        "explanation": "Kc5 puts the kings two squares apart with Black to move next, which is the opposition. White did not need a clever manoeuvre, just to count the squares and step forward at the right moment rather than drifting sideways."
      }
    ],
    "pitfalls": [
      "Moving the king sideways or randomly in a king and pawn ending instead of counting squares to the opposing king first.",
      "Advancing a pawn before the king is ready to support it, giving away the chance to win the opposition at the right time.",
      "Forgetting that giving up the opposition even once can turn a winning king and pawn ending into a draw."
    ],
    "nextIds": [
      "end-lucena-philidor",
      "pos-passed-pawns"
    ]
  },
  {
    "id": "end-lucena-philidor",
    "track": "endgames",
    "title": "Lucena builds a bridge, Philidor holds the line",
    "level": "advanced",
    "summary": "These are the two positions every rook endgame eventually gets compared to. Lucena is the winning technique for the side with a pawn one step from promoting: put the rook a rook's length away on the pawn's file so that a side check from the defending rook can be blocked, shielding the king and letting the pawn queen. Philidor is the drawing technique for the defender: hold the third rank in front of the pawn to stop the enemy king crossing, and only switch to checking from behind once the pawn actually reaches that rank.",
    "ideas": [
      "In the Lucena pattern, a rook placed a full rook's length from the pawn can slide sideways to block a check, \"building a bridge\" for the king.",
      "In the Philidor pattern, the defending rook holds the rank in front of the pawn for as long as possible, since that is what stops the attacking king crossing over.",
      "Once the attacker's pawn actually reaches the rank the defending rook was holding, that rank is no longer safe to hold, and the defending rook must switch to giving checks from behind instead."
    ],
    "patterns": [
      "endgame-technique",
      "passed-pawn"
    ],
    "openings": [],
    "positions": [
      {
        "fen": "k7/6KP/8/8/3R4/8/8/6r1 w - - 0 1",
        "sideToMove": "w",
        "prompt": "White is in check from the side, one step from promoting. Block the check on the fourth rank to build the bridge.",
        "answer": "Rg4",
        "explanation": "Rg4 blocks the check by interposing on the fourth rank, right on the file the checks were coming down. This is the Lucena bridge: with the rook a full rook's length in front of the king, any side check can be answered by sliding across to block it, and the h-pawn queens next."
      },
      {
        "fen": "4k3/8/r3P3/3K4/8/8/8/8 b - - 0 1",
        "sideToMove": "b",
        "prompt": "White's pawn has just reached the sixth rank that Black's rook was holding. Switch to checking from behind instead.",
        "answer": "Ra1",
        "explanation": "Ra1 gives up trying to hold the sixth rank, which the pawn has now reached anyway, and heads for the back rank to start checking the white king from behind once it steps in front of its pawn. Taking the pawn with the rook would just lose material, since the king on d5 defends it; the Philidor idea is to switch ranks at exactly this moment, not to grab material."
      }
    ],
    "pitfalls": [
      "Placing the rook too close to the pawn in the Lucena position, leaving no room to block a side check.",
      "Holding the third rank as the defender for too long, letting the pawn advance past it and removing the drawing resource.",
      "Capturing a pawn with the defending rook out of habit when the king defends it, losing material for nothing in what should have been a draw."
    ],
    "nextIds": [
      "end-rook-behind-passed-pawn",
      "pos-passed-pawns"
    ]
  },
  {
    "id": "end-rook-behind-passed-pawn",
    "track": "endgames",
    "title": "Put the rook behind the passed pawn, yours or theirs",
    "level": "intermediate",
    "summary": "In a rook endgame, the single most reliable rule of thumb is to put your rook behind a passed pawn: behind your own to shepherd it forward move by move, behind the opponent's to hold it back from a safe distance. A rook in front of a passed pawn gets in its own pawn's way, and a rook attacking an enemy passed pawn from the side can usually be kicked away as the pawn's escorts arrive; behind the pawn on its file is the one square a rook cannot be evicted from.",
    "ideas": [
      "A rook behind your own passed pawn defends every square it needs to cross on the way to promotion.",
      "A rook behind the opponent's passed pawn restrains it for as long as the pawn cannot safely advance past the rook's attack.",
      "Take the time to swing a misplaced rook to the right file before racing the pawn forward; the extra move usually pays for itself."
    ],
    "patterns": [
      "passed-pawn",
      "endgame-technique"
    ],
    "openings": [],
    "positions": [
      {
        "fen": "8/1pprkppp/8/P7/4K3/8/8/7R w - - 0 1",
        "sideToMove": "w",
        "prompt": "White has a passed a-pawn but the rook is stuck on the wrong side of the board. Swing it to the file that matters.",
        "answer": "Ra1",
        "explanation": "Ra1 uses the open a-file to get all the way behind the passed pawn, where it will support every step forward. A rook on h1 was not helping this pawn at all; the whole point of a rook endgame is making sure the rook is actually doing something for the structure that matters."
      },
      {
        "fen": "7R/1pprkppp/8/8/p3K3/8/8/8 w - - 0 1",
        "sideToMove": "w",
        "prompt": "Black has a dangerous passed a-pawn. Get the rook behind it to hold it back from a safe distance.",
        "answer": "Ra8",
        "explanation": "Ra8 gets fully behind the black pawn, restraining it along the whole file from a square the pawn can never attack on its way forward. Attacking the pawn from the side would only invite it to be defended and the rook to be kicked away later; behind it on the file is the safe, permanent way to stop it."
      }
    ],
    "pitfalls": [
      "Leaving the rook in front of your own passed pawn, where it blocks the pawn's advance instead of supporting it.",
      "Attacking an enemy passed pawn from the side instead of getting behind it, giving the opponent a tempo to defend or advance.",
      "Spending too many moves elsewhere before repositioning the rook, letting a passed pawn get dangerously advanced unchecked."
    ],
    "nextIds": [
      "end-lucena-philidor",
      "pos-passed-pawns"
    ]
  },
  {
    "id": "end-basic-mates",
    "track": "endgames",
    "title": "Deliver the basic mates without hesitation",
    "level": "beginner",
    "summary": "King and queen versus king, and king and rook versus king, both use the exact same mechanism: walk the attacking king up to support the checking piece, cut the defending king off along a rank or file, and deliver mate on the edge of the board with the queen or rook giving check while your own king covers every escape square next to it.",
    "ideas": [
      "The mating piece needs your own king close enough to cover the flight squares next to the enemy king; the check alone is never enough on its own.",
      "Push the defending king toward the edge of the board a rank or file at a time rather than trying to mate in the middle.",
      "A queen can often finish a rank or two earlier than a rook because it also controls the diagonal, but the underlying technique, cut off and bring the king up, is identical."
    ],
    "patterns": [
      "endgame-technique"
    ],
    "openings": [],
    "positions": [
      {
        "fen": "4k3/8/4K3/8/8/8/8/1Q6 w - - 0 1",
        "sideToMove": "w",
        "prompt": "The king is already on the edge and your king covers every flight square. Deliver mate along the back rank.",
        "answer": "Qb8#",
        "explanation": "Qb8 is checkmate: the queen controls the entire eighth rank so the king cannot step to d8 or f8, and White's own king on e6 already covers d7, e7 and f7. Every square around the black king is accounted for, which is the whole recipe for a basic mate."
      },
      {
        "fen": "4k3/8/4K3/8/8/8/8/7R w - - 0 1",
        "sideToMove": "w",
        "prompt": "Same idea, this time with a rook. The king is on the edge and your king covers the squares beside it. Finish it.",
        "answer": "Rh8#",
        "explanation": "Rh8 is checkmate for exactly the same reason as the queen version: the rook controls the entire eighth rank, and the king on e6 covers d7, e7 and f7, leaving nowhere for the black king to go. A rook needs the escorting king just as much as a queen does."
      }
    ],
    "pitfalls": [
      "Giving checks that push the enemy king toward the centre of the board instead of toward an edge.",
      "Delivering a check from too far away for your own king to be supporting the key squares, allowing the king to escape.",
      "Forgetting that a lone queen or rook without its king nearby usually cannot force mate at all, only harass."
    ],
    "nextIds": [
      "end-king-activity",
      "end-opposition"
    ]
  },
  {
    "id": "end-opposite-bishops",
    "track": "endgames",
    "title": "Opposite-coloured bishops favour the defender",
    "level": "advanced",
    "summary": "When each side has only one bishop and they run on different colours, the position is famous for being drawish even when one side is several pawns ahead. The reason is simple once you see it: the defending bishop can plant itself on a square of its own colour directly in front of an enemy pawn, and the attacker's bishop, being the wrong colour, can never challenge that blocking square. Extra material does not help if it cannot dislodge a well-placed blockader.",
    "ideas": [
      "Look for the square directly in front of the enemy pawn that matches your own bishop's colour; that square is where you build a permanent blockade.",
      "A bishop of the wrong colour to challenge a blockading square can never help dislodge it, no matter how many extra pawns are on the board.",
      "The drawish reputation of opposite bishops mostly applies to pure bishop endgames; add rooks or queens back onto the board and attacking chances often outweigh the blockade."
    ],
    "patterns": [
      "endgame-technique",
      "bad-bishop"
    ],
    "openings": [],
    "positions": [
      {
        "fen": "4k3/8/P7/8/2Bb4/8/8/4K3 b - - 0 1",
        "sideToMove": "b",
        "prompt": "White's a-pawn is dangerous, but your bishop is the wrong colour for White's bishop to ever contest. Find the permanent blockading square.",
        "answer": "Ba7",
        "explanation": "Ba7 sits on a square the white pawn must pass through, and because White's bishop runs on the opposite colour to a7, it can never help remove the blockade. Even with the extra pawn, White has no way to make progress on this side of the board while the bishop sits there."
      }
    ],
    "pitfalls": [
      "Assuming any opposite-coloured bishop ending is an automatic draw, even when rooks or queens are still on the board to create real attacking chances.",
      "Blockading a passed pawn with the king instead of the bishop when the bishop could do the job just as well and free the king for other work.",
      "Missing the one square that actually matters for the blockade and placing the bishop one square off, where a check or a subsequent pawn move can chase it away."
    ],
    "nextIds": [
      "pos-bishops",
      "end-king-activity"
    ]
  },
  {
    "id": "end-king-activity",
    "track": "endgames",
    "title": "Activate the king the moment the position allows it",
    "level": "beginner",
    "summary": "Once enough material has come off the board, the king stops being a piece to hide and becomes one of the strongest pieces on the board, worth roughly as much as a minor piece in a race for squares. The most common practical mistake in amateur endgames is leaving the king on the back rank a few moves too long while the opponent's king marches into the centre and starts winning pawns or squares uncontested.",
    "ideas": [
      "The moment queens are traded, start walking the king toward the centre unless there is a concrete reason not to.",
      "A more active king usually means more available squares and more targets you can attack that the opponent cannot defend fast enough.",
      "Every move spent leaving a passive king at home in an endgame is a move the opponent gets to bring their own king further into the game for free."
    ],
    "patterns": [
      "endgame-technique"
    ],
    "openings": [],
    "positions": [
      {
        "fen": "8/pp3ppp/8/4k3/8/8/PP3KPP/8 w - - 0 1",
        "sideToMove": "w",
        "prompt": "Black's king is already active in the centre while White's is still on the second rank. Start closing the gap immediately.",
        "answer": "Ke3",
        "explanation": "Ke3 begins bringing White's king into the game to meet Black's on equal terms. Waiting even one more move here just lets Black's king get further ahead in the race for central squares and any pawns that end up undefended later."
      }
    ],
    "pitfalls": [
      "Keeping the king tucked away out of habit even after the pieces that made it dangerous, the queens, have already been traded off.",
      "Activating the king before checking that it will not walk into checks or forks from pieces still on the board.",
      "Losing a tempo moving the king sideways or backward when a direct route to the centre or the key squares is available."
    ],
    "nextIds": [
      "end-opposition",
      "pos-passed-pawns"
    ]
  }
]
