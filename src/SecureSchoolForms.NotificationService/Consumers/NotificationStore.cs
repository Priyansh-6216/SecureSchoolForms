using System.Text.Json;

namespace SecureSchoolForms.NotificationService.Consumers;

/// <summary>
/// Thread-safe, shared persistence helper for simulated notifications.
/// Both the legacy <see cref="Workers.NotificationBackgroundWorker"/> (JsonFile mode)
/// and the new MassTransit consumers write through this class, avoiding duplication.
/// </summary>
public static class NotificationStore
{
    private static readonly string DataDir = Path.Combine(Core.SolutionDirectory.Path, ".data");
    private static readonly string NotificationFile = Path.Combine(DataDir, "notifications.json");
    private static readonly SemaphoreSlim FileLock = new(1, 1);

    public static async Task SaveAsync(SimulatedNotification notification)
    {
        await FileLock.WaitAsync();
        try
        {
            if (!Directory.Exists(DataDir))
                Directory.CreateDirectory(DataDir);

            var notifications = Load();
            notifications.Add(notification);

            var json = JsonSerializer.Serialize(notifications, new JsonSerializerOptions { WriteIndented = true });
            await File.WriteAllTextAsync(NotificationFile, json);

            Console.WriteLine($"[NotificationService] SIMULATED {notification.Type} DISPATCHED:");
            Console.WriteLine($"  To:      {notification.Recipient}");
            Console.WriteLine($"  Subject: {notification.Subject}");
            Console.WriteLine($"  Body:    {notification.Body}");
            Console.WriteLine($"--------------------------------------------------");
        }
        finally
        {
            FileLock.Release();
        }
    }

    private static List<SimulatedNotification> Load()
    {
        if (!File.Exists(NotificationFile)) return [];
        try
        {
            var json = File.ReadAllText(NotificationFile);
            return JsonSerializer.Deserialize<List<SimulatedNotification>>(json) ?? [];
        }
        catch
        {
            return [];
        }
    }
}

/// <summary>
/// Represents a simulated notification dispatch (Email or SMS).
/// </summary>
public class SimulatedNotification
{
    public Guid Id { get; set; }
    public required string Type { get; set; }
    public required string Recipient { get; set; }
    public required string Subject { get; set; }
    public required string Body { get; set; }
    public DateTime Timestamp { get; set; }
}
