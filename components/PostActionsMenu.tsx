import React, { useState } from 'react';
import { TouchableOpacity, StyleSheet, Modal, View, Text, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '../lib/firebase';
import ReportModal from './ReportModal';
import { Timestamp } from 'firebase/firestore';

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
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [showReportPostModal, setShowReportPostModal] = useState(false);
  const [showReportUserModal, setShowReportUserModal] = useState(false);

  const currentUserId = auth.currentUser?.uid;

  // Don't show menu if user is viewing their own post (optional - you can remove this if you want)
  // if (currentUserId === postOwnerId) {
  //   return null;
  // }

  const handleReportPost = () => {
    setShowActionSheet(false);
    setShowReportPostModal(true);
  };

  const handleReportUser = () => {
    setShowActionSheet(false);
    setShowReportUserModal(true);
  };

  const getSnapshot = () => {
    return {
      postOwnerId,
      postOwnerRole: postOwnerRole || undefined,
      mediaUrl: mediaUrl || undefined,
      mediaType: mediaType || undefined,
      contentText: contentText || undefined,
      postTimestamp: postTimestamp || undefined,
      reportedUserName: reportedUserName || undefined,
    };
  };

  return (
    <>
      <TouchableOpacity
        style={styles.menuButton}
        onPress={() => setShowActionSheet(true)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="ellipsis-vertical" size={20} color="#666" />
      </TouchableOpacity>

      {/* Action Sheet Modal */}
      <Modal
        visible={showActionSheet}
        transparent
        animationType="fade"
        onRequestClose={() => setShowActionSheet(false)}
      >
        <TouchableOpacity
          style={styles.actionSheetOverlay}
          activeOpacity={1}
          onPress={() => setShowActionSheet(false)}
        >
          <View style={styles.actionSheetContainer}>
            <TouchableOpacity
              style={styles.actionSheetItem}
              onPress={handleReportPost}
            >
              <Ionicons name="flag-outline" size={20} color="#FF3B30" />
              <Text style={styles.actionSheetText}>Report Post</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionSheetItem}
              onPress={handleReportUser}
            >
              <Ionicons name="person-remove-outline" size={20} color="#FF3B30" />
              <Text style={styles.actionSheetText}>Report User</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionSheetItem, styles.actionSheetCancel]}
              onPress={() => setShowActionSheet(false)}
            >
              <Text style={styles.actionSheetCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Report Post Modal */}
      <ReportModal
        visible={showReportPostModal}
        onClose={() => setShowReportPostModal(false)}
        targetType="post"
        targetId={postId}
        snapshot={getSnapshot()}
        reportedUserName={reportedUserName}
      />

      {/* Report User Modal */}
      <ReportModal
        visible={showReportUserModal}
        onClose={() => setShowReportUserModal(false)}
        targetType="user"
        targetId={postOwnerId}
        snapshot={getSnapshot()}
        reportedUserName={reportedUserName}
      />
    </>
  );
}

const styles = StyleSheet.create({
  menuButton: {
    padding: 8,
  },
  actionSheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  actionSheetContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
  },
  actionSheetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  actionSheetText: {
    fontSize: 16,
    color: '#000',
    marginLeft: 12,
  },
  actionSheetCancel: {
    borderBottomWidth: 0,
    justifyContent: 'center',
    marginTop: 8,
  },
  actionSheetCancelText: {
    fontSize: 16,
    color: '#FF3B30',
    fontWeight: '600',
  },
});

