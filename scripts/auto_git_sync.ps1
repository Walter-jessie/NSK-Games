# Auto Git Sync Script for NSK Games & NSK Bearing Challenge
$repoPath = "c:\Users\Asus\OneDrive\Desktop\NSK mobile\NSK-Bearing-Challenge"
Set-Location $repoPath

# Ensure both remotes are registered
$remotes = git remote
if ($remotes -notcontains "challenge") {
    git remote add challenge "https://github.com/surya-beast1803/NSK-Bearing-Challenge.git"
}

$status = git status --porcelain
if ($status) {
    Write-Output "Detected local changes (including Claude and AI edits). Staging and committing..."
    git add -A
    $timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    git commit -m "sync: $timestamp (Claude + Antigravity live updates)"
    
    # 1. Push to NSK-Games
    git push origin main
    # 2. Push to NSK-Bearing-Challenge (both master for GitHub Pages and main)
    git push challenge main:master --force
    git push challenge main:main
    
    Write-Output "Successfully synced changes to both repositories at $timestamp"
} else {
    Write-Output "Repository clean. No changes to push."
}
