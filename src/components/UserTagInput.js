import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiService } from '../services/ApiService';

const UserTagInput = ({ selectedUsers = [], onUsersChange, onAddUserToCaption }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim().length >= 1) {
        searchUsers(searchQuery.trim());
      } else {
        setSearchResults([]);
        setShowDropdown(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const searchUsers = async (query) => {
    try {
      setLoading(true);
      const response = await apiService.searchUsersForTagging(query);

      if (response.data?.success) {
        // Filter out already selected users
        const filtered = response.data.data.filter(
          user => !selectedUsers.some(selected => selected.id === user.id)
        );
        setSearchResults(filtered);
        setShowDropdown(filtered.length > 0);
      }
    } catch (error) {
      console.error('Search users error:', error);
      setSearchResults([]);
      setShowDropdown(false);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectUser = (user) => {
    const updatedUsers = [...selectedUsers, user];
    onUsersChange(updatedUsers);

    // Call callback to add @username to caption if provided
    if (onAddUserToCaption) {
      onAddUserToCaption(user.name);
    }

    setSearchQuery('');
    setSearchResults([]);
    setShowDropdown(false);
  };

  const handleRemoveUser = (userId) => {
    const updatedUsers = selectedUsers.filter(user => user.id !== userId);
    onUsersChange(updatedUsers);
  };

  const renderSearchResult = ({ item }) => (
    <TouchableOpacity
      style={styles.searchResultItem}
      onPress={() => handleSelectUser(item)}
    >
      <Image
        source={{ uri: item.avatar_url || 'https://via.placeholder.com/40' }}
        style={styles.searchResultAvatar}
      />
      <View style={styles.searchResultInfo}>
        <Text style={styles.searchResultName}>{item.name}</Text>
        <Text style={styles.searchResultEmail}>@{item.email}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderSelectedUser = ({ item }) => (
    <View style={styles.selectedUserChip}>
      <Image
        source={{ uri: item.avatar_url || 'https://via.placeholder.com/24' }}
        style={styles.selectedUserAvatar}
      />
      <Text style={styles.selectedUserName}>{item.name}</Text>
      <TouchableOpacity
        onPress={() => handleRemoveUser(item.id)}
        style={styles.removeButton}
      >
        <Ionicons name="close-circle" size={18} color="#666" />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Selected Users Display */}
      {selectedUsers.length > 0 && (
        <View style={styles.selectedUsersContainer}>
          <FlatList
            data={selectedUsers}
            renderItem={renderSelectedUser}
            keyExtractor={item => item.id.toString()}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.selectedUsersList}
          />
        </View>
      )}

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Cari user untuk di-tag..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          onFocus={() => {
            if (searchResults.length > 0) {
              setShowDropdown(true);
            }
          }}
        />
        {loading && (
          <ActivityIndicator size="small" color="#06402B" style={styles.loadingIcon} />
        )}
      </View>

      {/* Search Results Dropdown */}
      {showDropdown && searchResults.length > 0 && (
        <View style={styles.dropdownContainer}>
          <FlatList
            data={searchResults}
            renderItem={renderSearchResult}
            keyExtractor={item => item.id.toString()}
            style={styles.dropdown}
            keyboardShouldPersistTaps="handled"
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 15,
    zIndex: 1000,
  },
  selectedUsersContainer: {
    marginBottom: 10,
  },
  selectedUsersList: {
    paddingVertical: 5,
  },
  selectedUserChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#06402B',
  },
  selectedUserAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 6,
  },
  selectedUserName: {
    fontSize: 14,
    color: '#06402B',
    fontWeight: '500',
    marginRight: 4,
  },
  removeButton: {
    marginLeft: 2,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#333',
  },
  loadingIcon: {
    marginLeft: 8,
  },
  dropdownContainer: {
    position: 'absolute',
    top: 54,
    left: 0,
    right: 0,
    zIndex: 9999,
    elevation: 10,
  },
  dropdown: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    maxHeight: 250,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  searchResultAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  searchResultInfo: {
    flex: 1,
  },
  searchResultName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  searchResultEmail: {
    fontSize: 13,
    color: '#666',
  },
});

export default UserTagInput;
