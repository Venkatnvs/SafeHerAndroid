import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Linking,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  Dimensions,
  Image,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import { firestore } from '../config/firebase';
import YoutubePlayer from 'react-native-youtube-iframe';

interface SelfDefenseTopic {
  id: string;
  title: string;
  subtitle: string;
  color: string;
  duration: string;
  level: string;
  youtubeId: string;
  description: string;
  techniques: string[];
  createdAt?: Date;
}

interface FormData {
  title: string;
  subtitle: string;
  description: string;
  youtubeId: string;
  techniques: string;
}

// Move ThumbnailImage outside to prevent recreation on every render
const ThumbnailImage = React.memo(({ youtubeId, style }: { youtubeId: string; style: any }) => {
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUrlIndex, setCurrentUrlIndex] = useState(0);
  
  // Generate thumbnail URLs with useMemo to prevent recreation
  const thumbnailUrls = React.useMemo(() => {
    if (!youtubeId) return null;
    
    const cleanId = youtubeId.replace(/[^a-zA-Z0-9_-]/g, '');
    if (!cleanId) return null;
    
    return [
      `https://img.youtube.com/vi/${cleanId}/mqdefault.jpg`,
      `https://i.ytimg.com/vi/${cleanId}/mqdefault.jpg`,
      `https://img.youtube.com/vi/${cleanId}/hqdefault.jpg`,
      `https://i.ytimg.com/vi/${cleanId}/hqdefault.jpg`,
      `https://img.youtube.com/vi/${cleanId}/default.jpg`,
      `https://i.ytimg.com/vi/${cleanId}/default.jpg`,
    ];
  }, [youtubeId]);
  
  const currentUrl = thumbnailUrls?.[currentUrlIndex];

  const handleError = React.useCallback(() => {
    if (thumbnailUrls && currentUrlIndex < thumbnailUrls.length - 1) {
      setCurrentUrlIndex(prev => prev + 1);
    } else {
      setImageError(true);
      setIsLoading(false);
    }
  }, [currentUrlIndex, thumbnailUrls]);

  const handleLoad = React.useCallback(() => {
    setIsLoading(false);
    setImageError(false);
  }, []);

  const handleLoadStart = React.useCallback(() => {
    setIsLoading(true);
  }, []);

  if (!thumbnailUrls || !currentUrl || imageError) {
    return (
      <View style={[style, { backgroundColor: '#E0E0E0', justifyContent: 'center', alignItems: 'center' }]}>
        <Icon name="play-circle" size={28} color="#C0C0C0" />
      </View>
    );
  }

  return (
    <Image
      source={{ uri: currentUrl }}
      style={style}
      resizeMode="cover"
      onLoadStart={handleLoadStart}
      onError={handleError}
      onLoad={handleLoad}
      onLoadEnd={() => setIsLoading(false)}
    />
  );
});

const SelfDefenseScreen = () => {
  const { user } = useAuth();
  const [selectedVideo, setSelectedVideo] = useState<SelfDefenseTopic | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [videoPlayerVisible, setVideoPlayerVisible] = useState(false);
  const [topics, setTopics] = useState<SelfDefenseTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<FormData>({
    title: '',
    subtitle: '',
    description: '',
    youtubeId: '',
    techniques: '',
  });
  const [editingTopic, setEditingTopic] = useState<SelfDefenseTopic | null>(null);
  const [currentVideoId, setCurrentVideoId] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [videoLoading, setVideoLoading] = useState(false);
  const [cachedTopics, setCachedTopics] = useState<SelfDefenseTopic[]>([]);
  const [cacheTimestamp, setCacheTimestamp] = useState<number>(0);
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  
  const screenWidth = Dimensions.get('window').width;
  const playerRef = useRef<any>(null);

  // Optimized safe icon component
  const SafeIcon = React.memo(({ name, size, color, fallback = 'help-circle' }: any) => {
    const validIcons = useMemo(() => new Set([
      'play', 'pause', 'information', 'youtube', 'pencil', 'delete', 'close', 
      'alert-circle', 'check-circle', 'clock', 'star', 'plus', 'karate',
      'lightbulb', 'phone', 'map-marker', 'bell', 'account-group'
    ]), []);
    
    const cleanName = name ? name.toString().toLowerCase().trim() : '';
    const isValidIcon = validIcons.has(cleanName);
    const iconName = isValidIcon ? cleanName : fallback;
    
    return <Icon name={iconName} size={size} color={color} />;
  });

  // Simplified Firebase data loading without pagination
  const loadTopics = useCallback(async () => {
    try {
      const now = Date.now();
      const CACHE_DURATION = 3600000; // 1 hour cache
      
      // Check memory cache first
      if ((now - cacheTimestamp) < CACHE_DURATION && cachedTopics.length > 0) {
        setTopics(cachedTopics);
        setLoading(false);
        return;
      }

      // Try AsyncStorage cache
      try {
        const [storedData, storedTimestamp] = await Promise.all([
          AsyncStorage.getItem('selfDefenseTopics'),
          AsyncStorage.getItem('selfDefenseTopicsTimestamp')
        ]);
        
        if (storedData && storedTimestamp) {
          const storedTime = parseInt(storedTimestamp);
          if ((now - storedTime) < CACHE_DURATION) {
            const parsedTopics = JSON.parse(storedData);
            setTopics(parsedTopics);
            setCachedTopics(parsedTopics);
            setCacheTimestamp(storedTime);
            setLoading(false);
            return;
          }
        }
      } catch (storageError) {
        console.warn('AsyncStorage cache failed:', storageError);
      }

      setLoading(true);

      // Load all topics at once (no pagination)
      const snapshot = await firestore()
        .collection('selfDefenseTopics')
        .orderBy('createdAt', 'desc')
        .get();

      const topicsList: SelfDefenseTopic[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title || 'Untitled Topic',
          subtitle: data.subtitle || 'No description available',
          color: data.color || '#FF9800',
          duration: data.duration || '15 min',
          level: data.level || 'Beginner',
          youtubeId: data.youtubeId || '',
          description: data.description || 'No description available',
          techniques: Array.isArray(data.techniques) ? data.techniques : [],
          createdAt: data.createdAt?.toDate() || new Date(),
        } as SelfDefenseTopic;
      });

      setTopics(topicsList);
      setCachedTopics(topicsList);
      setCacheTimestamp(now);
      
      // Save to AsyncStorage
      try {
        await Promise.all([
          AsyncStorage.setItem('selfDefenseTopics', JSON.stringify(topicsList)),
          AsyncStorage.setItem('selfDefenseTopicsTimestamp', now.toString())
        ]);
      } catch (storageError) {
        console.warn('Failed to save to AsyncStorage:', storageError);
      }
    } catch (error) {
      console.error('Error loading topics:', error);
      Alert.alert('Error', 'Failed to load self-defense topics. Please check your internet connection.');
    } finally {
      setLoading(false);
    }
  }, [cachedTopics, cacheTimestamp]);


  // Memoized safety tips to prevent unnecessary re-renders
  const safetyTips = useMemo(() => [
    'Always trust your instincts - if something feels wrong, it probably is',
    'Stay in well-lit areas when walking at night',
    'Keep your phone charged and easily accessible',
    'Share your location with trusted friends when traveling',
    'Learn basic self-defense moves and practice them regularly',
    'Be aware of your surroundings and avoid distractions',
    'Have a plan for emergency situations',
    'Know the emergency numbers for your area',
  ], []);

  // Optimized video handling functions
  const openYouTubeVideo = useCallback((youtubeId: string) => {
    if (!youtubeId) {
      Alert.alert('Error', 'Invalid video ID');
      return;
    }
    
    const youtubeUrl = `https://www.youtube.com/watch?v=${youtubeId}`;
    Linking.openURL(youtubeUrl).catch(err => {
      console.error('Failed to open YouTube watch URL:', err);
      // Fallback to embed URL
      const embedUrl = `https://www.youtube.com/embed/${youtubeId}`;
      console.log('Trying embed URL fallback:', embedUrl);
      Linking.openURL(embedUrl).catch(embedErr => {
        console.error('Failed to open YouTube embed URL:', embedErr);
        Alert.alert('Error', 'Could not open YouTube video. Please try again.');
      });
    });
  }, []);

  const openInAppVideoPlayer = useCallback((youtubeId: string) => {
    if (!youtubeId) {
      Alert.alert('Error', 'Invalid video ID');
      return;
    }
    
    console.log('Opening video player with ID:', youtubeId);
    setCurrentVideoId(youtubeId);
    setVideoPlayerVisible(true);
    setVideoLoading(true);
    setVideoError(false);
    setIsPlaying(false);
  }, []);

  // Fallback function to try different YouTube URL formats
  const tryYouTubeFallback = useCallback((youtubeId: string) => {
    const urls = [
      `https://www.youtube.com/watch?v=${youtubeId}`,
      `https://www.youtube.com/embed/${youtubeId}`,
      `https://youtu.be/${youtubeId}`,
      `https://m.youtube.com/watch?v=${youtubeId}`,
    ];

    const tryNextUrl = (index: number) => {
      if (index >= urls.length) {
        Alert.alert('Error', 'Could not open video in any format. Please check your internet connection.');
        return;
      }

      const url = urls[index];
      console.log(`Trying YouTube URL ${index + 1}/${urls.length}:`, url);
      
      Linking.openURL(url).catch(err => {
        console.error(`Failed to open URL ${index + 1}:`, err);
        tryNextUrl(index + 1);
      });
    };

    tryNextUrl(0);
  }, []);

  const closeVideoPlayer = useCallback(() => {
    console.log('Closing video player');
    setVideoPlayerVisible(false);
    setCurrentVideoId('');
    setIsPlaying(false);
    setVideoError(false);
    setVideoLoading(false);
  }, []);

  // Optimized admin status checking
  const checkAdminStatus = useCallback(async () => {
    if (!user?.email) return;
    
    try {
      const adminDoc = await firestore()
        .collection('adminList')
        .doc('admins')
        .get();
      
      if (adminDoc.exists) {
        const adminData = adminDoc.data();
        const adminEmails = adminData?.emails || [];
        setIsAdmin(adminEmails.includes(user.email));
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
      setIsAdmin(false);
    }
  }, [user?.email]);

  useEffect(() => {
    console.log('SelfDefenseScreen mounted, loading topics...');
    checkAdminStatus();
    loadTopics();
  }, [checkAdminStatus, loadTopics]);

  // Handle video loading timeout
  useEffect(() => {
    if (videoLoading && currentVideoId) {
      const timeout = setTimeout(() => {
        console.log('Video loading timeout after 10 seconds, auto-opening in YouTube');
        setVideoError(true);
        setVideoLoading(false);
        // Auto-open in YouTube as fallback
        setTimeout(() => {
          tryYouTubeFallback(currentVideoId);
        }, 1000); // Small delay to show error state first
      }, 10000); // 10 second timeout

      return () => clearTimeout(timeout);
    }
  }, [videoLoading, currentVideoId, tryYouTubeFallback]);

  // Form validation
  const validateForm = useCallback((data: FormData) => {
    const newErrors: {[key: string]: string} = {};
    
    if (!data.title.trim()) {
      newErrors.title = 'Title is required';
    }
    
    if (!data.subtitle.trim()) {
      newErrors.subtitle = 'Subtitle is required';
    }
    
    if (!data.youtubeId.trim()) {
      newErrors.youtubeId = 'YouTube video ID is required';
    } else if (!/^[a-zA-Z0-9_-]{11}$/.test(data.youtubeId.trim())) {
      newErrors.youtubeId = 'Invalid YouTube video ID format';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, []);

  // Optimized add topic function
  const addNewTopic = useCallback(async () => {
    if (!validateForm(formData)) {
      return;
    }

    try {
      const topicData = {
        title: formData.title.trim(),
        subtitle: formData.subtitle.trim(),
        description: formData.description.trim(),
        youtubeId: formData.youtubeId.trim(),
        color: '#FF9800',
        duration: '15 min',
        level: 'Beginner',
        techniques: formData.techniques.split(',').map(t => t.trim()).filter(t => t),
        createdAt: new Date(),
        createdBy: user?.uid,
      };

      await firestore()
        .collection('selfDefenseTopics')
        .add(topicData);

      Alert.alert('Success', 'New self-defense topic added successfully');
      setAddModalVisible(false);
      resetForm();
      loadTopics();
    } catch (error) {
      console.error('Error adding topic:', error);
      Alert.alert('Error', 'Failed to add topic. Please try again.');
    }
  }, [formData, validateForm, user?.uid, loadTopics]);

  // Optimized edit topic function
  const editTopic = useCallback(async () => {
    if (!editingTopic) {
      Alert.alert('Error', 'No topic selected for editing');
      return;
    }
    
    if (!validateForm(formData)) {
      return;
    }

    try {
      const topicData = {
        title: formData.title.trim(),
        subtitle: formData.subtitle.trim(),
        description: formData.description.trim(),
        youtubeId: formData.youtubeId.trim(),
        techniques: formData.techniques.split(',').map(t => t.trim()).filter(t => t),
        updatedAt: new Date(),
        updatedBy: user?.uid,
      };

      await firestore()
        .collection('selfDefenseTopics')
        .doc(editingTopic.id)
        .update(topicData);

      Alert.alert('Success', 'Topic updated successfully');
      setEditModalVisible(false);
      setEditingTopic(null);
      resetForm();
      loadTopics();
    } catch (error) {
      console.error('Error updating topic:', error);
      Alert.alert('Error', 'Failed to update topic. Please try again.');
    }
  }, [editingTopic, formData, validateForm, user?.uid, loadTopics]);

  // Optimized delete topic function
  const deleteTopic = useCallback((topicId: string, topicTitle: string) => {
    Alert.alert(
      'Delete Topic',
      `Are you sure you want to delete "${topicTitle}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await firestore()
                .collection('selfDefenseTopics')
                .doc(topicId)
                .delete();

              Alert.alert('Success', 'Topic deleted successfully');
              loadTopics();
            } catch (error) {
              console.error('Error deleting topic:', error);
              Alert.alert('Error', 'Failed to delete topic. Please try again.');
            }
          }
        }
      ]
    );
  }, [loadTopics]);

  // Optimized form reset
  const resetForm = useCallback(() => {
    setFormData({
      title: '',
      subtitle: '',
      description: '',
      youtubeId: '',
      techniques: '',
    });
    setErrors({});
  }, []);

  // Optimized modal functions
  const openVideoDetails = useCallback((topic: SelfDefenseTopic) => {
    setSelectedVideo(topic);
  }, []);

  const openEditModal = useCallback((topic: SelfDefenseTopic) => {
    setEditingTopic(topic);
    setFormData({
      title: topic.title,
      subtitle: topic.subtitle,
      description: topic.description,
      youtubeId: topic.youtubeId,
      techniques: topic.techniques.join(', '),
    });
    setEditModalVisible(true);
  }, []);

  // Memoized skeleton component
  const SkeletonCard = React.memo(() => (
    <View style={styles.topicCard}>
      <View style={styles.cardHeader}>
        <View style={[styles.topicIcon, { backgroundColor: '#E0E0E0' }]}>
          <SafeIcon name="play-circle" size={28} color="#C0C0C0" />
        </View>
        <View style={styles.topicInfo}>
          <View style={styles.skeletonTitle} />
          <View style={styles.skeletonSubtitle} />
          <View style={styles.skeletonMeta} />
        </View>
      </View>
      <View style={styles.cardActions}>
        <View style={[styles.actionButton, styles.skeletonButton]} />
        <View style={[styles.actionButton, styles.skeletonButton]} />
        <View style={[styles.actionButton, styles.skeletonButton]} />
      </View>
    </View>
  ));

  // Optimized card component with proper memoization and performance optimization
  const SelfDefenseCard = React.memo(({ topic }: { topic: SelfDefenseTopic }) => {
    const handlePlay = useCallback(() => openInAppVideoPlayer(topic.youtubeId), [topic.youtubeId]);
    const handleInfo = useCallback(() => openVideoDetails(topic), [topic]);
    const handleYouTube = useCallback(() => openYouTubeVideo(topic.youtubeId), [topic.youtubeId]);
    const handleEdit = useCallback(() => openEditModal(topic), [topic]);
    const handleDelete = useCallback(() => deleteTopic(topic.id, topic.title), [topic.id, topic.title]);

    return (
      <View style={styles.topicCard}>
        <View style={styles.cardHeader}>
          <View style={[styles.topicIcon, { backgroundColor: topic.color }]}>
            <ThumbnailImage youtubeId={topic.youtubeId} style={styles.thumbnailImage} />
          </View>
          <View style={styles.topicInfo}>
            <Text style={styles.topicTitle} numberOfLines={2}>{topic.title}</Text>
            <Text style={styles.topicSubtitle} numberOfLines={1}>{topic.subtitle}</Text>
            <View style={styles.topicMeta}>
              <View style={styles.metaItem}>
                <SafeIcon name="clock" size={14} color="#666" />
                <Text style={styles.metaText}>{topic.duration}</Text>
              </View>
              <View style={styles.metaItem}>
                <SafeIcon name="star" size={14} color="#666" />
                <Text style={styles.metaText}>{topic.level}</Text>
              </View>
            </View>
          </View>
        </View>
        
        <View style={styles.cardActions}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.playButton]}
            onPress={handlePlay}
          >
            <SafeIcon name="play" size={18} color="white" />
            <Text style={styles.actionButtonText}>Play</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.infoButton]}
            onPress={handleInfo}
          >
            <SafeIcon name="information" size={18} color="white" />
            <Text style={styles.actionButtonText}>Info</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.externalButton]}
            onPress={handleYouTube}
          >
            <SafeIcon name="youtube" size={18} color="white" />
            <Text style={styles.actionButtonText}>YouTube</Text>
          </TouchableOpacity>
          
          {isAdmin && (
            <>
              <TouchableOpacity 
                style={[styles.actionButton, styles.editButton]}
                onPress={handleEdit}
              >
                <SafeIcon name="pencil" size={18} color="white" />
                <Text style={styles.actionButtonText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.actionButton, styles.deleteButton]}
                onPress={handleDelete}
              >
                <SafeIcon name="delete" size={18} color="white" />
                <Text style={styles.actionButtonText}>Delete</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  }, (prevProps, nextProps) => {
    // Custom comparison function for better performance
    return (
      prevProps.topic.id === nextProps.topic.id &&
      prevProps.topic.title === nextProps.topic.title &&
      prevProps.topic.subtitle === nextProps.topic.subtitle &&
      prevProps.topic.youtubeId === nextProps.topic.youtubeId &&
      prevProps.topic.color === nextProps.topic.color &&
      prevProps.topic.duration === nextProps.topic.duration &&
      prevProps.topic.level === nextProps.topic.level
    );
  });


  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#FF9800" />
      
      {/* Header */}
      <LinearGradient
        colors={['#FF9800', '#F57C00']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <SafeIcon name="karate" size={80} color="white" />
          <Text style={styles.headerTitle}>Self Defense</Text>
          <Text style={styles.headerSubtitle}>Knowledge is your best weapon</Text>
          {isAdmin && (
            <TouchableOpacity 
              style={styles.adminButton}
              onPress={() => setAddModalVisible(true)}
            >
              <SafeIcon name="plus" size={20} color="white" />
              <Text style={styles.adminButtonText}>Add Topic</Text>
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      {/* Single ScrollView for better layout control */}
      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Training Topics Section */}
        <View style={styles.topicsSection}>
          <Text style={styles.sectionTitle}>Training Topics</Text>
          
          {loading ? (
            <>
              {Array.from({ length: 3 }).map((_, index) => (
                <SkeletonCard key={index} />
              ))}
            </>
          ) : topics.length === 0 ? (
            <View style={styles.emptyContainer}>
              <SafeIcon name="karate" size={48} color="#CCC" />
              <Text style={styles.emptyText}>No self-defense topics available</Text>
              <Text style={styles.emptySubtext}>Check back later for new content</Text>
            </View>
          ) : (
            <>
              {topics.map((topic) => (
                <SelfDefenseCard key={topic.id} topic={topic} />
              ))}
            </>
          )}
        </View>
        {/* Safety Tips */}
        <View style={styles.tipsSection}>
          <Text style={styles.sectionTitle}>Safety Tips</Text>
          
          {safetyTips.map((tip, index) => (
            <View key={index} style={styles.tipCard}>
              <SafeIcon name="lightbulb" size={24} color="#FF9800" />
              <Text style={styles.tipText}>{tip}</Text>
            </View>
          ))}
        </View>

        {/* Emergency Resources */}
        <View style={styles.resourcesSection}>
          <Text style={styles.sectionTitle}>Emergency Resources</Text>
          
          <View style={styles.resourceGrid}>
            <TouchableOpacity style={styles.resourceCard}>
              <SafeIcon name="phone" size={32} color="#F44336" />
              <Text style={styles.resourceTitle}>Emergency Call</Text>
              <Text style={styles.resourceSubtitle}>Call 112 immediately</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.resourceCard}>
              <SafeIcon name="map-marker" size={32} color="#2196F3" />
              <Text style={styles.resourceTitle}>Find Safe Zones</Text>
              <Text style={styles.resourceSubtitle}>Locate nearby help</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.resourceCard}>
              <SafeIcon name="bell" size={32} color="#FF9800" />
              <Text style={styles.resourceTitle}>SOS Alert</Text>
              <Text style={styles.resourceSubtitle}>Send emergency alert</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.resourceCard}>
              <SafeIcon name="account-group" size={32} color="#4CAF50" />
              <Text style={styles.resourceTitle}>Contact Guardians</Text>
              <Text style={styles.resourceSubtitle}>Notify your network</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Disclaimer */}
        <View style={styles.disclaimerSection}>
          <Text style={styles.disclaimerTitle}>Important Disclaimer</Text>
          <Text style={styles.disclaimerText}>
            Self-defense training is for educational purposes only. The techniques shown are not guaranteed to work in all situations. Always prioritize avoiding dangerous situations and call emergency services when needed. Practice these techniques under professional supervision.
          </Text>
        </View>
      </ScrollView>

      {/* Video Player Modal */}
      <Modal
        visible={videoPlayerVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={closeVideoPlayer}
      >
        <View style={styles.videoPlayerContainer}>
          <View style={styles.videoPlayerHeader}>
            <Text style={styles.videoPlayerTitle}>Self-Defense Video</Text>
            <TouchableOpacity
              style={styles.videoCloseButton}
              onPress={closeVideoPlayer}
            >
              <SafeIcon name="close" size={24} color="white" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.videoContainer}>
            {videoError ? (
              <View style={styles.videoErrorContainer}>
                <SafeIcon name="alert-circle" size={48} color="#F44336" />
                <Text style={styles.videoErrorText}>Failed to load video</Text>
                <Text style={styles.videoErrorSubtext}>Video ID: {currentVideoId}</Text>
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={() => {
                    setVideoError(false);
                    setVideoLoading(true);
                  }}
                >
                  <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.retryButton, {backgroundColor: '#2196F3', marginTop: 10}]}
                  onPress={() => tryYouTubeFallback(currentVideoId)}
                >
                  <Text style={styles.retryButtonText}>Open in YouTube App</Text>
                </TouchableOpacity>
              </View>
            ) : videoLoading ? (
              <View style={styles.videoErrorContainer}>
                <ActivityIndicator size="large" color="#FF9800" />
                <Text style={styles.videoErrorText}>Loading video...</Text>
                <Text style={styles.videoErrorSubtext}>Video ID: {currentVideoId}</Text>
                <Text style={styles.videoErrorSubtext}>Will auto-open in YouTube after 10 seconds</Text>
                <TouchableOpacity
                  style={[styles.retryButton, {backgroundColor: '#2196F3', marginTop: 10}]}
                  onPress={() => {
                    setVideoLoading(false);
                    setVideoPlayerVisible(false);
                    tryYouTubeFallback(currentVideoId);
                  }}
                >
                  <Text style={styles.retryButtonText}>Cancel & Open in YouTube</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <YoutubePlayer
                ref={playerRef}
                height={Math.min(screenWidth * 0.6, 250)}
                play={isPlaying}
                videoId={currentVideoId}
                webViewStyle={{ 
                  opacity: 0.99,
                  backgroundColor: '#000'
                }}
                webViewProps={{
                  allowsInlineMediaPlayback: true,
                  mediaPlaybackRequiresUserAction: false,
                  allowsFullscreenVideo: true,
                  source: {
                    uri: `https://www.youtube.com/embed/${currentVideoId}?autoplay=${isPlaying ? 1 : 0}&controls=1&rel=0&modestbranding=1`
                  }
                }}
                onChangeState={(event) => {
                  console.log('Video state changed:', event);
                  if (event === 'ended') {
                    setIsPlaying(false);
                  } else if (event === 'playing') {
                    setVideoLoading(false);
                    setVideoError(false);
                  } else if (event === 'paused') {
                    setVideoLoading(false);
                  }
                }}
                onError={(error) => {
                  console.error('Video error:', error);
                  setVideoError(true);
                  setVideoLoading(false);
                  setIsPlaying(false);
                }}
                onReady={() => {
                  console.log('Video ready');
                  setVideoError(false);
                  setVideoLoading(false);
                }}
                initialPlayerParams={{
                  controls: true,
                  rel: false,
                }}
              />
            )}
          </View>
          
          <View style={styles.videoPlayerActions}>
            <TouchableOpacity
              style={styles.videoControlButton}
              onPress={() => setIsPlaying(!isPlaying)}
            >
              <SafeIcon name={isPlaying ? "pause" : "play"} size={20} color="white" />
              <Text style={styles.videoActionButtonText}>
                {isPlaying ? "Pause" : "Play"}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.videoActionButton}
              onPress={() => tryYouTubeFallback(currentVideoId)}
            >
              <SafeIcon name="youtube" size={20} color="white" />
              <Text style={styles.videoActionButtonText}>Open in YouTube</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Video Details Modal */}
      <Modal
        visible={selectedVideo !== null}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedVideo(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.infoModalContent}>
            {selectedVideo && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle} numberOfLines={2}>{selectedVideo.title}</Text>
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => setSelectedVideo(null)}
                  >
                    <SafeIcon name="close" size={24} color="#666" />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                  <View style={styles.videoThumbnailContainer}>
                    <ThumbnailImage youtubeId={selectedVideo.youtubeId} style={styles.modalThumbnail} />
                    <View style={styles.playOverlay}>
                      <SafeIcon name="play" size={32} color="white" />
                    </View>
                  </View>

                  <Text style={styles.modalSubtitle}>{selectedVideo.subtitle || 'No subtitle available'}</Text>
                  <Text style={styles.modalDescription}>{selectedVideo.description || 'No description available'}</Text>
                  
                  <View style={styles.videoMetaInfo}>
                    <View style={styles.metaItem}>
                      <SafeIcon name="clock" size={16} color="#666" />
                      <Text style={styles.metaText}>{selectedVideo.duration || 'Duration not specified'}</Text>
                    </View>
                    <View style={styles.metaItem}>
                      <SafeIcon name="star" size={16} color="#666" />
                      <Text style={styles.metaText}>{selectedVideo.level || 'Level not specified'}</Text>
                    </View>
                  </View>
                  
                  <View style={styles.techniquesSection}>
                    <Text style={styles.techniquesTitle}>Techniques Covered:</Text>
                    {selectedVideo.techniques && selectedVideo.techniques.length > 0 ? (
                      selectedVideo.techniques.map((technique: string, index: number) => (
                        <View key={index} style={styles.techniqueItem}>
                          <SafeIcon name="check-circle" size={16} color="#4CAF50" />
                          <Text style={styles.techniqueText}>{technique}</Text>
                        </View>
                      ))
                    ) : (
                      <Text style={styles.noTechniquesText}>No techniques specified</Text>
                    )}
                  </View>

                  <View style={styles.modalActions}>
                    <TouchableOpacity
                      style={[styles.modalActionButton, styles.playActionButton]}
                      onPress={() => {
                        openInAppVideoPlayer(selectedVideo.youtubeId);
                        setSelectedVideo(null);
                      }}
                    >
                      <SafeIcon name="play" size={20} color="white" />
                      <Text style={styles.modalActionButtonText}>Play Video</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[styles.modalActionButton, styles.youtubeActionButton]}
                      onPress={() => {
                        tryYouTubeFallback(selectedVideo.youtubeId);
                        setSelectedVideo(null);
                      }}
                    >
                      <SafeIcon name="youtube" size={20} color="white" />
                      <Text style={styles.modalActionButtonText}>Open in YouTube</Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Edit Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setEditModalVisible(false);
          setEditingTopic(null);
          resetForm();
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.formModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Self-Defense Topic</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => {
                  setEditModalVisible(false);
                  setEditingTopic(null);
                  resetForm();
                }}
              >
                <SafeIcon name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={styles.modalBody} 
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.formSection}>
                <Text style={styles.inputLabel}>Title *</Text>
                <TextInput
                  style={[styles.textInput, errors.title ? styles.errorInput : null]}
                  value={formData.title}
                  onChangeText={(text) => {
                    setFormData({...formData, title: text});
                    if (errors.title) {
                      setErrors({...errors, title: ''});
                    }
                  }}
                  placeholder="Enter topic title"
                  placeholderTextColor="#999"
                />
                {errors.title && <Text style={styles.errorText}>{errors.title}</Text>}
              </View>
              
              <View style={styles.formSection}>
                <Text style={styles.inputLabel}>Subtitle *</Text>
                <TextInput
                  style={[styles.textInput, errors.subtitle ? styles.errorInput : null]}
                  value={formData.subtitle}
                  onChangeText={(text) => {
                    setFormData({...formData, subtitle: text});
                    if (errors.subtitle) {
                      setErrors({...errors, subtitle: ''});
                    }
                  }}
                  placeholder="Enter topic subtitle"
                  placeholderTextColor="#999"
                />
                {errors.subtitle && <Text style={styles.errorText}>{errors.subtitle}</Text>}
              </View>
              
              <View style={styles.formSection}>
                <Text style={styles.inputLabel}>Description</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={formData.description}
                  onChangeText={(text) => setFormData({...formData, description: text})}
                  placeholder="Enter topic description"
                  placeholderTextColor="#999"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
              
              <View style={styles.formSection}>
                <Text style={styles.inputLabel}>YouTube Video ID *</Text>
                <TextInput
                  style={[styles.textInput, errors.youtubeId ? styles.errorInput : null]}
                  value={formData.youtubeId}
                  onChangeText={(text) => {
                    setFormData({...formData, youtubeId: text});
                    if (errors.youtubeId) {
                      setErrors({...errors, youtubeId: ''});
                    }
                  }}
                  placeholder="Enter YouTube video ID (11 characters)"
                  placeholderTextColor="#999"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {errors.youtubeId && <Text style={styles.errorText}>{errors.youtubeId}</Text>}
                <Text style={styles.helpText}>
                  Example: dQw4w9WgXcQ (from https://www.youtube.com/watch?v=dQw4w9WgXcQ)
                </Text>
              </View>
              
              <View style={styles.formSection}>
                <Text style={styles.inputLabel}>Techniques (comma-separated)</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={formData.techniques}
                  onChangeText={(text) => setFormData({...formData, techniques: text})}
                  placeholder="Enter techniques separated by commas"
                  placeholderTextColor="#999"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
                <Text style={styles.helpText}>
                  Example: Basic strikes, Defensive blocks, Escape techniques
                </Text>
              </View>
              
              <TouchableOpacity
                style={[styles.submitButton, styles.editButton]}
                onPress={editTopic}
              >
                <SafeIcon name="pencil" size={20} color="white" />
                <Text style={styles.submitButtonText}>Update Topic</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Add Modal */}
      <Modal
        visible={addModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setAddModalVisible(false);
          resetForm();
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.formModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Self-Defense Topic</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => {
                  setAddModalVisible(false);
                  resetForm();
                }}
              >
                <SafeIcon name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={styles.modalBody} 
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.formSection}>
                <Text style={styles.inputLabel}>Title *</Text>
                <TextInput
                  style={[styles.textInput, errors.title ? styles.errorInput : null]}
                  value={formData.title}
                  onChangeText={(text) => {
                    setFormData({...formData, title: text});
                    if (errors.title) {
                      setErrors({...errors, title: ''});
                    }
                  }}
                  placeholder="Enter topic title"
                  placeholderTextColor="#999"
                />
                {errors.title && <Text style={styles.errorText}>{errors.title}</Text>}
              </View>
              
              <View style={styles.formSection}>
                <Text style={styles.inputLabel}>Subtitle *</Text>
                <TextInput
                  style={[styles.textInput, errors.subtitle ? styles.errorInput : null]}
                  value={formData.subtitle}
                  onChangeText={(text) => {
                    setFormData({...formData, subtitle: text});
                    if (errors.subtitle) {
                      setErrors({...errors, subtitle: ''});
                    }
                  }}
                  placeholder="Enter topic subtitle"
                  placeholderTextColor="#999"
                />
                {errors.subtitle && <Text style={styles.errorText}>{errors.subtitle}</Text>}
              </View>
              
              <View style={styles.formSection}>
                <Text style={styles.inputLabel}>Description</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={formData.description}
                  onChangeText={(text) => setFormData({...formData, description: text})}
                  placeholder="Enter topic description"
                  placeholderTextColor="#999"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
              
              <View style={styles.formSection}>
                <Text style={styles.inputLabel}>YouTube Video ID *</Text>
                <TextInput
                  style={[styles.textInput, errors.youtubeId ? styles.errorInput : null]}
                  value={formData.youtubeId}
                  onChangeText={(text) => {
                    setFormData({...formData, youtubeId: text});
                    if (errors.youtubeId) {
                      setErrors({...errors, youtubeId: ''});
                    }
                  }}
                  placeholder="Enter YouTube video ID (11 characters)"
                  placeholderTextColor="#999"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {errors.youtubeId && <Text style={styles.errorText}>{errors.youtubeId}</Text>}
                <Text style={styles.helpText}>
                  Example: dQw4w9WgXcQ (from https://www.youtube.com/watch?v=dQw4w9WgXcQ)
                </Text>
              </View>
              
              <View style={styles.formSection}>
                <Text style={styles.inputLabel}>Techniques (comma-separated)</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={formData.techniques}
                  onChangeText={(text) => setFormData({...formData, techniques: text})}
                  placeholder="Enter techniques separated by commas"
                  placeholderTextColor="#999"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
                <Text style={styles.helpText}>
                  Example: Basic strikes, Defensive blocks, Escape techniques
                </Text>
              </View>
              
              <TouchableOpacity
                style={[styles.submitButton, styles.addButton]}
                onPress={addNewTopic}
              >
                <SafeIcon name="plus" size={20} color="white" />
                <Text style={styles.submitButtonText}>Add Topic</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  topicsSection: {
    marginTop: 30,
    marginBottom: 20,
    minHeight: 200, // Ensure minimum height for the section
  },
  topicCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    marginBottom: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  cardActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 8,
  },
  topicIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    overflow: 'hidden',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  topicInfo: {
    flex: 1,
  },
  topicTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  topicSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  topicMeta: {
    flexDirection: 'row',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  metaText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  tipsSection: {
    marginBottom: 30,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
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
  tipText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    marginLeft: 16,
    lineHeight: 20,
  },
  resourcesSection: {
    marginBottom: 30,
  },
  resourceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  resourceCard: {
    width: '48%',
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  resourceTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginTop: 12,
    marginBottom: 4,
    textAlign: 'center',
  },
  resourceSubtitle: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  disclaimerSection: {
    backgroundColor: '#FFF3E0',
    padding: 20,
    borderRadius: 12,
    marginBottom: 40,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  disclaimerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#E65100',
    marginBottom: 8,
  },
  disclaimerText: {
    fontSize: 14,
    color: '#BF360C',
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 50,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  infoModalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    width: '90%',
    height: '90%',
    maxHeight: '90%',
  },
  formModalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    width: '95%',
    height: '90%',
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    flex: 1,
    paddingVertical: 10,
    minHeight: 200,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  videoThumbnailContainer: {
    position: 'relative',
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  modalThumbnail: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
  playOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoMetaInfo: {
    flexDirection: 'row',
    marginBottom: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E0E0E0',
  },
  formSection: {
    marginBottom: 16,
  },
  helpText: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
    fontStyle: 'italic',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 20,
    marginBottom: 10,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  addButton: {
    backgroundColor: '#4CAF50',
  },
  modalActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 12,
  },
  modalActionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  playActionButton: {
    backgroundColor: '#4CAF50',
  },
  youtubeActionButton: {
    backgroundColor: '#F44336',
  },
  debugSection: {
    backgroundColor: '#F0F0F0',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  debugTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  debugText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  modalDescription: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
    marginBottom: 20,
  },
  techniquesSection: {
    marginBottom: 20,
  },
  techniquesTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  techniqueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  techniqueText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
    flex: 1,
  },
  noTechniquesText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    marginTop: 8,
  },
  modalActions: {
    marginTop: 20,
  },
  adminButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  adminButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    backgroundColor: '#FAFAFA',
    color: '#333',
    minHeight: 48,
  },
  errorInput: {
    borderColor: '#F44336',
  },
  errorText: {
    color: '#F44336',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
    paddingTop: 14,
  },
  addTopicButton: {
    backgroundColor: '#FF9800',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  addTopicButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 80,
    justifyContent: 'center',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  playButton: {
    backgroundColor: '#4CAF50',
  },
  infoButton: {
    backgroundColor: '#2196F3',
  },
  externalButton: {
    backgroundColor: '#FF9800',
  },
  editButton: {
    backgroundColor: '#9C27B0',
  },
  deleteButton: {
    backgroundColor: '#F44336',
  },
  videoPlayerContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  videoPlayerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FF9800',
  },
  videoPlayerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  videoCloseButton: {
    padding: 4,
  },
  videoContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoPlayerActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FF9800',
  },
  videoControlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
    marginRight: 10,
  },
  videoErrorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  videoErrorText: {
    color: 'white',
    fontSize: 16,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  videoErrorSubtext: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    marginBottom: 20,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  videoActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
  },
  videoActionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  skeletonTitle: {
    height: 16,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    marginBottom: 8,
    width: '80%',
  },
  skeletonSubtitle: {
    height: 12,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    marginBottom: 8,
    width: '60%',
  },
  skeletonMeta: {
    height: 10,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    width: '40%',
  },
  skeletonButton: {
    backgroundColor: '#E0E0E0',
    height: 32,
    width: 80,
  },
});

export default SelfDefenseScreen;