# Auto Git Sync Script for NSK Games
$repoPath = "c:\Users\Asus\OneDrive\Desktop\NSK mobile\NSK-Bearing-Challenge"
Set-Location $repoPath

$status = git status --porcelain
if ($status) {
    Write-Output "Detected changes. Staging and committing..."
    git add .
    $timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    git commit -m "auto-sync: $timestamp"
    git push origin main
    Write-Output "Successfully pushed changes at $timestamp"
} else {
    Write-Output "Repository clean. No changes to push."
}
