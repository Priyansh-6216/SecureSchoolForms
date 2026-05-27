using SecureSchoolForms.Core.Infrastructure;
using SecureSchoolForms.NotificationService.Consumers;
using SecureSchoolForms.NotificationService.Workers;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();

// ── Dual-transport messaging ──────────────────────────────────────────────────
// JsonFile mode → JsonFileMessageBus + NotificationBackgroundWorker.
// RabbitMQ mode → MassTransit with all three notification consumers.
var provider = builder.Configuration["MessageBusSettings:Provider"] ?? "JsonFile";

if (provider.Equals("RabbitMQ", StringComparison.OrdinalIgnoreCase))
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
