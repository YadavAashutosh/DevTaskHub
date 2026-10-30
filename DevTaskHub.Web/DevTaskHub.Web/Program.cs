using System.Text;
using Azure.Identity;
using DevTaskHub.Web.Settings;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

// --- 1. AZURE KEY VAULT CONNECT ---
var keyVaultUri = builder.Configuration["KeyVault:VaultUri"];
if (!string.IsNullOrWhiteSpace(keyVaultUri))
{
    try
    {
        builder.Configuration.AddAzureKeyVault(
            new Uri(keyVaultUri),
            new DefaultAzureCredential());
    }
    catch (Exception)
    {
        // Safe Fallback: Cloud vault unreachable, seamlessly fall back to local configuration
    }
}

// --- 2. FETCH DB CONNECTION SECURELY ---
var connectionString = builder.Configuration["DbConnectionString"]
                       ?? builder.Configuration.GetConnectionString("DefaultConnection");

builder.Services.AddDbContext<DevTaskHub.Web.Data.AppDbContext>(options =>
    options.UseSqlServer(connectionString));

// --- 3. FETCH JWT SETTINGS SECURELY ---
builder.Services.Configure<JwtSettings>(builder.Configuration.GetSection(JwtSettings.SectionName));
builder.Services.PostConfigure<JwtSettings>(options =>
{
    var vaultJwtKey = builder.Configuration["JwtSecretKey"];
    if (!string.IsNullOrWhiteSpace(vaultJwtKey))
    {
        options.Key = vaultJwtKey;
    }
});

// Register Service / Repository Layer
builder.Services.AddScoped<DevTaskHub.Web.Services.ITaskService, DevTaskHub.Web.Services.TaskService>();
builder.Services.AddScoped<DevTaskHub.Web.Services.IAuthService, DevTaskHub.Web.Services.AuthService>();
builder.Services.AddScoped<DevTaskHub.Web.Services.IJwtTokenGenerator, DevTaskHub.Web.Services.JwtTokenGenerator>();
builder.Services.AddSingleton<DevTaskHub.Web.Services.IKeyVaultService, DevTaskHub.Web.Services.KeyVaultService>();

// --- 3B. HTTP CLIENT & GITHUB SERVICE REGISTRATION ---
// Read optional GitHub PAT for 5,000 req/hr (unauthenticated = only 60 req/hr)
var gitHubToken = builder.Configuration["GitHub:Token"];
builder.Services.AddHttpClient("GitHubClient", client =>
{
    client.BaseAddress = new Uri("https://api.github.com/");
    client.DefaultRequestHeaders.Add("User-Agent", "DevTaskHub-Platform/1.0");
    client.DefaultRequestHeaders.Add("Accept", "application/vnd.github.v3+json");
    if (!string.IsNullOrWhiteSpace(gitHubToken))
    {
        client.DefaultRequestHeaders.Add("Authorization", $"Bearer {gitHubToken}");
    }
});
builder.Services.AddScoped<DevTaskHub.Web.Services.IGitHubService, DevTaskHub.Web.Services.GitHubService>();

// In-Memory Cache for GitHub API responses (10-min TTL to avoid 60 req/hr limit)
builder.Services.AddMemoryCache();

// --- 4. JWT AUTHENTICATION CONFIGURATION ---
var jwtSection = builder.Configuration.GetSection(JwtSettings.SectionName);
var jwtSettings = jwtSection.Get<JwtSettings>() ?? new JwtSettings();
var jwtKey = builder.Configuration["JwtSecretKey"] ?? jwtSettings.Key;

if (string.IsNullOrWhiteSpace(jwtKey))
{
    throw new InvalidOperationException("Fatal Security Error: JWT signing key is not configured.");
}

var keyBytes = Encoding.UTF8.GetBytes(jwtKey);

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = false;
    options.SaveToken = true;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(keyBytes),
        ValidateIssuer = true,
        ValidIssuer = jwtSettings.Issuer,
        ValidateAudience = true,
        ValidAudience = jwtSettings.Audience,
        ValidateLifetime = true,
        ClockSkew = TimeSpan.Zero
    };
});

builder.Services.AddAuthorization();

// --- CORS POLICY (Supports Secure Cookie Exchange with React SPA) ---
builder.Services.AddCors(options =>
{
    options.AddPolicy("DevTaskHubCorsPolicy", policy =>
    {
        policy.WithOrigins("http://localhost:5173", "https://localhost:5173")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

// Controllers & Views (with JSON Cycle Protection)
builder.Services.AddControllersWithViews()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
    });

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new Microsoft.OpenApi.OpenApiInfo { Title = "DevTaskHub API", Version = "v1" });

    // Swagger UI par "Authorize" Lock button enable karna
    c.AddSecurityDefinition("Bearer", new Microsoft.OpenApi.OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using Bearer scheme. Enter 'Bearer {token}'",
        Name = "Authorization",
        In = Microsoft.OpenApi.ParameterLocation.Header,
        Type = Microsoft.OpenApi.SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT"
    });

    c.AddSecurityRequirement(document => new Microsoft.OpenApi.OpenApiSecurityRequirement
    {
        {
            new Microsoft.OpenApi.OpenApiSecuritySchemeReference("Bearer", document),
            new List<string>()
        }
    });
});

var app = builder.Build();

// Enterprise Global Exception Handling Middleware (First in pipeline)
app.UseMiddleware<DevTaskHub.Web.Middleware.GlobalExceptionMiddleware>();

// Configure the HTTP request pipeline.
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Home/Error");
    app.UseHsts();
}
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseRouting();

// 🌐 CORS must execute after Routing and before Authentication/Authorization
app.UseCors("DevTaskHubCorsPolicy");

// 🛡️ JWT Authentication pehle execute hogi, phir Authorization (Roles)
app.UseAuthentication();
app.UseAuthorization();

app.MapStaticAssets();

app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Home}/{action=Index}/{id?}")
    .WithStaticAssets();

app.Run();
