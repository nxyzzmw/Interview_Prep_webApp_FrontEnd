import { useState } from 'react';
import type { FormEvent } from 'react';
import {
  extractAuthSession,
  loginRequest,
  registerRequest,
  type AuthSession,
  type RegisterPayload,
} from '../../api/AxiosInstance';

type RegisterProps = {
  onRegisterSuccess: (session: AuthSession) => void;
  onShowLogin: () => void;
};

const Register = ({ onRegisterSuccess, onShowLogin }: RegisterProps) => {
  const [formData, setFormData] = useState<RegisterPayload>({
    name: '',
    email: '',
    password: '',
    role: 'user',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage('');
    const name = formData.name.trim();
    const email = formData.email.trim().toLowerCase();
    const password = formData.password;
    const role = formData.role;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (name.length < 2) {
      setErrorMessage('Name must be at least 2 characters.');
      return;
    }

    if (!emailRegex.test(email)) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }

    if (role !== 'admin' && role !== 'user') {
      setErrorMessage('Please select a valid role.');
      return;
    }

    setIsSubmitting(true);

    try {
      await registerRequest({
        name,
        email,
        password,
        role,
      });
      const loginResponse = await loginRequest({
        email,
        password,
      });
      const session = extractAuthSession(loginResponse, email);
      onRegisterSuccess(session);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to register');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="auth-card">
      <h1>Register</h1>
      <p className="subtitle">Create your account</p>

      <form className="auth-form" onSubmit={handleSubmit}>
        <label htmlFor="name">Name</label>
        <input
          id="name"
          type="text"
          value={formData.name}
          onChange={(event) => setFormData((prev) => ({ ...prev, name: event.target.value }))}
          required
          placeholder="Enter full name"
        />

        <label htmlFor="register-email">Email</label>
        <input
          id="register-email"
          type="email"
          value={formData.email}
          onChange={(event) => setFormData((prev) => ({ ...prev, email: event.target.value }))}
          required
          placeholder="name@example.com"
        />

        <label htmlFor="register-password">Password</label>
        <input
          id="register-password"
          type="password"
          value={formData.password}
          onChange={(event) => setFormData((prev) => ({ ...prev, password: event.target.value }))}
          required
          minLength={6}
          placeholder="Enter password"
        />

        <label htmlFor="register-role">Role</label>
        <select
          id="register-role"
          value={formData.role}
          onChange={(event) =>
            setFormData((prev) => ({ ...prev, role: event.target.value as RegisterPayload['role'] }))
          }
        >
          <option value="admin">Admin</option>
          <option value="user">User</option>
        </select>

        {errorMessage ? <p className="error-message">{errorMessage}</p> : null}

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Registering...' : 'Register'}
        </button>
      </form>

      <p className="switch-auth">
        Already have an account?{' '}
        <button type="button" className="link-button" onClick={onShowLogin}>
          Login here
        </button>
      </p>
    </section>
  );
};

export default Register;
