using SecureSchoolForms.Core.Infrastructure;
using SecureSchoolForms.AuditService.Consumers;
using SecureSchoolForms.AuditService.Workers;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();

// Register database
builder.Services.AddDbContext<SchoolFormsDbContext>();

// ── Dual-transport messaging ──────────────────────────────────────────────────
// JsonFile mode → JsonFileMessageBus + AuditBackgroundWorker.
// RabbitMQ mode → MassTransit with all three audit consumers.
var provider = builder.Configuration["MessageBusSettings:Provider"] ?? "JsonFile";

if (provider.Equals("RabbitMQ", StringComparison.OrdinalIgnoreCase))
{
    builder.Services.AddCustomMessaging(builder.Configuration, x =>
    {
        x.AddConsumer<FormSubmittedAuditConsumer>();
        x.AddConsumer<WorkflowStepCompletedAuditConsumer>();
        x.AddConsumer<WorkflowStepRejectedAuditConsumer>();
    });
}
else
{
    builder.Services.AddCustomMessaging(builder.Configuration);
    // Legacy JsonFile-mode subscription worker
    builder.Services.AddHostedService<AuditBackgroundWorker>();
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

builder.WebHost.UseUrls("http://*:5003");

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
app.MapGet("/health", () => Results.Ok(new { status = "Healthy" }));

app.Run();
