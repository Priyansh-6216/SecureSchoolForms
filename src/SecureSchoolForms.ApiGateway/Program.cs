using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Configuration;
using System.Net.Http.Json;

var builder = WebApplication.CreateBuilder(args);

// Add Yarp Reverse Proxy services
builder.Services.AddReverseProxy()
    .LoadFromConfig(builder.Configuration.GetSection("ReverseProxy"));

builder.Services.AddHttpClient();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins("http://localhost:5173", "http://127.0.0.1:5173")
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials();
    });
});

builder.WebHost.UseUrls("http://*:5000");

var app = builder.Build();

app.UseCors("AllowFrontend");
app.MapReverseProxy();
app.MapGet("/health", () => Results.Ok(new { status = "Healthy" }));
app.MapGet("/status", async (IHttpClientFactory httpClientFactory) =>
{
    var serviceEndpoints = new[]
    {
        new { Service = "FormService", Url = "http://localhost:5001/status", Swagger = "http://localhost:5001/swagger" },
        new { Service = "WorkflowEngine", Url = "http://localhost:5002/status", Swagger = "http://localhost:5002/swagger" },
        new { Service = "AuditService", Url = "http://localhost:5003/status", Swagger = "http://localhost:5003/swagger" },
        new { Service = "NotificationService", Url = "http://localhost:5004/status", Swagger = "http://localhost:5004/swagger" },
        new { Service = "AuthService", Url = "http://localhost:5005/status", Swagger = "http://localhost:5005/swagger" },
        new { Service = "DocumentService", Url = "http://localhost:5006/status", Swagger = "http://localhost:5006/swagger" }
    };

    var client = httpClientFactory.CreateClient();
    var dependencies = new List<object>();

    foreach (var target in serviceEndpoints)
    {
        try
        {
            var response = await client.GetFromJsonAsync<StatusPayload>(target.Url);
            if (response is not null)
            {
                dependencies.Add(new
                {
                    service = response.service,
                    version = response.version,
                    status = response.status,
                    online = true,
                    endpoint = target.Url,
                    swagger = target.Swagger
                });
            }
            else
            {
                dependencies.Add(new { service = target.Service, version = "unknown", status = "Unknown", online = false, endpoint = target.Url, swagger = target.Swagger });
            }
        }
        catch (Exception ex)
        {
            dependencies.Add(new { service = target.Service, version = "offline", status = "Offline", online = false, endpoint = target.Url, swagger = target.Swagger, error = ex.Message });
        }
    }

    return Results.Ok(new
    {
        service = "ApiGateway",
        version = "1.0",
        status = "Healthy",
        dependencies
    });
});

app.Run();

public sealed record StatusPayload(string service, string version, string status);
