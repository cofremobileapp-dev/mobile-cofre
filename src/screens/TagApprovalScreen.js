import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Image,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { apiService } from '../services/ApiService';

const TagApprovalScreen = () => {
  const navigation = useNavigation();
  const [pendingTags, setPendingTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingTagId, setProcessingTagId] = useState(null);

  useEffect(() => {
    loadPendingTags();
  }, []);

  const loadPendingTags = async () => {
    try {
      setLoading(true);
      const response = await apiService.getPendingTags();

      if (response.data) {
        setPendingTags(response.data.data || []);
      }
    } catch (error) {
      console.error('Error loading pending tags:', error);
      Alert.alert('Error', 'Gagal memuat pending tags');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadPendingTags();
    setRefreshing(false);
  }, []);

  const handleApprove = async (tagId) => {
    try {
      setProcessingTagId(tagId);
      await apiService.approveTag(tagId);

      // Remove from list
      setPendingTags(prev => prev.filter(tag => tag.id !== tagId));

      Alert.alert('Success', 'Tag disetujui');
    } catch (error) {
      console.error('Error approving tag:', error);
      Alert.alert('Error', 'Gagal menyetujui tag');
    } finally {
      setProcessingTagId(null);
    }
  };

  const handleReject = async (tagId) => {
    Alert.alert(
      'Tolak Tag?',
      'Apakah Anda yakin ingin menolak tag ini?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Tolak',
          style: 'destructive',
          onPress: async () => {
            try {
              setProcessingTagId(tagId);
              await apiService.rejectTag(tagId);

              // Remove from list
              setPendingTags(prev => prev.filter(tag => tag.id !== tagId));

              Alert.alert('Success', 'Tag ditolak');
            } catch (error) {
              console.error('Error rejecting tag:', error);
              Alert.alert('Error', 'Gagal menolak tag');
            } finally {
              setProcessingTagId(null);
            }
          }
        }
      ]
    );
  };

  const handleVideoPress = (videoId) => {
    // Navigate to video detail or home screen
    navigation.navigate('Home');
  };

  const renderTagItem = ({ item }) => {
    const isProcessing = processingTagId === item.id;

    return (
      <View style={styles.tagCard}>
        <TouchableOpacity
          onPress={() => handleVideoPress(item.video?.id)}
          style={styles.videoSection}
          activeOpacity={0.7}
        >
          <Image
            source={{ uri: item.video?.thumbnail_url || 'https://via.placeholder.com/100' }}
            style={styles.videoThumbnail}
          />
          <View style={styles.videoInfo}>
            <Text style={styles.taggedByText}>
              <Text style={styles.taggedByName}>{item.tagged_by_user?.name}</Text>
              {' '}menandai Anda
            </Text>
            <Text style={styles.tagTypeText}>
              {item.tag_type === 'video' && '📹 Di video'}
              {item.tag_type === 'caption' && '💬 Di caption'}
              {item.tag_type === 'comment' && '💭 Di komentar'}
            </Text>
            <Text style={styles.timeText}>
              {new Date(item.created_at).toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>
        </TouchableOpacity>

        <View style={styles.actionsSection}>
          <TouchableOpacity
            style={[styles.rejectButton, isProcessing && styles.buttonDisabled]}
            onPress={() => handleReject(item.id)}
            disabled={isProcessing}
            activeOpacity={0.7}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color="#EF4444" />
            ) : (
              <>
                <Ionicons name="close-circle" size={20} color="#EF4444" />
                <Text style={styles.rejectButtonText}>Tolak</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.approveButton, isProcessing && styles.buttonDisabled]}
            onPress={() => handleApprove(item.id)}
            disabled={isProcessing}
            activeOpacity={0.7}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#FFF" />
                <Text style={styles.approveButtonText}>Setuju</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="checkmark-done-circle" size={80} color="#D1D5DB" />
      <Text style={styles.emptyStateTitle}>Tidak Ada Tag Pending</Text>
      <Text style={styles.emptyStateText}>
        Anda tidak memiliki tag yang menunggu persetujuan
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#06402B" />
        <Text style={styles.loadingText}>Memuat pending tags...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Persetujuan Tag</Text>
        <View style={styles.headerRight}>
          {pendingTags.length > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{pendingTags.length}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Tags List */}
      <FlatList
        data={pendingTags}
        renderItem={renderTagItem}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={[
          styles.listContent,
          pendingTags.length === 0 && styles.listContentEmpty
        ]}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#06402B']}
            tintColor="#06402B"
          />
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EDE8D0',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#EDE8D0',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    width: 32,
    alignItems: 'flex-end',
  },
  countBadge: {
    backgroundColor: '#06402B',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 24,
    alignItems: 'center',
  },
  countBadgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  listContent: {
    padding: 16,
  },
  listContentEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  tagCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  videoSection: {
    flexDirection: 'row',
    padding: 12,
  },
  videoThumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  videoInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  taggedByText: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 4,
  },
  taggedByName: {
    fontWeight: '700',
    color: '#06402B',
  },
  tagTypeText: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 4,
  },
  timeText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  actionsSection: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  rejectButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#EF4444',
  },
  approveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: '#06402B',
    gap: 6,
  },
  approveButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFF',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 20,
  },
});

export default TagApprovalScreen;
