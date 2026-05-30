using SecureSchoolForms.Core.Infrastructure;
using SecureSchoolForms.Core.Interfaces;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();

// ── Key Vault Provider ────────────────────────────────────────────────────────
builder.Services.AddSingleton<IKeyVaultProvider, AzureKeyVaultProvider>();

// ── Storage Provider ──────────────────────────────────────────────────────────
var storageProvider = builder.Configuration["StorageSettings:Provider"] ?? "LocalStorage";
Console.WriteLine($"[DocumentService] Using storage provider: {storageProvider}");

if (storageProvider.Equals("AzureBlob", StringComparison.OrdinalIgnoreCase))
{
    builder.Services.AddSingleton<IStorageProvider, AzureBlobStorageProvider>();
}
else
{
    builder.Services.AddSingleton<IStorageProvider, LocalStorageProvider>();
}

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

builder.WebHost.UseUrls("http://*:5006");

var app = builder.Build();

app.UseCors("AllowAll");
app.UseAuthorization();
app.MapControllers();

app.Run();
