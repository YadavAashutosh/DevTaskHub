using DevTaskHub.Web.DTOs.Auth;
using DevTaskHub.Web.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DevTaskHub.Web.Controllers.Api
{
    [ApiController]
    [Route("api/auth")]
    [Produces("application/json")]
    public class AuthApiController : ControllerBase
    {
        private readonly IAuthService _authService;
        private readonly ILogger<AuthApiController> _logger;

        public AuthApiController(IAuthService authService, ILogger<AuthApiController> logger)
        {
            _authService = authService;
            _logger = logger;
        }

        /// <summary>
        /// Registers a new developer or administrator account in the system.
        /// </summary>
        [HttpPost("register")]
        [ProducesResponseType(typeof(UserDto), StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> Register([FromBody] RegisterRequestDto request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            try
            {
                var newUser = await _authService.RegisterAsync(request);
                return StatusCode(StatusCodes.Status201Created, newUser);
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogWarning(ex, "Registration conflict: {Message}", ex.Message);
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Authenticates user credentials, returns in-memory JWT Bearer token, and attaches HttpOnly refresh cookie.
        /// </summary>
        [HttpPost("login")]
        [ProducesResponseType(typeof(AuthResponseDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> Login([FromBody] LoginRequestDto request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            try
            {
                var response = await _authService.LoginAsync(request);

                // Bank-Grade Security: Attach refresh token to HttpOnly cookie (immune to XSS)
                SetRefreshTokenCookie(response.RefreshToken);

                return Ok(response);
            }
            catch (UnauthorizedAccessException ex)
            {
                _logger.LogWarning("Login attempt failed: {Message}", ex.Message);
                return Unauthorized(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Rotates the refresh token. Reads from cookie or payload, mints fresh JWT access token.
        /// </summary>
        [HttpPost("refresh")]
        [ProducesResponseType(typeof(AuthResponseDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> RefreshToken([FromBody] RefreshTokenRequestDto? request)
        {
            // Read from request body or fallback to secure HttpOnly cookie
            var token = request?.RefreshToken ?? Request.Cookies["refreshToken"];

            if (string.IsNullOrWhiteSpace(token))
            {
                return Unauthorized(new { message = "No refresh token provided in payload or cookie." });
            }

            try
            {
                var response = await _authService.RefreshTokenAsync(new RefreshTokenRequestDto { RefreshToken = token });

                // Rotate and set fresh cookie
                SetRefreshTokenCookie(response.RefreshToken);

                return Ok(response);
            }
            catch (UnauthorizedAccessException ex)
            {
                _logger.LogWarning("Refresh token failure: {Message}", ex.Message);
                return Unauthorized(new { message = ex.Message });
            }
        }

        [HttpPost("logout")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public IActionResult Logout()
        {
            Response.Cookies.Delete("refreshToken", new CookieOptions
            {
                HttpOnly = true,
                Secure = Request.IsHttps,
                SameSite = SameSiteMode.Lax,
                Path = "/api/auth"
            });

            return Ok(new { message = "Logged out successfully. Refresh session terminated." });
        }

        /// <summary>
        /// Helper: Appends cryptographically secure HttpOnly cookie.
        /// </summary>
        private void SetRefreshTokenCookie(string refreshToken)
        {
            var cookieOptions = new CookieOptions
            {
                HttpOnly = true,
                Secure = Request.IsHttps, // Adapts to http (dev) and https (prod)
                SameSite = SameSiteMode.Lax,
                Expires = DateTime.UtcNow.AddDays(7),
                Path = "/api/auth"
            };

            Response.Cookies.Append("refreshToken", refreshToken, cookieOptions);
        }
    }
}
