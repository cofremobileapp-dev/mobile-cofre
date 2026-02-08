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

const DataManagementScreen = () => {
  const navigation = useNavigation();
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
      setStorageInfo(response.data.data);
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
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#000000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Data & Penyimpanan</Text>
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
        <Text style={styles.headerTitle}>Data & Penyimpanan</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Storage Info Card */}
        <View style={styles.storageCard}>
          <View style={styles.storageHeader}>
            <Ionicons name="server" size={32} color="#06402B" />
            <Text style={styles.storageTitle}>Penggunaan Penyimpanan</Text>
          </View>

          <View style={styles.storageStats}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Total Video</Text>
              <Text style={styles.statValue}>{storageInfo?.total_videos || 0}</Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Ukuran Total</Text>
              <Text style={styles.statValue}>
                {storageInfo?.total_size_mb ? `${storageInfo.total_size_mb} MB` : '0 MB'}
              </Text>
            </View>
          </View>

          <View style={styles.storageDetail}>
            <Ionicons name="information-circle" size={16} color="#6B7280" />
            <Text style={styles.storageDetailText}>
              Ini adalah total penyimpanan yang digunakan untuk video Anda di server
            </Text>
          </View>
        </View>

        {/* Cache Management */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Manajemen Cache</Text>

          <TouchableOpacity
            style={styles.actionItem}
            onPress={handleClearCache}
            disabled={isClearing}
          >
            <View style={styles.actionInfo}>
              <View style={[styles.iconContainer, { backgroundColor: '#FEE2E2' }]}>
                <Ionicons name="trash" size={20} color="#DC2626" />
              </View>
              <View style={styles.actionText}>
                <Text style={styles.actionTitle}>Hapus Cache</Text>
                <Text style={styles.actionDescription}>
                  Bersihkan data sementara untuk menghemat ruang
                </Text>
              </View>
            </View>
            {isClearing ? (
              <ActivityIndicator size="small" color="#06402B" />
            ) : (
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            )}
          </TouchableOpacity>
        </View>

        {/* Data Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informasi Data</Text>

          <View style={styles.infoItem}>
            <View style={styles.infoIconContainer}>
              <Ionicons name="cloud-download" size={20} color="#06402B" />
            </View>
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoTitle}>Data Unduhan</Text>
              <Text style={styles.infoDescription}>
                Video yang Anda tonton disimpan sementara untuk playback yang lebih cepat
              </Text>
            </View>
          </View>

          <View style={styles.infoItem}>
            <View style={styles.infoIconContainer}>
              <Ionicons name="images" size={20} color="#06402B" />
            </View>
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoTitle}>Thumbnail</Text>
              <Text style={styles.infoDescription}>
                Gambar thumbnail video di-cache untuk mempercepat loading
              </Text>
            </View>
          </View>

          <View style={styles.infoItem}>
            <View style={styles.infoIconContainer}>
              <Ionicons name="person" size={20} color="#06402B" />
            </View>
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoTitle}>Avatar Pengguna</Text>
              <Text style={styles.infoDescription}>
                Foto profil pengguna disimpan untuk mengurangi penggunaan data
              </Text>
            </View>
          </View>
        </View>

        {/* Tips */}
        <View style={styles.tipsCard}>
          <View style={styles.tipsHeader}>
            <Ionicons name="bulb" size={20} color="#D97706" />
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
