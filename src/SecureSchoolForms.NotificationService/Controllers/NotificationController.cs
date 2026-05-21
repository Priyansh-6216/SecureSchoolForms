using System.Collections.Generic;
using System.IO;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using SecureSchoolForms.Core;
using SecureSchoolForms.NotificationService.Workers;

namespace SecureSchoolForms.NotificationService.Controllers;

[ApiController]
[Route("api/[controller]")]
public class NotificationController : ControllerBase
{
    private static readonly string NotificationFile = Path.Combine(SolutionDirectory.Path, ".data", "notifications.json");

    [HttpGet]
    public IActionResult GetNotifications()
    {
        if (!File.Exists(NotificationFile))
        {
            return Ok(new List<SimulatedNotification>());
        }

        try
        {
            var json = File.ReadAllText(NotificationFile);
            var notifications = JsonSerializer.Deserialize<List<SimulatedNotification>>(json) ?? new List<SimulatedNotification>();
            notifications.Reverse(); // Return newest first
            return Ok(notifications);
        }
        catch
        {
            return Ok(new List<SimulatedNotification>());
        }
    }
}
