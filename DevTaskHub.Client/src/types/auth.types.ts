// 1. Backend Login Contract (Uses Corporate Email)
export interface LoginRequestDto {
  email: string;
  password: string;
}

// 2. Backend Register Contract (All 6 properties matching .NET RegisterRequestDto.cs)
export interface RegisterRequestDto {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: 'Developer' | 'Admin' | 'ProjectManager';
  gitHubUsername?: string | null; // Optional: GitHub PR tracking ke liye
}

// 3. Sanitized User Profile (Matches .NET UserDto.cs & User.cs)
export interface UserDto {
  userId: number;
  fullName: string;
  email: string;
  role: 'Developer' | 'Admin' | 'ProjectManager';
  gitHubUsername?: string | null;
  isActive: boolean;
  createdAt: string;
}

// 4. Authenticated Payload Contract (Matches .NET AuthResponseDto.cs)
export interface AuthResponseDto {
  token: string;
  refreshToken: string;
  tokenType: string; // "Bearer"
  expiresAtUtc: string;
  user: UserDto;
}

// 5. Token Rotation Contract (Matches .NET RefreshTokenRequestDto.cs)
export interface RefreshTokenRequestDto {
  refreshToken: string;
}

// 6. In-Memory Active Client Session State
export interface UserSession {
  user: UserDto | null;
  token: string | null;
  isAuthenticated: boolean;
}