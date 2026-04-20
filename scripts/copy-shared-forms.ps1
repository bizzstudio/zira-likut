# העתקת shared\ לפרויקטים חיצוניים
# דוגמה:
#   .\scripts\copy-shared-forms.ps1 -Backend "C:\repos\api\shared" -Admin "C:\repos\admin\shared"

param(
  [string] $Backend = "",
  [string] $Admin = ""
)

$src = Join-Path $PSScriptRoot "..\shared"
if (-not (Test-Path $src)) { throw "missing shared: $src" }

if ($Backend) {
  $parent = Split-Path $Backend -Parent
  if (-not (Test-Path $parent)) { throw "parent missing: $parent" }
  Copy-Item -Path $src -Destination $Backend -Recurse -Force
  Write-Host "Copied to $Backend"
}
if ($Admin) {
  $parent = Split-Path $Admin -Parent
  if (-not (Test-Path $parent)) { throw "parent missing: $parent" }
  Copy-Item -Path $src -Destination $Admin -Recurse -Force
  Write-Host "Copied to $Admin"
}
if (-not $Backend -and -not $Admin) {
  Write-Host "Usage: -Backend path -Admin path"
}
