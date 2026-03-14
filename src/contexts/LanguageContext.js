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

    // Notifications Screen
    loadingNotifications: 'Memuat notifikasi...',
    noNotificationsYet: 'Belum Ada Notifikasi',
    noNotificationsDesc: 'Notifikasi tentang likes, komentar, dan followers\nakan muncul di sini',
    followBack: 'Ikuti Balik',

    // Profile
    followers: 'Pengikut',
    following: 'Mengikuti',
    posts: 'Postingan',
    follow: 'Ikuti',
    unfollow: 'Berhenti Ikuti',
    myVideos: 'Video Saya',
    noVideos: 'Belum Ada Video',
    noVideosDesc: 'Video yang kamu upload akan muncul di sini',

    // Bookmarks
    bookmark: 'Bookmark',
    savedVideos: 'Video Tersimpan',
    noBookmarks: 'Belum Ada Bookmark',
    noBookmarksDesc: 'Video yang kamu simpan akan muncul di sini',
    exploreVideos: 'Jelajahi Video',

    // Admin
    adminPanel: 'Panel Admin',

    // Misc
    video: 'Video',
    photo: 'Foto',
    changeMedia: 'Ubah Media',
    report: 'Laporkan',
    share: 'Bagikan',
    block: 'Blokir',
    unblock: 'Buka Blokir',
    confirm: 'Konfirmasi',
    apply: 'Kirim',
    badgeApplication: 'Pengajuan Badge',

    // Home & Stories
    inspiration: 'Inspirasi',
    noApprovedVideos: 'Saat ini belum ada video yang disetujui.',
    beFirstToUpload: 'Jadilah yang pertama untuk mengupload video kuliner Anda!',
    yourStory: 'Story Anda',
    addStory: 'Tambah Story',
    addMoreStory: 'Tambah Story',
    daysAgo: 'hari yang lalu',
    hoursAgo: 'jam yang lalu',
    minutesAgo: 'menit yang lalu',
    justNow: 'Baru saja',
    highlightEmpty: 'Highlight kosong',

    // Settings subtitles
    editProfileSubtitle: 'Ubah nama dan email',
    changePasswordSubtitle: 'Ubah password akun Anda',
    yourActivity: 'Aktivitas Anda',
    likes: 'Suka',
    likesSubtitle: 'Video yang Anda sukai',
    comments: 'Komentar',
    commentsSubtitle: 'Komentar yang Anda tulis',
    archive: 'Arsip',
    archiveSubtitle: 'Lihat story dan postingan yang diarsipkan',
    blockSubtitle: 'Kelola pengguna yang diblokir',
    themeSubtitle: 'Mode terang, gelap, atau otomatis',
    notificationSubtitle: 'Kelola preferensi notifikasi',
    privacySubtitle: 'Atur privasi akun Anda',
    languageSubtitle: 'Pilih bahasa aplikasi',
    dataStorageSubtitle: 'Kelola penggunaan data',
    clearCacheSubtitle: 'Bersihkan data cache aplikasi',
    aboutSubtitle: 'Versi, kebijakan, dan syarat',
    helpFaqSubtitle: 'Dapatkan bantuan',
    logoutSubtitle: 'Logout dari akun Anda',
    deleteAccountSubtitle: 'Hapus akun Anda secara permanen',
    aboutAppDesc: 'Aplikasi berbagi video kuliner terbaik untuk creators dan food lovers.',
    helpComingSoon: 'Fitur Bantuan segera hadir',

    // Profile
    videos: 'Video',
    taggedVideos: 'Video Ditandai',

    // Form labels
    fullName: 'Nama Lengkap',
    enterFullName: 'Masukkan nama lengkap',
    enterEmail: 'Masukkan email',
    nameRequired: 'Nama tidak boleh kosong',
    emailRequired: 'Email tidak boleh kosong',
    profileUpdated: 'Profil berhasil diperbarui',
    currentPassword: 'Password Saat Ini',
    enterCurrentPassword: 'Masukkan password saat ini',
    newPassword: 'Password Baru',
    enterNewPassword: 'Masukkan password baru (min. 8 karakter)',
    allFieldsRequired: 'Semua field harus diisi',
    passwordMin8: 'Password baru minimal 8 karakter',
    passwordMismatch: 'Password baru dan konfirmasi tidak cocok',
    passwordChanged: 'Password berhasil diubah',
    saveChanges: 'Simpan Perubahan',
    saving: 'Menyimpan...',
    changing: 'Mengubah...',
    deleteAccountWarning: 'Tindakan ini tidak dapat dibatalkan. Semua data Anda akan hilang.',
    passwordConfirmation: 'Password untuk konfirmasi',

    // Video actions
    tapToPlay: 'Tap to Play',
    recipeDetails2: 'Detail Resep',
    ingredientsList: 'Alat dan Bahan',
    ingredientsNotAvailable: 'Informasi bahan belum tersedia',
    cookingMethod: 'Cara Pembuatan',
    taggedWith: 'Ditandai bersama',
    reposted: 'Diposting ulang',
    continueWatching: 'Lanjut menonton',
    reportVideo: 'Laporkan Video',
    reportVideoConfirm: 'Apakah Anda yakin ingin melaporkan video ini?',
    reportSent: 'Laporan Anda telah dikirim dan akan ditinjau oleh tim kami.',
    reportFailed: 'Gagal mengirim laporan. Silakan coba lagi.',
    tooManyReports: 'Anda telah mengirim terlalu banyak laporan. Silakan tunggu beberapa saat.',
    deleteVideoConfirm: 'Apakah Anda yakin ingin menghapus video ini? Tindakan ini tidak dapat dibatalkan.',
    videoDeleted: 'Video berhasil dihapus',
    canOnlyEditOwn: 'Anda hanya bisa mengedit video sendiri',
    canOnlyDeleteOwn: 'Anda hanya bisa menghapus video sendiri',
    cannotReportOwn: 'Anda tidak bisa melaporkan video sendiri',
    notInterestedTitle: 'Tidak Tertarik',
    notInterestedMsg: 'Video ini akan disembunyikan dari feed Anda',
    hide: 'Sembunyikan',
    hidden: 'Video tidak akan ditampilkan lagi',
    cannotFollowSelf: 'Anda tidak bisa mengikuti diri sendiri',
    followFailed: 'Gagal mengikuti pengguna. Silakan coba lagi.',
    likeFailed: 'Gagal menyukai video. Silakan coba lagi.',
    repostFailed: 'Gagal memposting ulang video',
    bookmarkFailed: 'Gagal menyimpan bookmark',
    shareFailed: 'Gagal membagikan video',
    deleteVideo: 'Hapus Video',

    // Bookmarks
    saved: 'Tersimpan',
    bookmarkRemoveFailed: 'Gagal menghapus bookmark',
    storyNotFound: 'Story tidak ditemukan',
    storyNotFoundMsg: 'Silakan coba lagi atau refresh halaman.',
    loadingBookmarks: 'Memuat bookmark...',

    // Upload
    selectBudgetOption: 'Pilih budget',
    selectTimeOption: 'Pilih waktu',
    compressionSuccess: 'Kompresi Berhasil',
    mediaSelectFailed: 'Gagal memilih media. Silakan coba lagi.',
    notFood: 'AI mendeteksi ini bukan gambar makanan.',
    aiScanFailed: 'Gagal melakukan scan AI',

    // Cache
    clearCacheTitle: 'Hapus Cache',
    clearCacheMsg: 'Ini akan menghapus semua data cache aplikasi.',
    cacheCleared: 'Cache berhasil dihapus',
    cacheClearFailed: 'Gagal menghapus cache',

    // Session
    sessionExpired: 'Sesi Berakhir',
    pleaseLoginAgain: 'Silakan login kembali.',
    timeout: 'Timeout',
    serverNotResponding: 'Server tidak merespon. Coba tarik ke bawah untuk refresh.',

    // Playlist
    playlistCreated: 'berhasil dibuat!',
    playlistNameRequired: 'Nama playlist tidak boleh kosong',
    playlistCreateFailed: 'Gagal membuat playlist. Silakan coba lagi.',
    playlistLoadFailed: 'Gagal memuat playlist',

    // Misc
    logoutFailed: 'Gagal logout. Silakan coba lagi.',
    logoutConfirm: 'Apakah Anda yakin ingin keluar dari akun Anda?',
    accountDeleted: 'Akun Anda telah berhasil dihapus',
    passwordWrong: 'Password salah',
    seeLess: 'Lihat lebih sedikit',
    seeMore: '...Lihat selengkapnya',
    avatarUploadFailed: 'Gagal upload foto profil. Pastikan file adalah gambar (JPG/PNG) dan ukuran max 5MB.',
    skip: 'Lewati',
    userBlocked: 'Pengguna telah diblokir',
    warning: 'Perhatian',
    info: 'Info',
    thankYou: 'Terima kasih',
    version: 'Versi',
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

    // Notifications Screen
    loadingNotifications: 'Loading notifications...',
    noNotificationsYet: 'No Notifications Yet',
    noNotificationsDesc: 'Notifications about likes, comments, and followers\nwill appear here',
    followBack: 'Follow Back',

    // Profile
    followers: 'Followers',
    following: 'Following',
    posts: 'Posts',
    follow: 'Follow',
    unfollow: 'Unfollow',
    myVideos: 'My Videos',
    noVideos: 'No Videos Yet',
    noVideosDesc: 'Videos you upload will appear here',

    // Bookmarks
    bookmark: 'Bookmark',
    savedVideos: 'Saved Videos',
    noBookmarks: 'No Bookmarks Yet',
    noBookmarksDesc: 'Videos you save will appear here',
    exploreVideos: 'Explore Videos',

    // Admin
    adminPanel: 'Admin Panel',

    // Misc
    video: 'Video',
    photo: 'Photo',
    changeMedia: 'Change Media',
    report: 'Report',
    share: 'Share',
    block: 'Block',
    unblock: 'Unblock',
    confirm: 'Confirm',
    apply: 'Submit',
    badgeApplication: 'Badge Application',

    // Home & Stories
    inspiration: 'Inspiration',
    noApprovedVideos: 'No approved videos at the moment.',
    beFirstToUpload: 'Be the first to upload your culinary video!',
    yourStory: 'Your Story',
    addStory: 'Add Story',
    addMoreStory: 'Add More',
    daysAgo: 'days ago',
    hoursAgo: 'hours ago',
    minutesAgo: 'minutes ago',
    justNow: 'Just now',
    highlightEmpty: 'Highlight is empty',

    // Settings subtitles
    editProfileSubtitle: 'Change name and email',
    changePasswordSubtitle: 'Change your account password',
    yourActivity: 'Your Activity',
    likes: 'Likes',
    likesSubtitle: 'Videos you liked',
    comments: 'Comments',
    commentsSubtitle: 'Comments you wrote',
    archive: 'Archive',
    archiveSubtitle: 'View archived stories and posts',
    blockSubtitle: 'Manage blocked users',
    themeSubtitle: 'Light, dark, or automatic mode',
    notificationSubtitle: 'Manage notification preferences',
    privacySubtitle: 'Set your account privacy',
    languageSubtitle: 'Choose app language',
    dataStorageSubtitle: 'Manage data usage',
    clearCacheSubtitle: 'Clear app cache data',
    aboutSubtitle: 'Version, policies, and terms',
    helpFaqSubtitle: 'Get help',
    logoutSubtitle: 'Log out from your account',
    deleteAccountSubtitle: 'Permanently delete your account',
    aboutAppDesc: 'The best culinary video sharing app for creators and food lovers.',
    helpComingSoon: 'Help feature coming soon',

    // Profile
    videos: 'Videos',
    taggedVideos: 'Tagged Videos',

    // Form labels
    fullName: 'Full Name',
    enterFullName: 'Enter full name',
    enterEmail: 'Enter email',
    nameRequired: 'Name cannot be empty',
    emailRequired: 'Email cannot be empty',
    profileUpdated: 'Profile updated successfully',
    currentPassword: 'Current Password',
    enterCurrentPassword: 'Enter current password',
    newPassword: 'New Password',
    enterNewPassword: 'Enter new password (min. 8 characters)',
    allFieldsRequired: 'All fields are required',
    passwordMin8: 'New password must be at least 8 characters',
    passwordMismatch: 'New password and confirmation do not match',
    passwordChanged: 'Password changed successfully',
    saveChanges: 'Save Changes',
    saving: 'Saving...',
    changing: 'Changing...',
    deleteAccountWarning: 'This action cannot be undone. All your data will be lost.',
    passwordConfirmation: 'Password for confirmation',

    // Video actions
    tapToPlay: 'Tap to Play',
    recipeDetails2: 'Recipe Details',
    ingredientsList: 'Ingredients',
    ingredientsNotAvailable: 'Ingredient information not available',
    cookingMethod: 'Cooking Method',
    taggedWith: 'Tagged with',
    reposted: 'Reposted',
    continueWatching: 'Continue watching',
    reportVideo: 'Report Video',
    reportVideoConfirm: 'Are you sure you want to report this video?',
    reportSent: 'Your report has been sent and will be reviewed by our team.',
    reportFailed: 'Failed to send report. Please try again.',
    tooManyReports: 'You have sent too many reports. Please wait a moment.',
    deleteVideoConfirm: 'Are you sure you want to delete this video? This action cannot be undone.',
    videoDeleted: 'Video deleted successfully',
    canOnlyEditOwn: 'You can only edit your own videos',
    canOnlyDeleteOwn: 'You can only delete your own videos',
    cannotReportOwn: 'You cannot report your own video',
    notInterestedTitle: 'Not Interested',
    notInterestedMsg: 'This video will be hidden from your feed',
    hide: 'Hide',
    hidden: 'Video will no longer be shown',
    cannotFollowSelf: 'You cannot follow yourself',
    followFailed: 'Failed to follow user. Please try again.',
    likeFailed: 'Failed to like video. Please try again.',
    repostFailed: 'Failed to repost video',
    bookmarkFailed: 'Failed to save bookmark',
    shareFailed: 'Failed to share video',
    deleteVideo: 'Delete Video',

    // Bookmarks
    saved: 'Saved',
    bookmarkRemoveFailed: 'Failed to remove bookmark',
    storyNotFound: 'Story not found',
    storyNotFoundMsg: 'Please try again or refresh the page.',
    loadingBookmarks: 'Loading bookmarks...',

    // Upload
    selectBudgetOption: 'Select budget',
    selectTimeOption: 'Select time',
    compressionSuccess: 'Compression Successful',
    mediaSelectFailed: 'Failed to select media. Please try again.',
    notFood: 'AI detected this is not a food image.',
    aiScanFailed: 'AI scan failed',

    // Cache
    clearCacheTitle: 'Clear Cache',
    clearCacheMsg: 'This will clear all app cache data.',
    cacheCleared: 'Cache cleared successfully',
    cacheClearFailed: 'Failed to clear cache',

    // Session
    sessionExpired: 'Session Expired',
    pleaseLoginAgain: 'Please log in again.',
    timeout: 'Timeout',
    serverNotResponding: 'Server not responding. Pull down to refresh.',

    // Playlist
    playlistCreated: 'created successfully!',
    playlistNameRequired: 'Playlist name cannot be empty',
    playlistCreateFailed: 'Failed to create playlist. Please try again.',
    playlistLoadFailed: 'Failed to load playlists',

    // Misc
    logoutFailed: 'Failed to log out. Please try again.',
    logoutConfirm: 'Are you sure you want to log out of your account?',
    accountDeleted: 'Your account has been successfully deleted',
    passwordWrong: 'Wrong password',
    seeLess: 'See less',
    seeMore: '...See more',
    avatarUploadFailed: 'Failed to upload profile photo. Make sure the file is an image (JPG/PNG) and max 5MB.',
    skip: 'Skip',
    userBlocked: 'User has been blocked',
    warning: 'Warning',
    info: 'Info',
    thankYou: 'Thank you',
    version: 'Version',
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
