using System;
using System.Net;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using DevTaskHub.Web.Data;
using DevTaskHub.Web.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace DevTaskHub.Tests
{
    public class FakeHttpClientFactory : IHttpClientFactory
    {
        private readonly HttpClient _client;

        public FakeHttpClientFactory(HttpClient client)
        {
            _client = client;
        }

        public HttpClient CreateClient(string name)
        {
            return _client;
        }
    }

    public class MockHttpMessageHandler : HttpMessageHandler
    {
        private readonly HttpStatusCode _statusCode;

        public MockHttpMessageHandler(HttpStatusCode statusCode)
        {
            _statusCode = statusCode;
        }

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            return Task.FromResult(new HttpResponseMessage
            {
                StatusCode = _statusCode,
                Content = new StringContent("{}")
            });
        }
    }

    public class GitHubValidationTests
    {
        private AppDbContext CreateInMemoryDbContext()
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;

            return new AppDbContext(options);
        }

        [Fact]
        public async Task VerifyUserExistsAsync_ReturnsFalse_ForEmptyOrWhitespaceUsername()
        {
            // Arrange
            using var context = CreateInMemoryDbContext();
            var client = new HttpClient(new MockHttpMessageHandler(HttpStatusCode.OK))
            {
                BaseAddress = new Uri("https://api.github.com/")
            };
            var factory = new FakeHttpClientFactory(client);
            var cache = new MemoryCache(new MemoryCacheOptions());
            var logger = NullLogger<GitHubService>.Instance;

            var service = new GitHubService(factory, context, logger, cache);

            // Act & Assert
            Assert.False(await service.VerifyUserExistsAsync(""));
            Assert.False(await service.VerifyUserExistsAsync("   "));
        }

        [Fact]
        public async Task VerifyUserExistsAsync_ReturnsFalse_WhenUserNotFound()
        {
            // Arrange - 404 NotFound
            using var context = CreateInMemoryDbContext();
            var client = new HttpClient(new MockHttpMessageHandler(HttpStatusCode.NotFound))
            {
                BaseAddress = new Uri("https://api.github.com/")
            };
            var factory = new FakeHttpClientFactory(client);
            var cache = new MemoryCache(new MemoryCacheOptions());
            var logger = NullLogger<GitHubService>.Instance;

            var service = new GitHubService(factory, context, logger, cache);

            // Act
            var result = await service.VerifyUserExistsAsync("nonexistent-devtaskhub-user-9999");

            // Assert
            Assert.False(result);
        }

        [Fact]
        public async Task VerifyUserExistsAsync_ReturnsTrue_WhenUserExists()
        {
            // Arrange - 200 OK
            using var context = CreateInMemoryDbContext();
            var client = new HttpClient(new MockHttpMessageHandler(HttpStatusCode.OK))
            {
                BaseAddress = new Uri("https://api.github.com/")
            };
            var factory = new FakeHttpClientFactory(client);
            var cache = new MemoryCache(new MemoryCacheOptions());
            var logger = NullLogger<GitHubService>.Instance;

            var service = new GitHubService(factory, context, logger, cache);

            // Act
            var result = await service.VerifyUserExistsAsync("YadavAashutosh");

            // Assert
            Assert.True(result);
        }

        [Theory]
        [InlineData("https://github.com/dotnet/aspnetcore/pull/1234", "dotnet", "aspnetcore", 1234)]
        [InlineData("https://github.com/YadavAashutosh/DevTaskHub/pull/7", "YadavAashutosh", "DevTaskHub", 7)]
        [InlineData("invalid-url", null, null, null)]
        [InlineData("", null, null, null)]
        public void ParseGitHubPrUrl_ExtractsComponentsCorrectly(string? url, string? expectedOwner, string? expectedRepo, int? expectedPr)
        {
            // Act
            var (owner, repo, prNumber) = GitHubService.ParseGitHubPrUrl(url);

            // Assert
            Assert.Equal(expectedOwner, owner);
            Assert.Equal(expectedRepo, repo);
            Assert.Equal(expectedPr, prNumber);
        }
    }
}
