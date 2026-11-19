#!/bin/sh
# Cutnote installer: clones (or updates) Cutnote in ~/.cutnote and adds a `cutnote` command to ~/.local/bin.
set -e
REPO="https://github.com/Jackd0127-dev/cutnote.git"
DIR="${CUTNOTE_DIR:-$HOME/.cutnote}"
BIN="${CUTNOTE_BIN:-$HOME/.local/bin}"

say() { printf '%s\n' "$*"; }
need() { command -v "$1" >/dev/null 2>&1; }

need git || { say "Cutnote needs git. Install it, then run this again."; exit 1; }
need python3 || { say "Cutnote needs Python 3.8+ (python3). Install it, then run this again."; exit 1; }
python3 -c 'import sys; sys.exit(0 if sys.version_info >= (3, 8) else 1)' || { say "Cutnote needs Python 3.8 or newer."; exit 1; }

if [ -d "$DIR/.git" ]; then
  say "Updating Cutnote in $DIR"; git -C "$DIR" pull --ff-only --quiet
else
  say "Installing Cutnote to $DIR"; git clone --quiet --depth 1 "$REPO" "$DIR"
fi

mkdir -p "$BIN"
cat > "$BIN/cutnote" <<SH
#!/bin/sh
exec python3 "$DIR/review.py" "\$@"
SH
chmod +x "$BIN/cutnote"

say "Installed: $BIN/cutnote"
case ":$PATH:" in *":$BIN:"*) ;; *) say "Add $BIN to your PATH to run 'cutnote' from anywhere (or run $BIN/cutnote)." ;; esac
if ! need ffmpeg || ! need ffprobe; then
  say "Note: ffmpeg/ffprobe not found. Cutnote works without them, but the filmstrip, waveform and Export cut need them."
  say "  macOS: brew install ffmpeg   Debian/Ubuntu: sudo apt install ffmpeg   Windows: winget install ffmpeg"
fi
need node || say "Optional: install Node.js 18+ and run 'npx hyperframes --version' once to review HyperFrames compositions."
say "Try it: cutnote ~/Videos/your-project"
