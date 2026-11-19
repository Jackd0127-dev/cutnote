# Cutnote setup for Windows: installs what Cutnote needs with winget, then Cutnote, then checks it all works.
#
#   irm https://raw.githubusercontent.com/Jackd0127-dev/cutnote/main/install.ps1 | iex
#
# Installs if missing (asks first; set $env:CUTNOTE_YES = "1" to skip questions):
#   Git, Python 3, ffmpeg (filmstrip, waveform, Export cut), Node.js LTS (HyperFrames compositions), the HyperFrames player.
# Running it again updates Cutnote. Everything runs inside one script block, so stopping early never closes your window.
& {
  $ErrorActionPreference = "Stop"
  $Repo = if ($env:CUTNOTE_REPO) { $env:CUTNOTE_REPO } else { "https://github.com/Jackd0127-dev/cutnote.git" }
  $Dir = if ($env:CUTNOTE_DIR) { $env:CUTNOTE_DIR } else { Join-Path $HOME ".cutnote" }
  $Bin = if ($env:CUTNOTE_BIN) { $env:CUTNOTE_BIN } else { Join-Path $HOME ".cutnote-bin" }
  $Yes = $env:CUTNOTE_YES -eq "1"

  function Step($m) { Write-Host "`n==> $m" -ForegroundColor White }
  function Warn($m) { Write-Host "! $m" -ForegroundColor Yellow }
  function Fail($m) { Write-Host $m -ForegroundColor Red }
  function Have($c) { [bool](Get-Command $c -ErrorAction SilentlyContinue) }
  function Ask($q) { if ($Yes) { return $true }; $a = Read-Host "$q [Y/n]"; return -not ($a -match '^(n|no)$') }
  function Refresh-Path { $env:Path = [Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [Environment]::GetEnvironmentVariable("Path", "User") }
  function PyCmd {
    foreach ($p in @("python", "py")) {
      if (Have $p) { try { & $p -c "import sys; sys.exit(0 if sys.version_info >= (3, 8) else 1)" 2>$null; if ($LASTEXITCODE -eq 0) { return $p } } catch {} }
    }
    return $null
  }
  function NodeOk { if (-not (Have node)) { return $false }; try { $v = (node --version) -replace '^v', ''; return ([int]($v.Split('.')[0]) -ge 18) } catch { return $false } }

  Step "Checking the tools Cutnote needs"
  $need = @()
  if (-not (Have git)) { $need += @{ name = "Git"; id = "Git.Git" } }
  if (-not (PyCmd)) { $need += @{ name = "Python 3"; id = "Python.Python.3.12" } }
  if (-not ((Have ffmpeg) -and (Have ffprobe))) { $need += @{ name = "ffmpeg"; id = "Gyan.FFmpeg" } }
  if (-not (NodeOk)) { $need += @{ name = "Node.js"; id = "OpenJS.NodeJS.LTS" } }
  $names = ($need | ForEach-Object { $_.name }) -join ", "
  if ($need.Count -eq 0) { Write-Host "All there." -ForegroundColor Green }
  elseif (-not (Have winget)) { Warn "Missing: $names. Install winget (App Installer, from the Microsoft Store) or install them yourself, then run this again." }
  elseif (Ask "Install $names with winget?") {
    foreach ($p in $need) {
      Write-Host "Installing $($p.name)..."
      winget install --id $p.id -e --silent --accept-source-agreements --accept-package-agreements | Out-Null
      if ($LASTEXITCODE -ne 0) { Warn "winget couldn't install $($p.name) (code $LASTEXITCODE)." }
    }
    Refresh-Path
  } else { Warn "Skipped. Cutnote still runs; install them later with winget, or run this again." }

  $py = PyCmd
  if (-not (Have git)) { Fail "Cutnote needs Git. Install it, then run this again."; return }
  if (-not $py) { Fail "Cutnote needs Python 3.8 or newer. Install it (then open a new window), and run this again."; return }

  Step "Installing Cutnote"
  if (Test-Path (Join-Path $Dir ".git")) {
    Write-Host "Updating Cutnote in $Dir"
    git -C $Dir pull --ff-only --quiet
    if ($LASTEXITCODE -ne 0) { Fail "Couldn't update $Dir (local changes?). Fix that, then run this again."; return }
  } else {
    Write-Host "Installing Cutnote to $Dir"
    git clone --quiet --depth 1 $Repo $Dir
    if ($LASTEXITCODE -ne 0) { Fail "Couldn't download Cutnote. Check your connection, then run this again."; return }
  }
  New-Item -ItemType Directory -Force -Path $Bin | Out-Null
  Set-Content -Path (Join-Path $Bin "cutnote.cmd") -Value "@echo off`r`n$py `"$Dir\review.py`" %*" -Encoding ASCII

  # add the command folder to the user PATH, keeping the PATH value's type (so %VARIABLES% in it stay variables)
  $key = [Microsoft.Win32.Registry]::CurrentUser.OpenSubKey("Environment", $true)
  $old = [string]$key.GetValue("Path", "", [Microsoft.Win32.RegistryValueOptions]::DoNotExpandEnvironmentNames)
  if (-not ($old -split ';' | Where-Object { $_ -eq $Bin })) {
    if (Ask "Add $Bin to your PATH so 'cutnote' works in every new terminal?") {
      $new = if ($old) { $old.TrimEnd(';') + ";" + $Bin } else { $Bin }
      $key.SetValue("Path", $new, [Microsoft.Win32.RegistryValueKind]::ExpandString)
      Refresh-Path
      Write-Host "Added. Open a new terminal to use 'cutnote'."
    } else { Write-Host "Run it as $Bin\cutnote.cmd" }
  }
  $key.Close()

  if ((NodeOk) -and (Have npx) -and (Ask "Fetch the HyperFrames player now (needed to play HyperFrames compositions)?")) {
    Step "Fetching the HyperFrames player"
    npx --yes hyperframes --version *> $null
    if ($LASTEXITCODE -eq 0) { Write-Host "HyperFrames ready." -ForegroundColor Green } else { Warn "Couldn't fetch HyperFrames now; run 'npx hyperframes --version' later." }
  }

  Step "Checking everything"
  if (Select-String -Path (Join-Path $Dir "review.py") -Pattern "--doctor" -SimpleMatch -Quiet) { & $py (Join-Path $Dir "review.py") --doctor }
  Write-Host "`nTry it: cutnote C:\Videos\your-project"
}
