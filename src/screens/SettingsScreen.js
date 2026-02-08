import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ScrollView,
  StyleSheet,
  TextInput,
  Modal,
  Switch,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/ApiService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';

const SettingsScreen = ({ navigation }) => {
  const { user, logout } = useAuth();
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [editName, setEditName] = useState(user?.name || '');
  const [editEmail, setEditEmail] = useState(user?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Settings states
  const [pushNotifications, setPushNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [privateAccount, setPrivateAccount] = useState(false);

  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      Alert.alert('Error', 'Nama tidak boleh kosong');
      return;
    }

    if (!editEmail.trim()) {
      Alert.alert('Error', 'Email tidak boleh kosong');
      return;
    }

    setIsLoading(true);
    try {
      await apiService.updateProfile({ name: editName, email: editEmail });

      Alert.alert('Sukses', 'Profil berhasil diperbarui', [
        {
          text: 'OK',
          onPress: () => setShowEditProfile(false),
        },
      ]);
    } catch (error) {
      console.error('Error updating profile:', error);
      const errorMessage = error.response?.data?.message || 'Gagal memperbarui profil';
      Alert.alert('Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Error', 'Semua field harus diisi');
      return;
    }

    if (newPassword.length < 8) {
      Alert.alert('Error', 'Password baru minimal 8 karakter');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Password baru dan konfirmasi tidak cocok');
      return;
    }

    setIsLoading(true);
    try {
      await apiService.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
        new_password_confirmation: confirmPassword
      });

      Alert.alert('Sukses', 'Password berhasil diubah', [
        {
          text: 'OK',
          onPress: () => {
            setShowChangePassword(false);
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
          },
        },
      ]);
    } catch (error) {
      console.error('Error changing password:', error);
      const errorMessage = error.response?.data?.message || 'Gagal mengubah password. Pastikan password lama benar.';
      Alert.alert('Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Keluar',
      'Apakah Anda yakin ingin keluar dari akun Anda?',
      [
        {
          text: 'Batal',
          style: 'cancel',
        },
        {
          text: 'Keluar',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
              console.log('✅ Logout successful');
            } catch (error) {
              console.error('❌ Logout error:', error);
              Alert.alert('Error', 'Gagal logout. Silakan coba lagi.');
            }
          },
        },
      ]
    );
  };

  const handleClearCache = () => {
    Alert.alert(
      'Hapus Cache',
      'Ini akan menghapus semua data cache. File yang sudah diundload akan dihapus. Lanjutkan?',
      [
        {
          text: 'Batal',
          style: 'cancel',
        },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoading(true);

              // Clear AsyncStorage (except auth token and theme)
              const keys = await AsyncStorage.getAllKeys();
              const keysToRemove = keys.filter(k =>
                k !== 'authToken' &&
                k !== '@app_theme' &&
                k !== 'userData'
              );
              await AsyncStorage.multiRemove(keysToRemove);

              // Clear file cache
              const cacheDir = FileSystem.cacheDirectory;
              if (cacheDir) {
                const files = await FileSystem.readDirectoryAsync(cacheDir);
                for (const file of files) {
                  await FileSystem.deleteAsync(`${cacheDir}${file}`, {
                    idempotent: true
                  });
                }
              }

              Alert.alert('Berhasil', 'Cache berhasil dihapus');
            } catch (error) {
              console.error('Error clearing cache:', error);
              Alert.alert('Error', 'Gagal menghapus cache');
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Hapus Akun',
      'Apakah Anda yakin ingin menghapus akun? Tindakan ini tidak dapat dibatalkan dan semua data Anda akan hilang.',
      [
        {
          text: 'Batal',
          style: 'cancel',
        },
        {
          text: 'Lanjutkan',
          style: 'destructive',
          onPress: () => {
            setShowDeleteAccount(true);
          },
        },
      ]
    );
  };

  const confirmDeleteAccount = async () => {
    if (!deletePassword.trim()) {
      Alert.alert('Error', 'Password harus diisi');
      return;
    }

    try {
      setIsLoading(true);
      await apiService.deleteAccount(deletePassword);

      setShowDeleteAccount(false);
      setDeletePassword('');

      Alert.alert(
        'Akun Dihapus',
        'Akun Anda telah berhasil dihapus',
        [
          {
            text: 'OK',
            onPress: async () => {
              try {
                await logout();
              } catch (error) {
                console.error('❌ Logout error after delete:', error);
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error deleting account:', error);
      const errorMessage = error.response?.status === 401
        ? 'Password salah'
        : error.response?.data?.message || 'Gagal menghapus akun';
      Alert.alert('Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const settingsSections = [
    {
      title: 'Akun',
      items: [
        {
          icon: 'person-outline',
          label: 'Edit Profil',
          subtitle: 'Ubah nama dan email',
          onPress: () => setShowEditProfile(true),
        },
        {
          icon: 'lock-closed-outline',
          label: 'Ganti Password',
          subtitle: 'Ubah password akun Anda',
          onPress: () => setShowChangePassword(true),
        },
      ],
    },
    {
      title: 'Pengaturan Aplikasi',
      items: [
        {
          icon: 'color-palette-outline',
          label: 'Tema Aplikasi',
          subtitle: 'Mode terang, gelap, atau otomatis',
          onPress: () => navigation.navigate('ThemeSettings'),
        },
        {
          icon: 'notifications-outline',
          label: 'Notifikasi',
          subtitle: 'Kelola preferensi notifikasi',
          onPress: () => navigation.navigate('NotificationSettings'),
        },
        {
          icon: 'shield-outline',
          label: 'Privasi Akun',
          subtitle: 'Atur privasi akun Anda',
          onPress: () => navigation.navigate('AccountPrivacy'),
        },
        {
          icon: 'globe-outline',
          label: 'Bahasa',
          subtitle: 'Pilih bahasa aplikasi',
          onPress: () => navigation.navigate('Language'),
        },
        {
          icon: 'server-outline',
          label: 'Data & Penyimpanan',
          subtitle: 'Kelola penggunaan data',
          onPress: () => navigation.navigate('DataManagement'),
        },
        {
          icon: 'ban-outline',
          label: 'Pengguna yang Diblokir',
          subtitle: 'Kelola daftar blokir',
          onPress: () => navigation.navigate('BlockedAccounts'),
        },
        {
          icon: 'trash-bin-outline',
          label: 'Hapus Cache',
          subtitle: 'Bersihkan data cache aplikasi',
          onPress: handleClearCache,
        },
      ],
    },
    {
      title: 'Lainnya',
      items: [
        {
          icon: 'information-circle-outline',
          label: 'Tentang Aplikasi',
          subtitle: 'Versi, kebijakan, dan syarat',
          onPress: () => Alert.alert('Covre', 'Versi 1.0.0\n\nAplikasi berbagi video kuliner terbaik untuk creators dan food lovers.'),
        },
        {
          icon: 'help-circle-outline',
          label: 'Bantuan & FAQ',
          subtitle: 'Dapatkan bantuan',
          onPress: () => Alert.alert('Info', 'Fitur Bantuan segera hadir'),
        },
      ],
    },
    {
      title: 'Aksi',
      items: [
        {
          icon: 'log-out-outline',
          label: 'Keluar',
          subtitle: 'Logout dari akun Anda',
          onPress: handleLogout,
          warning: true,
        },
      ],
    },
    {
      title: 'Zona Berbahaya',
      items: [
        {
          icon: 'trash-outline',
          label: 'Hapus Akun',
          subtitle: 'Hapus akun Anda secara permanen',
          onPress: handleDeleteAccount,
          danger: true,
        },
      ],
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#06402B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pengaturan</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {settingsSections.map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionCard}>
              {section.items.map((item, itemIndex) => (
                <TouchableOpacity
                  key={itemIndex}
                  style={[
                    styles.settingItem,
                    itemIndex === section.items.length - 1 && styles.settingItemLast,
                  ]}
                  onPress={item.onPress}
                  disabled={item.toggle}
                  activeOpacity={item.toggle ? 1 : 0.7}
                >
                  <View style={[
                    styles.settingIconContainer,
                    item.danger && styles.settingIconDanger,
                    item.warning && styles.settingIconWarning,
                  ]}>
                    <Ionicons
                      name={item.icon}
                      size={22}
                      color={item.danger ? '#EF4444' : item.warning ? '#F59E0B' : '#06402B'}
                    />
                  </View>
                  <View style={styles.settingTextContainer}>
                    <Text style={[
                      styles.settingLabel,
                      item.danger && styles.settingLabelDanger,
                      item.warning && styles.settingLabelWarning,
                    ]}>
                      {item.label}
                    </Text>
                    <Text style={styles.settingSubtitle}>{item.subtitle}</Text>
                  </View>
                  {item.toggle ? (
                    <Switch
                      value={item.value}
                      onValueChange={item.onToggle}
                      trackColor={{ false: '#D1D5DB', true: '#06402B' }}
                      thumbColor={item.value ? '#FFFFFF' : '#F3F4F6'}
                    />
                  ) : (
                    <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* App Version */}
        <Text style={styles.versionText}>Cofre v1.0.0</Text>
      </ScrollView>

      {/* Edit Profile Modal - FIX: ScrollView to prevent button cutoff */}
      <Modal
        visible={showEditProfile}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEditProfile(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profil</Text>
              <TouchableOpacity onPress={() => setShowEditProfile(false)}>
                <Ionicons name="close-circle" size={28} color="#06402B" />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalScrollContent}
            >
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Nama Lengkap</Text>
                <TextInput
                  style={styles.input}
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="Masukkan nama lengkap"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email</Text>
                <TextInput
                  style={styles.input}
                  value={editEmail}
                  onChangeText={setEditEmail}
                  placeholder="Masukkan email"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <TouchableOpacity
                style={[styles.saveButton, isLoading && styles.saveButtonDisabled]}
                onPress={handleSaveProfile}
                disabled={isLoading}
              >
                <Text style={styles.saveButtonText}>
                  {isLoading ? 'Menyimpan...' : 'Simpan Perubahan'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Change Password Modal - FIX: ScrollView to prevent button cutoff */}
      <Modal
        visible={showChangePassword}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowChangePassword(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Ganti Password</Text>
              <TouchableOpacity onPress={() => setShowChangePassword(false)}>
                <Ionicons name="close-circle" size={28} color="#06402B" />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalScrollContent}
            >
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Password Saat Ini</Text>
                <TextInput
                  style={styles.input}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  placeholder="Masukkan password saat ini"
                  placeholderTextColor="#9CA3AF"
                  secureTextEntry
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Password Baru</Text>
                <TextInput
                  style={styles.input}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="Masukkan password baru (min. 8 karakter)"
                  placeholderTextColor="#9CA3AF"
                  secureTextEntry
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Konfirmasi Password Baru</Text>
                <TextInput
                  style={styles.input}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Konfirmasi password baru"
                  placeholderTextColor="#9CA3AF"
                  secureTextEntry
                />
              </View>

              <TouchableOpacity
                style={[styles.saveButton, isLoading && styles.saveButtonDisabled]}
                onPress={handleChangePassword}
                disabled={isLoading}
              >
                <Text style={styles.saveButtonText}>
                  {isLoading ? 'Mengubah...' : 'Ubah Password'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Delete Account Modal */}
      <Modal
        visible={showDeleteAccount}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowDeleteAccount(false);
          setDeletePassword('');
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Konfirmasi Hapus Akun</Text>
              <TouchableOpacity onPress={() => {
                setShowDeleteAccount(false);
                setDeletePassword('');
              }}>
                <Ionicons name="close-circle" size={28} color="#EF4444" />
              </TouchableOpacity>
            </View>

            <View style={styles.warningBox}>
              <Ionicons name="warning" size={24} color="#EF4444" />
              <Text style={styles.warningText}>
                Tindakan ini tidak dapat dibatalkan. Semua data Anda akan dihapus secara permanen.
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Masukkan Password Anda</Text>
              <TextInput
                style={styles.input}
                value={deletePassword}
                onChangeText={setDeletePassword}
                placeholder="Password untuk konfirmasi"
                placeholderTextColor="#9CA3AF"
                secureTextEntry
                editable={!isLoading}
              />
            </View>

            <TouchableOpacity
              style={[styles.deleteButton, isLoading && styles.saveButtonDisabled]}
              onPress={confirmDeleteAccount}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Ionicons name="trash" size={20} color="#FFFFFF" />
                  <Text style={styles.saveButtonText}>Hapus Akun Selamanya</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EDE8D0',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#06402B',
  },
  headerSpacer: {
    width: 32,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    minHeight: 72,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  settingItemLast: {
    borderBottomWidth: 0,
  },
  settingIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingIconDanger: {
    backgroundColor: '#FEE2E2',
  },
  settingIconWarning: {
    backgroundColor: '#FEF3C7',
  },
  settingTextContainer: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  settingLabelDanger: {
    color: '#EF4444',
  },
  settingLabelWarning: {
    color: '#F59E0B',
  },
  settingSubtitle: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  versionText: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 20,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  modalScrollContent: {
    paddingBottom: 100,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#06402B',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1F2937',
  },
  saveButton: {
    backgroundColor: '#06402B',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    gap: 12,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: '#991B1B',
    lineHeight: 20,
  },
  deleteButton: {
    backgroundColor: '#EF4444',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    flexDirection: 'row',
    gap: 8,
  },
});

export default SettingsScreen;
