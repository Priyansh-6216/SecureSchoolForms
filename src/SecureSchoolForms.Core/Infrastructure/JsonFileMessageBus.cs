using System;
using System.Collections.Generic;
using System.IO;
using System.Text.Json;
using System.Threading.Tasks;
using SecureSchoolForms.Core.Interfaces;

namespace SecureSchoolForms.Core.Infrastructure;

public class JsonFileMessageBus : IMessageBus
{
    private static readonly string EventsDir = Path.Combine(SolutionDirectory.Path, ".events");
    private static readonly Dictionary<string, List<Func<string, Task>>> Handlers = new();
    private static FileSystemWatcher? _watcher;
    private static readonly object Lock = new();

    public JsonFileMessageBus()
    {
        lock (Lock)
        {
            if (!Directory.Exists(EventsDir))
            {
                Directory.CreateDirectory(EventsDir);
            }
        }
    }

    public async Task PublishMessageAsync<T>(T message, string topicName)
    {
        var eventId = Guid.NewGuid();
        var payload = JsonSerializer.Serialize(message);
        var envelope = new EventEnvelope
        {
            EventId = eventId,
            TopicName = topicName,
            Payload = payload,
            PublishedAt = DateTime.UtcNow
        };

        lock (Lock)
        {
            if (!Directory.Exists(EventsDir))
            {
                Directory.CreateDirectory(EventsDir);
            }
        }

        var filePath = Path.Combine(EventsDir, $"{topicName}_{eventId}.json");
        var serializedEnvelope = JsonSerializer.Serialize(envelope);
        
        await File.WriteAllTextAsync(filePath, serializedEnvelope);
    }

    public static void Subscribe<T>(string topicName, Func<T, Task> handler)
    {
        lock (Lock)
        {
            if (!Handlers.ContainsKey(topicName))
            {
                Handlers[topicName] = new List<Func<string, Task>>();
            }

            Handlers[topicName].Add(async (payloadJson) =>
            {
                var val = JsonSerializer.Deserialize<T>(payloadJson);
                if (val != null)
                {
                    await handler(val);
                }
            });

            InitializeWatcher();
        }
    }

    private static void InitializeWatcher()
    {
        if (_watcher != null) return;

        lock (Lock)
        {
            if (!Directory.Exists(EventsDir))
            {
                Directory.CreateDirectory(EventsDir);
            }
        }

        _watcher = new FileSystemWatcher(EventsDir, "*.json")
        {
            EnableRaisingEvents = true,
            NotifyFilter = NotifyFilters.FileName | NotifyFilters.LastWrite
        };

        _watcher.Created += async (sender, e) =>
        {
            await ProcessEventFileAsync(e.FullPath);
        };
    }

    private static async Task ProcessEventFileAsync(string filePath)
    {
        int retryCount = 0;
        while (retryCount < 5)
        {
            try
            {
                if (!File.Exists(filePath)) return;
                var content = await File.ReadAllTextAsync(filePath);
                var envelope = JsonSerializer.Deserialize<EventEnvelope>(content);
                if (envelope != null)
                {
                    List<Func<string, Task>>? topicHandlers = null;
                    lock (Lock)
                    {
                        if (Handlers.TryGetValue(envelope.TopicName, out var registered))
                        {
                            topicHandlers = new List<Func<string, Task>>(registered);
                        }
                    }

                    if (topicHandlers != null)
                    {
                        foreach (var handler in topicHandlers)
                        {
                            try
                            {
                                await handler(envelope.Payload);
                            }
                            catch (Exception ex)
                            {
                                Console.WriteLine($"Error executing subscriber handler: {ex.Message}");
                            }
                        }
                    }
                }
                break;
            }
            catch (IOException)
            {
                // File might be locked while being written, wait and retry
                retryCount++;
                await Task.Delay(50);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error processing event file {filePath}: {ex.Message}");
                break;
            }
        }
    }

    private class EventEnvelope
    {
        public Guid EventId { get; set; }
        public required string TopicName { get; set; }
        public required string Payload { get; set; }
        public DateTime PublishedAt { get; set; }
    }
}
