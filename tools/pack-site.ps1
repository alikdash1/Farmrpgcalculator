# Build the all-in-one download: the planner and the account sync extension.
#
#   powershell -ExecutionPolicy Bypass -File tools/pack-site.ps1
#
# Writes downloads/farm-rpg-calculator.zip. Unzipped, it is one folder:
#
#   farm-rpg-calculator/
#     START-HERE.txt              what to do, in order
#     index.html                  double-click to open the planner
#     js/ css/ data/ assets/ ...  everything the page loads
#     farm-rpg-account-sync/      the extension - "Load unpacked" this folder
#
# Packed from the last COMMIT, not the working copy, so half-finished edits
# (another agent's, or your own) never reach players. Commit first.
#
# Never packed: raw/ (account captures), tools/, tests/, docs/, publish/,
# handoff/, build/ - none of them are loaded by the page.

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$outDir = Join-Path $root "downloads"
$zip = Join-Path $outDir "farm-rpg-calculator.zip"
$stage = Join-Path ([System.IO.Path]::GetTempPath()) ("frpg-site-" + [guid]::NewGuid().ToString("N"))
$top = Join-Path $stage "farm-rpg-calculator"

# What index.html loads, plus the licence. Keep in step with index.html.
$sitePaths = @("index.html", "site.webmanifest", "LICENSE", "js", "css", "data", "assets",
               "collectors/account-importer/shared", "downloads/farm-rpg-account-sync.zip")

New-Item -ItemType Directory -Force $top | Out-Null
try {
  Push-Location $root
  try {
    $tar = Join-Path $stage "site.tar"
    git archive --format=tar -o $tar HEAD @sitePaths
    if ($LASTEXITCODE -ne 0) { throw "git archive failed for the site files" }
    tar -xf $tar -C $top
    Remove-Item $tar

    # The extension goes at the top level under its own readable name, since
    # that folder is what people pick in "Load unpacked".
    $ext = Join-Path $stage "ext.tar"
    git archive --format=tar -o $ext HEAD collectors/account-sync-extension
    if ($LASTEXITCODE -ne 0) { throw "git archive failed for the extension" }
    $extStage = Join-Path $stage "ext"
    New-Item -ItemType Directory -Force $extStage | Out-Null
    tar -xf $ext -C $extStage
    Move-Item (Join-Path $extStage "collectors/account-sync-extension") (Join-Path $top "farm-rpg-account-sync")
    $commit = (git rev-parse --short HEAD).Trim()
  } finally { Pop-Location }

  $manifest = Get-Content (Join-Path $top "farm-rpg-account-sync/manifest.json") -Raw | ConvertFrom-Json
  $guide = @"
FARM RPG CALCULATOR - START HERE
================================

What does an item actually cost you? A planner for endgame Farm RPG:
Grand and Mega Masteries, the Tower and long questlines, priced in what you
really spend - stamina, Arnold Palmers, Cider, Large Nets and farm time.

Online version: https://alikdash1.github.io/Farmrpgcalculator/
This folder is the same planner, to run from your own computer.


1. OPEN THE PLANNER
   Double-click index.html. No install, no server, nothing to set up.
   It opens on the author's farm as an example, and says so on every page.

2. ADD THE EXTENSION (to see your own farm)
   a. Open chrome://extensions  (or brave://extensions, edge://extensions)
   b. Turn on "Developer mode" (top right).
   c. Click "Load unpacked" and choose the farm-rpg-account-sync folder
      that is inside this folder.
   d. Click "Details" on the extension and switch on
      "Allow access to file URLs".  <- the one people miss. Without it the
      extension cannot reach a planner opened from index.html.
      (Not needed if you use the online version instead.)

3. CONNECT IT
   a. Open Farm RPG and refresh the game tab once.
   b. Keep the planner open in another tab. Its Account page says when the
      two have found each other.
   c. In Farm RPG, visit your Profile, Inventory, Tower, Mastery, Quests and
      farm pages once each. The example farm is dropped the moment your first
      capture arrives - nothing of the author's is mixed into your numbers.
   After that, the pages you visit while playing keep it up to date.

Keep this folder: the browser runs the extension from it.

The extension is read-only. It never clicks, plays or navigates the game, has
no network code, and never reads passwords or cookies. Everything stays in
your browser.

Updating: download the new zip, replace this folder's contents, then press
"Reload" on the extension's card in chrome://extensions.

Fan-made, not affiliated with Farm RPG. Planner v$commit, extension $($manifest.version).
"@
  Set-Content -Path (Join-Path $top "START-HERE.txt") -Value $guide -Encoding UTF8

  # Entries written by hand with forward slashes - see pack-extension.ps1 for why.
  Add-Type -AssemblyName System.IO.Compression, System.IO.Compression.FileSystem
  New-Item -ItemType Directory -Force $outDir | Out-Null
  if (Test-Path $zip) { Remove-Item -Force $zip }
  $archive = [System.IO.Compression.ZipFile]::Open($zip, "Create")
  try {
    Get-ChildItem -Recurse -File $top | ForEach-Object {
      $rel = $_.FullName.Substring($top.Length + 1).Replace("\", "/")
      [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive, $_.FullName, "farm-rpg-calculator/$rel") | Out-Null
    }
  } finally { $archive.Dispose() }
} finally {
  if (Test-Path $stage) { Remove-Item -Recurse -Force $stage }
}

$size = [math]::Round((Get-Item $zip).Length / 1MB, 1)
Write-Host "Wrote downloads/farm-rpg-calculator.zip ($size MB) - planner $commit, extension $($manifest.version)"
