using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using SecureSchoolForms.Core.Interfaces;
using SecureSchoolForms.Core.Infrastructure;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();

// Register concrete implementations
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

builder.WebHost.UseUrls("http://*:5005");

var app = builder.Build();

app.UseCors("AllowAll");
app.UseAuthorization();
app.MapControllers();
app.MapGet("/health", () => Results.Ok(new { status = "Healthy" }));

app.Run();
