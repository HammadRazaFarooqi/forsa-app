import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface PostActionsMenuProps {
  postId: string;
  postOwnerId: string;
  postOwnerRole?: string;
  mediaUrl?: string;
  mediaType?: string;
  contentText?: string;
  postTimestamp?: any;
  reportedUserName?: string;
}

export default function PostActionsMenu({
  postId,
  postOwnerId,
  postOwnerRole,
  mediaUrl,
  mediaType,
  contentText,
  postTimestamp,
  reportedUserName,
}: PostActionsMenuProps) {
  // Placeholder component - report functionality will be added later
  return (
    <TouchableOpacity
      style={styles.menuButton}
      onPress={() => {
        // Report functionality will be implemented here
      }}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <Ionicons name="ellipsis-vertical" size={20} color="#666" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  menuButton: {
    padding: 8,
  },
});

