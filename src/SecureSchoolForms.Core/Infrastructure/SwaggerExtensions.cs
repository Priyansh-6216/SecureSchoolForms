using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.OpenApi.Models;

namespace SecureSchoolForms.Core.Infrastructure;

public static class SwaggerExtensions
{
    public static IServiceCollection AddSwaggerDocumentation(this IServiceCollection services, string title, string version = "v1")
    {
        services.AddEndpointsApiExplorer();
        services.AddSwaggerGen(c =>
        {
            c.SwaggerDoc(version, new OpenApiInfo
            {
                Title = title,
                Version = version,
                Description = "SecureSchoolForms API documentation for developer onboarding and integration.",
            });
        });

        return services;
    }

    public static WebApplication UseSwaggerDocumentation(this WebApplication app, string serviceName, string version = "v1")
    {
        if (app.Environment.IsDevelopment())
        {
            app.UseSwagger();
            app.UseSwaggerUI(c =>
            {
                c.SwaggerEndpoint($"/swagger/{version}/swagger.json", $"{serviceName} API {version}");
                c.RoutePrefix = "swagger";
            });
        }

        return app;
    }
}
