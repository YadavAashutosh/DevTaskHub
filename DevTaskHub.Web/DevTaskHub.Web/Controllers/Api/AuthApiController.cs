using DevTaskHub.Web.DTOs.Auth;
using DevTaskHub.Web.Services;
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
        /// Registers a new corporate developer or team member with PBKDF2 credential protection.
        /// </summary>
        /// <param name="request">Registration credentials and identity attributes.</param>
        /// <returns>Sanitized user account profile.</returns>
        /// <response code="201">User account provisioned successfully.</response>
        /// <response code="400">Input validation failed or email already registered.</response>
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
        /// Authenticates user credentials and returns an enterprise JWT Bearer token with claims.
        /// </summary>
        /// <param name="request">User login credentials.</param>
        /// <returns>Authentication response payload with JWT access token and profile.</returns>
        /// <response code="200">Credentials authenticated successfully.</response>
        /// <response code="400">Validation failed on request body.</response>
        /// <response code="401">Invalid credentials provided.</response>
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
                return Ok(response);
            }
            catch (UnauthorizedAccessException ex)
            {
                _logger.LogWarning("Login attempt failed: {Message}", ex.Message);
                return Unauthorized(new { message = ex.Message });
            }
        }
    }
}
