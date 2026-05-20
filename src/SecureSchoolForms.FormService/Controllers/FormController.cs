using Microsoft.AspNetCore.Mvc;
using SecureSchoolForms.Core.Entities;
using SecureSchoolForms.Core.Interfaces;
using SecureSchoolForms.Core.Events;

namespace SecureSchoolForms.FormService.Controllers;

[ApiController]
[Route("api/[controller]")]
public class FormController : ControllerBase
{
    private readonly IFormRepository _formRepository;
    private readonly IMessageBus _messageBus;

    public FormController(IFormRepository formRepository, IMessageBus messageBus)
    {
        _formRepository = formRepository;
        _messageBus = messageBus;
    }

    [HttpGet]
    public async Task<IActionResult> GetAvailableForms()
    {
        var forms = await _formRepository.GetAllFormsAsync();
        return Ok(forms);
    }

    [HttpPost("submit")]
    public async Task<IActionResult> SubmitForm([FromBody] FormSubmission submission)
    {
        // 1. Save submission to Cosmos DB / SQL
        submission.SubmissionId = Guid.NewGuid();
        submission.Status = "Submitted";
        submission.CreatedAt = DateTime.UtcNow;
        
        await _formRepository.SubmitFormAsync(submission);

        // 2. Publish Event to Azure Service Bus
        var formSubmittedEvent = new FormSubmittedEvent
        {
            SubmissionId = submission.SubmissionId,
            FormId = submission.FormId,
            UserId = submission.UserId,
            SubmittedAt = submission.CreatedAt,
            InitialStatus = "Submitted"
        };
        
        await _messageBus.PublishMessageAsync(formSubmittedEvent, "forms.submitted");

        return CreatedAtAction(nameof(GetSubmission), new { id = submission.SubmissionId }, submission);
    }

    [HttpGet("submissions/{id}")]
    public async Task<IActionResult> GetSubmission(Guid id)
    {
        var submission = await _formRepository.GetSubmissionByIdAsync(id);
        if (submission == null) return NotFound();
        return Ok(submission);
    }
}
