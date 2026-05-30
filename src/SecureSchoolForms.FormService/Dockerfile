FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /source

# Copy solution file and project files first to restore dependencies
COPY SecureSchoolForms.sln .
COPY src/SecureSchoolForms.Core/SecureSchoolForms.Core.csproj src/SecureSchoolForms.Core/
COPY src/SecureSchoolForms.FormService/SecureSchoolForms.FormService.csproj src/SecureSchoolForms.FormService/

RUN dotnet restore src/SecureSchoolForms.FormService/SecureSchoolForms.FormService.csproj

# Copy the rest of the source code
COPY src/SecureSchoolForms.Core/ src/SecureSchoolForms.Core/
COPY src/SecureSchoolForms.FormService/ src/SecureSchoolForms.FormService/

# Build and publish
WORKDIR /source/src/SecureSchoolForms.FormService
RUN dotnet publish -c Release -o /app

# Run stage
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
COPY --from=build /app .
EXPOSE 5001
ENTRYPOINT ["dotnet", "SecureSchoolForms.FormService.dll"]
