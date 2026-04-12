import { StyleSheet } from 'react-native';
import { colors } from './colors';

export const sharedStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPage,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 8,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  rowSpaceBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 12,
    color: colors.textFaint,
  },
});
