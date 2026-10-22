using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);
// Add EF Core SQL Server DbContext
builder.Services.AddDbContext<DevTaskHub.Web.Data.AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));
// Register Service / Repository Layer
builder.Services.AddScoped<DevTaskHub.Web.Services.ITaskService, DevTaskHub.Web.Services.TaskService>();
builder.Services.AddScoped<DevTaskHub.Web.Services.IAuthService, DevTaskHub.Web.Services.AuthService>();

// Controllers, Views & Authorization Services
builder.Services.AddControllersWithViews();
builder.Services.AddAuthorization();

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
var app = builder.Build();
// Enterprise Global Exception Handling Middleware (First in pipeline)
app.UseMiddleware<DevTaskHub.Web.Middleware.GlobalExceptionMiddleware>();
// Configure the HTTP request pipeline.
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Home/Error");
    // The default HSTS value is 30 days. You may want to change this for production scenarios, see https://aka.ms/aspnetcore-hsts.
    app.UseHsts();
}
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "DevTask Hub API v1");
        c.RoutePrefix = "swagger";
    });
}

app.UseHttpsRedirection();
app.UseRouting();

app.UseAuthorization();

app.MapStaticAssets();

app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Home}/{action=Index}/{id?}")
    .WithStaticAssets();


app.Run();
