using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using SecureSchoolForms.Core.Interfaces;
using SecureSchoolForms.Core.Infrastructure;
using SecureSchoolForms.AuditService.Workers;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();

// Register concrete database and message bus implementations
builder.Services.AddDbContext<SchoolFormsDbContext>();
builder.Services.AddSingleton<IMessageBus, JsonFileMessageBus>();

// Register background audit processor worker
builder.Services.AddHostedService<AuditBackgroundWorker>();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

builder.WebHost.UseUrls("http://localhost:5003");

var app = builder.Build();

// Ensure SQLite database is created on startup
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<SchoolFormsDbContext>();
    db.Database.EnsureCreated();
}

app.UseCors("AllowAll");
app.UseAuthorization();
app.MapControllers();

app.Run();
