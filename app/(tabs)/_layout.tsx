import { Tabs } from 'expo-router';
import { useTheme } from '../../lib/themeContext';
import { useLanguage } from '../../lib/languageContext';
import IconButton from '../../components/IconButton';

export default function TabsLayout() {
  const { t } = useLanguage();
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarStyle: { 
          backgroundColor: colors.white,
          borderTopColor: colors.border,
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t.readingList,
          tabBarIcon: ({ color, size }) => (
            <IconButton name="list-outline" size={size} color={color} passive style={{ padding: 0 }} />
          ),
        }}
      />
      <Tabs.Screen
        name="tags"
        options={{
          title: t.tags,
          tabBarIcon: ({ color, size }) => (
            <IconButton name="pricetags-outline" size={size} color={color} passive style={{ padding: 0 }} />
          ),
        }}
      />
      <Tabs.Screen
        name="highlights"
        options={{
          title: t.highlights,
          tabBarIcon: ({ color, size }) => (
            <IconButton name="bookmarks-outline" size={size} color={color} passive style={{ padding: 0 }} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t.settings,
          tabBarIcon: ({ color, size }) => (
            <IconButton name="settings-outline" size={size} color={color} passive style={{ padding: 0 }} />
          ),
        }}
      />
    </Tabs>
  );
}
