$ErrorActionPreference = 'Stop'
$base = Split-Path -Parent $MyInvocation.MyCommand.Path
$files = @('cards-major-1.json','cards-major-2.json','cards-major-3.json','cards-fire.json','cards-water.json','cards-air.json','cards-earth.json')
$cards = @()
foreach ($file in $files) {
  $data = Get-Content -Raw -Encoding UTF8 (Join-Path $base $file) | ConvertFrom-Json
  $cards += @($data.cards)
}
$json = ConvertTo-Json -InputObject $cards -Depth 20 -Compress
('window.MANARA_DATA=' + $json + ';') | Set-Content -Encoding UTF8 (Join-Path $base 'cards-bundle.js')
Write-Output "Объединено карт: $($cards.Count)"
