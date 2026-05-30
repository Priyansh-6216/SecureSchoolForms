FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /source

# Copy solution file and project files first to restore dependencies
COPY SecureSchoolForms.sln .
COPY src/SecureSchoolForms.Core/SecureSchoolForms.Core.csproj src/SecureSchoolForms.Core/
COPY src/SecureSchoolForms.DocumentService/SecureSchoolForms.DocumentService.csproj src/SecureSchoolForms.DocumentService/

RUN dotnet restore src/SecureSchoolForms.DocumentService/SecureSchoolForms.DocumentService.csproj

# Copy the rest of the source code
COPY src/SecureSchoolForms.Core/ src/SecureSchoolForms.Core/
COPY src/SecureSchoolForms.DocumentService/ src/SecureSchoolForms.DocumentService/

# Build and publish
WORKDIR /source/src/SecureSchoolForms.DocumentService
RUN dotnet publish -c Release -o /app

# Run stage
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
COPY --from=build /app .
EXPOSE 5006
ENTRYPOINT ["dotnet", "SecureSchoolForms.DocumentService.dll"]
