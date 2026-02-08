import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
  Image,
  StyleSheet,
  Modal,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { apiService } from '../services/ApiService';
import { mediaUtils } from '../utils/mediaUtils';
import UserTagInput from '../components/UserTagInput';
import { formatPrice } from '../utils/formatUtils';

const UploadScreen = () => {
  const navigation = useNavigation();
  const [mediaUri, setMediaUri] = useState(null);
  const [mediaType, setMediaType] = useState(null); // 'video' or 'image'
  const [thumbnailUri, setThumbnailUri] = useState(null);
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [budget, setBudget] = useState('');
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [aiResult, setAiResult] = useState(null);

  // Recipe data fields
  const [menuName, setMenuName] = useState('');
  const [ingredients, setIngredients] = useState('');
  const [steps, setSteps] = useState('');
  const [price, setPrice] = useState('');
  const [servings, setServings] = useState('');

  // Tag users
  const [taggedUsers, setTaggedUsers] = useState([]);

  // Playlist selection
  const [playlists, setPlaylists] = useState([]);
  const [selectedPlaylistIds, setSelectedPlaylistIds] = useState([]);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [isLoadingPlaylists, setIsLoadingPlaylists] = useState(false);

  const budgetOptions = [
    { label: 'Pilih budget', value: '' },
    { label: '< Rp 25.000', value: '<25000' },
    { label: 'Rp 25.000 - Rp 50.000', value: '25000-50000' },
    { label: 'Rp 50.000 - Rp 100.000', value: '50000-100000' },
    { label: 'Rp 100.000 - Rp 200.000', value: '100000-200000' },
    { label: '> Rp 200.000', value: '>200000' },
  ];

  const timeOptions = [
    { label: 'Pilih waktu', value: '' },
    { label: 'Sarapan (06:00 - 10:00)', value: 'breakfast' },
    { label: 'Brunch (10:00 - 12:00)', value: 'brunch' },
    { label: 'Makan Siang (12:00 - 15:00)', value: 'lunch' },
    { label: 'Snack Sore (15:00 - 18:00)', value: 'snack' },
    { label: 'Makan Malam (18:00 - 22:00)', value: 'dinner' },
    { label: 'Malam (22:00 - 00:00)', value: 'night' },
  ];

  // Load playlists when component mounts
  useEffect(() => {
    loadPlaylists();
  }, []);

  const loadPlaylists = async () => {
    setIsLoadingPlaylists(true);
    try {
      const response = await apiService.getPlaylists();
      const playlistData = response.data?.data || response.data;
      if (playlistData && Array.isArray(playlistData)) {
        setPlaylists(playlistData);
      }
    } catch (error) {
      console.error('Error loading playlists:', error);
    } finally {
      setIsLoadingPlaylists(false);
    }
  };

  const togglePlaylistSelection = (playlistId) => {
    setSelectedPlaylistIds(prevIds => {
      if (prevIds.includes(playlistId)) {
        return prevIds.filter(id => id !== playlistId);
      } else {
        return [...prevIds, playlistId];
      }
    });
  };

  const generateThumbnail = async (videoUri) => {
    try {
      const { uri } = await VideoThumbnails.getThumbnailAsync(videoUri, {
        time: 1000,
      });
      return uri;
    } catch (error) {
      console.error('Error generating thumbnail:', error);
      return null;
    }
  };

  const pickMedia = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (permissionResult.granted === false) {
        Alert.alert('Permission Required', 'Permission to access media library is required!');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'], // Allow both images and videos
        allowsEditing: true,
        quality: 1,
        videoMaxDuration: 60,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const uri = asset.uri;
        const type = asset.type; // 'image' or 'video'

        // Validate media file size
        const validation = await mediaUtils.validateMedia(uri, type);
        if (!validation.valid) {
          Alert.alert('File Terlalu Besar', validation.error);
          return;
        }

        // Show file size info
        const fileSize = await mediaUtils.getFileSize(uri);
        console.log(`Selected ${type} size:`, mediaUtils.formatFileSize(fileSize));

        let processedUri = uri;

        // Compress image if needed
        if (type === 'image') {
          const shouldCompress = await mediaUtils.shouldCompressImage(uri);
          if (shouldCompress) {
            Alert.alert(
              'Mengkompresi Gambar',
              'Gambar Anda akan dikompres untuk mempercepat upload...',
              [{ text: 'OK' }]
            );

            try {
              const compressed = await mediaUtils.compressImage(uri);
              processedUri = compressed.uri;
              console.log('Image compressed:', {
                original: mediaUtils.formatFileSize(compressed.originalSize),
                compressed: mediaUtils.formatFileSize(compressed.compressedSize),
                ratio: Math.round(compressed.compressionRatio) + '%'
              });

              Alert.alert(
                'Kompresi Berhasil',
                `Ukuran file dikurangi dari ${mediaUtils.formatFileSize(compressed.originalSize)} menjadi ${mediaUtils.formatFileSize(compressed.compressedSize)}`
              );
            } catch (compressionError) {
              console.error('Compression failed:', compressionError);
              Alert.alert('Warning', 'Kompresi gagal, menggunakan gambar original');
            }
          }
        }

        setMediaUri(processedUri);
        setMediaType(type);

        // Generate thumbnail based on media type
        if (type === 'video') {
          const thumbnail = await generateThumbnail(processedUri);
          if (thumbnail) {
            setThumbnailUri(thumbnail);
          }
        } else if (type === 'image') {
          // For images, generate optimized thumbnail
          const thumbnail = await mediaUtils.generateImageThumbnail(processedUri);
          setThumbnailUri(thumbnail);
        }

        Alert.alert('Success', `${type === 'video' ? 'Video' : 'Foto'} berhasil dipilih!`);
      }
    } catch (error) {
      console.error('Error picking media:', error);
      Alert.alert('Error', 'Gagal memilih media. Silakan coba lagi.');
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleAiScan = async () => {
    // EMERGENCY DEBUG: Alert to confirm button press
    Alert.alert('Debug', 'Tombol AI ditekan! Memulai scan...');

    console.log('🔍 Tombol AI ditekan');
    console.log('📸 Thumbnail URI:', thumbnailUri);

    if (!thumbnailUri) {
      Alert.alert('Error', 'Tidak ada gambar untuk di-scan');
      return;
    }

    setIsScanning(true);
    console.log('⏳ Loading AI scan...');

    try {
      const formData = new FormData();
      formData.append('image', {
        uri: thumbnailUri,
        type: 'image/jpeg',
        name: `scan_${Date.now()}.jpg`,
      });

      console.log('📤 Sending image to AI API...');
      const response = await apiService.scanFood(formData);
      console.log('✅ AI Response received:', response);

      if (response.success && response.data) {
        const result = response.data;
        setAiResult(result);

        if (!result.is_food) {
          Alert.alert('❌ Bukan Makanan', 'AI mendeteksi ini bukan gambar makanan.');
        } else {
          // Navigate to Analysis Result Screen with detailed breakdown
          navigation.navigate('AnalysisResult', {
            analysisData: result,
            imageUri: thumbnailUri || mediaUri,
            videoData: null, // Optional: can include video metadata if needed
          });

          // Also auto-fill form with AI results for later upload
          const firstItem = result.items?.[0] || {};
          const dishName = firstItem.name || result.name || 'Makanan';

          // Auto-fill description
          const formattedDescription = `${dishName} | ${result.total_calories || result.calories || '?'} kkal | ${formatPrice(result.price || 0)}`;
          setDescription(formattedDescription);

          // Auto-fill menu name
          setMenuName(dishName);

          // Auto-fill price
          if (result.price) {
            const priceFormatted = new Intl.NumberFormat('id-ID', {
              style: 'currency',
              currency: 'IDR',
              minimumFractionDigits: 0,
            }).format(result.price);
            setPrice(priceFormatted);

            // Auto-fill budget range from price
            if (result.price < 25000) setBudget('<25000');
            else if (result.price < 50000) setBudget('25000-50000');
            else if (result.price < 100000) setBudget('50000-100000');
            else if (result.price < 200000) setBudget('100000-200000');
            else setBudget('>200000');
          }

          // Auto-fill ingredients from AI result
          if (result.ingredients) {
            // Convert comma-separated to bullet points
            const ingredientsList = result.ingredients
              .split(',')
              .map(item => `• ${item.trim().charAt(0).toUpperCase() + item.trim().slice(1)}`)
              .join('\n');
            setIngredients(ingredientsList);
          }

          // Auto-fill servings estimation based on calories
          if (result.total_calories || result.calories) {
            const totalCal = result.total_calories || result.calories;
            if (totalCal < 300) setServings('1 porsi');
            else if (totalCal < 600) setServings('1-2 porsi');
            else if (totalCal < 1000) setServings('2-3 porsi');
            else setServings('3-4 porsi');
          }
        }
      }
    } catch (error) {
      console.error('❌ AI Scan Error:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });

      // DEBUG: Show detailed error to user
      const errorMessage = error.response?.data?.message || error.message || 'Gagal melakukan scan AI';
      Alert.alert('Error', `AI Scan Failed:\n${errorMessage}`);
    } finally {
      setIsScanning(false);
      console.log('✅ AI scan process completed');
    }
  };

  const handleUpload = async () => {
    if (!mediaUri) {
      Alert.alert('Error', 'Silakan pilih foto atau video terlebih dahulu');
      return;
    }

    if (!thumbnailUri) {
      Alert.alert('Error', 'Thumbnail generation failed. Please select media again.');
      return;
    }

    if (!description.trim()) {
      Alert.alert('Error', 'Silakan isi deskripsi');
      return;
    }

    if (!budget) {
      Alert.alert('Error', 'Silakan pilih budget');
      return;
    }

    if (!time) {
      Alert.alert('Error', 'Silakan pilih waktu');
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();

      // Upload media based on type
      if (mediaType === 'video') {
        formData.append('video', {
          uri: mediaUri,
          type: 'video/mp4',
          name: `video_${Date.now()}.mp4`,
        });
      } else if (mediaType === 'image') {
        formData.append('video', {
          uri: mediaUri,
          type: 'image/jpeg',
          name: `image_${Date.now()}.jpg`,
        });
      }

      formData.append('thumbnail', {
        uri: thumbnailUri,
        type: 'image/jpeg',
        name: `thumbnail_${Date.now()}.jpg`,
      });

      const menuData = {
        name: menuName || null,
        description: description,
        tags: tags,
        budget: budget,
        time: time,
        location: location || null,
        media_type: mediaType, // Add media type to menu_data
        ingredients: ingredients || null,
        steps: steps || null,
        price: price || null,
        servings: servings || null,
      };
      formData.append('menu_data', JSON.stringify(menuData));

      const response = await apiService.uploadVideo(formData, (progressEvent) => {
        if (progressEvent.total && progressEvent.total > 0) {
          const progress = Math.min(100, Math.round((progressEvent.loaded * 100) / progressEvent.total));
          setUploadProgress(progress);
        }
      });

      // Tag users if any
      if (taggedUsers.length > 0 && response.data?.data?.id) {
        try {
          const videoId = response.data.data.id;
          const userIds = taggedUsers.map(user => user.id);
          await apiService.tagUsersInVideo(videoId, userIds);
          console.log('✅ Users tagged successfully');
        } catch (tagError) {
          console.error('Tag error:', tagError);
          // Don't fail the whole upload if tagging fails
        }
      }

      // Add video to selected playlists
      if (selectedPlaylistIds.length > 0 && response.data?.data?.id) {
        const videoId = response.data.data.id;
        for (const playlistId of selectedPlaylistIds) {
          try {
            await apiService.addVideoToPlaylist(playlistId, videoId);
          } catch (error) {
            console.error('Error adding video to playlist:', error);
          }
        }
      }

      Alert.alert('Success', `${mediaType === 'video' ? 'Video' : 'Foto'} berhasil diupload!`);

      // Reset form
      setMediaUri(null);
      setMediaType(null);
      setThumbnailUri(null);
      setDescription('');
      setTags([]);
      setTagInput('');
      setBudget('');
      setTime('');
      setLocation('');
      setMenuName('');
      setIngredients('');
      setSteps('');
      setPrice('');
      setServings('');
      setTaggedUsers([]);
      setSelectedPlaylistIds([]);
    } catch (error) {
      console.error('Upload error:', error);
      const errorMessage = error.response?.data?.message || 'Gagal mengupload. Silakan coba lagi.';
      Alert.alert('Error', errorMessage);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    >
      <View style={styles.contentContainer}>
        {/* Media Picker */}
        {!mediaUri && (
          <TouchableOpacity
            style={styles.videoPicker}
            onPress={pickMedia}
            disabled={isUploading}
            activeOpacity={0.7}
          >
            <View style={styles.videoPickerContent}>
              <Ionicons name="images-outline" size={48} color="#8D9F8E" />
              <Text style={styles.videoPickerText}>Pilih Foto atau Video</Text>
            </View>
          </TouchableOpacity>
        )}

        {mediaUri && thumbnailUri && (
          <View style={styles.videoPreviewContainer}>
            <Image
              source={{ uri: thumbnailUri }}
              style={styles.videoPreview}
              resizeMode="cover"
            />
            {mediaType === 'video' && (
              <View style={styles.mediaTypeBadge}>
                <Ionicons name="videocam" size={16} color="#FFFFFF" />
                <Text style={styles.mediaTypeBadgeText}>Video</Text>
              </View>
            )}
            {mediaType === 'image' && (
              <View style={styles.mediaTypeBadge}>
                <Ionicons name="image" size={16} color="#FFFFFF" />
                <Text style={styles.mediaTypeBadgeText}>Foto</Text>
              </View>
            )}
            <TouchableOpacity
              style={styles.changeVideoButton}
              onPress={pickMedia}
              disabled={isUploading}
            >
              <Ionicons name="refresh" size={20} color="#FFFFFF" />
              <Text style={styles.changeVideoText}>Ubah Media</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* AI Food Scanner Button - REMOVED per user request */}

        {/* Description */}
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.descriptionInput}
            placeholder="Ceritakan tentang makanan atau tempat ini..."
            placeholderTextColor="#9CA3AF"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            editable={!isUploading}
          />
        </View>

        {/* Tags */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="pricetag-outline" size={20} color="#6B7280" />
            <Text style={styles.sectionLabel}>Tags</Text>
          </View>

          <View style={styles.tagInputContainer}>
            <TextInput
              style={styles.tagInput}
              placeholder="Tambah tag..."
              placeholderTextColor="#9CA3AF"
              value={tagInput}
              onChangeText={setTagInput}
              editable={!isUploading}
              onSubmitEditing={handleAddTag}
            />
            <TouchableOpacity
              style={styles.addTagButton}
              onPress={handleAddTag}
              disabled={isUploading || !tagInput.trim()}
            >
              <Text style={styles.addTagButtonText}>Tambah</Text>
            </TouchableOpacity>
          </View>

          {tags.length > 0 && (
            <View style={styles.tagsContainer}>
              {tags.map((tag, index) => (
                <View key={index} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                  <TouchableOpacity
                    onPress={() => handleRemoveTag(tag)}
                    disabled={isUploading}
                  >
                    <Ionicons name="close-circle" size={18} color="#6B7280" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Budget & Time Row */}
        <View style={styles.row}>
          {/* Budget */}
          <View style={styles.halfWidth}>
            <View style={styles.sectionHeader}>
              <Ionicons name="cash-outline" size={20} color="#6B7280" />
              <Text style={styles.sectionLabel}>Budget</Text>
            </View>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setShowBudgetModal(true)}
              disabled={isUploading}
              activeOpacity={0.7}
            >
              <Text style={budget ? styles.pickerButtonTextSelected : styles.pickerButtonText}>
                {budget ? budgetOptions.find(o => o.value === budget)?.label : 'Pilih budget'}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Time */}
          <View style={styles.halfWidth}>
            <View style={styles.sectionHeader}>
              <Ionicons name="time-outline" size={20} color="#6B7280" />
              <Text style={styles.sectionLabel}>Waktu</Text>
            </View>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setShowTimeModal(true)}
              disabled={isUploading}
              activeOpacity={0.7}
            >
              <Text style={time ? styles.pickerButtonTextSelected : styles.pickerButtonText}>
                {time ? timeOptions.find(o => o.value === time)?.label : 'Pilih waktu'}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Budget Modal */}
        <Modal
          visible={showBudgetModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowBudgetModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Pilih Budget</Text>
                <TouchableOpacity onPress={() => setShowBudgetModal(false)}>
                  <Ionicons name="close" size={24} color="#1F2937" />
                </TouchableOpacity>
              </View>
              <FlatList
                data={budgetOptions}
                keyExtractor={(item) => item.value}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.modalItem}
                    onPress={() => {
                      setBudget(item.value);
                      setShowBudgetModal(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.modalItemText}>{item.label}</Text>
                    {budget === item.value && (
                      <Ionicons name="checkmark" size={24} color="#8D9F8E" />
                    )}
                  </TouchableOpacity>
                )}
              />
            </View>
          </View>
        </Modal>

        {/* Time Modal */}
        <Modal
          visible={showTimeModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowTimeModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Pilih Waktu</Text>
                <TouchableOpacity onPress={() => setShowTimeModal(false)}>
                  <Ionicons name="close" size={24} color="#1F2937" />
                </TouchableOpacity>
              </View>
              <FlatList
                data={timeOptions}
                keyExtractor={(item) => item.value}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.modalItem}
                    onPress={() => {
                      setTime(item.value);
                      setShowTimeModal(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.modalItemText}>{item.label}</Text>
                    {time === item.value && (
                      <Ionicons name="checkmark" size={24} color="#8D9F8E" />
                    )}
                  </TouchableOpacity>
                )}
              />
            </View>
          </View>
        </Modal>

        {/* Location */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="location-outline" size={20} color="#6B7280" />
            <Text style={styles.sectionLabel}>Lokasi (opsional)</Text>
          </View>
          <TextInput
            style={styles.locationInput}
            placeholder="Nama tempat atau alamat..."
            placeholderTextColor="#9CA3AF"
            value={location}
            onChangeText={setLocation}
            editable={!isUploading}
          />
        </View>

        {/* Playlist Selection */}
        <TouchableOpacity
          style={styles.inputContainer}
          onPress={() => setShowPlaylistModal(true)}
        >
          <View style={styles.inputRow}>
            <Ionicons name="albums-outline" size={20} color="#06402B" />
            <Text style={styles.inputLabel}>Tambah ke Playlist</Text>
          </View>
          <View style={styles.inputValueContainer}>
            <Text style={styles.inputValue}>
              {selectedPlaylistIds.length > 0
                ? `${selectedPlaylistIds.length} playlist dipilih`
                : 'Pilih playlist'}
            </Text>
            <Ionicons name="chevron-forward" size={20} color="#999999" />
          </View>
        </TouchableOpacity>

        {/* Recipe Details Section */}
        <View style={styles.recipeSection}>
          <View style={styles.recipeSectionHeader}>
            <Ionicons name="restaurant" size={22} color="#06402B" />
            <Text style={styles.recipeSectionTitle}>Detail Resep (opsional)</Text>
            {aiResult && aiResult.is_food && (
              <View style={styles.aiBadge}>
                <Ionicons name="sparkles" size={12} color="#8B5CF6" />
                <Text style={styles.aiBadgeText}>AI</Text>
              </View>
            )}
          </View>
          <Text style={styles.recipeSectionSubtitle}>
            {aiResult && aiResult.is_food
              ? '✨ Data telah terisi otomatis oleh AI. Anda dapat mengedit sesuai kebutuhan.'
              : 'Tambahkan detail resep agar viewer dapat melihat informasi lengkap'
            }
          </Text>

          {/* Menu Name */}
          <View style={styles.recipeInputGroup}>
            <Text style={styles.recipeLabel}>Nama Menu</Text>
            <TextInput
              style={styles.recipeInput}
              placeholder="Contoh: Kucing masak"
              placeholderTextColor="#9CA3AF"
              value={menuName}
              onChangeText={setMenuName}
              editable={!isUploading}
            />
          </View>

          {/* Price and Servings Row */}
          <View style={styles.row}>
            <View style={styles.halfWidth}>
              <Text style={styles.recipeLabel}>Harga</Text>
              <TextInput
                style={styles.recipeInput}
                placeholder="Rp 10.000"
                placeholderTextColor="#9CA3AF"
                value={price}
                onChangeText={setPrice}
                keyboardType="default"
                editable={!isUploading}
              />
            </View>
            <View style={styles.halfWidth}>
              <Text style={styles.recipeLabel}>Porsi</Text>
              <TextInput
                style={styles.recipeInput}
                placeholder="2-3 orang"
                placeholderTextColor="#9CA3AF"
                value={servings}
                onChangeText={setServings}
                editable={!isUploading}
              />
            </View>
          </View>

          {/* Ingredients */}
          <View style={styles.recipeInputGroup}>
            <Text style={styles.recipeLabel}>Alat dan Bahan</Text>
            <TextInput
              style={[styles.recipeInput, styles.recipeMultilineInput]}
              placeholder={"Contoh:\n• 2 butir telur\n• 100ml susu cair\n• 50g tepung terigu"}
              placeholderTextColor="#9CA3AF"
              value={ingredients}
              onChangeText={setIngredients}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              editable={!isUploading}
            />
          </View>

          {/* Steps */}
          <View style={styles.recipeInputGroup}>
            <Text style={styles.recipeLabel}>Cara Pembuatan</Text>
            <TextInput
              style={[styles.recipeInput, styles.recipeMultilineInput]}
              placeholder={"Contoh:\n1. Kocok telur dan susu\n2. Tambahkan tepung, aduk rata\n3. Panaskan wajan, tuang adonan\n4. Masak hingga matang"}
              placeholderTextColor="#9CA3AF"
              value={steps}
              onChangeText={setSteps}
              multiline
              numberOfLines={8}
              textAlignVertical="top"
              editable={!isUploading}
            />
          </View>
        </View>

        {/* Tag Users Section - FIX: Keyboard avoiding */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
        >
          <View style={styles.tagUsersSection}>
            <View style={styles.tagUsersSectionHeader}>
              <Ionicons name="people" size={22} color="#06402B" />
              <Text style={styles.tagUsersSectionTitle}>Tag Teman (opsional)</Text>
            </View>
            <Text style={styles.tagUsersSectionSubtitle}>
              Tag teman yang ada di foto/video ini. Mereka akan menerima notifikasi.
            </Text>
            <UserTagInput
              selectedUsers={taggedUsers}
              onUsersChange={setTaggedUsers}
              onAddUserToCaption={(username) => {
                // Add @username to description at cursor position or end
                const mention = `@${username} `;
                setDescription(prevDescription => {
                  // Add at the end with a space
                  return prevDescription ? `${prevDescription} ${mention}` : mention;
                });
              }}
            />
          </View>
        </KeyboardAvoidingView>

        {/* Upload Button */}
        <TouchableOpacity
          style={[styles.uploadButton, isUploading && styles.uploadButtonDisabled]}
          onPress={handleUpload}
          disabled={isUploading}
          activeOpacity={0.8}
        >
          {isUploading ? (
            <View style={styles.uploadingContainer}>
              <ActivityIndicator color="#FFFFFF" size="small" />
              <Text style={styles.uploadButtonText}>
                Uploading...
              </Text>
            </View>
          ) : (
            <Text style={styles.uploadButtonText}>Upload Konten</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Playlist Selection Modal */}
      <Modal
        visible={showPlaylistModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPlaylistModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Pilih Playlist</Text>
              <TouchableOpacity onPress={() => setShowPlaylistModal(false)}>
                <Ionicons name="close" size={24} color="#000000" />
              </TouchableOpacity>
            </View>

            {isLoadingPlaylists ? (
              <ActivityIndicator size="large" color="#06402B" style={{ marginVertical: 20 }} />
            ) : playlists.length > 0 ? (
              <FlatList
                data={playlists}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.playlistItem}
                    onPress={() => togglePlaylistSelection(item.id)}
                  >
                    <View style={styles.playlistInfo}>
                      <Ionicons name="albums" size={20} color="#06402B" />
                      <Text style={styles.playlistName}>{item.name}</Text>
                    </View>
                    <Ionicons
                      name={selectedPlaylistIds.includes(item.id) ? "checkbox" : "square-outline"}
                      size={24}
                      color={selectedPlaylistIds.includes(item.id) ? "#06402B" : "#999999"}
                    />
                  </TouchableOpacity>
                )}
              />
            ) : (
              <Text style={styles.emptyPlaylistText}>
                Belum ada playlist. Buat playlist terlebih dahulu di halaman profil.
              </Text>
            )}

            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setShowPlaylistModal(false)}
            >
              <Text style={styles.modalButtonText}>Selesai</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EDE8D0',
  },
  scrollContent: {
    paddingBottom: 100,
  },
  contentContainer: {
    padding: 20,
  },
  videoPicker: {
    backgroundColor: '#D9D4BC',
    borderRadius: 12,
    padding: 40,
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 150,
  },
  videoPickerContent: {
    alignItems: 'center',
    gap: 12,
  },
  videoPickerText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  videoPreviewContainer: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 20,
    height: 250,
  },
  videoPreview: {
    width: '100%',
    height: '100%',
  },
  mediaTypeBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    gap: 4,
  },
  mediaTypeBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  changeVideoButton: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: '#06402B',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    gap: 6,
  },
  changeVideoText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  inputWrapper: {
    marginBottom: 20,
  },
  descriptionInput: {
    backgroundColor: '#D9D4BC',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1F2937',
    minHeight: 120,
    textAlignVertical: 'top',
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  sectionLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  tagInputContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  tagInput: {
    flex: 1,
    backgroundColor: '#D9D4BC',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#1F2937',
  },
  addTagButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  addTagButtonText: {
    color: '#1F2937',
    fontSize: 14,
    fontWeight: '600',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  tagText: {
    fontSize: 14,
    color: '#1F2937',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  halfWidth: {
    flex: 1,
  },
  pickerButton: {
    backgroundColor: '#D9D4BC',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 50,
  },
  pickerButtonText: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  pickerButtonTextSelected: {
    fontSize: 16,
    color: '#1F2937',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalItemText: {
    fontSize: 16,
    color: '#1F2937',
    flex: 1,
  },
  locationInput: {
    backgroundColor: '#D9D4BC',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#1F2937',
  },
  uploadButton: {
    backgroundColor: '#06402B',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  uploadButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  uploadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  uploadButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  aiScanButton: {
    backgroundColor: '#06402B',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 10, // EMERGENCY FIX: Ensure button is clickable
  },
  aiScanButtonDisabled: {
    backgroundColor: '#8D9F8E',
    opacity: 0.6,
  },
  aiScanContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  aiScanButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  recipeSection: {
    backgroundColor: '#D9D4BC',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  recipeSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  recipeSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#06402B',
    flex: 1,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  aiBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8B5CF6',
  },
  recipeSectionSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 16,
    lineHeight: 18,
  },
  recipeInputGroup: {
    marginBottom: 14,
  },
  recipeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  recipeInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#1F2937',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  recipeMultilineInput: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  tagUsersSection: {
    backgroundColor: '#D9D4BC',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  tagUsersSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  tagUsersSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#06402B',
  },
  tagUsersSectionSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 16,
    lineHeight: 18,
  },
  inputContainer: {
    backgroundColor: '#D9D4BC',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#06402B',
  },
  inputValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 28,
  },
  inputValue: {
    fontSize: 14,
    color: '#333333',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalButton: {
    backgroundColor: '#06402B',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 16,
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  playlistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  playlistInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  playlistName: {
    fontSize: 14,
    color: '#333333',
    fontWeight: '500',
  },
  emptyPlaylistText: {
    fontSize: 14,
    color: '#999999',
    textAlign: 'center',
    marginVertical: 30,
    paddingHorizontal: 20,
  },
});

export default UploadScreen;
