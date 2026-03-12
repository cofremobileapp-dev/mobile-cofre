import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { apiService } from '../services/ApiService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../contexts/ThemeContext';

const DataManagementScreen = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const [isLoading, setIsLoading] = useState(true);
  const [storageInfo, setStorageInfo] = useState(null);
  const [isClearing, setIsClearing] = useState(false);

  useEffect(() => {
    loadStorageInfo();
  }, []);

  const loadStorageInfo = async () => {
    try {
      setIsLoading(true);
      const response = await apiService.getStorageInfo();
      setStorageInfo(response.data?.data || response.data || null);
    } catch (error) {
      console.error('Error loading storage info:', error);
      Alert.alert('Error', 'Gagal memuat informasi penyimpanan');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearCache = () => {
    Alert.alert(
      'Hapus Cache',
      'Apakah Anda yakin ingin menghapus cache aplikasi? Ini akan menghapus data sementara dan mungkin memperlambat aplikasi untuk sementara waktu.',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsClearing(true);

              // Clear server cache
              await apiService.clearCache();

              // Clear local AsyncStorage cache (except user data)
              const allKeys = await AsyncStorage.getAllKeys();
              const cacheKeys = allKeys.filter(
                (key) =>
                  !key.includes('auth_token') &&
                  !key.includes('user_data') &&
                  !key.includes('device_token')
              );
              await AsyncStorage.multiRemove(cacheKeys);

              Alert.alert('Berhasil', 'Cache berhasil dihapus');
            } catch (error) {
              console.error('Error clearing cache:', error);
              Alert.alert('Error', 'Gagal menghapus cache');
            } finally {
              setIsClearing(false);
            }
          },
        },
      ]
    );
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.backgroundSecondary }]}>
        <StatusBar barStyle={colors.background === '#FFFFFF' ? 'dark-content' : 'light-content'} backgroundColor={colors.header} />
        <View style={[styles.header, { backgroundColor: colors.header, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.headerText} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.headerText }]}>Data & Penyimpanan</Text>
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
        <Text style={[styles.headerTitle, { color: colors.headerText }]}>Data & Penyimpanan</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Storage Info Card */}
        <View style={[styles.storageCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.storageHeader}>
            <Ionicons name="server" size={32} color={colors.primary} />
            <Text style={[styles.storageTitle, { color: colors.textPrimary }]}>Penggunaan Penyimpanan</Text>
          </View>

          <View style={styles.storageStats}>
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Total Video</Text>
              <Text style={[styles.statValue, { color: colors.primary }]}>{storageInfo?.total_videos || 0}</Text>
            </View>

            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />

            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: colors.textTertiary }]}>Ukuran Total</Text>
              <Text style={[styles.statValue, { color: colors.primary }]}>
                {storageInfo?.total_size_mb ? `${storageInfo.total_size_mb} MB` : '0 MB'}
              </Text>
            </View>
          </View>

          <View style={[styles.storageDetail, { borderTopColor: colors.borderLight }]}>
            <Ionicons name="information-circle" size={16} color={colors.textTertiary} />
            <Text style={[styles.storageDetailText, { color: colors.textTertiary }]}>
              Ini adalah total penyimpanan yang digunakan untuk video Anda di server
            </Text>
          </View>
        </View>

        {/* Cache Management */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>Manajemen Cache</Text>

          <TouchableOpacity
            style={[styles.actionItem, { borderTopColor: colors.borderLight }]}
            onPress={handleClearCache}
            disabled={isClearing}
          >
            <View style={styles.actionInfo}>
              <View style={[styles.iconContainer, { backgroundColor: colors.errorLight }]}>
                <Ionicons name="trash" size={20} color={colors.error} />
              </View>
              <View style={styles.actionText}>
                <Text style={[styles.actionTitle, { color: colors.textPrimary }]}>Hapus Cache</Text>
                <Text style={[styles.actionDescription, { color: colors.textTertiary }]}>
                  Bersihkan data sementara untuk menghemat ruang
                </Text>
              </View>
            </View>
            {isClearing ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Ionicons name="chevron-forward" size={20} color={colors.iconInactive} />
            )}
          </TouchableOpacity>
        </View>

        {/* Data Info */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>Informasi Data</Text>

          <View style={[styles.infoItem, { borderTopColor: colors.borderLight }]}>
            <View style={[styles.infoIconContainer, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="cloud-download" size={20} color={colors.primary} />
            </View>
            <View style={styles.infoTextContainer}>
              <Text style={[styles.infoTitle, { color: colors.textPrimary }]}>Data Unduhan</Text>
              <Text style={[styles.infoDescription, { color: colors.textTertiary }]}>
                Video yang Anda tonton disimpan sementara untuk playback yang lebih cepat
              </Text>
            </View>
          </View>

          <View style={[styles.infoItem, { borderTopColor: colors.borderLight }]}>
            <View style={[styles.infoIconContainer, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="images" size={20} color={colors.primary} />
            </View>
            <View style={styles.infoTextContainer}>
              <Text style={[styles.infoTitle, { color: colors.textPrimary }]}>Thumbnail</Text>
              <Text style={[styles.infoDescription, { color: colors.textTertiary }]}>
                Gambar thumbnail video di-cache untuk mempercepat loading
              </Text>
            </View>
          </View>

          <View style={[styles.infoItem, { borderTopColor: colors.borderLight }]}>
            <View style={[styles.infoIconContainer, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="person" size={20} color={colors.primary} />
            </View>
            <View style={styles.infoTextContainer}>
              <Text style={[styles.infoTitle, { color: colors.textPrimary }]}>Avatar Pengguna</Text>
              <Text style={[styles.infoDescription, { color: colors.textTertiary }]}>
                Foto profil pengguna disimpan untuk mengurangi penggunaan data
              </Text>
            </View>
          </View>
        </View>

        {/* Tips */}
        <View style={[styles.tipsCard, { backgroundColor: colors.warningLight, borderColor: colors.warning }]}>
          <View style={styles.tipsHeader}>
            <Ionicons name="bulb" size={20} color={colors.warning} />
            <Text style={styles.tipsTitle}>Tips Hemat Data</Text>
          </View>
          <Text style={styles.tipsText}>
            • Hapus cache secara berkala untuk menghemat ruang{'\n'}
            • Gunakan WiFi saat mengupload video untuk menghemat kuota{'\n'}
            • Hapus video lama yang tidak diperlukan dari profil Anda
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
  storageCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  storageHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  storageTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
    marginTop: 12,
  },
  storageStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#06402B',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#E5E7EB',
  },
  storageDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  storageDetailText: {
    fontSize: 13,
    color: '#6B7280',
    marginLeft: 8,
    flex: 1,
    lineHeight: 18,
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
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  actionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  actionText: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  actionDescription: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  infoIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  infoDescription: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  tipsCard: {
    backgroundColor: '#FFFBEB',
    margin: 16,
    marginTop: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  tipsTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#92400E',
    marginLeft: 8,
  },
  tipsText: {
    fontSize: 14,
    color: '#92400E',
    lineHeight: 20,
  },
});

export default DataManagementScreen;
