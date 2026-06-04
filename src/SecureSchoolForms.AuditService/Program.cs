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

if (provider.Equals("RabbitMQ", StringComparison.OrdinalIgnoreCase) || provider.Equals("AzureServiceBus", StringComparison.OrdinalIgnoreCase))
{
    builder.Services.AddCustomMessaging(builder.Configuration, x =>
    {
        x.AddConsumer<FormSubmittedAuditConsumer>();
        x.AddConsumer<WorkflowStepCompletedAuditConsumer>();
        x.AddConsumer<WorkflowStepRejectedAuditConsumer>();
        x.AddConsumer<DocumentDownloadedAuditConsumer>();
        x.AddConsumer<WorkflowStepReturnedAuditConsumer>();
    });
}
else
{
    builder.Services.AddCustomMessaging(builder.Configuration);
    // Legacy JsonFile-mode subscription worker
    builder.Services.AddHostedService<AuditBackgroundWorker>();
}

builder.Services.AddSwaggerDocumentation("SecureSchoolForms Audit Service API");

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
app.UseSwaggerDocumentation("SecureSchoolForms Audit Service API");
app.MapControllers();
app.MapGet("/health", () => Results.Ok(new { status = "Healthy" }));
app.MapGet("/status", () => Results.Ok(new { service = "AuditService", version = "1.0", status = "Healthy" }));

app.Run();
