import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  FlatList,
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { apiService } from '../services/ApiService';
import { useTheme } from '../contexts/ThemeContext';

const BlockedAccountsScreen = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [unblockingId, setUnblockingId] = useState(null);

  useEffect(() => {
    loadBlockedUsers();
  }, []);

  const loadBlockedUsers = async () => {
    try {
      setIsLoading(true);
      const response = await apiService.getBlockedUsers();
      setBlockedUsers(response.data.data || []);
    } catch (error) {
      console.error('Error loading blocked users:', error);
      Alert.alert('Error', 'Gagal memuat daftar pengguna yang diblokir');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadBlockedUsers();
    setIsRefreshing(false);
  }, []);

  const handleUnblock = (user) => {
    Alert.alert(
      'Unblock Pengguna',
      `Apakah Anda yakin ingin unblock ${user.name}?`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Unblock',
          style: 'destructive',
          onPress: async () => {
            try {
              setUnblockingId(user.id);

              const response = await apiService.unblockUser(user.id);

              if (response.data.success) {
                // Remove from list
                setBlockedUsers((prev) => prev.filter((u) => u.id !== user.id));
                Alert.alert('Berhasil', `${user.name} telah di-unblock`);
              }
            } catch (error) {
              console.error('Error unblocking user:', error);
              Alert.alert('Error', 'Gagal unblock pengguna');
            } finally {
              setUnblockingId(null);
            }
          },
        },
      ]
    );
  };

  const renderBlockedUser = ({ item }) => (
    <View style={[styles.userItem, { backgroundColor: colors.card, borderBottomColor: colors.borderLight }]}>
      <View style={styles.userInfo}>
        {item.avatar_url ? (
          <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: colors.backgroundTertiary }]}>
            <Ionicons name="person" size={24} color={colors.iconInactive} />
          </View>
        )}

        <View style={styles.userText}>
          <Text style={[styles.userName, { color: colors.textPrimary }]}>{item.name}</Text>
          <View style={styles.blockedBadge}>
            <Ionicons name="ban" size={12} color={colors.error} />
            <Text style={[styles.blockedText, { color: colors.error }]}>Diblokir</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.unblockButton, { backgroundColor: colors.card, borderColor: colors.primary }]}
        onPress={() => handleUnblock(item)}
        disabled={unblockingId === item.id}
      >
        {unblockingId === item.id ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <Text style={[styles.unblockButtonText, { color: colors.primary }]}>Unblock</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={[styles.emptyIconContainer, { backgroundColor: colors.backgroundTertiary }]}>
        <Ionicons name="people-outline" size={64} color={colors.iconInactive} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>Tidak Ada Pengguna yang Diblokir</Text>
      <Text style={[styles.emptyDescription, { color: colors.textTertiary }]}>
        Pengguna yang Anda blokir akan muncul di sini.{'\n'}
        Mereka tidak akan bisa melihat profil atau konten Anda.
      </Text>
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.backgroundSecondary }]}>
        <StatusBar barStyle={colors.background === '#FFFFFF' ? 'dark-content' : 'light-content'} backgroundColor={colors.header} />
        <View style={[styles.header, { backgroundColor: colors.header, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.headerText} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.headerText }]}>Pengguna yang Diblokir</Text>
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
        <Text style={[styles.headerTitle, { color: colors.headerText }]}>Pengguna yang Diblokir</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Info Banner */}
      {blockedUsers.length > 0 && (
        <View style={[styles.infoBanner, { backgroundColor: colors.infoLight, borderBottomColor: colors.info }]}>
          <Ionicons name="information-circle" size={20} color={colors.info} />
          <Text style={[styles.infoBannerText, { color: colors.info }]}>
            Pengguna yang diblokir tidak bisa melihat profil atau konten Anda
          </Text>
        </View>
      )}

      {/* Blocked Users List */}
      <FlatList
        data={blockedUsers}
        renderItem={renderBlockedUser}
        keyExtractor={(item) => item.id.toString()}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={
          blockedUsers.length === 0 ? styles.emptyContainer : styles.listContainer
        }
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      />
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
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#BFDBFE',
  },
  infoBannerText: {
    fontSize: 13,
    color: '#1E40AF',
    marginLeft: 8,
    flex: 1,
    lineHeight: 18,
  },
  listContainer: {
    paddingVertical: 8,
  },
  emptyContainer: {
    flex: 1,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  avatarPlaceholder: {
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userText: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  blockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  blockedText: {
    fontSize: 13,
    color: '#DC2626',
    marginLeft: 4,
  },
  unblockButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#06402B',
    borderRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  unblockButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#06402B',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
  },
});

export default BlockedAccountsScreen;
