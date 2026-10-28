import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RegisterForm } from '../components/auth';
import type { RegisterRequestDto } from '../types';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleRegister = async (data: RegisterRequestDto) => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      // UX review delay (Day 7 me yahan real .NET API call aayegi)
      await new Promise((resolve) => setTimeout(resolve, 600));
      console.log('Register submission:', data);

      alert(`Account created successfully for ${data.fullName} as ${data.role}! Please sign in.`);
      navigate('/login');
    } catch {
      setErrorMessage('Registration failed. The corporate email may already be in use.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ padding: '2rem 1rem' }}>
      <RegisterForm
        onSubmit={handleRegister}
        isLoading={isLoading}
        errorMessage={errorMessage}
      />
    </div>
  );
};