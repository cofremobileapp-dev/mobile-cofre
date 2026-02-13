import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiService } from '../services/ApiService';
import { useAuth } from '../contexts/AuthContext';

const FollowersListScreen = ({ navigation, route }) => {
  const { userId, type, userName } = route.params; // type: 'followers' or 'following'
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [followLoading, setFollowLoading] = useState({});

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async (page = 1) => {
    try {
      if (page === 1) {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }

      const response = type === 'followers'
        ? await apiService.getFollowers(userId, page)
        : await apiService.getFollowing(userId, page);

      const newUsers = response.data.data || [];

      if (page === 1) {
        setUsers(newUsers);
      } else {
        setUsers(prev => [...prev, ...newUsers]);
      }

      setHasMore(response.data.next_page_url !== null);
      setCurrentPage(page);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      setIsLoadingMore(false);
    }
  };

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadUsers(1);
  }, []);

  const handleLoadMore = () => {
    if (!isLoadingMore && hasMore) {
      loadUsers(currentPage + 1);
    }
  };

  const handleToggleFollow = async (targetUserId) => {
    if (followLoading[targetUserId]) return;

    setFollowLoading(prev => ({ ...prev, [targetUserId]: true }));

    try {
      const response = await apiService.toggleFollow(targetUserId);

      // Update local state
      setUsers(prev => prev.map(u => {
        if (u.id === targetUserId) {
          return { ...u, is_following: response.data.following };
        }
        return u;
      }));
    } catch (error) {
      console.error('Error toggling follow:', error);
    } finally {
      setFollowLoading(prev => ({ ...prev, [targetUserId]: false }));
    }
  };

  const handleUserPress = (user) => {
    if (user.id === currentUser?.id) {
      navigation.navigate('Profile');
    } else {
      navigation.navigate('OtherUserProfile', { userId: user.id });
    }
  };

  const renderUserItem = ({ item }) => (
    <TouchableOpacity
      style={styles.userItem}
      onPress={() => handleUserPress(item)}
      activeOpacity={0.7}
    >
      {/* Avatar */}
      {item.avatar_url ? (
        <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
      ) : (
        <View style={styles.avatarPlaceholder}>
          <Text style={styles.avatarPlaceholderText}>
            {item.name?.charAt(0).toUpperCase() || 'U'}
          </Text>
        </View>
      )}

      {/* User Info */}
      <View style={styles.userInfo}>
        <View style={styles.nameRow}>
          <Text style={styles.userName} numberOfLines={1}>
            {item.username || item.name || 'User'}
          </Text>
          {item.badge_status === 'approved' && item.show_badge && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>CREATOR</Text>
            </View>
          )}
        </View>
        {item.name && item.username && (
          <Text style={styles.fullName} numberOfLines={1}>
            {item.name}
          </Text>
        )}
        {item.bio && (
          <Text style={styles.bio} numberOfLines={1}>
            {item.bio}
          </Text>
        )}
      </View>

      {/* Follow Button (only if not self) */}
      {!item.is_me && (
        <TouchableOpacity
          style={[
            styles.followButton,
            item.is_following && styles.followingButton
          ]}
          onPress={() => handleToggleFollow(item.id)}
          disabled={followLoading[item.id]}
        >
          {followLoading[item.id] ? (
            <ActivityIndicator size="small" color={item.is_following ? '#06402B' : '#FFFFFF'} />
          ) : (
            <Text style={[
              styles.followButtonText,
              item.is_following && styles.followingButtonText
            ]}>
              {item.is_following ? 'Mengikuti' : 'Ikuti'}
            </Text>
          )}
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#06402B" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {type === 'followers' ? 'Pengikut' : 'Mengikuti'}
        </Text>
        <View style={styles.headerRight} />
      </View>

      {/* User Count */}
      <View style={styles.countContainer}>
        <Text style={styles.countText}>
          {userName ? `@${userName}` : ''} - {users.length} {type === 'followers' ? 'Pengikut' : 'Mengikuti'}
        </Text>
      </View>

      {/* Users List */}
      <FlatList
        data={users}
        renderItem={renderUserItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={['#06402B']}
            tintColor="#06402B"
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          isLoadingMore ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator size="small" color="#06402B" />
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons
              name={type === 'followers' ? 'people-outline' : 'person-add-outline'}
              size={64}
              color="#9CA3AF"
            />
            <Text style={styles.emptyTitle}>
              {type === 'followers' ? 'Belum Ada Pengikut' : 'Belum Mengikuti Siapapun'}
            </Text>
            <Text style={styles.emptyText}>
              {type === 'followers'
                ? 'Orang yang mengikuti akun ini akan muncul di sini.'
                : 'Akun yang diikuti akan muncul di sini.'}
            </Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
  },
  headerRight: {
    width: 40,
  },
  countContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  countText: {
    fontSize: 14,
    color: '#6B7280',
  },
  listContent: {
    flexGrow: 1,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#06402B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPlaceholderText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 12,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
  },
  fullName: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  bio: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 2,
  },
  badge: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#000000',
  },
  followButton: {
    backgroundColor: '#06402B',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 90,
    alignItems: 'center',
  },
  followingButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#06402B',
  },
  followButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  followingButtonText: {
    color: '#06402B',
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
});

export default FollowersListScreen;
