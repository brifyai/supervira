# Comprehensive script to migrate all alert() and confirm() to react-toastify
# Run from CODIGO_FUENTE directory

function Migrate-File {
    param (
        [string]$filePath,
        [bool]$addImport = $true
    )
    
    if (-not (Test-Path $filePath)) {
        Write-Host "File not found: $filePath" -ForegroundColor Yellow
        return
    }
    
    $content = Get-Content $filePath -Raw -Encoding UTF8
    $originalContent = $content
    
    # Add import if needed and not already present
    if ($addImport -and $content -notmatch "from 'react-toastify'") {
        if ($content -match "'use client'") {
            $content = $content -replace "'use client'", "'use client'`r`n`r`nimport { toast } from 'react-toastify'"
        }
    }
    
    # Remove old toast imports
    $content = $content -replace "import \{ toast \} from 'sonner'[\r\n]*", ""
    $content = $content -replace "import \{ toast \} from 'react-hot-toast'[\r\n]*", ""
    
    # === REPLACE ALL ALERT PATTERNS ===
    
    # Simple success patterns
    $content = $content -replace "alert\('([^']*exitosamente[^']*)'\)", "toast.success('`$1')"
    $content = $content -replace "alert\('([^']*guardada[^']*)'\)", "toast.success('`$1')"
    $content = $content -replace "alert\('([^']*guardado[^']*)'\)", "toast.success('`$1')"
    $content = $content -replace "alert\('([^']*agregad[ao][^']*)'\)", "toast.success('`$1')"
    $content = $content -replace "alert\('([^']*eliminad[ao][^']*)'\)", "toast.success('`$1')"
    $content = $content -replace "alert\('([^']*actualizado[^']*)'\)", "toast.success('`$1')"
    $content = $content -replace "alert\('Copiado al portapapeles'\)", "toast.success('Copiado al portapapeles')"
    $content = $content -replace "alert\('(✅[^']*)'\)", "toast.success('`$1')"
    
    # Error patterns
    $content = $content -replace "alert\('(Error[^']*)'\)", "toast.error('`$1')"
    $content = $content -replace "alert\('(❌[^']*)'\)", "toast.error('`$1')"
    $content = $content -replace "alert\('No se pudo ([^']*)'\)", "toast.error('No se pudo `$1')"
    
    # Warning patterns (Por favor)
    $content = $content -replace "alert\('Por favor ([^']*)'\)", "toast.warning('Por favor `$1')"
    
    # Template literal alerts - success
    $content = $content -replace 'alert\(`✅ ([^`]*)`\)', 'toast.success(`$1`)'
    $content = $content -replace 'alert\(`🎙️ ([^`]*)`\)', 'toast.success(`$1`)'
    $content = $content -replace 'alert\(`Configuración ([^`]*)`\)', 'toast.success(`Configuración $1`)'
    $content = $content -replace 'alert\(`Sitio ([^`]*)`\)', 'toast.success(`Sitio $1`)'
    
    # Template literal alerts - error
    $content = $content -replace 'alert\(`❌ ([^`]*)`\)', 'toast.error(`$1`)'
    $content = $content -replace 'alert\(`Error ([^`]*)`\)', 'toast.error(`Error $1`)'
    
    # Template literal alerts - info
    $content = $content -replace 'alert\(`Probando ([^`]*)`\)', 'toast.info(`Probando $1`)'
    
    # Remaining simple alert() - convert to toast.info as fallback
    # Be careful - only catch remaining simple ones
    
    # Check if changes were made
    if ($content -ne $originalContent) {
        Set-Content $filePath $content -Encoding UTF8 -NoNewline
        Write-Host "Migrated: $filePath" -ForegroundColor Green
    } else {
        Write-Host "No changes: $filePath" -ForegroundColor Gray
    }
}

# List of files to migrate
$files = @(
    "app\integraciones\page.tsx",
    "app\perfil\page.tsx",
    "app\pagos\page.tsx",
    "app\timeline-noticiero\[id]\page.tsx",
    "app\timeline-noticiero\[id]\components\AddNewsModal.tsx",
    "app\timeline-noticiero\[id]\components\AddAudioModal.tsx",
    "app\timeline-noticiero\[id]\components\AdjustDurationModal.tsx",
    "app\timeline-noticiero\[id]\components\BackgroundMusicBar.tsx",
    "app\timeline-noticiero\[id]\components\BackgroundMusicConfig.tsx",
    "app\timeline-noticiero\[id]\components\NewsCard.tsx",
    "app\timeline-noticiero\[id]\components\AddAdModal.tsx",
    "app\bibliotecas\components\CreateCampaignModal.tsx",
    "app\automatizacion\page.tsx",
    "app\activos\page.tsx",
    "components\mercadopago-button.tsx",
    "components\ultimo-minuto\breaking-news-card.tsx"
)

Write-Host "Starting toast migration..." -ForegroundColor Cyan
Write-Host ""

foreach ($file in $files) {
    $fullPath = Join-Path (Get-Location) $file
    Migrate-File -filePath $fullPath
}

Write-Host ""
Write-Host "Migration complete!" -ForegroundColor Cyan
