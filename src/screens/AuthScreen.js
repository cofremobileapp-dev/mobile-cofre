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
      style={styles.container}
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
            <Text style={styles.tagline}>
              Platform berbagi resep & video kuliner Indonesia
            </Text>
          </View>

          {/* Tab Switcher */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'login' && styles.activeTab]}
              onPress={() => setActiveTab('login')}
              disabled={isLoading}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, activeTab === 'login' && styles.activeTabText]}>
                Masuk
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'register' && styles.activeTab]}
              onPress={() => setActiveTab('register')}
              disabled={isLoading}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, activeTab === 'register' && styles.activeTabText]}>
                Daftar
              </Text>
            </TouchableOpacity>
          </View>

          {/* Form Section */}
          <View style={styles.formContainer}>
            {/* Name Field - Only for Register */}
            {activeTab === 'register' && (
              <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>Nama Lengkap</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="person-outline" size={20} color="#06402B" />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Masukkan nama lengkap"
                    placeholderTextColor="#9CA3AF"
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
                <Text style={styles.inputLabel}>Username</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="at-outline" size={20} color="#06402B" />
                  <TextInput
                    style={styles.textInput}
                    placeholder="username_anda"
                    placeholderTextColor="#9CA3AF"
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
              <Text style={styles.inputLabel}>Email</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="mail-outline" size={20} color="#06402B" />
                <TextInput
                  style={styles.textInput}
                  placeholder="contoh@email.com"
                  placeholderTextColor="#9CA3AF"
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
              <Text style={styles.inputLabel}>Password</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed-outline" size={20} color="#06402B" />
                <TextInput
                  style={styles.textInput}
                  placeholder="Minimal 8 karakter"
                  placeholderTextColor="#9CA3AF"
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
                    color="#9CA3AF"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Confirm Password - Only for Register */}
            {activeTab === 'register' && (
              <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>Konfirmasi Password</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="lock-closed-outline" size={20} color="#06402B" />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Ulangi password"
                    placeholderTextColor="#9CA3AF"
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
                      color="#9CA3AF"
                    />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
              onPress={activeTab === 'login' ? handleLogin : handleRegister}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Text style={styles.submitButtonText}>
                    {activeTab === 'login' ? 'Masuk Sekarang' : 'Daftar Sekarang'}
                  </Text>
                  <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                </>
              )}
            </TouchableOpacity>

            {/* Demo Mode Button - Only show on Login tab */}

            {/* Additional Info */}
            {activeTab === 'register' && (
              <Text style={styles.infoText}>
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
