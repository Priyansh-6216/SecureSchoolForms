using MassTransit;
using SecureSchoolForms.Core.Interfaces;

namespace SecureSchoolForms.Core.Infrastructure;

/// <summary>
/// MassTransit-backed implementation of <see cref="IMessageBus"/>.
/// Delegates all publishing to MassTransit's <see cref="IPublishEndpoint"/>,
/// enabling transparent swap between RabbitMQ, Azure Service Bus, or in-memory transport.
/// </summary>
public class MassTransitMessageBus : IMessageBus
{
    private readonly IPublishEndpoint _publishEndpoint;

    public MassTransitMessageBus(IPublishEndpoint publishEndpoint)
    {
        _publishEndpoint = publishEndpoint;
    }

    /// <summary>
    /// Publishes the message to the configured MassTransit transport.
    /// The <paramref name="topicName"/> is included in the message headers for routing context,
    /// but MassTransit itself uses the message type for exchange/topic binding.
    /// </summary>
    public async Task PublishMessageAsync<T>(T message, string topicName)
    {
        await _publishEndpoint.Publish(message!, context =>
        {
            context.Headers.Set("topic-name", topicName);
        });
    }
}
