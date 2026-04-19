import { Tabs } from 'expo-router';
import { useTheme } from '@/lib/theme';
import { useLanguage } from '@/lib/language';
import { IconButton } from '@/components';

export default function TabsLayout() {
  const { t } = useLanguage();
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarStyle: { 
          backgroundColor: colors.bgPage,
          borderTopColor: colors.border,
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t.nav.readingList,
          tabBarIcon: ({ color, size }) => (
            <IconButton name="list-outline" size={size} color={color} passive style={{ padding: 0 }} />
          ),
        }}
      />
      <Tabs.Screen
        name="tags"
        options={{
          title: t.nav.tags,
          tabBarIcon: ({ color, size }) => (
            <IconButton name="pricetags-outline" size={size} color={color} passive style={{ padding: 0 }} />
          ),
        }}
      />
      <Tabs.Screen
        name="highlights"
        options={{
          title: t.nav.highlights,
          tabBarIcon: ({ color, size }) => (
            <IconButton name="bookmarks-outline" size={size} color={color} passive style={{ padding: 0 }} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t.nav.settings,
          tabBarIcon: ({ color, size }) => (
            <IconButton name="settings-outline" size={size} color={color} passive style={{ padding: 0 }} />
          ),
        }}
      />
    </Tabs>
  );
}
