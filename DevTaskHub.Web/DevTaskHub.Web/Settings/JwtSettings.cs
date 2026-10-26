namespace DevTaskHub.Web.Settings
{
    /// <summary>
    /// Strongly-typed enterprise JWT options configuration.
    /// Populated from Azure Key Vault / environment settings.
    /// </summary>
    public class JwtSettings
    {
        public const string SectionName = "JwtSettings";

        public string Key { get; set; } = string.Empty;
        public string Issuer { get; set; } = "DevTaskHubApi";
        public string Audience { get; set; } = "DevTaskHubClient";
        public int DurationInMinutes { get; set; } = 60;
    }
}