using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using SecureSchoolForms.Core.Entities;
using SecureSchoolForms.Core.Interfaces;

namespace SecureSchoolForms.AuthService.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private static readonly List<User> SimulatedUsers = new()
    {
        new User
        {
            UserId = Guid.Parse("a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d"),
            Name = "Alex Rivers",
            Email = "alex.rivers@school.edu",
            Role = "Teacher",
            SchoolId = "HighSchool-01",
            CreatedAt = DateTime.UtcNow.AddDays(-10)
        },
        new User
        {
            UserId = Guid.Parse("f5e4d3c2-b1a0-9e8d-7c6b-5a4b3c2d1e0f"),
            Name = "Principal Eleanor",
            Email = "eleanor.vance@school.edu",
            Role = "Admin",
            SchoolId = "HighSchool-01",
            CreatedAt = DateTime.UtcNow.AddDays(-10)
        },
        new User
        {
            UserId = Guid.Parse("9e8d7c6b-5a4b-3c2d-1e0f-f5e4d3c2b1a0"),
            Name = "Superintendent Davis",
            Email = "davis.officer@district.edu",
            Role = "District",
            SchoolId = "District-Office",
            CreatedAt = DateTime.UtcNow.AddDays(-10)
        }
    };

    [HttpGet("users")]
    public IActionResult GetUsers()
    {
        return Ok(SimulatedUsers);
    }

    [HttpPost("login")]
    public IActionResult Login([FromBody] LoginRequest request)
    {
        var user = SimulatedUsers.FirstOrDefault(u => u.Email.Equals(request.Email, StringComparison.OrdinalIgnoreCase));
        if (user == null)
        {
            return Unauthorized(new { Message = "Invalid email or credentials." });
        }
        return Ok(user);
    }

    [HttpPost("register")]
    public IActionResult Register([FromBody] RegisterRequest request)
    {
        if (SimulatedUsers.Any(u => u.Email.Equals(request.Email, StringComparison.OrdinalIgnoreCase)))
        {
            return BadRequest(new { Message = "Email address already registered." });
        }

        var newUser = new User
        {
            UserId = Guid.NewGuid(),
            Name = request.Name,
            Email = request.Email,
            Role = request.Role,
            SchoolId = request.SchoolId ?? "HighSchool-01",
            CreatedAt = DateTime.UtcNow
        };

        SimulatedUsers.Add(newUser);
        return Ok(newUser);
    }
}

public class LoginRequest
{
    public required string Email { get; set; }
}

public class RegisterRequest
{
    public required string Name { get; set; }
    public required string Email { get; set; }
    public required string Role { get; set; }
    public string? SchoolId { get; set; }
}
