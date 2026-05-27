using SecureSchoolForms.Core.Infrastructure;
using SecureSchoolForms.Core.Interfaces;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();

// ── Storage Provider ──────────────────────────────────────────────────────────
// Register LocalStorageProvider as the IStorageProvider implementation.
// In a production deployment, swap this for AzureBlobStorageProvider or S3StorageProvider.
builder.Services.AddSingleton<IStorageProvider, LocalStorageProvider>();

// ── Message Bus ───────────────────────────────────────────────────────────────
// DocumentService only publishes (currently no outbound events), so we wire the
// messaging stack without any consumers.
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

builder.WebHost.UseUrls("http://localhost:5006");

var app = builder.Build();

app.UseCors("AllowAll");
app.UseAuthorization();
app.MapControllers();

app.Run();
