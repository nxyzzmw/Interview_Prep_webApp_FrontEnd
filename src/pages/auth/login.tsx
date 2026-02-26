import { useState } from 'react';
import type { FormEvent } from 'react';
import {
  extractAuthSession,
  loginRequest,
  type AuthSession,
  type LoginPayload,
} from '../../api/AxiosInstance';

type LoginProps = {
  onLoginSuccess: (session: AuthSession) => void;
  onShowRegister: () => void;
};

const Login = ({ onLoginSuccess, onShowRegister }: LoginProps) => {
  const [formData, setFormData] = useState<LoginPayload>({
    email: '',
    password: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage('');
    const email = formData.email.trim().toLowerCase();
    const password = formData.password;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await loginRequest({
        email,
        password,
      });
      const session = extractAuthSession(response, email);
      onLoginSuccess(session);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to login');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="auth-card">
      <h1>Login</h1>
      <p className="subtitle">Sign in with your account</p>

      <form className="auth-form" onSubmit={handleSubmit}>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={formData.email}
          onChange={(event) => setFormData((prev) => ({ ...prev, email: event.target.value }))}
          required
          placeholder="name@example.com"
        />

        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          value={formData.password}
          onChange={(event) => setFormData((prev) => ({ ...prev, password: event.target.value }))}
          required
          minLength={6}
          placeholder="Enter password"
        />

        {errorMessage ? <p className="error-message">{errorMessage}</p> : null}

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Logging in...' : 'Login'}
        </button>
      </form>

      <p className="switch-auth">
        New user?{' '}
        <button type="button" className="link-button" onClick={onShowRegister}>
          Register here
        </button>
      </p>
    </section>
  );
};

export default Login;
