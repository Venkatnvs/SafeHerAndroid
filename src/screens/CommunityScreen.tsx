import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  TextInput,
  Alert,
  FlatList,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import { firestore } from '../config/firebase';

interface CommunityMessage {
  id: string;
  userId: string;
  userName: string;
  message: string;
  timestamp: Date;
  isAnonymous: boolean;
  category: 'general' | 'safety_tips' | 'support';
}

const CommunityScreen = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<CommunityMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'general' | 'safety_tips' | 'support'>('general');
  const [loading, setLoading] = useState(false);
  const [isSafetyNoticeHidden, setIsSafetyNoticeHidden] = useState(false);

  useEffect(() => {
    loadMessages();
    loadSafetyNoticePreference();
  }, [selectedCategory]);

  const loadSafetyNoticePreference = async () => {
    try {
      const hidden = await AsyncStorage.getItem('safetyNoticeHidden');
      if (hidden !== null) {
        setIsSafetyNoticeHidden(JSON.parse(hidden));
      }
    } catch (error) {
      console.error('Error loading safety notice preference:', error);
    }
  };

  const toggleSafetyNotice = async () => {
    try {
      const newHiddenState = !isSafetyNoticeHidden;
      setIsSafetyNoticeHidden(newHiddenState);
      await AsyncStorage.setItem('safetyNoticeHidden', JSON.stringify(newHiddenState));
    } catch (error) {
      console.error('Error saving safety notice preference:', error);
    }
  };

  const loadMessages = async () => {
    try {
      const snapshot = await firestore()
        .collection('communityMessages')
        .where('category', '==', selectedCategory)
        .orderBy('timestamp', 'desc')
        .limit(50)
        .get();

      const messageList: CommunityMessage[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          timestamp: data.timestamp?.toDate() || new Date(),
        } as CommunityMessage;
      });

      setMessages(messageList);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !user) return;

    setLoading(true);
    try {
      const messageData = {
        userId: user.uid,
        userName: user.displayName || 'Anonymous',
        message: newMessage.trim(),
        timestamp: new Date(),
        isAnonymous: true, // Always anonymous for safety
        category: selectedCategory,
      };

      await firestore().collection('communityMessages').add(messageData);
      setNewMessage('');
      loadMessages();
    } catch (error) {
      Alert.alert('Error', 'Failed to send message. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const CategoryButton = ({ category, title, icon }: any) => (
    <TouchableOpacity
      style={[
        styles.categoryButton,
        selectedCategory === category && styles.categoryButtonActive
      ]}
      onPress={() => setSelectedCategory(category)}
    >
      <Icon 
        name={icon} 
        size={20} 
        color={selectedCategory === category ? 'white' : '#E91E63'} 
      />
      <Text style={[
        styles.categoryText,
        selectedCategory === category && styles.categoryTextActive
      ]}>
        {title}
      </Text>
    </TouchableOpacity>
  );

  const MessageItem = ({ message }: { message: CommunityMessage }) => (
    <View style={styles.messageItem}>
      <View style={styles.messageHeader}>
        <Text style={styles.messageUser}>
          {message.isAnonymous ? 'Anonymous' : message.userName}
        </Text>
        <Text style={styles.messageTime}>
          {message.timestamp.toLocaleTimeString()}
        </Text>
      </View>
      <Text style={styles.messageText}>{message.message}</Text>
    </View>
  );


  const renderContent = () => (
    <FlatList
      data={messages}
      renderItem={({ item }) => <MessageItem message={item} />}
      keyExtractor={(item) => item.id}
      style={styles.messagesList}
      inverted
      showsVerticalScrollIndicator={false}
    />
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#9C27B0" />
      
      {/* Header */}
      <LinearGradient
        colors={['#9C27B0', '#7B1FA2']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <Icon name="account-group" size={60} color="white" />
          <Text style={styles.headerTitle}>Community Support</Text>
          <Text style={styles.headerSubtitle}>Connect with other women safely</Text>
        </View>
      </LinearGradient>

      {/* Category Selection */}
      <View style={styles.categoryContainer}>
        <CategoryButton 
          category="general" 
          title="General" 
          icon="chat" 
        />
        <CategoryButton 
          category="safety_tips" 
          title="Safety Tips" 
          icon="shield" 
        />
        <CategoryButton 
          category="support" 
          title="Support" 
          icon="heart" 
        />
      </View>

      {/* Content */}
      <View style={styles.content}>
        {renderContent()}
      </View>

      {/* Message Input */}
      <View style={styles.inputContainer}>
          <TextInput
            style={styles.messageInput}
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder="Share your thoughts safely..."
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.sendButton, (!newMessage.trim() || loading) && styles.sendButtonDisabled]}
            onPress={sendMessage}
            disabled={!newMessage.trim() || loading}
          >
            <Icon name="send" size={20} color="white" />
          </TouchableOpacity>
        </View>

      {/* Safety Notice */}
      {!isSafetyNoticeHidden && (
        <View style={styles.safetyNotice}>
          <Icon name="shield-check" size={16} color="#4CAF50" />
          <Text style={styles.safetyText}>
            All messages are anonymous and moderated for your safety
          </Text>
          <TouchableOpacity 
            style={styles.dismissButton}
            onPress={toggleSafetyNotice}
          >
            <Icon name="close" size={16} color="#4CAF50" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    paddingTop: 20,
    paddingBottom: 30,
    alignItems: 'center',
  },
  headerContent: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 16,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },
  categoryContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  categoryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginHorizontal: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E91E63',
  },
  categoryButtonActive: {
    backgroundColor: '#E91E63',
  },
  categoryText: {
    fontSize: 12,
    color: '#E91E63',
    marginLeft: 4,
    fontWeight: '600',
  },
  categoryTextActive: {
    color: 'white',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  messagesList: {
    flex: 1,
    paddingTop: 16,
  },
  messageItem: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  messageUser: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9C27B0',
  },
  messageTime: {
    fontSize: 12,
    color: '#999',
  },
  messageText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 22,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  messageInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    maxHeight: 100,
    marginRight: 12,
    color: '#000000',
  },
  sendButton: {
    backgroundColor: '#9C27B0',
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#CCC',
  },
  safetyNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E8',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  safetyText: {
    fontSize: 14,
    color: '#4CAF50',
    marginLeft: 8,
    fontWeight: '500',
    flex: 1,
  },
  dismissButton: {
    padding: 4,
    marginLeft: 8,
  },
});

export default CommunityScreen;
