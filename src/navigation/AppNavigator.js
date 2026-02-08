import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';

// Import screens
import AuthScreen from '../screens/AuthScreen';
import HomeScreen from '../screens/HomeScreen';
import UploadScreen from '../screens/UploadScreen';
import BookmarksScreen from '../screens/BookmarksScreen';
import ProfileScreen from '../screens/ProfileScreen';
import MyVideosScreen from '../screens/MyVideosScreen';
import SettingsScreen from '../screens/SettingsScreen';
import OtherUserProfileScreen from '../screens/OtherUserProfileScreen';
import SearchScreen from '../screens/SearchScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import AdminScreen from '../screens/AdminScreen';
import AnalysisResultScreen from '../screens/AnalysisResultScreen';

// Import Settings screens
import AccountPrivacyScreen from '../screens/AccountPrivacyScreen';
import NotificationSettingsScreen from '../screens/NotificationSettingsScreen';
import DataManagementScreen from '../screens/DataManagementScreen';
import LanguageScreen from '../screens/LanguageScreen';
import BlockedAccountsScreen from '../screens/BlockedAccountsScreen';
import ThemeSettingsScreen from '../screens/ThemeSettingsScreen';

// Import Story screens
import StoryCameraScreen from '../screens/Story/StoryCameraScreen';
import StoryEditorScreenSimple from '../screens/Story/StoryEditorScreenSimple';
import StoryPreviewScreen from '../screens/Story/StoryPreviewScreen';
import TagApprovalScreen from '../screens/TagApprovalScreen';

// Import Playlist screens
import PlaylistDetailScreen from '../screens/PlaylistDetailScreen';

// Import Badge Application screen
import BadgeApplicationScreen from '../screens/BadgeApplicationScreen';

const Tab = createBottomTabNavigator();
const ProfileStack = createNativeStackNavigator();
const HomeStack = createNativeStackNavigator();
const RootStack = createNativeStackNavigator();

// Custom Header Logo Component
const HeaderLogo = () => (
  <View style={headerStyles.logoContainer}>
    <Image
      source={require('../../assets/logo-menu.png')}
      style={headerStyles.logo}
      resizeMode="contain"
    />
  </View>
);

// Custom Header Right Buttons
const HeaderRightButtons = ({ navigation }) => (
  <View style={headerStyles.headerRight}>
    <TouchableOpacity
      onPress={() => navigation.navigate('Search')}
      style={headerStyles.headerButton}
    >
      <Ionicons name="search" size={24} color="#FFFFFF" />
    </TouchableOpacity>
    <TouchableOpacity
      onPress={() => navigation.navigate('Notifications')}
      style={headerStyles.headerButton}
    >
      <Ionicons name="notifications" size={24} color="#FFFFFF" />
      <View style={headerStyles.notificationBadge}>
        <View style={headerStyles.notificationDot} />
      </View>
    </TouchableOpacity>
  </View>
);

// Home Stack Navigator
const HomeStackNavigator = () => {
  return (
    <HomeStack.Navigator>
      <HomeStack.Screen
        name="HomeMain"
        component={HomeScreen}
        options={{ headerShown: false }}
      />
      <HomeStack.Screen
        name="OtherUserProfile"
        component={OtherUserProfileScreen}
        options={{ headerShown: false }}
      />
    </HomeStack.Navigator>
  );
};

// Profile Stack Navigator
const ProfileStackNavigator = () => {
  return (
    <ProfileStack.Navigator>
      <ProfileStack.Screen
        name="ProfileMain"
        component={ProfileScreen}
        options={{ headerShown: false }}
      />
      <ProfileStack.Screen
        name="MyVideos"
        component={MyVideosScreen}
        options={{
          headerTitle: 'Video Saya',
          headerStyle: { backgroundColor: '#06402B' },
          headerTintColor: '#fff',
        }}
      />
      <ProfileStack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ headerShown: false }}
      />
      <ProfileStack.Screen
        name="ThemeSettings"
        component={ThemeSettingsScreen}
        options={{ headerShown: false }}
      />
      <ProfileStack.Screen
        name="AccountPrivacy"
        component={AccountPrivacyScreen}
        options={{ headerShown: false }}
      />
      <ProfileStack.Screen
        name="NotificationSettings"
        component={NotificationSettingsScreen}
        options={{ headerShown: false }}
      />
      <ProfileStack.Screen
        name="DataManagement"
        component={DataManagementScreen}
        options={{ headerShown: false }}
      />
      <ProfileStack.Screen
        name="Language"
        component={LanguageScreen}
        options={{ headerShown: false }}
      />
      <ProfileStack.Screen
        name="BlockedAccounts"
        component={BlockedAccountsScreen}
        options={{ headerShown: false }}
      />
      <ProfileStack.Screen
        name="Admin"
        component={AdminScreen}
        options={{ headerShown: false }}
      />
      <ProfileStack.Screen
        name="OtherUserProfile"
        component={OtherUserProfileScreen}
        options={{ headerShown: false }}
      />
      <ProfileStack.Screen
        name="BadgeApplication"
        component={BadgeApplicationScreen}
        options={{ headerShown: false }}
      />
    </ProfileStack.Navigator>
  );
};

// Main Tabs - for authenticated users
const MainTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: true,
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#e5e5e5',
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        tabBarActiveTintColor: '#06402B',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Upload') {
            iconName = focused ? 'add-circle' : 'add-circle-outline';
          } else if (route.name === 'Bookmarks') {
            iconName = focused ? 'bookmark' : 'bookmark-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeStackNavigator}
        options={{
          tabBarLabel: 'Beranda',
          headerShown: false,
        }}
      />
      <Tab.Screen
        name="Upload"
        component={UploadScreen}
        options={{
          tabBarLabel: 'Upload',
          headerTitle: () => <HeaderLogo />,
          headerTitleAlign: 'center',
          headerStyle: {
            backgroundColor: '#06402B',
          },
          headerTintColor: '#fff',
        }}
      />
      <Tab.Screen
        name="Bookmarks"
        component={BookmarksScreen}
        options={{
          tabBarLabel: 'Bookmark',
          headerTitle: () => <HeaderLogo />,
          headerTitleAlign: 'center',
          headerStyle: {
            backgroundColor: '#06402B',
          },
          headerTintColor: '#fff',
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileStackNavigator}
        options={{
          tabBarLabel: 'Profil',
          headerShown: false,
        }}
      />
    </Tab.Navigator>
  );
};

// Root Stack Navigator - wraps MainTabs and modal screens
const RootStackNavigator = () => {
  return (
    <>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        <RootStack.Screen name="MainTabs" component={MainTabs} />
        <RootStack.Screen
          name="Search"
          component={SearchScreen}
          options={{
            presentation: 'modal',
            animation: 'slide_from_right',
          }}
        />
        <RootStack.Screen
          name="Notifications"
          component={NotificationsScreen}
          options={{
            presentation: 'modal',
            animation: 'slide_from_right',
          }}
        />
        <RootStack.Screen
          name="AnalysisResult"
          component={AnalysisResultScreen}
          options={{
            presentation: 'fullScreenModal',
            animation: 'slide_from_bottom',
          }}
        />
        <RootStack.Screen
          name="StoryCamera"
          component={StoryCameraScreen}
          options={{
            presentation: 'fullScreenModal',
            animation: 'slide_from_bottom',
          }}
        />
        <RootStack.Screen
          name="StoryEditor"
          component={StoryEditorScreenSimple}
          options={{
            presentation: 'fullScreenModal',
            animation: 'slide_from_right',
            headerShown: false,
          }}
        />
        <RootStack.Screen
          name="StoryPreview"
          component={StoryPreviewScreen}
          options={{
            presentation: 'fullScreenModal',
            animation: 'slide_from_right',
          }}
        />
        <RootStack.Screen
          name="OtherUserProfile"
          component={OtherUserProfileScreen}
          options={{
            presentation: 'card',
            animation: 'slide_from_right',
            headerShown: false,
          }}
        />
        <RootStack.Screen
          name="TagApproval"
          component={TagApprovalScreen}
          options={{
            presentation: 'card',
            animation: 'slide_from_right',
            headerShown: false,
          }}
        />
        <RootStack.Screen
          name="PlaylistDetail"
          component={PlaylistDetailScreen}
          options={{
            presentation: 'card',
            animation: 'slide_from_right',
            headerShown: false,
          }}
        />
      </RootStack.Navigator>

      {/* AI Floating Button - REMOVED per user request */}
    </>
  );
};

// Main App Navigator (forwardRef to allow notification deep-linking from App.js)
const AppNavigator = React.forwardRef(({ onReady }, ref) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#EDE8D0' }}>
        <ActivityIndicator size="large" color="#06402B" />
      </View>
    );
  }

  return (
    <NavigationContainer ref={ref} onReady={onReady}>
      {isAuthenticated ? <RootStackNavigator /> : <AuthScreen />}
    </NavigationContainer>
  );
});

const headerStyles = StyleSheet.create({
  logoContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 120,
    height: 40,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  headerButton: {
    marginLeft: 16,
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
  },
  notificationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF3B5C',
    borderWidth: 1,
    borderColor: '#06402B',
  },
});

export default AppNavigator;
