import React from 'react';
import { StyleSheet, View, Text, Modal, Pressable, TouchableOpacity, Alert, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { RssFeed } from '@/lib/db/types';
import { useTheme, spacing, borderRadius, typography } from '@/lib/theme';
import { useLanguage } from '@/lib/language';
import IconButton from '@/components/common/IconButton';

interface Props {
  visible: boolean;
  onClose: () => void;
  feeds: RssFeed[];
  onReorder: (data: RssFeed[]) => void;
  onDeleteFeed: (id: string) => void;
  onMarkFeedRead: (id: string) => void;
  onImport: () => void;
  onExport: () => void;
  onDeleteAll: () => void;
  onClearRead: () => void;
}

const RssManageSheet = ({ visible, onClose, feeds, onReorder, onDeleteFeed, onMarkFeedRead, onImport, onExport, onDeleteAll, onClearRead }: Props) => {
  const { colors } = useTheme();
  const { t } = useLanguage();

  const renderFeedItem = ({ item }: { item: RssFeed }) => (
      <Swipeable
        renderRightActions={() => (
          <TouchableOpacity 
            onPress={() => {
              Alert.alert(item.title || '', t.rss.deleteFeedConfirm, [
                { text: t.common.cancel, style: 'cancel' },
                { text: t.common.delete, style: 'destructive', onPress: () => onDeleteFeed(item.id) }
              ]);
            }}
            style={[styles.deleteAction, { backgroundColor: colors.error }]}
          >
            <Ionicons name="trash" size={20} color={colors.white} />
          </TouchableOpacity>
        )}
      >
        <TouchableOpacity
          style={[
            styles.row, 
            { backgroundColor: colors.bgPage, borderBottomColor: colors.borderLight }
          ]}
        >
          <Ionicons name="logo-rss" size={18} color={colors.primary} style={{ marginRight: spacing.sm }} />
          <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>{item.title}</Text>
          <IconButton 
            name="checkmark-done-outline" 
            size={20} 
            color={colors.primary} 
            onPress={() => {
              Alert.alert(
                item.title || '',
                t.rss.markFeedReadConfirm,
                [
                  { text: t.common.cancel, style: 'cancel' },
                  { text: t.articles.markAsRead, onPress: () => onMarkFeedRead(item.id) }
                ],
                { cancelable: true }
              );
            }}
          />
        </TouchableOpacity>
      </Swipeable>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: colors.bgPage }]} onPress={() => {}}>
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Text style={[styles.headerText, { color: colors.textPrimary }]}>{t.rss.manageFeeds}</Text>
            <IconButton name="close" size={24} onPress={onClose} />
          </View>
          
          <FlatList
            data={feeds}
            keyExtractor={(item) => item.id}
            renderItem={renderFeedItem}
            style={{ maxHeight: 400 }}
          />

          <View style={styles.footer}>
            <View style={styles.buttonRow}>
              <TouchableOpacity style={[styles.btn, { backgroundColor: colors.bgMuted }]} onPress={onImport}>
                <Ionicons name="download-outline" size={18} color={colors.textPrimary} style={{ marginRight: 8 }} />
                <Text style={{ color: colors.textPrimary }}>{t.rss.importOpml}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, { backgroundColor: colors.bgMuted }]} onPress={onExport}>
                <Ionicons name="share-outline" size={18} color={colors.textPrimary} style={{ marginRight: 8 }} />
                <Text style={{ color: colors.textPrimary }}>{t.rss.exportOpml}</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={[styles.btn, { backgroundColor: colors.error + '1a' }]} onPress={onDeleteAll}>
              <Ionicons name="trash-bin-outline" size={18} color={colors.error} style={{ marginRight: 8 }} />
              <Text style={{ color: colors.error, fontWeight: typography.weights.bold }}>{t.rss.deleteAll}</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: borderRadius.xl, borderTopRightRadius: borderRadius.xl, paddingBottom: 40 },
  header: { padding: spacing.md, borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerText: { fontSize: 18, fontWeight: typography.weights.bold },
  row: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderBottomWidth: 1 },
  title: { flex: 1, fontSize: 16 },
  deleteAction: { width: 80, justifyContent: 'center', alignItems: 'center' },
  footer: { padding: spacing.md, gap: spacing.sm },
  buttonRow: { flexDirection: 'row', gap: spacing.sm },
  btn: { flex: 1, height: 50, borderRadius: borderRadius.md, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
});

export default RssManageSheet;