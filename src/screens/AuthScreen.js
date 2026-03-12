import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';

const AuthScreen = () => {
  const [activeTab, setActiveTab] = useState('login'); // 'login' or 'register'
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirmation, setShowPasswordConfirmation] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login, register } = useAuth();
  const { colors } = useTheme();
  const { t } = useLanguage();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Mohon isi semua field');
      return;
    }

    setIsLoading(true);
    const result = await login(email, password);
    setIsLoading(false);

    if (!result.success) {
      Alert.alert('Login Gagal', result.error);
    }
  };

  const handleRegister = async () => {
    // Validate each field with specific messages
    if (!name.trim()) {
      Alert.alert('Error', 'Nama lengkap wajib diisi');
      return;
    }

    if (!username.trim()) {
      Alert.alert('Error', 'Username wajib diisi');
      return;
    }

    // Validate username format (only alphanumeric, dots, and underscores)
    const usernameRegex = /^[a-zA-Z0-9._]+$/;
    if (!usernameRegex.test(username)) {
      Alert.alert('Error', 'Username hanya boleh mengandung huruf, angka, titik, dan underscore');
      return;
    }

    if (username.length > 30) {
      Alert.alert('Error', 'Username maksimal 30 karakter');
      return;
    }

    if (!email.trim()) {
      Alert.alert('Error', 'Email wajib diisi');
      return;
    }

    if (!password) {
      Alert.alert('Error', 'Password wajib diisi');
      return;
    }

    if (password.length < 8) {
      Alert.alert('Error', 'Password minimal 8 karakter');
      return;
    }

    if (!passwordConfirmation) {
      Alert.alert('Error', 'Konfirmasi password wajib diisi');
      return;
    }

    if (password !== passwordConfirmation) {
      Alert.alert('Error', 'Password tidak cocok');
      return;
    }

    setIsLoading(true);
    const result = await register(name.trim(), username.trim(), email.trim(), password, passwordConfirmation);
    setIsLoading(false);

    if (!result.success) {
      Alert.alert('Registrasi Gagal', result.error);
    }
  };


  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.contentContainer}>
          {/* Logo Section */}
          <View style={styles.logoSection}>
            <Image
              source={require('../../assets/logo-login-register.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
            <Text style={[styles.tagline, { color: colors.textSecondary }]}>
              Platform berbagi resep & video kuliner Indonesia
            </Text>
          </View>

          {/* Tab Switcher */}
          <View style={[styles.tabContainer, { backgroundColor: colors.backgroundTertiary }]}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'login' && [styles.activeTab, { backgroundColor: colors.backgroundSecondary }]]}
              onPress={() => setActiveTab('login')}
              disabled={isLoading}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, { color: colors.textTertiary }, activeTab === 'login' && { color: colors.primary, fontWeight: '700' }]}>
                {t('login')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'register' && [styles.activeTab, { backgroundColor: colors.backgroundSecondary }]]}
              onPress={() => setActiveTab('register')}
              disabled={isLoading}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, { color: colors.textTertiary }, activeTab === 'register' && { color: colors.primary, fontWeight: '700' }]}>
                {t('register')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Form Section */}
          <View style={styles.formContainer}>
            {/* Name Field - Only for Register */}
            {activeTab === 'register' && (
              <View style={styles.inputWrapper}>
                <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>Nama Lengkap</Text>
                <View style={[styles.inputContainer, { backgroundColor: colors.backgroundTertiary, borderColor: colors.border }]}>
                  <Ionicons name="person-outline" size={20} color={colors.primary} />
                  <TextInput
                    style={[styles.textInput, { color: colors.textPrimary }]}
                    placeholder="Masukkan nama lengkap"
                    placeholderTextColor={colors.textTertiary}
                    value={name}
                    onChangeText={setName}
                    editable={!isLoading}
                    autoComplete="name"
                  />
                </View>
              </View>
            )}

            {/* Username Field - Only for Register */}
            {activeTab === 'register' && (
              <View style={styles.inputWrapper}>
                <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>Username</Text>
                <View style={[styles.inputContainer, { backgroundColor: colors.backgroundTertiary, borderColor: colors.border }]}>
                  <Ionicons name="at-outline" size={20} color={colors.primary} />
                  <TextInput
                    style={[styles.textInput, { color: colors.textPrimary }]}
                    placeholder="username_anda"
                    placeholderTextColor={colors.textTertiary}
                    value={username}
                    onChangeText={(text) => setUsername(text.toLowerCase().replace(/[^a-z0-9._]/g, ''))}
                    editable={!isLoading}
                    autoCapitalize="none"
                    autoComplete="username"
                    maxLength={30}
                  />
                </View>
              </View>
            )}

            {/* Email Field */}
            <View style={styles.inputWrapper}>
              <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>{t('email')}</Text>
              <View style={[styles.inputContainer, { backgroundColor: colors.backgroundTertiary, borderColor: colors.border }]}>
                <Ionicons name="mail-outline" size={20} color={colors.primary} />
                <TextInput
                  style={[styles.textInput, { color: colors.textPrimary }]}
                  placeholder="contoh@email.com"
                  placeholderTextColor={colors.textTertiary}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  editable={!isLoading}
                  autoComplete="email"
                />
              </View>
            </View>

            {/* Password Field */}
            <View style={styles.inputWrapper}>
              <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>{t('password')}</Text>
              <View style={[styles.inputContainer, { backgroundColor: colors.backgroundTertiary, borderColor: colors.border }]}>
                <Ionicons name="lock-closed-outline" size={20} color={colors.primary} />
                <TextInput
                  style={[styles.textInput, { color: colors.textPrimary }]}
                  placeholder="Minimal 8 karakter"
                  placeholderTextColor={colors.textTertiary}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  editable={!isLoading}
                  autoComplete="password"
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons
                    name={showPassword ? "eye-outline" : "eye-off-outline"}
                    size={20}
                    color={colors.textTertiary}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Confirm Password - Only for Register */}
            {activeTab === 'register' && (
              <View style={styles.inputWrapper}>
                <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>{t('confirmPassword')}</Text>
                <View style={[styles.inputContainer, { backgroundColor: colors.backgroundTertiary, borderColor: colors.border }]}>
                  <Ionicons name="lock-closed-outline" size={20} color={colors.primary} />
                  <TextInput
                    style={[styles.textInput, { color: colors.textPrimary }]}
                    placeholder="Ulangi password"
                    placeholderTextColor={colors.textTertiary}
                    value={passwordConfirmation}
                    onChangeText={setPasswordConfirmation}
                    secureTextEntry={!showPasswordConfirmation}
                    editable={!isLoading}
                    autoComplete="password"
                  />
                  <TouchableOpacity onPress={() => setShowPasswordConfirmation(!showPasswordConfirmation)}>
                    <Ionicons
                      name={showPasswordConfirmation ? "eye-outline" : "eye-off-outline"}
                      size={20}
                      color={colors.textTertiary}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitButton, { backgroundColor: colors.primary, shadowColor: colors.primary }, isLoading && styles.submitButtonDisabled]}
              onPress={activeTab === 'login' ? handleLogin : handleRegister}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Text style={styles.submitButtonText}>
                    {activeTab === 'login' ? t('login') : t('register')}
                  </Text>
                  <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                </>
              )}
            </TouchableOpacity>

            {/* Demo Mode Button - Only show on Login tab */}

            {/* Additional Info */}
            {activeTab === 'register' && (
              <Text style={[styles.infoText, { color: colors.textTertiary }]}>
                Dengan mendaftar, Anda menyetujui syarat & ketentuan yang berlaku
              </Text>
            )}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EDE8D0',
  },
  scrollContent: {
    flexGrow: 1,
    paddingVertical: 40,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 36,
  },
  logoImage: {
    width: 200,
    height: 200,
    marginBottom: 16,
  },
  tagline: {
    fontSize: 15,
    color: '#374151',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 32,
    fontWeight: '500',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#E8E8E0',
    borderRadius: 16,
    padding: 4,
    marginBottom: 32,
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  activeTabText: {
    color: '#06402B',
    fontWeight: '700',
  },
  formContainer: {
    gap: 20,
  },
  inputWrapper: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E8E8E0',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
  },
  submitButton: {
    backgroundColor: '#06402B',
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    shadowColor: '#06402B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  submitButtonDisabled: {
    backgroundColor: '#9CA3AF',
    shadowOpacity: 0.1,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  infoText: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 20,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#D1D5DB',
  },
  dividerText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '600',
    paddingHorizontal: 12,
  },
});

export default AuthScreen;
