using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using SecureSchoolForms.Core.Interfaces;
using SecureSchoolForms.Core.Infrastructure;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();

builder.Services.AddSwaggerDocumentation("SecureSchoolForms Auth Service API");

// Register concrete implementations
builder.Services.AddCustomMessaging(builder.Configuration);

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
app.UseSwaggerDocumentation("Auth Service");
app.UseAuthorization();
app.MapControllers();
app.MapGet("/health", () => Results.Ok(new { status = "Healthy" }));
app.MapGet("/status", () => Results.Ok(new { service = "AuthService", version = "1.0", status = "Healthy" }));

app.Run();
