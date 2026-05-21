using System.Collections.Generic;
using System.IO;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using SecureSchoolForms.Core;
using SecureSchoolForms.Core.Entities;

namespace SecureSchoolForms.AuditService.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuditController : ControllerBase
{
    private static readonly string AuditFile = Path.Combine(SolutionDirectory.Path, ".data", "audit_logs.json");

    [HttpGet]
    public IActionResult GetAuditLogs()
    {
        if (!File.Exists(AuditFile))
        {
            return Ok(new List<AuditLog>());
        }

        try
        {
            var json = File.ReadAllText(AuditFile);
            var logs = JsonSerializer.Deserialize<List<AuditLog>>(json) ?? new List<AuditLog>();
            // Return newest first
            logs.Reverse();
            return Ok(logs);
        }
        catch
        {
            return Ok(new List<AuditLog>());
        }
    }
}
