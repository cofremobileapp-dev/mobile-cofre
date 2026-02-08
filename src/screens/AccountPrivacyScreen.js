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

const AccountPrivacyScreen = () => {
  const navigation = useNavigation();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const response = await apiService.getSettings();
      const settings = response.data.settings || {};
      setIsPrivate(settings.account_private || false);
    } catch (error) {
      console.error('Error loading settings:', error);
      Alert.alert('Error', 'Gagal memuat pengaturan');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTogglePrivacy = async (value) => {
    try {
      setIsSaving(true);
      setIsPrivate(value);

      const response = await apiService.updatePrivacy(value);

      if (response.data.success) {
        Alert.alert(
          'Berhasil',
          value
            ? 'Akun Anda sekarang bersifat privat'
            : 'Akun Anda sekarang bersifat publik'
        );
      }
    } catch (error) {
      console.error('Error updating privacy:', error);
      // Revert on error
      setIsPrivate(!value);
      Alert.alert('Error', 'Gagal mengubah pengaturan privasi');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#000000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Privasi Akun</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#06402B" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privasi Akun</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Private Account Setting */}
        <View style={styles.section}>
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <View style={styles.iconContainer}>
                <Ionicons name="lock-closed" size={20} color="#06402B" />
              </View>
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Akun Privat</Text>
                <Text style={styles.settingDescription}>
                  Hanya pengikut yang disetujui yang dapat melihat konten Anda
                </Text>
              </View>
            </View>
            <Switch
              value={isPrivate}
              onValueChange={handleTogglePrivacy}
              trackColor={{ false: '#D1D5DB', true: '#06402B' }}
              thumbColor="#FFFFFF"
              ios_backgroundColor="#D1D5DB"
              disabled={isSaving}
            />
          </View>
        </View>

        {/* Information Section */}
        <View style={styles.infoSection}>
          <View style={styles.infoCard}>
            <Ionicons name="information-circle" size={24} color="#06402B" style={styles.infoIcon} />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoTitle}>
                {isPrivate ? 'Akun Privat Aktif' : 'Akun Publik Aktif'}
              </Text>
              <Text style={styles.infoText}>
                {isPrivate
                  ? 'Ketika akun Anda privat:\n\n' +
                    '• Video dan profil hanya dapat dilihat oleh pengikut yang disetujui\n' +
                    '• Permintaan follow memerlukan persetujuan manual\n' +
                    '• Video Anda tidak akan muncul di halaman "Untuk Anda"\n' +
                    '• Pencarian akan menampilkan profil tapi konten tersembunyi'
                  : 'Ketika akun Anda publik:\n\n' +
                    '• Siapa saja dapat melihat video dan profil Anda\n' +
                    '• Siapa saja dapat mengikuti tanpa persetujuan\n' +
                    '• Video dapat muncul di halaman "Untuk Anda"\n' +
                    '• Konten dapat dicari dan dibagikan'}
              </Text>
            </View>
          </View>
        </View>

        {/* Additional Privacy Tips */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tips Privasi</Text>

          <View style={styles.tipItem}>
            <Ionicons name="shield-checkmark" size={20} color="#06402B" />
            <Text style={styles.tipText}>
              Tinjau pengikut Anda secara berkala dan hapus yang tidak dikenal
            </Text>
          </View>

          <View style={styles.tipItem}>
            <Ionicons name="eye-off" size={20} color="#06402B" />
            <Text style={styles.tipText}>
              Blokir pengguna yang mengirim komentar atau pesan yang tidak pantas
            </Text>
          </View>

          <View style={styles.tipItem}>
            <Ionicons name="alert-circle" size={20} color="#06402B" />
            <Text style={styles.tipText}>
              Jangan bagikan informasi pribadi seperti alamat atau nomor telepon
            </Text>
          </View>
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
    backgroundColor: '#E8F5E9',
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
  infoSection: {
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  infoIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#06402B',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  tipText: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
    marginLeft: 12,
    flex: 1,
  },
});

export default AccountPrivacyScreen;
