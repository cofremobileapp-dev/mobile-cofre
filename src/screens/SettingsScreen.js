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
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { apiService } from '../services/ApiService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';

const SettingsScreen = ({ navigation }) => {
  const { user, logout, refreshUser } = useAuth();
  const { colors } = useTheme();
  const { t } = useLanguage();
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

      // Refresh user data in context
      if (refreshUser) await refreshUser();

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
      title: t('account'),
      items: [
        {
          icon: 'person-outline',
          label: t('editProfile'),
          subtitle: 'Ubah nama dan email',
          onPress: () => setShowEditProfile(true),
        },
        {
          icon: 'lock-closed-outline',
          label: t('changePassword'),
          subtitle: 'Ubah password akun Anda',
          onPress: () => setShowChangePassword(true),
        },
      ],
    },
    {
      title: 'Aktivitas Anda',
      items: [
        {
          icon: 'heart-outline',
          label: 'Suka',
          subtitle: 'Video yang Anda sukai',
          onPress: () => navigation.navigate('LikedVideos'),
        },
        {
          icon: 'chatbubble-outline',
          label: 'Komentar',
          subtitle: 'Komentar yang Anda tulis',
          onPress: () => navigation.navigate('MyComments'),
        },
        {
          icon: 'archive-outline',
          label: 'Arsip',
          subtitle: 'Lihat story dan postingan yang diarsipkan',
          onPress: () => navigation.navigate('Archive'),
        },
        {
          icon: 'ban-outline',
          label: 'Blokir',
          subtitle: 'Kelola pengguna yang diblokir',
          onPress: () => navigation.navigate('BlockedAccounts'),
        },
      ],
    },
    {
      title: t('appSettings'),
      items: [
        {
          icon: 'color-palette-outline',
          label: t('theme'),
          subtitle: 'Mode terang, gelap, atau otomatis',
          onPress: () => navigation.navigate('ThemeSettings'),
        },
        {
          icon: 'notifications-outline',
          label: t('notificationSettings'),
          subtitle: 'Kelola preferensi notifikasi',
          onPress: () => navigation.navigate('NotificationSettings'),
        },
        {
          icon: 'shield-outline',
          label: t('privacy'),
          subtitle: 'Atur privasi akun Anda',
          onPress: () => navigation.navigate('AccountPrivacy'),
        },
        {
          icon: 'globe-outline',
          label: t('language'),
          subtitle: 'Pilih bahasa aplikasi',
          onPress: () => navigation.navigate('Language'),
        },
        {
          icon: 'server-outline',
          label: t('dataStorage'),
          subtitle: 'Kelola penggunaan data',
          onPress: () => navigation.navigate('DataManagement'),
        },
        {
          icon: 'trash-bin-outline',
          label: t('clearCache'),
          subtitle: 'Bersihkan data cache aplikasi',
          onPress: handleClearCache,
        },
      ],
    },
    {
      title: t('about'),
      items: [
        {
          icon: 'information-circle-outline',
          label: t('about'),
          subtitle: 'Versi, kebijakan, dan syarat',
          onPress: () => Alert.alert('Covre', 'Versi 1.0.0\n\nAplikasi berbagi video kuliner terbaik untuk creators dan food lovers.'),
        },
        {
          icon: 'help-circle-outline',
          label: t('helpFaq'),
          subtitle: 'Dapatkan bantuan',
          onPress: () => Alert.alert('Info', 'Fitur Bantuan segera hadir'),
        },
      ],
    },
    {
      title: t('logout'),
      items: [
        {
          icon: 'log-out-outline',
          label: t('logout'),
          subtitle: 'Logout dari akun Anda',
          onPress: handleLogout,
          warning: true,
        },
      ],
    },
    {
      title: t('dangerZone'),
      items: [
        {
          icon: 'trash-outline',
          label: t('deleteAccount'),
          subtitle: 'Hapus akun Anda secara permanen',
          onPress: handleDeleteAccount,
          danger: true,
        },
      ],
    },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.primary }]}>{t('settings')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {settingsSections.map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>{section.title}</Text>
            <View style={[styles.sectionCard, { backgroundColor: colors.card }]}>
              {section.items.map((item, itemIndex) => (
                <TouchableOpacity
                  key={itemIndex}
                  style={[
                    styles.settingItem,
                    { borderBottomColor: colors.borderLight },
                    itemIndex === section.items.length - 1 && styles.settingItemLast,
                  ]}
                  onPress={item.onPress}
                  disabled={item.toggle}
                  activeOpacity={item.toggle ? 1 : 0.7}
                >
                  <View style={[
                    styles.settingIconContainer,
                    { backgroundColor: colors.primaryLight },
                    item.danger && styles.settingIconDanger,
                    item.warning && styles.settingIconWarning,
                  ]}>
                    <Ionicons
                      name={item.icon}
                      size={22}
                      color={item.danger ? '#EF4444' : item.warning ? '#F59E0B' : colors.primary}
                    />
                  </View>
                  <View style={styles.settingTextContainer}>
                    <Text style={[
                      styles.settingLabel,
                      { color: colors.textPrimary },
                      item.danger && styles.settingLabelDanger,
                      item.warning && styles.settingLabelWarning,
                    ]}>
                      {item.label}
                    </Text>
                    <Text style={[styles.settingSubtitle, { color: colors.textTertiary }]}>{item.subtitle}</Text>
                  </View>
                  {item.toggle ? (
                    <Switch
                      value={item.value}
                      onValueChange={item.onToggle}
                      trackColor={{ false: colors.border, true: colors.primary }}
                      thumbColor={item.value ? '#FFFFFF' : '#F3F4F6'}
                    />
                  ) : (
                    <Ionicons name="chevron-forward" size={20} color={colors.border} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* App Version */}
        <Text style={[styles.versionText, { color: colors.textTertiary }]}>Cofre v1.0.0</Text>
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
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.primary }]}>{t('editProfile')}</Text>
              <TouchableOpacity onPress={() => setShowEditProfile(false)}>
                <Ionicons name="close-circle" size={28} color={colors.primary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalScrollContent}
            >
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Nama Lengkap</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border, color: colors.textPrimary }]}
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="Masukkan nama lengkap"
                  placeholderTextColor={colors.textTertiary}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t('email')}</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border, color: colors.textPrimary }]}
                  value={editEmail}
                  onChangeText={setEditEmail}
                  placeholder="Masukkan email"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: colors.primary }, isLoading && styles.saveButtonDisabled]}
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
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.primary }]}>{t('changePassword')}</Text>
              <TouchableOpacity onPress={() => setShowChangePassword(false)}>
                <Ionicons name="close-circle" size={28} color={colors.primary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalScrollContent}
            >
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Password Saat Ini</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border, color: colors.textPrimary }]}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  placeholder="Masukkan password saat ini"
                  placeholderTextColor={colors.textTertiary}
                  secureTextEntry
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Password Baru</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border, color: colors.textPrimary }]}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="Masukkan password baru (min. 8 karakter)"
                  placeholderTextColor={colors.textTertiary}
                  secureTextEntry
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t('confirmPassword')}</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border, color: colors.textPrimary }]}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Konfirmasi password baru"
                  placeholderTextColor={colors.textTertiary}
                  secureTextEntry
                />
              </View>

              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: colors.primary }, isLoading && styles.saveButtonDisabled]}
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
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.error }]}>{t('deleteAccount')}</Text>
              <TouchableOpacity onPress={() => {
                setShowDeleteAccount(false);
                setDeletePassword('');
              }}>
                <Ionicons name="close-circle" size={28} color={colors.error} />
              </TouchableOpacity>
            </View>

            <View style={[styles.warningBox, { backgroundColor: colors.errorLight }]}>
              <Ionicons name="warning" size={24} color={colors.error} />
              <Text style={styles.warningText}>
                Tindakan ini tidak dapat dibatalkan. Semua data Anda akan dihapus secara permanen.
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{t('password')}</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border, color: colors.textPrimary }]}
                value={deletePassword}
                onChangeText={setDeletePassword}
                placeholder="Password untuk konfirmasi"
                placeholderTextColor={colors.textTertiary}
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
                  <Text style={styles.saveButtonText}>{t('deleteAccount')}</Text>
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
    paddingBottom: 150,
    flexGrow: 1,
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
