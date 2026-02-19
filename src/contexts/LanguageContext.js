import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiService } from '../services/ApiService';

const LANGUAGE_STORAGE_KEY = '@app_language';

const LanguageContext = createContext({});

// Translation strings
const translations = {
  id: {
    // Common
    loading: 'Memuat...',
    error: 'Error',
    success: 'Berhasil',
    cancel: 'Batal',
    save: 'Simpan',
    delete: 'Hapus',
    edit: 'Edit',
    done: 'Selesai',
    ok: 'OK',
    yes: 'Ya',
    no: 'Tidak',
    back: 'Kembali',
    next: 'Selanjutnya',
    search: 'Cari',
    retry: 'Coba Lagi',

    // Auth
    login: 'Masuk',
    register: 'Daftar',
    logout: 'Keluar',
    email: 'Email',
    password: 'Kata Sandi',
    confirmPassword: 'Konfirmasi Kata Sandi',
    forgotPassword: 'Lupa Kata Sandi?',
    dontHaveAccount: 'Belum punya akun?',
    alreadyHaveAccount: 'Sudah punya akun?',

    // Navigation
    home: 'Beranda',
    explore: 'Jelajahi',
    upload: 'Upload',
    notifications: 'Notifikasi',
    profile: 'Profil',

    // Upload Screen
    uploadContent: 'Upload Konten',
    selectMedia: 'Pilih Foto atau Video',
    description: 'Deskripsi',
    descriptionPlaceholder: 'Ceritakan tentang makanan atau tempat ini...',
    tags: 'Tags',
    addTag: 'Tambah tag...',
    add: 'Tambah',
    budget: 'Budget',
    selectBudget: 'Pilih budget',
    time: 'Waktu',
    selectTime: 'Pilih waktu',
    location: 'Lokasi (opsional)',
    locationPlaceholder: 'Nama tempat atau alamat...',
    uploading: 'Mengupload...',
    uploadSuccess: 'berhasil diupload!',
    uploadFailed: 'Gagal mengupload. Silakan coba lagi.',

    // Recipe Details
    recipeDetails: 'Detail Resep (opsional)',
    recipeDetailsDesc: 'Tambahkan detail resep agar viewer dapat melihat informasi lengkap',
    recipeDetailsAiDesc: 'Data telah terisi otomatis oleh AI. Anda dapat mengedit sesuai kebutuhan.',
    menuName: 'Nama Menu',
    price: 'Harga',
    servings: 'Porsi',
    ingredients: 'Alat dan Bahan',
    cookingSteps: 'Cara Pembuatan',

    // Tag Users
    tagFriends: 'Tag Teman (opsional)',
    tagFriendsDesc: 'Tag teman yang ada di foto/video ini. Mereka akan menerima notifikasi.',

    // Playlist
    addToPlaylist: 'Tambah ke Playlist',
    selectPlaylist: 'Pilih playlist',
    playlistsSelected: 'playlist dipilih',
    noPlaylists: 'Belum ada playlist. Buat playlist terlebih dahulu di halaman profil.',

    // Settings
    settings: 'Pengaturan',
    account: 'Akun',
    editProfile: 'Edit Profil',
    changePassword: 'Ubah Kata Sandi',
    appSettings: 'Pengaturan Aplikasi',
    theme: 'Tema',
    language: 'Bahasa',
    notificationSettings: 'Notifikasi',
    privacy: 'Privasi Akun',
    dataStorage: 'Data & Penyimpanan',
    blockedUsers: 'Pengguna Diblokir',
    clearCache: 'Hapus Cache',
    about: 'Tentang Aplikasi',
    helpFaq: 'Bantuan & FAQ',
    deleteAccount: 'Hapus Akun',
    dangerZone: 'Zona Berbahaya',

    // Theme Settings
    themeSettings: 'Tema Aplikasi',
    lightMode: 'Mode Terang',
    darkMode: 'Mode Gelap',
    autoMode: 'Otomatis',
    lightModeDesc: 'Tampilan terang untuk siang hari',
    darkModeDesc: 'Tampilan gelap untuk menghemat baterai',
    autoModeDesc: 'Otomatis berubah sesuai pengaturan gelap/terang perangkat Anda',
    themeSelectDesc: 'Pilih tema tampilan aplikasi sesuai preferensi Anda',

    // Language Settings
    languageSettings: 'Bahasa / Language',
    languageSelectDesc: 'Pilih bahasa yang ingin Anda gunakan di aplikasi',
    languageNote: 'Catatan',
    languageNoteDesc: 'Perubahan bahasa akan diterapkan setelah Anda me-restart aplikasi. Beberapa bagian mungkin masih menggunakan bahasa sebelumnya hingga restart.',
    languageChangeSuccess: 'Bahasa aplikasi akan berubah setelah aplikasi direstart',
    languageChangeFailed: 'Gagal mengubah bahasa',

    // Budget Options
    budgetUnder25k: '< Rp 25.000',
    budget25kTo50k: 'Rp 25.000 - Rp 50.000',
    budget50kTo100k: 'Rp 50.000 - Rp 100.000',
    budget100kTo200k: 'Rp 100.000 - Rp 200.000',
    budgetOver200k: '> Rp 200.000',

    // Time Options
    breakfast: 'Sarapan (06:00 - 10:00)',
    brunch: 'Brunch (10:00 - 12:00)',
    lunch: 'Makan Siang (12:00 - 15:00)',
    snack: 'Snack Sore (15:00 - 18:00)',
    dinner: 'Makan Malam (18:00 - 22:00)',
    night: 'Malam (22:00 - 00:00)',

    // Errors
    errorLoadingSettings: 'Gagal memuat pengaturan',
    errorSelectMedia: 'Silakan pilih foto atau video terlebih dahulu',
    errorNoThumbnail: 'Thumbnail generation failed. Please select media again.',
    errorNoDescription: 'Silakan isi deskripsi',
    errorNoBudget: 'Silakan pilih budget',
    errorNoTime: 'Silakan pilih waktu',
    fileTooLarge: 'File Terlalu Besar',
    permissionRequired: 'Permission Required',
    permissionMedia: 'Permission to access media library is required!',

    // Misc
    video: 'Video',
    photo: 'Foto',
    changeMedia: 'Ubah Media',
  },

  en: {
    // Common
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    cancel: 'Cancel',
    save: 'Save',
    delete: 'Delete',
    edit: 'Edit',
    done: 'Done',
    ok: 'OK',
    yes: 'Yes',
    no: 'No',
    back: 'Back',
    next: 'Next',
    search: 'Search',
    retry: 'Retry',

    // Auth
    login: 'Login',
    register: 'Register',
    logout: 'Logout',
    email: 'Email',
    password: 'Password',
    confirmPassword: 'Confirm Password',
    forgotPassword: 'Forgot Password?',
    dontHaveAccount: "Don't have an account?",
    alreadyHaveAccount: 'Already have an account?',

    // Navigation
    home: 'Home',
    explore: 'Explore',
    upload: 'Upload',
    notifications: 'Notifications',
    profile: 'Profile',

    // Upload Screen
    uploadContent: 'Upload Content',
    selectMedia: 'Select Photo or Video',
    description: 'Description',
    descriptionPlaceholder: 'Tell us about this food or place...',
    tags: 'Tags',
    addTag: 'Add tag...',
    add: 'Add',
    budget: 'Budget',
    selectBudget: 'Select budget',
    time: 'Time',
    selectTime: 'Select time',
    location: 'Location (optional)',
    locationPlaceholder: 'Place name or address...',
    uploading: 'Uploading...',
    uploadSuccess: 'uploaded successfully!',
    uploadFailed: 'Upload failed. Please try again.',

    // Recipe Details
    recipeDetails: 'Recipe Details (optional)',
    recipeDetailsDesc: 'Add recipe details so viewers can see complete information',
    recipeDetailsAiDesc: 'Data has been auto-filled by AI. You can edit as needed.',
    menuName: 'Menu Name',
    price: 'Price',
    servings: 'Servings',
    ingredients: 'Ingredients',
    cookingSteps: 'Cooking Steps',

    // Tag Users
    tagFriends: 'Tag Friends (optional)',
    tagFriendsDesc: 'Tag friends in this photo/video. They will receive a notification.',

    // Playlist
    addToPlaylist: 'Add to Playlist',
    selectPlaylist: 'Select playlist',
    playlistsSelected: 'playlists selected',
    noPlaylists: 'No playlists yet. Create a playlist first on your profile page.',

    // Settings
    settings: 'Settings',
    account: 'Account',
    editProfile: 'Edit Profile',
    changePassword: 'Change Password',
    appSettings: 'App Settings',
    theme: 'Theme',
    language: 'Language',
    notificationSettings: 'Notifications',
    privacy: 'Account Privacy',
    dataStorage: 'Data & Storage',
    blockedUsers: 'Blocked Users',
    clearCache: 'Clear Cache',
    about: 'About App',
    helpFaq: 'Help & FAQ',
    deleteAccount: 'Delete Account',
    dangerZone: 'Danger Zone',

    // Theme Settings
    themeSettings: 'App Theme',
    lightMode: 'Light Mode',
    darkMode: 'Dark Mode',
    autoMode: 'Automatic',
    lightModeDesc: 'Light appearance for daytime use',
    darkModeDesc: 'Dark appearance to save battery',
    autoModeDesc: 'Automatically changes based on your device settings',
    themeSelectDesc: 'Choose the app theme according to your preference',

    // Language Settings
    languageSettings: 'Language',
    languageSelectDesc: 'Select the language you want to use in the app',
    languageNote: 'Note',
    languageNoteDesc: 'Language changes will be applied after you restart the app. Some parts may still use the previous language until restart.',
    languageChangeSuccess: 'App language will change after app restart',
    languageChangeFailed: 'Failed to change language',

    // Budget Options
    budgetUnder25k: '< IDR 25,000',
    budget25kTo50k: 'IDR 25,000 - 50,000',
    budget50kTo100k: 'IDR 50,000 - 100,000',
    budget100kTo200k: 'IDR 100,000 - 200,000',
    budgetOver200k: '> IDR 200,000',

    // Time Options
    breakfast: 'Breakfast (06:00 - 10:00)',
    brunch: 'Brunch (10:00 - 12:00)',
    lunch: 'Lunch (12:00 - 15:00)',
    snack: 'Afternoon Snack (15:00 - 18:00)',
    dinner: 'Dinner (18:00 - 22:00)',
    night: 'Night (22:00 - 00:00)',

    // Errors
    errorLoadingSettings: 'Failed to load settings',
    errorSelectMedia: 'Please select a photo or video first',
    errorNoThumbnail: 'Thumbnail generation failed. Please select media again.',
    errorNoDescription: 'Please fill in the description',
    errorNoBudget: 'Please select a budget',
    errorNoTime: 'Please select a time',
    fileTooLarge: 'File Too Large',
    permissionRequired: 'Permission Required',
    permissionMedia: 'Permission to access media library is required!',

    // Misc
    video: 'Video',
    photo: 'Photo',
    changeMedia: 'Change Media',
  },
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguageState] = useState('id');
  const [isLoading, setIsLoading] = useState(true);

  // Load saved language preference
  useEffect(() => {
    loadLanguagePreference();
  }, []);

  const loadLanguagePreference = async () => {
    try {
      // First try to load from local storage
      const savedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (savedLanguage && (savedLanguage === 'id' || savedLanguage === 'en')) {
        setLanguageState(savedLanguage);
      }

      // Then try to sync with backend
      try {
        const response = await apiService.getSettings();
        const backendLanguage = response.data?.settings?.language;
        if (backendLanguage && (backendLanguage === 'id' || backendLanguage === 'en')) {
          setLanguageState(backendLanguage);
          await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, backendLanguage);
        }
      } catch (apiError) {
        // Silently fail - use local storage value
        console.log('Could not sync language from backend');
      }
    } catch (error) {
      console.error('Error loading language preference:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const setLanguage = async (newLanguage) => {
    if (newLanguage !== 'id' && newLanguage !== 'en') {
      console.error('Invalid language:', newLanguage);
      return false;
    }

    try {
      // Save to local storage first
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, newLanguage);
      setLanguageState(newLanguage);

      // Then sync to backend
      try {
        await apiService.updateLanguage(newLanguage);
      } catch (apiError) {
        // Silently fail - local storage is the source of truth
        console.log('Could not sync language to backend');
      }

      return true;
    } catch (error) {
      console.error('Error saving language preference:', error);
      return false;
    }
  };

  // Get translation by key
  const t = (key) => {
    const translation = translations[language]?.[key];
    if (!translation) {
      console.warn(`Missing translation for key: ${key} in language: ${language}`);
      // Fallback to Indonesian if English translation is missing, or vice versa
      return translations['id']?.[key] || translations['en']?.[key] || key;
    }
    return translation;
  };

  // Get all translations for current language
  const getTranslations = () => translations[language] || translations['id'];

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t,
        getTranslations,
        isLoading,
        isEnglish: language === 'en',
        isIndonesian: language === 'id',
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};

export default LanguageContext;
