namespace SecureSchoolForms.Core.Interfaces;

public interface IMessageBus
{
    Task PublishMessageAsync<T>(T message, string topicName);
}
