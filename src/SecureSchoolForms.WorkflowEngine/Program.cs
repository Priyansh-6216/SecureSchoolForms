using SecureSchoolForms.Core.Infrastructure;
using SecureSchoolForms.Core.Interfaces;
using SecureSchoolForms.WorkflowEngine.Consumers;
using SecureSchoolForms.WorkflowEngine.Workers;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();

// Register database repository
builder.Services.AddDbContext<SchoolFormsDbContext>();
builder.Services.AddScoped<IWorkflowRepository, EfWorkflowRepository>();

// ── Dual-transport messaging ──────────────────────────────────────────────────
// JsonFile mode → registers JsonFileMessageBus + WorkflowBackgroundWorker.
// RabbitMQ mode → registers MassTransit with FormSubmittedConsumer.
var provider = builder.Configuration["MessageBusSettings:Provider"] ?? "JsonFile";

if (provider.Equals("RabbitMQ", StringComparison.OrdinalIgnoreCase) || provider.Equals("AzureServiceBus", StringComparison.OrdinalIgnoreCase))
{
    builder.Services.AddCustomMessaging(builder.Configuration, x =>
    {
        x.AddConsumer<FormSubmittedConsumer>();
    });
}
else
{
    builder.Services.AddCustomMessaging(builder.Configuration);
    // Legacy JsonFile-mode subscription worker
    builder.Services.AddHostedService<WorkflowBackgroundWorker>();
}

builder.Services.AddSwaggerDocumentation("SecureSchoolForms Workflow Engine API");

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

builder.WebHost.UseUrls("http://*:5002");

var app = builder.Build();

// Ensure SQLite database is created on startup
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<SchoolFormsDbContext>();
    db.Database.EnsureCreated();
}

app.UseCors("AllowAll");
app.UseSwaggerDocumentation("Workflow Engine");
app.UseAuthorization();
app.MapControllers();
app.MapGet("/health", () => Results.Ok(new { status = "Healthy" }));
app.MapGet("/status", () => Results.Ok(new { service = "WorkflowEngine", version = "1.0", status = "Healthy" }));

app.Run();
