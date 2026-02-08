import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  FlatList,
  Image,
  useWindowDimensions,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { apiService } from '../services/ApiService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../contexts/AuthContext';

const SearchScreen = () => {
  const { width } = useWindowDimensions();
  const ITEM_WIDTH = (width - 48) / 2;
  const navigation = useNavigation();
  const { user } = useAuth();
  const currentUserId = user?.id;
  const [searchQuery, setSearchQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState([]);

  // Dynamic styles that depend on ITEM_WIDTH
  const dynamicStyles = useMemo(() => createDynamicStyles(ITEM_WIDTH), [ITEM_WIDTH]);
  const [userResults, setUserResults] = useState([]);
  const [videoResults, setVideoResults] = useState([]);
  const [suggestedUsers, setSuggestedUsers] = useState([]);
  const [recommendedAccounts, setRecommendedAccounts] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [trendingSearches, setTrendingSearches] = useState([
    'Nasi Goreng',
    'Ayam Geprek',
    'Dessert Box',
    'Resep Murah',
    'Street Food Jakarta',
  ]);

  useEffect(() => {
    loadRecentSearches();
    loadSuggestedUsers();
    loadRecommendedAccounts();
    loadTrendingSearches();
  }, []);

  const loadRecentSearches = async () => {
    try {
      const searches = await AsyncStorage.getItem('recentSearches');
      if (searches) {
        setRecentSearches(JSON.parse(searches));
      }
    } catch (error) {
      console.error('Error loading recent searches:', error);
    }
  };

  const loadSuggestedUsers = async () => {
    try {
      // Search for users with a common term to get suggested accounts
      const response = await apiService.searchContent('');
      // Ensure users is always an array with safe access
      const users = response?.data?.users || [];
      setSuggestedUsers(Array.isArray(users) ? users : []);
    } catch (error) {
      console.error('Error loading suggested users:', error);
      setSuggestedUsers([]);
    }
  };

  const loadRecommendedAccounts = async () => {
    try {
      const response = await apiService.getRecommendedAccounts();
      setRecommendedAccounts(response.data || []);
    } catch (error) {
      console.error('Error loading recommended accounts:', error);
      setRecommendedAccounts([]);
    }
  };

  const loadTrendingSearches = async () => {
    try {
      const response = await apiService.getTrendingSearches(7, 5);
      if (response.success && response.data && response.data.length > 0) {
        // Extract just the query strings from the response
        const queries = response.data.map(item => item.query);
        setTrendingSearches(queries);
      }
    } catch (error) {
      console.error('Error loading trending searches:', error);
      // Keep fallback static list
    }
  };

  const saveRecentSearch = async (query) => {
    try {
      const trimmedQuery = query.trim();
      if (!trimmedQuery) return;

      let searches = [...recentSearches];

      // Remove if already exists
      searches = searches.filter(s => s !== trimmedQuery);

      // Add to beginning
      searches.unshift(trimmedQuery);

      // Keep only last 5 searches
      searches = searches.slice(0, 5);

      setRecentSearches(searches);
      await AsyncStorage.setItem('recentSearches', JSON.stringify(searches));
    } catch (error) {
      console.error('Error saving recent search:', error);
    }
  };

  const handleSearch = async (query) => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      setShowResults(false);
      setUserResults([]);
      setVideoResults([]);
      return;
    }

    setIsSearching(true);
    setShowResults(true);

    try {
      const response = await apiService.searchContent(trimmedQuery);
      // Ensure safe array access with defensive coding
      const users = response?.data?.users || [];
      const videos = response?.data?.videos || [];

      setUserResults(Array.isArray(users) ? users : []);
      setVideoResults(Array.isArray(videos) ? videos : []);
      await saveRecentSearch(trimmedQuery);

      // Log search to backend (non-blocking)
      apiService.logSearch(trimmedQuery, 'general').catch(() => {});
    } catch (error) {
      console.error('Search error:', error);
      setUserResults([]);
      setVideoResults([]);
      Alert.alert(
        'Pencarian Gagal',
        'Tidak dapat melakukan pencarian. Silakan periksa koneksi internet Anda dan coba lagi.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchSubmit = () => {
    handleSearch(searchQuery);
  };

  const handleSelectSearch = (query) => {
    setSearchQuery(query);
    handleSearch(query);
  };

  const removeRecentSearch = async (item) => {
    try {
      const updatedSearches = recentSearches.filter((search) => search !== item);
      setRecentSearches(updatedSearches);
      await AsyncStorage.setItem('recentSearches', JSON.stringify(updatedSearches));
    } catch (error) {
      console.error('Error removing recent search:', error);
    }
  };

  const handleFollowToggle = async (userId) => {
    // CRASH FIX: Add comprehensive null checks
    if (!userId || !currentUserId) {
      console.error('Follow error: Missing userId or currentUserId');
      return;
    }

    // Prevent following yourself
    if (Number(userId) === Number(currentUserId)) {
      Alert.alert('Perhatian', 'Anda tidak bisa mengikuti diri sendiri');
      return;
    }

    try {
      // OPTIMISTIC UPDATE: Update UI immediately
      const updateFollowState = (users) => {
        if (!Array.isArray(users)) return [];
        return users.map(user => {
          if (Number(user.id) === Number(userId)) {
            return {
              ...user,
              is_following: !user.is_following,
              followers_count: user.is_following
                ? (user.followers_count || 1) - 1
                : (user.followers_count || 0) + 1
            };
          }
          return user;
        });
      };

      // Update all lists immediately (optimistic)
      setUserResults(prevUsers => updateFollowState(prevUsers));
      setRecommendedAccounts(prevAccounts => updateFollowState(prevAccounts));
      setSuggestedUsers(prevUsers => updateFollowState(prevUsers));

      // Call API (non-blocking UI update)
      const response = await apiService.toggleFollow(userId);

      // Verify response and update if needed
      if (response?.data && typeof response.data.following !== 'undefined') {
        const isNowFollowing = response.data.following;

        // Update with actual server state
        const updateToServerState = (users) => {
          if (!Array.isArray(users)) return [];
          return users.map(user =>
            user.id === userId
              ? { ...user, is_following: isNowFollowing }
              : user
          );
        };

        setUserResults(prevUsers => updateToServerState(prevUsers));
        setRecommendedAccounts(prevAccounts => updateToServerState(prevAccounts));
        setSuggestedUsers(prevUsers => updateToServerState(prevUsers));
      }
    } catch (error) {
      console.error('Error toggling follow:', error);

      // REVERT OPTIMISTIC UPDATE on error
      const revertFollowState = (users) => {
        if (!Array.isArray(users)) return [];
        return users.map(user => {
          if (user.id === userId) {
            return {
              ...user,
              is_following: !user.is_following,
              followers_count: user.is_following
                ? (user.followers_count || 0) + 1
                : (user.followers_count || 1) - 1
            };
          }
          return user;
        });
      };

      setUserResults(prevUsers => revertFollowState(prevUsers));
      setRecommendedAccounts(prevAccounts => revertFollowState(prevAccounts));
      setSuggestedUsers(prevUsers => revertFollowState(prevUsers));

      const errorMessage = error.response?.data?.message || error.message;
      if (errorMessage === 'You cannot follow yourself') {
        Alert.alert('Perhatian', 'Anda tidak bisa mengikuti diri sendiri');
      } else {
        Alert.alert('Error', 'Gagal mengubah status follow. Silakan coba lagi.');
      }
    }
  };

  const renderUserResult = ({ item: user }) => {
    return (
      <View style={styles.userCard}>
        <TouchableOpacity
          style={styles.userInfo}
          onPress={() => navigation.navigate('OtherUserProfile', { userId: user.id })}
        >
          {user.avatar_url ? (
            <Image source={{ uri: user.avatar_url }} style={styles.userAvatar} />
          ) : (
            <View style={styles.userAvatarPlaceholder}>
              <Ionicons name="person" size={24} color="#6B7280" />
            </View>
          )}
          <View style={styles.userDetails}>
            {/* Username + Badge */}
            <View style={styles.usernameRow}>
              <Text style={styles.username}>@{user.username || user.name.toLowerCase().replace(/\s+/g, '')}</Text>
              {user.badge_status === 'approved' && user.show_badge && (
                <View style={styles.creatorBadge}>
                  <Text style={styles.creatorBadgeText}>CREATOR</Text>
                </View>
              )}
            </View>

            {/* Name + Followers */}
            <View style={styles.nameFollowersRow}>
              <Text style={styles.displayName} numberOfLines={1}>{user.name}</Text>
              <Text style={styles.followersDot}> • </Text>
              <Text style={styles.followersCount}>{user.followers_count || 0} followers</Text>
            </View>
          </View>
        </TouchableOpacity>
        {currentUserId && Number(user.id) !== Number(currentUserId) && (
          <TouchableOpacity
            style={[styles.followButton, user.is_following && styles.followingButton]}
            onPress={() => handleFollowToggle(user.id)}
          >
            <Text style={[
              styles.followButtonText,
              user.is_following && { color: '#000000' }
            ]}>
              {user.is_following ? 'Following' : 'Follow'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderSearchResult = ({ item }) => {
    // Safely parse menu_data
    let menuData = {};
    try {
      if (item.menu_data) {
        if (typeof item.menu_data === 'string') {
          menuData = JSON.parse(item.menu_data);
        } else if (typeof item.menu_data === 'object') {
          menuData = item.menu_data;
        }
      }
    } catch (error) {
      console.warn('Error parsing menu_data in search result:', error);
      menuData = {};
    }

    return (
      <TouchableOpacity
        style={dynamicStyles.resultCard}
        onPress={() => {
          // Navigate to Home with video ID
          navigation.navigate('MainTabs', {
            screen: 'Home',
            params: {
              screen: 'HomeMain',
              params: { videoId: item.id }
            }
          });
        }}
      >
        <Image
          source={{ uri: item.thumbnail_url || 'https://via.placeholder.com/200' }}
          style={dynamicStyles.resultThumbnail}
          resizeMode="cover"
        />
        <View style={dynamicStyles.resultOverlay}>
          <Ionicons name="play-circle" size={40} color="rgba(255,255,255,0.9)" />
        </View>
        <View style={styles.resultInfo}>
          <Text style={styles.resultTitle} numberOfLines={2}>
            {menuData.name || 'Video kuliner'}
          </Text>
          <View style={styles.resultStats}>
            <View style={styles.resultStat}>
              <Ionicons name="heart" size={14} color="#FF3B5C" />
              <Text style={styles.resultStatText}>{item.likes_count || 0}</Text>
            </View>
            <View style={styles.resultStat}>
              <Ionicons name="eye" size={14} color="#6B7280" />
              <Text style={styles.resultStatText}>{item.views_count || 0}</Text>
            </View>
          </View>
          <View style={styles.resultCreator}>
            <Ionicons name="person-circle-outline" size={14} color="#6B7280" />
            <Text style={styles.resultCreatorText} numberOfLines={1}>
              {item.user?.name || 'Unknown'}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderRecommendedAccount = ({ item: account }) => {
    const CARD_WIDTH = (width - 48) / 3; // 3 cards with spacing

    return (
      <View style={styles.recommendedAccountCard}>
        {/* Account Header */}
        <View style={styles.accountHeader}>
          <TouchableOpacity
            style={styles.accountInfo}
            onPress={() => navigation.navigate('OtherUserProfile', { userId: account.id })}
          >
            {account.avatar_url ? (
              <Image source={{ uri: account.avatar_url }} style={styles.accountAvatar} />
            ) : (
              <View style={styles.accountAvatarPlaceholder}>
                <Ionicons name="person" size={32} color="#FFFFFF" />
              </View>
            )}
            <View style={styles.accountDetails}>
              <Text style={styles.accountName}>{account.name}</Text>
              <Text style={styles.accountFollowers}>{account.followers_count || 0} followers</Text>
            </View>
          </TouchableOpacity>
          {currentUserId && Number(account.id) !== Number(currentUserId) && (
            <TouchableOpacity
              style={[
                styles.followButton,
                account.is_following && styles.followingButton,
              ]}
              onPress={() => handleFollowToggle(account.id)}
            >
              <Ionicons
                name={account.is_following ? "checkmark" : "person-add"}
                size={16}
                color="#FFFFFF"
              />
              <Text style={styles.followButtonText}>
                {account.is_following ? 'Following' : 'Follow'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Videos Grid - Show first 3 videos */}
        {account.videos && account.videos.length > 0 && (
          <View style={styles.videosGrid}>
            {account.videos.slice(0, 3).map((video, index) => (
              <TouchableOpacity
                key={video.id}
                style={[styles.videoThumb, { width: CARD_WIDTH }]}
                onPress={() => {
                  navigation.navigate('MainTabs', {
                    screen: 'Home',
                    params: {
                      screen: 'HomeMain',
                      params: { videoId: video.id }
                    }
                  });
                }}
              >
                <Image
                  source={{ uri: video.thumbnail_url || 'https://via.placeholder.com/150' }}
                  style={styles.videoThumbImage}
                  resizeMode="cover"
                />
                <View style={styles.videoLikeOverlay}>
                  <Ionicons name="heart" size={14} color="#FF3B5C" />
                  <Text style={styles.videoLikeText}>{video.likes_count || 0}</Text>
                </View>
              </TouchableOpacity>
            ))}
            {/* Placeholder boxes if less than 3 videos */}
            {account.videos.length < 3 && [...Array(3 - account.videos.length)].map((_, i) => (
              <View key={`placeholder-${i}`} style={[styles.videoThumb, styles.videoPlaceholder, { width: CARD_WIDTH }]}>
                <Ionicons name="images-outline" size={32} color="#D1D5DB" />
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#EDE8D0" />

      {/* Search Bar */}
      <View style={styles.searchBarContainer}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#000000" />
        </TouchableOpacity>

        <View style={styles.searchInputWrapper}>
          <Ionicons name="search" size={20} color="#999999" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search videos, users..."
            placeholderTextColor="#999999"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearchSubmit}
            autoFocus
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => {
              setSearchQuery('');
              setShowResults(false);
            }}>
              <Ionicons name="close-circle" size={20} color="#999999" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {showResults ? (
        <ScrollView style={styles.resultsContainer} showsVerticalScrollIndicator={false}>
          {isSearching ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#06402B" />
              <Text style={styles.loadingText}>Mencari...</Text>
            </View>
          ) : userResults.length > 0 || videoResults.length > 0 ? (
            <>
              {/* Accounts Section */}
              {userResults.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Accounts</Text>
                  {userResults.map((user) => (
                    <View key={user.id}>
                      {renderUserResult({ item: user })}
                    </View>
                  ))}
                </View>
              )}

              {/* Video Results */}
              {videoResults.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.resultsCount}>
                    {videoResults.length} video untuk "{searchQuery}"
                  </Text>
                  <View style={styles.videoGrid}>
                    {videoResults.map((video) => (
                      <View key={video.id} style={dynamicStyles.videoGridItem}>
                        {renderSearchResult({ item: video })}
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </>
          ) : (
            <View style={styles.emptyResults}>
              <Ionicons name="search-outline" size={64} color="#D1D5DB" />
              <Text style={styles.emptyResultsText}>Tidak ada hasil</Text>
              <Text style={styles.emptyResultsSubtext}>
                Coba kata kunci lain
              </Text>
            </View>
          )}
        </ScrollView>
      ) : (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Trending Searches */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Trending Searches</Text>

            {trendingSearches.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={styles.trendingItemSimple}
                onPress={() => handleSelectSearch(item)}
              >
                <Text style={styles.trendingTextRed}>{item}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Accounts Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Accounts</Text>

            {/* Show Recommended Accounts if available */}
            {recommendedAccounts.length > 0 && recommendedAccounts.map((account) => (
              <View key={account.id}>
                {renderUserResult({ item: account })}
              </View>
            ))}

            {/* Show Suggested Users */}
            {suggestedUsers.length > 0 && suggestedUsers.map((user) => (
              <View key={user.id}>
                {renderUserResult({ item: user })}
              </View>
            ))}
          </View>

          {/* Recent Searches */}
          {recentSearches.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="time" size={20} color="#06402B" />
                <Text style={styles.sectionTitle}>Pencarian Terakhir</Text>
              </View>

              {recentSearches.map((item, index) => (
                <View key={index} style={styles.recentItem}>
                  <Ionicons name="search" size={18} color="#9CA3AF" />
                  <TouchableOpacity
                    style={styles.recentTextContainer}
                    onPress={() => handleSelectSearch(item)}
                  >
                    <Text style={styles.recentText}>{item}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => removeRecentSearch(item)}>
                    <Ionicons name="close" size={18} color="#D1D5DB" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {/* Quick Filters */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="filter" size={20} color="#06402B" />
              <Text style={styles.sectionTitle}>Kategori Populer</Text>
            </View>

            <View style={styles.filterContainer}>
              {['Makanan Pedas', 'Dessert', 'Street Food', 'Resep Murah', 'Healthy Food', 'Traditional'].map((filter, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.filterChip}
                  onPress={() => handleSelectSearch(filter)}
                >
                  <Text style={styles.filterText}>{filter}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EDE8D0',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#EDE8D0',
  },
  cofreTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000000',
  },
  headerIcon: {
    padding: 4,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: '#EDE8D0',
    gap: 12,
  },
  backButton: {
    padding: 4,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    borderWidth: 2,
    borderColor: '#06402B',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  searchIcon: {
    marginRight: 4,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000000',
  },
  content: {
    flex: 1,
    backgroundColor: '#EDE8D0',
  },
  section: {
    backgroundColor: '#FFFFFF',
    paddingTop: 8,
    paddingBottom: 8,
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '400',
    color: '#9CA3AF',
    paddingHorizontal: 20,
    marginBottom: 12,
    marginTop: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
    paddingHorizontal: 20,
    marginBottom: 16,
    marginTop: 8,
  },
  sectionTitleLarge: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  trendingItemSimple: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 0,
  },
  trendingTextRed: {
    fontSize: 16,
    fontWeight: '500',
    color: '#EF4444',
  },
  trendingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#EDE8D0',
  },
  trendingRank: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#06402B',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  trendingRankText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  trendingTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '400',
    color: '#000000',
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
  },
  recentTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  recentText: {
    fontSize: 15,
    color: '#000000',
    fontWeight: '400',
  },
  filterContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
  },
  filterChip: {
    backgroundColor: '#F0F0F0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    margin: 4,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000000',
  },
  resultsContainer: {
    flex: 1,
    backgroundColor: '#EDE8D0',
  },
  resultsCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  resultsContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  resultsRow: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  // resultCard, resultThumbnail, resultOverlay moved to createDynamicStyles
  resultInfo: {
    padding: 12,
  },
  resultTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 6,
    lineHeight: 18,
  },
  resultStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 6,
  },
  resultStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  resultStatText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  resultCreator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  resultCreatorText: {
    fontSize: 12,
    color: '#6B7280',
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  emptyResults: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyResultsText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 16,
  },
  emptyResultsSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
  },
  // User Card Styles
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 0,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#D1D5DB',
  },
  userAvatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userDetails: {
    marginLeft: 12,
    flex: 1,
    justifyContent: 'center',
  },
  usernameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  username: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
  },
  nameFollowersRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  displayName: {
    fontSize: 13,
    fontWeight: '400',
    color: '#6B7280',
    flexShrink: 1,
  },
  followersDot: {
    fontSize: 13,
    color: '#6B7280',
    marginHorizontal: 2,
  },
  followersCount: {
    fontSize: 13,
    fontWeight: '400',
    color: '#6B7280',
  },
  creatorBadge: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
  },
  creatorBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: 0.5,
  },
  followButton: {
    backgroundColor: '#06402B',
    paddingHorizontal: 20,
    paddingVertical: 7,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 90,
  },
  followingButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  followButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Video Grid Styles
  videoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  // videoGridItem moved to createDynamicStyles
  // Recommended Account Styles
  recommendedAccountCard: {
    backgroundColor: '#FFFFFF',
    marginBottom: 20,
    paddingBottom: 16,
  },
  accountHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  accountInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  accountAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#000000',
  },
  accountAvatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  accountDetails: {
    marginLeft: 12,
    flex: 1,
  },
  accountName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 2,
  },
  accountFollowers: {
    fontSize: 13,
    color: '#6B7280',
  },
  videosGrid: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 12,
    gap: 8,
  },
  videoThumb: {
    height: 180,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
    position: 'relative',
  },
  videoPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoThumbImage: {
    width: '100%',
    height: '100%',
  },
  videoLikeOverlay: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
    gap: 4,
  },
  videoLikeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Remove styles that use ITEM_WIDTH - moved to createDynamicStyles
});

// Dynamic styles that depend on ITEM_WIDTH
const createDynamicStyles = (ITEM_WIDTH) => StyleSheet.create({
  resultCard: {
    width: ITEM_WIDTH,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  resultThumbnail: {
    width: '100%',
    height: ITEM_WIDTH * 1.3,
    backgroundColor: '#E8E8E0',
  },
  resultOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: ITEM_WIDTH * 0.4,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  videoGridItem: {
    width: ITEM_WIDTH,
    marginBottom: 16,
  },
});

export default SearchScreen;
