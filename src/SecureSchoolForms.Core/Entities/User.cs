namespace SecureSchoolForms.Core.Entities;

public class User
{
    public Guid UserId { get; set; }
    public required string Name { get; set; }
    public required string Email { get; set; }
    public required string Role { get; set; } // e.g. Student, Parent, Teacher, Admin, District Officer
    public string? SchoolId { get; set; }
    public DateTime CreatedAt { get; set; }
}
