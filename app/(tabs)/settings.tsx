import React from 'react';
import { View, Text, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { sharedStyles } from '../../lib/sharedStyles';

export default function SettingsScreen() {
  return (
    <SafeAreaView style={sharedStyles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" translucent={false} />
      <View style={sharedStyles.header}>
        <Text style={sharedStyles.headerTitle}>Ayarlar</Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.placeholder}>Ayarlar 2. fazda geliyor.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholder: {
    fontSize: 15,
    color: '#aaa',
  },
});
