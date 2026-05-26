using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using SecureSchoolForms.Core.Entities;
using SecureSchoolForms.Core.Interfaces;

namespace SecureSchoolForms.Core.Infrastructure;

public class EfWorkflowRepository : IWorkflowRepository
{
    private readonly SchoolFormsDbContext _dbContext;

    public EfWorkflowRepository(SchoolFormsDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<WorkflowInstance> CreateWorkflowInstanceAsync(WorkflowInstance instance)
    {
        var existing = await _dbContext.Workflows.FindAsync(instance.WorkflowId);
        if (existing != null)
        {
            _dbContext.Entry(existing).CurrentValues.SetValues(instance);
        }
        else
        {
            await _dbContext.Workflows.AddAsync(instance);
        }

        await _dbContext.SaveChangesAsync();
        return instance;
    }

    public async Task<WorkflowInstance?> GetWorkflowInstanceAsync(Guid workflowId)
    {
        return await _dbContext.Workflows.FindAsync(workflowId);
    }

    public async Task UpdateWorkflowStatusAsync(Guid workflowId, string step, string status, Guid? nextAssignee)
    {
        var instance = await _dbContext.Workflows.FindAsync(workflowId);
        if (instance != null)
        {
            instance.CurrentStep = step;
            instance.Status = status;
            instance.AssignedTo = nextAssignee;
            instance.UpdatedAt = DateTime.UtcNow;

            // Also update matching submission status
            var submission = await _dbContext.Submissions.FindAsync(instance.SubmissionId);
            if (submission != null)
            {
                submission.Status = status == "Completed" ? "Approved" : status == "Rejected" ? "Rejected" : $"Review ({step})";
                submission.UpdatedAt = DateTime.UtcNow;
            }

            await _dbContext.SaveChangesAsync();
        }
    }

    public async Task<IEnumerable<WorkflowInstance>> GetPendingApprovalsForUserAsync(Guid userId)
    {
        // A pending approval is in InProgress status
        return await _dbContext.Workflows
            .Where(w => w.Status == "InProgress")
            .ToListAsync();
    }
}
