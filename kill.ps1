try {
    $conns = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
    foreach ($conn in $conns) {
        if ($conn.OwningProcess) {
            Write-Host "Killing PID: $($conn.OwningProcess)"
            Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
        }
    }
} catch {
    Write-Host "No process found"
}
