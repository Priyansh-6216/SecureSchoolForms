using MassTransit;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using SecureSchoolForms.Core.Interfaces;

namespace SecureSchoolForms.Core.Infrastructure;

/// <summary>
/// Extension methods for registering the message bus and MassTransit
/// into the DI container with a provider-aware dual-transport configuration.
/// </summary>
public static class MassTransitConfiguration
{
    /// <summary>
    /// Registers MassTransit with a dynamically selected transport based on
    /// the <c>MessageBusSettings:Provider</c> configuration key.
    ///
    /// <list type="bullet">
    ///   <item><c>Provider = "RabbitMQ"</c> — Connects to a local/cloud RabbitMQ instance.</item>
    ///   <item><c>Provider = "JsonFile"</c> (default) — Falls back to the zero-dependency JsonFileMessageBus
    ///     using the local .events/ folder watcher. Keeps the project instantly runnable without Docker.</item>
    /// </list>
    /// </summary>
    /// <param name="services">The DI service collection.</param>
    /// <param name="configuration">The app configuration (reads MessageBusSettings section).</param>
    /// <param name="configureConsumers">Optional callback to register MassTransit consumers.</param>
    public static IServiceCollection AddCustomMessaging(
        this IServiceCollection services,
        IConfiguration configuration,
        Action<IBusRegistrationConfigurator>? configureConsumers = null)
    {
        var provider = configuration["MessageBusSettings:Provider"] ?? "JsonFile";
        Console.WriteLine($"[MassTransitConfiguration] MessageBus provider: {provider}");

        if (provider.Equals("RabbitMQ", StringComparison.OrdinalIgnoreCase))
        {
            // ── Enterprise mode: MassTransit → RabbitMQ ──────────────────────────
            var host = configuration["MessageBusSettings:RabbitMQ:Host"] ?? "localhost";
            var user = configuration["MessageBusSettings:RabbitMQ:Username"] ?? "guest";
            var pass = configuration["MessageBusSettings:RabbitMQ:Password"] ?? "guest";

            services.AddMassTransit(x =>
            {
                configureConsumers?.Invoke(x);

                x.UsingRabbitMq((ctx, cfg) =>
                {
                    cfg.Host(host, h =>
                    {
                        h.Username(user);
                        h.Password(pass);
                    });

                    cfg.ConfigureEndpoints(ctx);
                });
            });

            // Bind IMessageBus → MassTransitMessageBus for all publishers
            services.AddScoped<IMessageBus, MassTransitMessageBus>();
        }
        else if (provider.Equals("AzureServiceBus", StringComparison.OrdinalIgnoreCase))
        {
            // ── Enterprise Cloud mode: MassTransit → Azure Service Bus ──────────
            var connectionString = configuration["MessageBusSettings:AzureServiceBus:ConnectionString"];
            if (string.IsNullOrEmpty(connectionString))
            {
                throw new InvalidOperationException("Azure Service Bus connection string is required when MessageBusSettings:Provider is 'AzureServiceBus'.");
            }

            services.AddMassTransit(x =>
            {
                configureConsumers?.Invoke(x);

                x.UsingAzureServiceBus((ctx, cfg) =>
                {
                    cfg.Host(connectionString);
                    cfg.ConfigureEndpoints(ctx);
                });
            });

            // Bind IMessageBus → MassTransitMessageBus for all publishers
            services.AddScoped<IMessageBus, MassTransitMessageBus>();
        }
        else
        {
            // ── Zero-dependency mode: JsonFile-based bus ──────────────────────────
            // No MassTransit host is started; consumers continue to use the
            // JsonFileMessageBus's static subscription/watcher mechanism.
            services.AddSingleton<IMessageBus, JsonFileMessageBus>();
        }

        return services;
    }
}
