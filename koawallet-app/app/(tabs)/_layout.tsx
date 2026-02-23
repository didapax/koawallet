import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';

function TabIcon({ iconName, label, focused }: { iconName: any; label: string; focused: boolean }) {
  return (
    <View style={styles.tabItem}>
      <Ionicons
        name={iconName}
        size={24}
        color={focused ? Colors.gold : Colors.textMuted}
      />
      <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>{label}</Text>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: Colors.gold,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon iconName={focused ? "home" : "home-outline"} label="Inicio" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon iconName={focused ? "person" : "person-outline"} label="Perfil" focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#0F0F0F', // Darker background for more premium feel
    borderTopColor: '#1A1A1A',
    borderTopWidth: 1,
    height: 75,
    paddingBottom: 12,
    paddingTop: 8,
  },
  tabItem: { alignItems: 'center', justifyContent: 'center' },
  tabLabel: { fontSize: 11, color: Colors.textMuted, marginTop: 4, fontWeight: '500' },
  tabLabelActive: { color: Colors.gold, fontWeight: '700' },
});
