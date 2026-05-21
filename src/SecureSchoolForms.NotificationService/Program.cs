using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using SecureSchoolForms.Core.Interfaces;
using SecureSchoolForms.Core.Infrastructure;
using SecureSchoolForms.NotificationService.Workers;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();

// Register concrete implementations
builder.Services.AddSingleton<IMessageBus, JsonFileMessageBus>();

// Register background notification worker
builder.Services.AddHostedService<NotificationBackgroundWorker>();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

builder.WebHost.UseUrls("http://localhost:5004");

var app = builder.Build();

app.UseCors("AllowAll");
app.UseAuthorization();
app.MapControllers();

app.Run();
