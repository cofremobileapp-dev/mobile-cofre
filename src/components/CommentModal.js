import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiService } from '../services/ApiService';
import { useAuth } from '../contexts/AuthContext';

const CommentModal = ({ visible, onClose, videoId, initialCommentsCount = 0 }) => {
  const { user } = useAuth();
  const [comments, setComments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [commentsCount, setCommentsCount] = useState(initialCommentsCount);
  const flatListRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (visible) {
      loadComments(1);
    }
  }, [visible, videoId]);

  const loadComments = async (page = 1) => {
    try {
      if (page === 1) {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }

      const response = await apiService.getComments(videoId, page);
      const newComments = response.data.data || [];

      if (page === 1) {
        setComments(newComments);
      } else {
        setComments(prev => [...prev, ...newComments]);
      }

      setHasMore(response.data.next_page_url !== null);
      setCurrentPage(page);
      setCommentsCount(response.data.total || 0);
    } catch (error) {
      console.error('Error loading comments:', error);
      Alert.alert('Error', 'Gagal memuat komentar');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    if (!isLoadingMore && hasMore) {
      loadComments(currentPage + 1);
    }
  };

  const handleSubmitComment = async () => {
    if (!commentText.trim()) {
      return;
    }

    if (commentText.length > 500) {
      Alert.alert('Error', 'Komentar maksimal 500 karakter');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await apiService.addComment(videoId, commentText.trim());

      // Add new comment to the top of the list
      setComments(prev => [response.data.comment, ...prev]);
      setCommentsCount(prev => prev + 1);
      setCommentText('');

      // Scroll to top to show new comment
      if (flatListRef.current) {
        flatListRef.current.scrollToOffset({ offset: 0, animated: true });
      }
    } catch (error) {
      console.error('Error submitting comment:', error);
      Alert.alert('Error', 'Gagal menambahkan komentar');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    Alert.alert(
      'Hapus Komentar',
      'Apakah Anda yakin ingin menghapus komentar ini?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiService.deleteComment(commentId);

              // Remove comment from list
              setComments(prev => prev.filter(c => c.id !== commentId));
              setCommentsCount(prev => prev - 1);
            } catch (error) {
              console.error('Error deleting comment:', error);
              if (error.response?.status === 403) {
                Alert.alert('Error', 'Anda tidak dapat menghapus komentar ini');
              } else {
                Alert.alert('Error', 'Gagal menghapus komentar');
              }
            }
          },
        },
      ]
    );
  };

  const renderComment = ({ item }) => {
    // Only show delete button if comment belongs to current user
    // Check both item.user_id and item.user?.id for compatibility
    const commentUserId = item.user_id || item.user?.id;
    const isOwnComment = user?.id && commentUserId && Number(user.id) === Number(commentUserId);

    return (
      <View style={styles.commentItem}>
        <View style={styles.commentAvatar}>
          <Ionicons name="person-circle" size={36} color="#06402B" />
        </View>
        <View style={styles.commentContent}>
          <View style={styles.commentHeader}>
            <Text style={styles.commentUsername}>@{item.user?.name || 'Unknown'}</Text>
            <Text style={styles.commentTime}>
              {formatTimeAgo(item.created_at)}
            </Text>
          </View>
          <Text style={styles.commentText}>{item.content}</Text>
        </View>
        {isOwnComment && (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeleteComment(item.id)}
          >
            <Ionicons name="trash-outline" size={20} color="#EF4444" />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const commentTime = new Date(timestamp);
    const diffInSeconds = Math.floor((now - commentTime) / 1000);

    if (diffInSeconds < 60) return 'Baru saja';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d`;
    return commentTime.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.modalContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              Komentar {commentsCount > 0 ? `(${commentsCount})` : ''}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={28} color="#06402B" />
            </TouchableOpacity>
          </View>

          {/* Comments List */}
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#06402B" />
              <Text style={styles.loadingText}>Memuat komentar...</Text>
            </View>
          ) : comments.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubbles-outline" size={64} color="#D1D5DB" />
              <Text style={styles.emptyText}>Belum ada komentar</Text>
              <Text style={styles.emptySubtext}>Jadilah yang pertama berkomentar!</Text>
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={comments}
              renderItem={renderComment}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={styles.commentsList}
              onEndReached={handleLoadMore}
              onEndReachedThreshold={0.5}
              ListFooterComponent={
                isLoadingMore ? (
                  <View style={styles.footerLoader}>
                    <ActivityIndicator size="small" color="#06402B" />
                  </View>
                ) : null
              }
            />
          )}

          {/* Comment Input */}
          <View style={styles.inputContainer}>
            <TextInput
              ref={inputRef}
              style={styles.textInput}
              placeholder="Tulis komentar..."
              placeholderTextColor="#9CA3AF"
              value={commentText}
              onChangeText={setCommentText}
              multiline
              maxLength={500}
              editable={!isSubmitting}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!commentText.trim() || isSubmitting) && styles.sendButtonDisabled,
              ]}
              onPress={handleSubmitComment}
              disabled={!commentText.trim() || isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="send" size={20} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          </View>
          {commentText.length > 0 && (
            <Text style={styles.characterCount}>
              {commentText.length}/500
            </Text>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#EDE8D0',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#E8E8E0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#06402B',
  },
  closeButton: {
    padding: 4,
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#6B7280',
    fontSize: 14,
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
  },
  commentsList: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  commentItem: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E0',
  },
  commentAvatar: {
    marginRight: 12,
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  commentUsername: {
    fontSize: 14,
    fontWeight: '600',
    color: '#06402B',
    marginRight: 8,
  },
  commentTime: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  commentText: {
    fontSize: 14,
    color: '#1F2937',
    lineHeight: 20,
  },
  deleteButton: {
    padding: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E8E8E0',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#EDE8D0',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1F2937',
    maxHeight: 100,
    marginRight: 12,
  },
  sendButton: {
    backgroundColor: '#06402B',
    borderRadius: 24,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  characterCount: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'right',
    paddingHorizontal: 20,
    paddingBottom: 8,
    backgroundColor: '#FFFFFF',
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
});

export default CommentModal;
