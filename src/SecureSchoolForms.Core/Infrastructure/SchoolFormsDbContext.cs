using System;
using System.IO;
using Microsoft.EntityFrameworkCore;
using SecureSchoolForms.Core.Entities;

namespace SecureSchoolForms.Core.Infrastructure;

public class SchoolFormsDbContext : DbContext
{
    public DbSet<Form> Forms { get; set; } = null!;
    public DbSet<FormSubmission> Submissions { get; set; } = null!;
    public DbSet<WorkflowInstance> Workflows { get; set; } = null!;
    public DbSet<User> Users { get; set; } = null!;
    public DbSet<AuditLog> AuditLogs { get; set; } = null!;
    public DbSet<Document> Documents { get; set; } = null!;

    public SchoolFormsDbContext()
    {
    }

    public SchoolFormsDbContext(DbContextOptions<SchoolFormsDbContext> options)
        : base(options)
    {
    }

    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
    {
        if (!optionsBuilder.IsConfigured)
        {
            var dataDir = Path.Combine(SolutionDirectory.Path, ".data");
            if (!Directory.Exists(dataDir))
            {
                Directory.CreateDirectory(dataDir);
            }
            var dbPath = Path.Combine(dataDir, "school_forms.db");
            optionsBuilder.UseSqlite($"Data Source={dbPath}");
        }
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Configure Form
        modelBuilder.Entity<Form>(entity =>
        {
            entity.HasKey(e => e.FormId);
            entity.Property(e => e.Type).IsRequired().HasMaxLength(100);
            entity.Property(e => e.Status).IsRequired().HasMaxLength(50);
        });

        // Configure FormSubmission
        modelBuilder.Entity<FormSubmission>(entity =>
        {
            entity.HasKey(e => e.SubmissionId);
            entity.Property(e => e.Status).IsRequired().HasMaxLength(50);
            entity.Property(e => e.Data).IsRequired();
            
            // Map relation to Form
            entity.HasOne<Form>()
                  .WithMany()
                  .HasForeignKey(e => e.FormId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // Configure WorkflowInstance
        modelBuilder.Entity<WorkflowInstance>(entity =>
        {
            entity.HasKey(e => e.WorkflowId);
            entity.Property(e => e.CurrentStep).IsRequired().HasMaxLength(100);
            entity.Property(e => e.Status).IsRequired().HasMaxLength(50);

            // Map relation to FormSubmission
            entity.HasOne<FormSubmission>()
                  .WithMany()
                  .HasForeignKey(e => e.SubmissionId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // Configure User
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(e => e.UserId);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(100);
            entity.Property(e => e.Email).IsRequired().HasMaxLength(150);
            entity.Property(e => e.Role).IsRequired().HasMaxLength(50);
            entity.Property(e => e.SchoolId).HasMaxLength(100);
        });

        // Configure AuditLog
        modelBuilder.Entity<AuditLog>(entity =>
        {
            entity.HasKey(e => e.LogId);
            entity.Property(e => e.ActionType).IsRequired().HasMaxLength(100);
        });

        // Configure Document
        modelBuilder.Entity<Document>(entity =>
        {
            entity.HasKey(e => e.DocumentId);
            entity.Property(e => e.FileUrl).IsRequired().HasMaxLength(255);
            entity.Property(e => e.EncryptedKey).IsRequired().HasMaxLength(255);
            entity.Property(e => e.Status).HasMaxLength(50);
        });
    }
}
