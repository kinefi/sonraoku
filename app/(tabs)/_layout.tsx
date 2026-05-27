import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import { useIsMutating, useIsFetching } from '@tanstack/react-query';
import { useTheme } from '@/lib/theme';
import { useLanguage } from '@/lib/language';
import { IconButton } from '@/components';

export default function TabsLayout() {
  const { t } = useLanguage();
  const { colors } = useTheme();

  // Detect if any RSS-related sync or fetch is happening
  const isSyncing = useIsMutating({ mutationKey: ['rss-sync-all'] }) > 0;
  const isFetching = useIsFetching({ queryKey: ['rss-items'] }) > 0;
  const showIndicator = isSyncing || isFetching;

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
        name="rss"
        options={{
          title: t.nav.rss,
          tabBarIcon: ({ color, size }) => (
            <View>
              <IconButton name="logo-rss" size={size} color={color} passive style={{ padding: 0 }} />
              {showIndicator && (
                <View style={[styles.indicatorContainer, { backgroundColor: colors.bgPage }]}>
                  <ActivityIndicator size={10} color={colors.primary} />
                </View>
              )}
            </View>
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

const styles = StyleSheet.create({
  indicatorContainer: {
    position: 'absolute',
    top: -2,
    right: -6,
    borderRadius: 10,
    padding: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
