using System;
using System.IO;

namespace SecureSchoolForms.Core;

public static class SolutionDirectory
{
    private static string? _rootPath;

    public static string Path
    {
        get
        {
            if (_rootPath != null) return _rootPath;

            var current = AppDomain.CurrentDomain.BaseDirectory;
            while (!string.IsNullOrEmpty(current))
            {
                if (Directory.Exists(System.IO.Path.Combine(current, ".git")) || 
                    Directory.Exists(System.IO.Path.Combine(current, "src")))
                {
                    _rootPath = current;
                    return _rootPath;
                }
                var parent = Directory.GetParent(current);
                if (parent == null) break;
                current = parent.FullName;
            }

            // Fallback to CurrentDirectory
            _rootPath = Directory.GetCurrentDirectory();
            return _rootPath;
        }
    }
}
