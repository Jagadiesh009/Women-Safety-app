import React from 'react';
import { Platform, useWindowDimensions, View, ActivityIndicator } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { Home, Map as MapIcon, User, ShieldAlert, Shield, AlertTriangle, MapPin, Clock, TrendingUp } from 'lucide-react-native';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import { EmergencyProvider, useEmergency } from './src/context/EmergencyContext';
import { ThemeProvider } from './src/context/ThemeContext';
import * as ExpoSplashScreen from 'expo-splash-screen';
import { useAppTheme, typography } from './src/utils/theme';

ExpoSplashScreen.preventAutoHideAsync().catch(() => {});

import { LoginScreen } from './src/screens/LoginScreen';
import { RegisterScreen } from './src/screens/RegisterScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { EmergencyActiveScreen } from './src/screens/EmergencyActiveScreen';
import { IncidentDetailsScreen } from './src/screens/IncidentDetailsScreen';
import { ContactsScreen } from './src/screens/ContactsScreen';
import { MapScreen } from './src/screens/MapScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { ForgotPasswordScreen } from './src/screens/ForgotPasswordScreen';
import { FakeCallScreen } from './src/screens/FakeCallScreen';
import { ReportScreen } from './src/screens/ReportScreen';
import { PrivacySecurityScreen } from './src/screens/PrivacySecurityScreen';
import { NotificationsScreen } from './src/screens/NotificationsScreen';
import { IncidentsScreen } from './src/screens/IncidentsScreen';
import { CrimeSearchScreen } from './src/screens/CrimeSearchScreen';
import { CommunitySafetyScreen } from './src/screens/CommunitySafetyScreen';

import { PoliceDashboardScreen } from './src/screens/police/PoliceDashboardScreen';
import { PoliceAlertsScreen } from './src/screens/police/PoliceAlertsScreen';
import { PoliceIncidentResponseScreen } from './src/screens/police/PoliceIncidentResponseScreen';
import { PolicePatrolMapScreen } from './src/screens/police/PolicePatrolMapScreen';
import { PoliceHistoryScreen } from './src/screens/police/PoliceHistoryScreen';
import { PoliceRecommendationsScreen } from './src/screens/police/PoliceRecommendationsScreen';
import { PoliceWeeklyReportScreen } from './src/screens/police/PoliceWeeklyReportScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const PoliceTab = createBottomTabNavigator();

function MainTabs() {
  const { colors, isDark } = useAppTheme();
  const { width } = useWindowDimensions();
  const isDesktop = width > 768;
  
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: isDark ? '#11141A' : colors.bgPrimary, 
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 88 : 68,
          paddingBottom: Platform.OS === 'ios' ? 28 : 12,
          paddingTop: 12,
          elevation: 0,
          ...(isDesktop && {
            width: '100%',
            maxWidth: 1100,
            alignSelf: 'center',
          })
        },
        tabBarActiveTintColor: colors.accentBrand,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          ...typography.footnote,
          marginTop: 4,
          fontWeight: '600',
        }
      }}
    >
      <Tab.Screen 
        name="HomeTab" 
        component={HomeScreen} 
        options={{ 
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Home color={color} size={22} /> 
        }} 
      />
      <Tab.Screen 
        name="MapTab" 
        component={MapScreen} 
        options={{ 
          title: 'Map',
          tabBarIcon: ({ color, size }) => <MapIcon color={color} size={22} /> 
        }} 
      />
      <Tab.Screen 
        name="ProfileTab" 
        component={ProfileScreen} 
        options={{ 
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <User color={color} size={22} /> 
        }} 
      />
    </Tab.Navigator>
  );
}

function PoliceTabs() {
  const { width } = useWindowDimensions();
  const isDesktop = width > 768;

  return (
    <PoliceTab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0A0F1D',
          borderTopColor: '#1E293B',
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 88 : 68,
          paddingBottom: Platform.OS === 'ios' ? 28 : 12,
          paddingTop: 12,
          elevation: 0,
          ...(isDesktop && {
            width: '100%',
            maxWidth: 1100,
            alignSelf: 'center',
          })
        },
        tabBarActiveTintColor: '#38BDF8',
        tabBarInactiveTintColor: '#64748B',
        tabBarLabelStyle: {
          ...typography.footnote,
          marginTop: 4,
          fontWeight: '600',
        }
      }}
    >
      <PoliceTab.Screen
        name="PoliceDashboard"
        component={PoliceDashboardScreen}
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color }) => <Shield color={color} size={22} />
        }}
      />
      <PoliceTab.Screen
        name="PoliceAlerts"
        component={PoliceAlertsScreen}
        options={{
          title: 'SOS Alerts',
          tabBarIcon: ({ color }) => <AlertTriangle color={color} size={22} />
        }}
      />
      <PoliceTab.Screen
        name="PolicePatrolMap"
        component={PolicePatrolMapScreen}
        options={{
          title: 'Patrol Map',
          tabBarIcon: ({ color }) => <MapPin color={color} size={22} />
        }}
      />
      <PoliceTab.Screen
        name="PoliceHistory"
        component={PoliceHistoryScreen}
        options={{
          title: 'History',
          tabBarIcon: ({ color }) => <Clock color={color} size={22} />
        }}
      />
      <PoliceTab.Screen
        name="PoliceRecommendations"
        component={PoliceRecommendationsScreen}
        options={{
          title: 'Hotspots',
          tabBarIcon: ({ color }) => <TrendingUp color={color} size={22} />
        }}
      />
    </PoliceTab.Navigator>
  );
}

function SplashScreen() {
  const { colors } = useAppTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.bgPrimary, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator size="large" color={colors.accentBrand} />
    </View>
  );
}

function AppNavigator() {
  const { user, isPolice, loading } = useAuth();
  const { isEmergencyActive, isEmergencyLoading } = useEmergency();
  const { colors } = useAppTheme();

  return (
    <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bgPrimary }, animation: 'fade' }}>
      {(loading || (user && isEmergencyLoading)) ? (
        <Stack.Screen name="Splash" component={SplashScreen} />
      ) : isPolice ? (
        // POLICE OFFICER PORTAL
        <>
          <Stack.Screen name="PoliceTabs" component={PoliceTabs} />
          <Stack.Screen name="PoliceIncidentResponse" component={PoliceIncidentResponseScreen} />
          <Stack.Screen name="PoliceWeeklyReport" component={PoliceWeeklyReportScreen} />
        </>
      ) : !user ? (
        <Stack.Group>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        </Stack.Group>
      ) : isEmergencyActive ? (
        <Stack.Group screenOptions={{ presentation: 'fullScreenModal', animation: 'fade' }}>
          <Stack.Screen name="EmergencyActive" component={EmergencyActiveScreen} />
          <Stack.Screen name="IncidentDetails" component={IncidentDetailsScreen} />
        </Stack.Group>
      ) : (
        <>
          <Stack.Screen name="MainTabs" component={MainTabs} />
          <Stack.Screen name="Contacts" component={ContactsScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
          <Stack.Screen name="FakeCall" component={FakeCallScreen} />
          <Stack.Screen name="Report" component={ReportScreen} />
          <Stack.Screen name="PrivacySecurity" component={PrivacySecurityScreen} />
          <Stack.Screen name="Notifications" component={NotificationsScreen} />
          <Stack.Screen name="Incidents" component={IncidentsScreen} />
          <Stack.Screen name="IncidentDetails" component={IncidentDetailsScreen} />
          <Stack.Screen name="CrimeSearch" component={CrimeSearchScreen} />
          <Stack.Screen name="CommunitySafety" component={CommunitySafetyScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  React.useEffect(() => {
    async function prepare() {
      try {
        console.log("App mounted!");
        // any pre-load logic
      } catch (e) {
        console.warn(e);
      } finally {
        await ExpoSplashScreen.hideAsync();
      }
    }
    prepare();
  }, []);

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <EmergencyProvider>
            <AppContent />
          </EmergencyProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function AppContent() {
  const { colors, isDark } = useAppTheme();
  const MyTheme = {
    ...DefaultTheme,
    dark: isDark,
    colors: {
      ...DefaultTheme.colors,
      background: colors.bgPrimary,
      primary: colors.accentBrand,
      text: colors.textPrimary,
      card: colors.bgSecondary,
      border: colors.border,
    }
  };

  return (
    <NavigationContainer theme={MyTheme}>
      <AppNavigator />
    </NavigationContainer>
  );
}
