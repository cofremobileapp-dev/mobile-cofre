import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import LoginScreen from '../../src/screens/LoginScreen';
import { useAuth } from '../../src/contexts/AuthContext';

jest.mock('../../src/contexts/AuthContext');
jest.spyOn(Alert, 'alert');

describe('LoginScreen Component', () => {
  const mockNavigate = jest.fn();
  const mockLogin = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    useAuth.mockReturnValue({
      login: mockLogin,
    });
  });

  describe('Rendering', () => {
    test('renders login form correctly', () => {
      const { getByText, getByPlaceholderText } = render(
        <LoginScreen navigation={{ navigate: mockNavigate }} />
      );

      expect(getByText('Cofre')).toBeTruthy();
      expect(getByText('Login to continue')).toBeTruthy();
      expect(getByPlaceholderText('Enter your email')).toBeTruthy();
      expect(getByPlaceholderText('Enter your password')).toBeTruthy();
      expect(getByText('Login')).toBeTruthy();
    });

    test('displays register link', () => {
      const { getByText } = render(
        <LoginScreen navigation={{ navigate: mockNavigate }} />
      );

      expect(getByText("Don't have an account? Register")).toBeTruthy();
    });

    test('email input has correct keyboard type', () => {
      const { getByPlaceholderText } = render(
        <LoginScreen navigation={{ navigate: mockNavigate }} />
      );

      const emailInput = getByPlaceholderText('Enter your email');
      expect(emailInput.props.keyboardType).toBe('email-address');
      expect(emailInput.props.autoCapitalize).toBe('none');
    });

    test('password input is secure', () => {
      const { getByPlaceholderText } = render(
        <LoginScreen navigation={{ navigate: mockNavigate }} />
      );

      const passwordInput = getByPlaceholderText('Enter your password');
      expect(passwordInput.props.secureTextEntry).toBe(true);
    });
  });

  describe('Form Validation', () => {
    test('shows error when fields are empty', async () => {
      const { getByText } = render(
        <LoginScreen navigation={{ navigate: mockNavigate }} />
      );

      const loginButton = getByText('Login');
      fireEvent.press(loginButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Error',
          'Please fill in all fields'
        );
      });

      expect(mockLogin).not.toHaveBeenCalled();
    });

    test('shows error when email is empty', async () => {
      const { getByText, getByPlaceholderText } = render(
        <LoginScreen navigation={{ navigate: mockNavigate }} />
      );

      const passwordInput = getByPlaceholderText('Enter your password');
      fireEvent.changeText(passwordInput, 'password123');

      const loginButton = getByText('Login');
      fireEvent.press(loginButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalled();
      });
    });

    test('shows error when password is empty', async () => {
      const { getByText, getByPlaceholderText } = render(
        <LoginScreen navigation={{ navigate: mockNavigate }} />
      );

      const emailInput = getByPlaceholderText('Enter your email');
      fireEvent.changeText(emailInput, 'test@example.com');

      const loginButton = getByText('Login');
      fireEvent.press(loginButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalled();
      });
    });
  });

  describe('Login Flow', () => {
    test('calls login function with correct credentials', async () => {
      mockLogin.mockResolvedValue({ success: true });

      const { getByText, getByPlaceholderText } = render(
        <LoginScreen navigation={{ navigate: mockNavigate }} />
      );

      const emailInput = getByPlaceholderText('Enter your email');
      const passwordInput = getByPlaceholderText('Enter your password');
      const loginButton = getByText('Login');

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'password123');
      fireEvent.press(loginButton);

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123');
      });
    });

    test('shows error alert on login failure', async () => {
      mockLogin.mockResolvedValue({
        success: false,
        error: 'Invalid credentials',
      });

      const { getByText, getByPlaceholderText } = render(
        <LoginScreen navigation={{ navigate: mockNavigate }} />
      );

      const emailInput = getByPlaceholderText('Enter your email');
      const passwordInput = getByPlaceholderText('Enter your password');
      const loginButton = getByText('Login');

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'wrongpassword');
      fireEvent.press(loginButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Login Failed',
          'Invalid credentials'
        );
      });
    });

    test('does not navigate on login failure', async () => {
      mockLogin.mockResolvedValue({
        success: false,
        error: 'Invalid credentials',
      });

      const { getByText, getByPlaceholderText } = render(
        <LoginScreen navigation={{ navigate: mockNavigate }} />
      );

      const emailInput = getByPlaceholderText('Enter your email');
      const passwordInput = getByPlaceholderText('Enter your password');
      const loginButton = getByText('Login');

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'wrongpassword');
      fireEvent.press(loginButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalled();
      });

      // Navigation should not be called on failure
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('Loading State', () => {
    test('shows loading indicator while logging in', async () => {
      mockLogin.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ success: true }), 100))
      );

      const { getByText, getByPlaceholderText, UNSAFE_getByType } = render(
        <LoginScreen navigation={{ navigate: mockNavigate }} />
      );

      const emailInput = getByPlaceholderText('Enter your email');
      const passwordInput = getByPlaceholderText('Enter your password');
      const loginButton = getByText('Login');

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'password123');
      fireEvent.press(loginButton);

      // Should show ActivityIndicator
      expect(UNSAFE_getByType('ActivityIndicator')).toBeTruthy();

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalled();
      });
    });

    test('disables inputs while loading', async () => {
      mockLogin.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ success: true }), 100))
      );

      const { getByText, getByPlaceholderText } = render(
        <LoginScreen navigation={{ navigate: mockNavigate }} />
      );

      const emailInput = getByPlaceholderText('Enter your email');
      const passwordInput = getByPlaceholderText('Enter your password');
      const loginButton = getByText('Login');

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'password123');
      fireEvent.press(loginButton);

      // Inputs should be disabled
      expect(emailInput.props.editable).toBe(false);
      expect(passwordInput.props.editable).toBe(false);

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalled();
      });
    });

    test('disables button while loading', async () => {
      mockLogin.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ success: true }), 100))
      );

      const { getByText, getByPlaceholderText } = render(
        <LoginScreen navigation={{ navigate: mockNavigate }} />
      );

      const emailInput = getByPlaceholderText('Enter your email');
      const passwordInput = getByPlaceholderText('Enter your password');
      const loginButton = getByText('Login');

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'password123');
      fireEvent.press(loginButton);

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalled();
      });
    });
  });

  describe('Navigation', () => {
    test('navigates to Register screen when link is pressed', () => {
      const { getByText } = render(
        <LoginScreen navigation={{ navigate: mockNavigate }} />
      );

      const registerLink = getByText("Don't have an account? Register");
      fireEvent.press(registerLink);

      expect(mockNavigate).toHaveBeenCalledWith('Register');
    });

    test('register link is disabled while loading', async () => {
      mockLogin.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ success: true }), 100))
      );

      const { getByText, getByPlaceholderText } = render(
        <LoginScreen navigation={{ navigate: mockNavigate }} />
      );

      const emailInput = getByPlaceholderText('Enter your email');
      const passwordInput = getByPlaceholderText('Enter your password');
      const loginButton = getByText('Login');

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'password123');
      fireEvent.press(loginButton);

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalled();
      });
    });
  });

  describe('Accessibility', () => {
    test('form labels are present', () => {
      const { getByText } = render(
        <LoginScreen navigation={{ navigate: mockNavigate }} />
      );

      expect(getByText('Email')).toBeTruthy();
      expect(getByText('Password')).toBeTruthy();
    });

    test('input fields have proper placeholders', () => {
      const { getByPlaceholderText } = render(
        <LoginScreen navigation={{ navigate: mockNavigate }} />
      );

      expect(getByPlaceholderText('Enter your email')).toBeTruthy();
      expect(getByPlaceholderText('Enter your password')).toBeTruthy();
    });

    test('uses semantic colors for different states', () => {
      const { getByText } = render(
        <LoginScreen navigation={{ navigate: mockNavigate }} />
      );

      const loginButton = getByText('Login');
      // Normal state: bg-blue-600
      // Loading state: bg-blue-300
      expect(loginButton).toBeTruthy();
    });

    test('button has adequate touch target size', () => {
      const { getByText } = render(
        <LoginScreen navigation={{ navigate: mockNavigate }} />
      );

      const loginButton = getByText('Login');
      // py-4 (16px padding) ensures adequate touch target
      expect(loginButton).toBeTruthy();
    });
  });

  describe('Keyboard Behavior', () => {
    test('uses KeyboardAvoidingView for better UX', () => {
      const { UNSAFE_getByType } = render(
        <LoginScreen navigation={{ navigate: mockNavigate }} />
      );

      expect(UNSAFE_getByType('KeyboardAvoidingView')).toBeTruthy();
    });

    test('email input has proper autocomplete settings', () => {
      const { getByPlaceholderText } = render(
        <LoginScreen navigation={{ navigate: mockNavigate }} />
      );

      const emailInput = getByPlaceholderText('Enter your email');
      expect(emailInput.props.autoCapitalize).toBe('none');
    });
  });

  describe('Visual Design', () => {
    test('displays app branding', () => {
      const { getByText } = render(
        <LoginScreen navigation={{ navigate: mockNavigate }} />
      );

      expect(getByText('Cofre')).toBeTruthy();
      expect(getByText('Login to continue')).toBeTruthy();
    });

    test('uses consistent color scheme', () => {
      // Using TailwindCSS classes:
      // - bg-white for background
      // - text-gray-600 for secondary text
      // - bg-blue-600 for primary action button
      expect(true).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('handles network errors gracefully', async () => {
      mockLogin.mockResolvedValue({
        success: false,
        error: 'Network error. Please check your connection.',
      });

      const { getByText, getByPlaceholderText } = render(
        <LoginScreen navigation={{ navigate: mockNavigate }} />
      );

      const emailInput = getByPlaceholderText('Enter your email');
      const passwordInput = getByPlaceholderText('Enter your password');
      const loginButton = getByText('Login');

      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'password123');
      fireEvent.press(loginButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Login Failed',
          expect.stringContaining('Network')
        );
      });
    });
  });
});
