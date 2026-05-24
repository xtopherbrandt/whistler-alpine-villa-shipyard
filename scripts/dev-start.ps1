# Local development startup script
# Run from the project root: .\scripts\dev-start.ps1

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Write-Step($msg) { Write-Host "`n>> $msg" -ForegroundColor Cyan }
function Write-Ok($msg)   { Write-Host "   OK  $msg" -ForegroundColor Green }
function Write-Fail($msg) { Write-Host "   ERR $msg" -ForegroundColor Red }

# 1. Check .env file exists (Prisma needs DATABASE_URL + seed vars)
Write-Step "Checking environment"
if (-not (Test-Path ".env.local")) {
    Write-Fail ".env.local not found — copy .env.local.example and fill in AUTH_SECRET and RESEND_API_KEY"
    exit 1
}

# Read SEED_ vars from .env.local and write them to .env so Prisma CLI can see them
$envLocalContent = Get-Content ".env.local" -ErrorAction SilentlyContinue
$seedVars = $envLocalContent | Where-Object { $_ -match '^SEED_' -or $_ -match '^DATABASE_URL' }

Set-Content -Path ".env" -Value ($seedVars -join "`n")
Write-Ok ".env synced from .env.local (DATABASE_URL + SEED_ vars)"

# 2. Check Docker is running
Write-Step "Starting database (Docker)"
try {
    $null = docker info 2>&1
} catch {
    Write-Fail "Docker is not running. Start Docker Desktop and try again."
    exit 1
}

docker-compose up -d
if ($LASTEXITCODE -ne 0) {
    Write-Fail "docker-compose up failed"
    exit 1
}
Write-Ok "Postgres container running"

# 3. Wait briefly for Postgres to be ready
Write-Host "   Waiting for Postgres to accept connections..."
Start-Sleep -Seconds 3

# 4. Run migrations
Write-Step "Running database migrations"
npx prisma migrate dev
if ($LASTEXITCODE -ne 0) {
    Write-Fail "Migration failed — check DATABASE_URL in .env"
    exit 1
}
Write-Ok "Schema up to date"

# 5. Seed (idempotent — safe to re-run)
Write-Step "Seeding database"
npx prisma db seed
if ($LASTEXITCODE -ne 0) {
    Write-Fail "Seed failed"
    exit 1
}
Write-Ok "Seed complete"

# 6. Start dev server
Write-Step "Starting dev server"
Write-Host ""
Write-Host "  App:    http://localhost:3000" -ForegroundColor White
Write-Host "  Login:  check SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD in .env.local" -ForegroundColor White
Write-Host "  DB UI:  npx prisma studio (in a separate terminal)" -ForegroundColor White
Write-Host ""

npm run dev
