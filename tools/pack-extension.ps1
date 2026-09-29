# Build the downloadable copy of the account sync extension.
#
#   powershell -ExecutionPolicy Bypass -File tools/pack-extension.ps1
#
# Writes downloads/farm-rpg-account-sync.zip. The name never changes, so the
# download link on the site and in the README never goes stale. The version
# players are getting is in the manifest, and this prints it.
#
# Only the account sync extension is packed. The exploration logger watches the
# game's own network traffic, which is fine for measuring drop rates on your own
# machine but is not something to hand to other players.

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$source = Join-Path $root "collectors\account-sync-extension"
$outDir = Join-Path $root "downloads"
$zip = Join-Path $outDir "farm-rpg-account-sync.zip"

$manifest = Get-Content (Join-Path $source "manifest.json") -Raw | ConvertFrom-Json

# Unzipping should give one folder with a readable name - that folder is what
# people pick in "Load unpacked".
#
# Entries are written by hand with forward slashes. Compress-Archive in Windows
# PowerShell 5.1 writes backslashes, which a Mac or Linux unzip turns into flat
# files with the backslash baked into their names instead of a folder.
Add-Type -AssemblyName System.IO.Compression, System.IO.Compression.FileSystem
New-Item -ItemType Directory -Force $outDir | Out-Null
if (Test-Path $zip) { Remove-Item -Force $zip }
$archive = [System.IO.Compression.ZipFile]::Open($zip, "Create")
try {
  Get-ChildItem -Recurse -File $source | ForEach-Object {
    $rel = $_.FullName.Substring($source.Length + 1).Replace("\", "/")
    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive, $_.FullName, "farm-rpg-account-sync/$rel") | Out-Null
  }
} finally {
  $archive.Dispose()
}

$size = [math]::Round((Get-Item $zip).Length / 1KB)
Write-Output "Packed version $($manifest.version) -> downloads/farm-rpg-account-sync.zip ($size KB)"
