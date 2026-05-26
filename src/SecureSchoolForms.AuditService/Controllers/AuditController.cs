using System.Collections.Generic;
using System.Linq;
using Microsoft.AspNetCore.Mvc;
using SecureSchoolForms.Core.Entities;
using SecureSchoolForms.Core.Infrastructure;

namespace SecureSchoolForms.AuditService.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuditController : ControllerBase
{
    private readonly SchoolFormsDbContext _dbContext;

    public AuditController(SchoolFormsDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    [HttpGet]
    public IActionResult GetAuditLogs()
    {
        try
        {
            var logs = _dbContext.AuditLogs
                .OrderByDescending(log => log.Timestamp)
                .ToList();
            return Ok(logs);
        }
        catch
        {
            return Ok(new List<AuditLog>());
        }
    }
}
