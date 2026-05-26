using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using SecureSchoolForms.Core.Entities;
using SecureSchoolForms.Core.Interfaces;

namespace SecureSchoolForms.Core.Infrastructure;

public class EfFormRepository : IFormRepository
{
    private readonly SchoolFormsDbContext _dbContext;

    public EfFormRepository(SchoolFormsDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<Form?> GetFormByIdAsync(Guid formId)
    {
        return await _dbContext.Forms.FindAsync(formId);
    }

    public async Task<IEnumerable<Form>> GetAllFormsAsync()
    {
        return await _dbContext.Forms.ToListAsync();
    }

    public async Task<FormSubmission> SubmitFormAsync(FormSubmission submission)
    {
        // First check if form exists in db, if not, seed/add it to prevent foreign key issues
        var formExists = await _dbContext.Forms.AnyAsync(f => f.FormId == submission.FormId);
        if (!formExists)
        {
            var defaultForm = new Form
            {
                FormId = submission.FormId,
                Type = "Seeded Request Form",
                Status = "Published",
                CreatedAt = DateTime.UtcNow,
                CreatedBy = Guid.Empty
            };
            _dbContext.Forms.Add(defaultForm);
            await _dbContext.SaveChangesAsync();
        }

        var existing = await _dbContext.Submissions.FindAsync(submission.SubmissionId);
        if (existing != null)
        {
            _dbContext.Entry(existing).CurrentValues.SetValues(submission);
        }
        else
        {
            await _dbContext.Submissions.AddAsync(submission);
        }

        await _dbContext.SaveChangesAsync();
        return submission;
    }

    public async Task<FormSubmission?> GetSubmissionByIdAsync(Guid submissionId)
    {
        return await _dbContext.Submissions.FindAsync(submissionId);
    }

    public async Task<IEnumerable<FormSubmission>> GetSubmissionsByUserAsync(Guid userId)
    {
        return await _dbContext.Submissions
            .Where(s => s.UserId == userId)
            .ToListAsync();
    }
}
