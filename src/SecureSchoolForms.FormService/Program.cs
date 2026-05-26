using System;
using System.Linq;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using SecureSchoolForms.Core.Entities;
using SecureSchoolForms.Core.Interfaces;
using SecureSchoolForms.Core.Infrastructure;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();

// Register concrete database and message bus implementations
builder.Services.AddDbContext<SchoolFormsDbContext>();
builder.Services.AddScoped<IFormRepository, EfFormRepository>();
builder.Services.AddSingleton<IMessageBus, JsonFileMessageBus>();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

builder.WebHost.UseUrls("http://localhost:5001");

var app = builder.Build();

// Ensure SQLite database is created and seeded with templates on startup
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<SchoolFormsDbContext>();
    db.Database.EnsureCreated();
    
    if (!db.Forms.Any())
    {
        db.Forms.AddRange(
            new Form
            {
                FormId = Guid.Parse("d3b07384-d113-49be-a5d6-5c1b528bfe01"),
                Type = "Enrollment Form",
                Status = "Published",
                CreatedBy = Guid.Empty,
                CreatedAt = DateTime.UtcNow
            },
            new Form
            {
                FormId = Guid.Parse("d3b07384-d113-49be-a5d6-5c1b528bfe02"),
                Type = "Transfer Form",
                Status = "Published",
                CreatedBy = Guid.Empty,
                CreatedAt = DateTime.UtcNow
            },
            new Form
            {
                FormId = Guid.Parse("d3b07384-d113-49be-a5d6-5c1b528bfe03"),
                Type = "Transcript Request",
                Status = "Published",
                CreatedBy = Guid.Empty,
                CreatedAt = DateTime.UtcNow
            }
        );
        db.SaveChanges();
    }
}

app.UseCors("AllowAll");
app.UseAuthorization();
app.MapControllers();

app.Run();
