# Farm RPG Crafting Calculator — data refresh.
# Re-downloads source snapshots into raw\, then regenerates data\ via tools\build-data.mjs.
# Never touches data\drop_overrides.json (your hand corrections always win).
#
# Usage: .\update-data.ps1            (fetch everything, then rebuild)
#        .\update-data.ps1 -BuildOnly (skip downloads, just rebuild from existing raw\)
#
# NOTE: items/recipes come from coderanger/farmrpg-etl2, which has no public export
# URL - refresh raw\items-etl2.json manually when that project publishes a snapshot.

param([switch]$BuildOnly)

$ErrorActionPreference = "Stop"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$Root = $PSScriptRoot
if (-not $Root) { $Root = (Get-Location).Path }
$Raw = Join-Path $Root "raw"
New-Item -ItemType Directory -Force -Path $Raw | Out-Null

$ExtBase = "https://raw.githubusercontent.com/coderanger/farmrpg-ext/main/data"
$Sources = [ordered]@{
    "drop_rates.json"        = "$ExtBase/drop_rates.json"
    "locations.json"         = "$ExtBase/locations.json"
    "cooking_recipes.json"   = "$ExtBase/cooking_recipes.json"
    "cooking_recipe_items.json" = "$ExtBase/cooking_recipe_items.json"
    "xp.json"                = "$ExtBase/xp.json"
}
$MarketUrl = "https://farmrpg-pricecheck.free.nf/prices2.json"

function Save-Raw([string]$Name, [string]$Content) {
    # only ever write things that parse as JSON - never poison raw\ with HTML
    $trimmed = $Content.TrimStart()
    if ($trimmed.Length -lt 1 -or ($trimmed[0] -ne "{" -and $trimmed[0] -ne "[")) {
        throw "response is not JSON"
    }
    $null = $Content | ConvertFrom-Json   # hard validation
    $dest = Join-Path $Raw $Name
    if (Test-Path $dest) { Copy-Item $dest "$dest.bak" -Force }  # rollback copy
    Set-Content -LiteralPath $dest -Value $Content -Encoding UTF8
    Write-Host ("  ok {0} ({1} KB)" -f $Name, [math]::Round((Get-Item $dest).Length / 1KB))
}

function Get-GitHub([string]$Url) {
    try {
        $r = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 60 `
            -Headers @{ "User-Agent" = "farmrpg-calc update-data" }
        return $r.Content
    } catch {
        Write-Warning "fetch failed: $Url -> $($_.Exception.Message)"
        return $null
    }
}

# The pricecheck host fronts downloads with a JS challenge: it sets a __test cookie
# computed as hex(AES-128-CBC-decrypt(c, key=a, iv=b)) then reloads with ?i=1.
# We replicate exactly what the page's slowAES.decrypt(c, 2, a, b) does.
function Get-Market {
    for ($attempt = 0; $attempt -lt 3; $attempt++) {
        try {
            $first = Invoke-WebRequest -Uri $MarketUrl -UseBasicParsing -TimeoutSec 90 `
                -Headers @{ "User-Agent" = "Mozilla/5.0" }
            $m = [regex]::Matches($first.Content, 'toNumbers\("([0-9a-f]+)"\)')
            if ($m.Count -lt 3) {
                if ($first.Content.TrimStart().StartsWith("{")) { return $first.Content }  # no challenge today
                throw "challenge page in unexpected format"
            }
            $hexToBytes = { param($s)
                $o = New-Object byte[] ($s.Length / 2)
                for ($i = 0; $i -lt $o.Length; $i++) { $o[$i] = [Convert]::ToByte($s.Substring($i * 2, 2), 16) }
                , $o
            }
            $aes = [System.Security.Cryptography.Aes]::Create()
            $aes.Mode = [System.Security.Cryptography.CipherMode]::CBC
            $aes.Padding = [System.Security.Cryptography.PaddingMode]::None
            $aes.Key = & $hexToBytes $m[0].Groups[1].Value
            $aes.IV = & $hexToBytes $m[1].Groups[1].Value
            $dec = $aes.CreateDecryptor()
            $cipher = & $hexToBytes $m[2].Groups[1].Value
            $plain = $dec.TransformFinalBlock($cipher, 0, $cipher.Length)
            $cookie = ($plain | ForEach-Object { $_.ToString("x2") }) -join ""

            $sess = New-Object Microsoft.PowerShell.Commands.WebRequestSession
            $host_ = ([Uri]$MarketUrl).Host
            $sess.Cookies.Add((New-Object System.Net.Cookie("__test", $cookie, "/", $host_)))
            $second = Invoke-WebRequest -Uri "$MarketUrl`?i=1" -WebSession $sess -UseBasicParsing -TimeoutSec 90 `
                -Headers @{ "User-Agent" = "Mozilla/5.0"; "Referer" = $MarketUrl }
            return $second.Content
        } catch {
            Write-Warning "market fetch attempt $($attempt + 1) failed: $($_.Exception.Message)"
            Start-Sleep -Seconds 2
        }
    }
    return $null
}

$failures = 0
if (-not $BuildOnly) {
    foreach ($name in $Sources.Keys) {
        Write-Host "- fetching $name ..."
        $content = Get-GitHub $Sources[$name]
        if ($null -eq $content) { $failures++; continue }
        try { Save-Raw $name $content } catch { $failures++; Write-Warning "rejected $name : $($_.Exception.Message)" }
    }

    Write-Host "- fetching market-pricecheck.json (with anti-bot cookie dance) ..."
    $mk = Get-Market
    if ($null -eq $mk) { $failures++ }
    else {
        try { Save-Raw "market-pricecheck.json" $mk } catch { $failures++; Write-Warning "rejected market-pricecheck.json : $($_.Exception.Message)" }
    }

    if (-not (Test-Path (Join-Path $Raw "items-etl2.json"))) {
        Write-Warning "raw\items-etl2.json missing - etl2 has no public export; primary dataset stays whatever you last saved."
    }
}

Write-Host "`nbuilding data\ ..."
node (Join-Path $Root "tools\build-data.mjs")
if ($LASTEXITCODE -ne 0) { Write-Error "build-data.mjs failed"; exit 1 }

if ($failures -gt 0) {
    Write-Warning "$failures source(s) failed; rebuilt from everything available (.bak copies kept next to raw files)."
} else {
    Write-Host "done."
}
