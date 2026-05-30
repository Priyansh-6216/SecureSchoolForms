FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /source

# Copy solution file and project files first to restore dependencies
COPY SecureSchoolForms.sln .
COPY src/SecureSchoolForms.Core/SecureSchoolForms.Core.csproj src/SecureSchoolForms.Core/
COPY src/SecureSchoolForms.WorkflowEngine/SecureSchoolForms.WorkflowEngine.csproj src/SecureSchoolForms.WorkflowEngine/

RUN dotnet restore src/SecureSchoolForms.WorkflowEngine/SecureSchoolForms.WorkflowEngine.csproj

# Copy the rest of the source code
COPY src/SecureSchoolForms.Core/ src/SecureSchoolForms.Core/
COPY src/SecureSchoolForms.WorkflowEngine/ src/SecureSchoolForms.WorkflowEngine/

# Build and publish
WORKDIR /source/src/SecureSchoolForms.WorkflowEngine
RUN dotnet publish -c Release -o /app

# Run stage
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
COPY --from=build /app .
EXPOSE 5002
ENTRYPOINT ["dotnet", "SecureSchoolForms.WorkflowEngine.dll"]
