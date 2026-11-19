#!/bin/sh
# Cutnote setup: installs everything Cutnote needs, then Cutnote itself, then checks it all works.
#
#   curl -fsSL https://raw.githubusercontent.com/Jackd0127-dev/cutnote/main/install.sh | sh
#   curl -fsSL https://raw.githubusercontent.com/Jackd0127-dev/cutnote/main/install.sh | sh -s -- --yes
#
# Needs: git, Python 3.8+.  Installs if missing (asks first unless --yes):
#   ffmpeg + ffprobe  filmstrip, waveform and "Export cut"
#   Node.js 18+       plays HyperFrames compositions (and the library's animated components)
#   HyperFrames       the player Cutnote embeds (cached with `npx hyperframes`)
# macOS uses Homebrew (installed first if missing); Linux uses apt, dnf, pacman or zypper; Windows: run install.ps1.
# Running it again updates Cutnote. Options: --yes (no questions), --no-deps (only Cutnote), --no-path (leave shell files alone),
# --dir DIR, --bin DIR.
set -e
REPO="${CUTNOTE_REPO:-https://github.com/Jackd0127-dev/cutnote.git}"
DIR="${CUTNOTE_DIR:-$HOME/.cutnote}"
BIN="${CUTNOTE_BIN:-$HOME/.local/bin}"
YES=0; DEPS=1; EDITPATH=1
while [ $# -gt 0 ]; do
  case "$1" in
    -y|--yes) YES=1 ;;
    --no-deps) DEPS=0 ;;
    --no-path) EDITPATH=0 ;;
    --dir) shift; DIR="$1" ;;
    --bin) shift; BIN="$1" ;;
    -h|--help) sed -n '2,14p' "$0" 2>/dev/null || true; exit 0 ;;
  esac
  shift
done

if [ -t 1 ]; then B="$(printf '\033[1m')"; G="$(printf '\033[32m')"; Y="$(printf '\033[33m')"; R="$(printf '\033[31m')"; N="$(printf '\033[0m')"; else B=""; G=""; Y=""; R=""; N=""; fi
say() { printf '%s\n' "$*"; }
step() { printf '\n%s==> %s%s\n' "$B" "$*" "$N"; }
warn() { printf '%s! %s%s\n' "$Y" "$*" "$N"; }
need() { command -v "$1" >/dev/null 2>&1; }
# questions read the keyboard even when this script arrives through a pipe (curl ... | sh)
# (with no keyboard and no --yes, the answer is no: nothing gets installed or changed without someone agreeing)
ask() {
  [ "$YES" = 1 ] && return 0
  ( : < /dev/tty ) 2>/dev/null || return 1
  printf '%s [Y/n] ' "$1" > /dev/tty
  read -r a < /dev/tty || return 1
  case "$a" in n|N|no|No) return 1 ;; *) return 0 ;; esac
}
SUDO=""
if [ "$(id -u)" != 0 ] && need sudo; then SUDO="sudo"; fi

node_ok() { need node && node -e 'process.exit(+process.versions.node.split(".")[0] >= 18 ? 0 : 1)' 2>/dev/null; }
py_ok() { need python3 && python3 -c 'import sys; sys.exit(0 if sys.version_info >= (3, 8) else 1)' 2>/dev/null; }

OS="$(uname -s)"
PM=""
case "$OS" in
  Darwin) PM=brew ;;
  Linux)
    if need apt-get; then PM=apt; elif need dnf; then PM=dnf; elif need pacman; then PM=pacman; elif need zypper; then PM=zypper; fi ;;
  MINGW*|MSYS*|CYGWIN*)
    say "On Windows, run this in PowerShell instead:"
    say "  irm https://raw.githubusercontent.com/Jackd0127-dev/cutnote/main/install.ps1 | iex"
    exit 1 ;;
esac

brew_env() {
  for b in /opt/homebrew/bin/brew /usr/local/bin/brew /home/linuxbrew/.linuxbrew/bin/brew; do
    [ -x "$b" ] && eval "$("$b" shellenv)" && return 0
  done
  return 1
}

# package names per manager, from the generic names git python ffmpeg node
pkg_name() {
  case "$PM:$1" in
    brew:python) echo python ;;
    apt:python|dnf:python|zypper:python) echo python3 ;;
    apt:node|dnf:node|pacman:node|zypper:node) echo nodejs npm ;;
    dnf:ffmpeg) echo ffmpeg-free ;;
    *) echo "$1" ;;
  esac
}
pkg_install() {
  names=""
  for p in "$@"; do names="$names $(pkg_name "$p")"; done
  case "$PM" in
    # shellcheck disable=SC2086
    brew) brew install $names ;;
    apt) $SUDO apt-get update -qq && $SUDO apt-get install -y -qq $names ;;
    dnf) $SUDO dnf install -y -q $names ;;
    pacman) $SUDO pacman -S --needed --noconfirm $names ;;
    zypper) $SUDO zypper -n install $names ;;
    *) return 1 ;;
  esac
}

if [ "$DEPS" = 1 ]; then
  step "Checking the tools Cutnote needs"
  MISSING=""
  need git || MISSING="$MISSING git"
  py_ok || MISSING="$MISSING python"
  { need ffmpeg && need ffprobe; } || MISSING="$MISSING ffmpeg"
  node_ok || MISSING="$MISSING node"
  if [ -z "$MISSING" ]; then
    say "${G}All there.${N}"
  else
    say "Missing:$MISSING"
    if [ "$PM" = brew ] && ! need brew && ! brew_env; then
      say "Cutnote installs these with Homebrew, the standard macOS package manager (it asks for your Mac password)."
      if ask "Install Homebrew now?"; then
        # Homebrew treats any value of NONINTERACTIVE as "don't ask": only set it for --yes, so it can ask for the password
        if [ "$YES" = 1 ]; then
          NONINTERACTIVE=1 /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)" || true
        else
          /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)" < /dev/tty || true
        fi
        brew_env || true
      fi
      if ! need brew; then
        warn "No Homebrew. Installing only what macOS can provide: git and Python come with the Command Line Tools."
        PM=""
        if ! need git || ! py_ok; then xcode-select --install 2>/dev/null || true; say "Finish the Command Line Tools install in the window that opened, then run this again."; exit 1; fi
      fi
    fi
    if [ -n "$PM" ]; then
      if ask "Install$MISSING with $PM?"; then
        # shellcheck disable=SC2086
        pkg_install $MISSING || warn "Some packages didn't install; see above."
      else
        warn "Skipped. Cutnote still runs; install them later with: $PM install$MISSING (or run this again with --yes)."
      fi
    else
      warn "No package manager found. Install$MISSING yourself, then run this again."
    fi
  fi
  if ! node_ok && need node; then
    warn "Node.js $(node -v) is older than 18. HyperFrames needs 18+: https://nodejs.org (or: brew install node / your package manager's nodejs from NodeSource)."
  fi
fi

need git || { say "${R}Cutnote needs git.${N} Install it, then run this again."; exit 1; }
py_ok || { say "${R}Cutnote needs Python 3.8 or newer (python3).${N} Install it, then run this again."; exit 1; }

step "Installing Cutnote"
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

case ":$PATH:" in
  *":$BIN:"*) ;;
  *)
    RC=""
    case "${SHELL:-}" in */zsh) RC="$HOME/.zshrc" ;; */bash) RC="$HOME/.bashrc"; [ "$OS" = Darwin ] && RC="$HOME/.bash_profile" ;; */fish) RC="" ;; *) RC="$HOME/.profile" ;; esac
    if [ "$EDITPATH" = 1 ] && [ -n "$RC" ] && ask "Add $BIN to your PATH (in $RC) so 'cutnote' works in every new terminal?"; then
      printf '\n# Cutnote\nexport PATH="%s:$PATH"\n' "$BIN" >> "$RC"
      say "Added. Open a new terminal (or run: export PATH=\"$BIN:\$PATH\")."
    else
      say "Run it as $BIN/cutnote, or add $BIN to your PATH."
    fi ;;
esac

if node_ok && need npx && [ "$DEPS" = 1 ] && ask "Fetch the HyperFrames player now (needed to play HyperFrames compositions)?"; then
  step "Fetching the HyperFrames player"
  npx --yes hyperframes --version >/dev/null 2>&1 && say "${G}HyperFrames ready.${N}" || warn "Couldn't fetch HyperFrames now; run 'npx hyperframes --version' later to play HyperFrames compositions."
elif node_ok && [ "$DEPS" = 1 ]; then
  say "Skipped the HyperFrames player. Run 'npx hyperframes --version' when you want to play HyperFrames compositions."
fi

step "Checking everything"
if grep -q -- "--doctor" "$DIR/review.py"; then python3 "$DIR/review.py" --doctor || true; fi
say ""
say "${B}Try it:${N} cutnote ~/Videos/your-project"
