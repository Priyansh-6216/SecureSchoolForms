using SecureSchoolForms.Core.Entities;

namespace SecureSchoolForms.Core.Interfaces;

public interface IFormRepository
{
    Task<Form?> GetFormByIdAsync(Guid formId);
    Task<IEnumerable<Form>> GetAllFormsAsync();
    Task<FormSubmission> SubmitFormAsync(FormSubmission submission);
    Task<FormSubmission?> GetSubmissionByIdAsync(Guid submissionId);
    Task<IEnumerable<FormSubmission>> GetSubmissionsByUserAsync(Guid userId);
}
