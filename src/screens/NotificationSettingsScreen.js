import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Switch,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { apiService } from '../services/ApiService';
import { useTheme } from '../contexts/ThemeContext';

const NotificationSettingsScreen = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState({
    likes: true,
    comments: true,
    follows: true,
    mentions: true,
    reposts: true,
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const response = await apiService.getSettings();
      const notifSettings = response.data.settings?.notification_settings || {};
      setSettings({
        likes: notifSettings.likes ?? true,
        comments: notifSettings.comments ?? true,
        follows: notifSettings.follows ?? true,
        mentions: notifSettings.mentions ?? true,
        reposts: notifSettings.reposts ?? true,
      });
    } catch (error) {
      console.error('Error loading settings:', error);
      Alert.alert('Error', 'Gagal memuat pengaturan');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleSetting = async (key, value) => {
    try {
      setIsSaving(true);
      const newSettings = { ...settings, [key]: value };
      setSettings(newSettings);

      const response = await apiService.updateNotificationSettings(newSettings);

      if (response.data.success) {
        // Success - no need to show alert for each toggle
        console.log('Notification settings updated');
      }
    } catch (error) {
      console.error('Error updating notification settings:', error);
      // Revert on error
      setSettings({ ...settings, [key]: !value });
      Alert.alert('Error', 'Gagal mengubah pengaturan notifikasi');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.backgroundSecondary }]}>
        <StatusBar barStyle={colors.background === '#FFFFFF' ? 'dark-content' : 'light-content'} backgroundColor={colors.header} />
        <View style={[styles.header, { backgroundColor: colors.header, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.headerText} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.headerText }]}>Notifikasi</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.backgroundSecondary }]}>
      <StatusBar barStyle={colors.background === '#FFFFFF' ? 'dark-content' : 'light-content'} backgroundColor={colors.header} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.header, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.headerText} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.headerText }]}>Notifikasi</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Info Card */}
        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="notifications" size={24} color={colors.primary} />
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            Kelola notifikasi yang ingin Anda terima dari aktivitas akun Anda
          </Text>
        </View>

        {/* Interaction Notifications */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>Interaksi</Text>

          <View style={[styles.settingItem, { borderTopColor: colors.borderLight }]}>
            <View style={styles.settingInfo}>
              <View style={[styles.iconContainer, { backgroundColor: colors.errorLight }]}>
                <Ionicons name="heart" size={20} color={colors.error} />
              </View>
              <View style={styles.settingText}>
                <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>Likes</Text>
                <Text style={[styles.settingDescription, { color: colors.textTertiary }]}>
                  Notifikasi saat seseorang menyukai video Anda
                </Text>
              </View>
            </View>
            <Switch
              value={settings.likes}
              onValueChange={(value) => handleToggleSetting('likes', value)}
              trackColor={{ false: '#D1D5DB', true: colors.primary }}
              thumbColor="#FFFFFF"
              ios_backgroundColor="#D1D5DB"
              disabled={isSaving}
            />
          </View>

          <View style={[styles.settingItem, { borderTopColor: colors.borderLight }]}>
            <View style={styles.settingInfo}>
              <View style={[styles.iconContainer, { backgroundColor: colors.infoLight }]}>
                <Ionicons name="chatbubble" size={20} color={colors.info} />
              </View>
              <View style={styles.settingText}>
                <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>Komentar</Text>
                <Text style={[styles.settingDescription, { color: colors.textTertiary }]}>
                  Notifikasi saat seseorang mengomentari video Anda
                </Text>
              </View>
            </View>
            <Switch
              value={settings.comments}
              onValueChange={(value) => handleToggleSetting('comments', value)}
              trackColor={{ false: '#D1D5DB', true: colors.primary }}
              thumbColor="#FFFFFF"
              ios_backgroundColor="#D1D5DB"
              disabled={isSaving}
            />
          </View>
        </View>

        {/* Social Notifications */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>Sosial</Text>

          <View style={[styles.settingItem, { borderTopColor: colors.borderLight }]}>
            <View style={styles.settingInfo}>
              <View style={[styles.iconContainer, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name="person-add" size={20} color={colors.primary} />
              </View>
              <View style={styles.settingText}>
                <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>Pengikut Baru</Text>
                <Text style={[styles.settingDescription, { color: colors.textTertiary }]}>
                  Notifikasi saat seseorang mengikuti Anda
                </Text>
              </View>
            </View>
            <Switch
              value={settings.follows}
              onValueChange={(value) => handleToggleSetting('follows', value)}
              trackColor={{ false: '#D1D5DB', true: colors.primary }}
              thumbColor="#FFFFFF"
              ios_backgroundColor="#D1D5DB"
              disabled={isSaving}
            />
          </View>

          <View style={[styles.settingItem, { borderTopColor: colors.borderLight }]}>
            <View style={styles.settingInfo}>
              <View style={[styles.iconContainer, { backgroundColor: colors.warningLight }]}>
                <Ionicons name="at" size={20} color={colors.warning} />
              </View>
              <View style={styles.settingText}>
                <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>Sebutan (Mentions)</Text>
                <Text style={[styles.settingDescription, { color: colors.textTertiary }]}>
                  Notifikasi saat seseorang menyebut @username Anda
                </Text>
              </View>
            </View>
            <Switch
              value={settings.mentions}
              onValueChange={(value) => handleToggleSetting('mentions', value)}
              trackColor={{ false: '#D1D5DB', true: colors.primary }}
              thumbColor="#FFFFFF"
              ios_backgroundColor="#D1D5DB"
              disabled={isSaving}
            />
          </View>

          <View style={[styles.settingItem, { borderTopColor: colors.borderLight }]}>
            <View style={styles.settingInfo}>
              <View style={[styles.iconContainer, { backgroundColor: '#EDE9FE' }]}>
                <Ionicons name="repeat" size={20} color="#7C3AED" />
              </View>
              <View style={styles.settingText}>
                <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>Posting Ulang</Text>
                <Text style={[styles.settingDescription, { color: colors.textTertiary }]}>
                  Notifikasi saat seseorang memposting ulang video Anda
                </Text>
              </View>
            </View>
            <Switch
              value={settings.reposts}
              onValueChange={(value) => handleToggleSetting('reposts', value)}
              trackColor={{ false: '#D1D5DB', true: colors.primary }}
              thumbColor="#FFFFFF"
              ios_backgroundColor="#D1D5DB"
              disabled={isSaving}
            />
          </View>
        </View>

        {/* Note */}
        <View style={styles.noteContainer}>
          <Ionicons name="information-circle-outline" size={20} color={colors.textTertiary} />
          <Text style={[styles.noteText, { color: colors.textTertiary }]}>
            Pengaturan ini mengatur notifikasi push yang dikirim ke perangkat Anda.
            Anda dapat mengubahnya kapan saja.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 4,
    width: 40,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
    flex: 1,
    textAlign: 'center',
  },
  placeholder: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  infoText: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
    marginLeft: 12,
    flex: 1,
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginTop: 12,
    paddingVertical: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  noteContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginTop: 12,
  },
  noteText: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
    marginLeft: 8,
    flex: 1,
  },
});

export default NotificationSettingsScreen;
