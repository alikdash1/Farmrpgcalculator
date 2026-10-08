# Publish the two download zips as a new GitHub release, so downloads are counted.
#
#   powershell -ExecutionPolicy Bypass -File tools/release.ps1
#
# The site's download buttons point at releases/latest/download/<file>, so the
# newest release is always what people get. A NEW release is made each time
# (v2, v3...) rather than replacing the files: replacing a file resets its
# download count. Run it after tools/pack-site.ps1 when the zips should go out -
# not on every push. Totals: tools/release.ps1 -Count
param([switch]$Count)
$ErrorActionPreference = "Stop"
$gh = "C:\Program Files\GitHub CLI\gh.exe"
$repo = "alikdash1/Farmrpgcalculator"
$root = Split-Path -Parent $PSScriptRoot
if ($Count) {
  $rows = & $gh api "repos/$repo/releases" --paginate --jq '.[] | .assets[] | [.name, .download_count] | @tsv'
  $totals = @{}
  foreach ($row in $rows) { $n, $c = $row -split "`t"; $totals[$n] = [int]$totals[$n] + [int]$c }
  $totals.GetEnumerator() | Sort-Object Name | ForEach-Object { "{0,-28} {1,6} downloads" -f $_.Name, $_.Value }
  return
}
$tags = & $gh release list --repo $repo --limit 200 --json tagName --jq '.[].tagName'
$next = 1 + (@($tags | Where-Object { $_ -match '^v(\d+)$' } | ForEach-Object { [int]($_ -replace 'v', '') }) + 0 | Measure-Object -Maximum).Maximum
$tag = "v$next"
$zips = @((Join-Path $root "downloads\farm-rpg-calculator.zip"), (Join-Path $root "downloads\farm-rpg-account-sync.zip"))
& $gh release create $tag $zips --repo $repo --title "Farm RPG Calculator ($tag)" --latest `
  --notes "The whole planner (open index.html) and the account sync extension. Download counts are shown here; nothing else is tracked."
Write-Output "Released $tag"
