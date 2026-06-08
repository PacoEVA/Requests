$ports = @(4100, 5173, 5174, 5175)

foreach ($port in $ports) {
  Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue |
    Where-Object { $_.State -eq "Listen" } |
    ForEach-Object {
      $process = Get-CimInstance Win32_Process -Filter "ProcessId = $($_.OwningProcess)"

      [PSCustomObject]@{
        Port = $_.LocalPort
        PID = $_.OwningProcess
        Process = $process.Name
        CommandLine = $process.CommandLine
      }
    }
}
