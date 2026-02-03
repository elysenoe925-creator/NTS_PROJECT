param(
  [int]$FrontendPort = 5173,
  [int]$ServerPort = 4000
)

$root = Split-Path -Path $MyInvocation.MyCommand.Definition -Parent
$serverDir = Join-Path $root 'server'
$frontendUrl = "http://localhost:$FrontendPort"

Write-Output "Starting server in a new PowerShell window..."
Start-Process powershell -ArgumentList "-NoExit","-Command","Set-Location -Path '$serverDir'; npm run dev"
Write-Output "Starting frontend in a new PowerShell window..."
Start-Process powershell -ArgumentList "-NoExit","-Command","Set-Location -Path '$root'; npm run dev"

$serverUrl = "http://localhost:$ServerPort"
Write-Output "Waiting for server at $serverUrl (timeout 60s)..."
$max = 60
$try = 0
while ($try -lt $max) {
  try {
    $r = Invoke-WebRequest -Uri $serverUrl -UseBasicParsing -TimeoutSec 2
    if ($r.StatusCode -ge 200) { Write-Output "Server available"; break }
  } catch {}
  Start-Sleep -Seconds 1
  $try++
}

if ($try -ge $max) {
  Write-Output "Warning: server not reachable after $max seconds. Opening browser anyway."
}

Write-Output "Opening server URL $serverUrl in default browser..."
Start-Process $serverUrl

Write-Output "Waiting briefly before launching test script..."
Start-Sleep -Seconds 2

Write-Output "Starting server test script in a new PowerShell window..."
Start-Process powershell -ArgumentList "-NoExit","-Command","Set-Location -Path '$serverDir'; node test-api.js"

Write-Output "Done. Server + frontend started; browser opened and tests launched."
