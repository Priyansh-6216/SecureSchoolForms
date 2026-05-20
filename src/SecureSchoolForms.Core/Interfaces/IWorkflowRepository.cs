using SecureSchoolForms.Core.Entities;

namespace SecureSchoolForms.Core.Interfaces;

public interface IWorkflowRepository
{
    Task<WorkflowInstance> CreateWorkflowInstanceAsync(WorkflowInstance instance);
    Task<WorkflowInstance?> GetWorkflowInstanceAsync(Guid workflowId);
    Task UpdateWorkflowStatusAsync(Guid workflowId, string step, string status, Guid? nextAssignee);
    Task<IEnumerable<WorkflowInstance>> GetPendingApprovalsForUserAsync(Guid userId);
}
