import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { useAuth } from '../hooks/useAuth';

// Screens - Teacher
import TeacherDashboard from '../screens/teacher/TeacherDashboard';
import TeacherMyProfileScreen from '../screens/teacher/TeacherMyProfileScreen';
import TeacherBookingsScreen from '../screens/teacher/TeacherBookingsScreen';
import TeacherAvailabilityScreen from '../screens/teacher/TeacherAvailabilityScreen';
import TeacherStudentsScreen from '../screens/teacher/TeacherStudentsScreen';

// Screens - Parent
import ParentDashboard from '../screens/parent/ParentDashboard';
import ParentProfileScreen from '../screens/parent/ParentProfileScreen';
import ParentMyProfileScreen from '../screens/parent/ParentMyProfileScreen';
import ParentBookingsScreen from '../screens/parent/ParentBookingsScreen';
import FavoritesScreen from '../screens/parent/FavoritesScreen';

// Shared
import FindTeachersScreen from '../screens/shared/FindTeachersScreen';
import NotificationsScreen from '../screens/shared/NotificationsScreen';
import CalendarScreen from '../screens/shared/CalendarScreen';
import ConversationsScreen from '../screens/shared/ConversationsScreen';
import ConversationThreadScreen from '../screens/shared/ConversationThreadScreen';
import SecurityTestScreen from '../screens/dev/SecurityTestScreen';
import SettingsScreen from '../screens/shared/SettingsScreen';

const Drawer = createDrawerNavigator();

export default function AppDrawer() {
  const { user } = useAuth();
  const isTeacher = user?.type === 'teacher' || user?.userType === 'teacher';

  return (
    <Drawer.Navigator
      initialRouteName={isTeacher ? 'TeacherDashboard' : 'ParentDashboard'}
      screenOptions={{
        headerShown: false,
      }}
    >
      {/* Dashboards */}
      <Drawer.Screen 
        name="TeacherDashboard" 
        component={TeacherDashboard} 
        options={{ drawerLabel: 'Dashboard (Teacher)', drawerItemStyle: { display: isTeacher ? 'flex' : 'none' } }} 
      />
      <Drawer.Screen 
        name="ParentDashboard" 
        component={ParentDashboard} 
        options={{ drawerLabel: 'Dashboard (Parent)', drawerItemStyle: { display: !isTeacher ? 'flex' : 'none' } }} 
      />

      {/* Common entries */}
      <Drawer.Screen name="Conversations" component={ConversationsScreen} options={{ drawerLabel: 'Messages' }} />
      {isTeacher ? (
        <Drawer.Screen name="TeacherBookings" component={TeacherBookingsScreen} options={{ drawerLabel: 'Bookings & Requests' }} />
      ) : (
        <Drawer.Screen name="ParentBookings" component={ParentBookingsScreen} options={{ drawerLabel: 'My Bookings' }} />
      )}
      {isTeacher ? (
        <Drawer.Screen name="TeacherMyProfile" component={TeacherMyProfileScreen} options={{ drawerLabel: 'My Profile' }} />
      ) : (
        <Drawer.Screen name="ParentMyProfile" component={ParentMyProfileScreen} options={{ drawerLabel: 'My Profile' }} />
      )}
      <Drawer.Screen name="Settings" component={SettingsScreen} />

      {/* Other useful screens in drawer for quick access */}
      <Drawer.Screen name="Calendar" component={CalendarScreen} />
      <Drawer.Screen name="Notifications" component={NotificationsScreen} options={{ drawerLabel: 'Notifications' }} />

      {/* Parent-only extras */}
      {!isTeacher && (
        <Drawer.Screen name="ParentFavorites" component={FavoritesScreen} options={{ drawerLabel: 'Favorites' }} />
      )}

      {/* Teacher-only extras */}
      {isTeacher && (
        <Drawer.Screen name="TeacherAvailability" component={TeacherAvailabilityScreen} options={{ drawerLabel: 'Availability' }} />
      )}

      {/* Hidden/secondary but kept for navigation compatibility */}
      <Drawer.Screen name="FindTeachers" component={FindTeachersScreen} options={{ drawerItemStyle: { display: 'none' } }} />
      <Drawer.Screen name="TeacherStudents" component={TeacherStudentsScreen} options={{ drawerItemStyle: { display: 'none' } }} />
      <Drawer.Screen name="ParentProfile" component={ParentProfileScreen} options={{ drawerItemStyle: { display: 'none' } }} />
      <Drawer.Screen name="ConversationThread" component={ConversationThreadScreen} options={{ drawerItemStyle: { display: 'none' } }} />
      <Drawer.Screen name="SecurityTest" component={SecurityTestScreen} options={{ drawerItemStyle: { display: 'none' } }} />
    </Drawer.Navigator>
  );
}
