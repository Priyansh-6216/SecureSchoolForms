using SecureSchoolForms.Core.Infrastructure;
using SecureSchoolForms.NotificationService.Consumers;
using SecureSchoolForms.NotificationService.Workers;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();

// ── Dual-transport messaging ──────────────────────────────────────────────────
// JsonFile mode → JsonFileMessageBus + NotificationBackgroundWorker.
// RabbitMQ mode → MassTransit with all three notification consumers.
var provider = builder.Configuration["MessageBusSettings:Provider"] ?? "JsonFile";

if (provider.Equals("RabbitMQ", StringComparison.OrdinalIgnoreCase) || provider.Equals("AzureServiceBus", StringComparison.OrdinalIgnoreCase))
{
    builder.Services.AddCustomMessaging(builder.Configuration, x =>
    {
        x.AddConsumer<FormSubmittedNotificationConsumer>();
        x.AddConsumer<WorkflowStepCompletedNotificationConsumer>();
        x.AddConsumer<WorkflowStepRejectedNotificationConsumer>();
    });
}
else
{
    builder.Services.AddCustomMessaging(builder.Configuration);
    // Legacy JsonFile-mode subscription worker
    builder.Services.AddHostedService<NotificationBackgroundWorker>();
}

builder.Services.AddSwaggerDocumentation("SecureSchoolForms Notification Service API");

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

builder.WebHost.UseUrls("http://*:5004");

var app = builder.Build();

app.UseCors("AllowAll");
app.UseSwaggerDocumentation("Notification Service");
app.UseAuthorization();
app.MapControllers();
app.MapGet("/health", () => Results.Ok(new { status = "Healthy" }));
app.MapGet("/status", () => Results.Ok(new { service = "NotificationService", version = "1.0", status = "Healthy" }));

app.Run();
