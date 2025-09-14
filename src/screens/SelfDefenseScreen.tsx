import React, { useState } from 'react';
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
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface SelfDefenseTopic {
  id: number;
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  duration: string;
  level: string;
  youtubeId: string;
  description: string;
  techniques: string[];
}

const SelfDefenseScreen = () => {
  const [selectedVideo, setSelectedVideo] = useState<SelfDefenseTopic | null>(null);

  const selfDefenseTopics = [
    {
      id: 1,
      title: 'Basic Self-Defense Techniques',
      subtitle: 'Learn fundamental moves to protect yourself',
      icon: 'karate',
      color: '#FF9800',
      duration: '15 min',
      level: 'Beginner',
      youtubeId: 'dQw4w9WgXcQ', // Replace with actual self-defense video ID
      description: 'Master the essential self-defense moves that can save your life. Learn proper stance, basic strikes, and defensive positioning.',
      techniques: ['Proper stance and balance', 'Basic palm strikes', 'Elbow strikes', 'Knee strikes', 'Defensive positioning']
    },
    {
      id: 2,
      title: 'Situational Awareness',
      subtitle: 'How to stay alert and avoid dangerous situations',
      icon: 'eye',
      color: '#2196F3',
      duration: '10 min',
      level: 'Beginner',
      youtubeId: 'dQw4w9WgXcQ', // Replace with actual video ID
      description: 'Develop your awareness skills to prevent dangerous situations before they happen.',
      techniques: ['Environmental scanning', 'Body language reading', 'Trusting your instincts', 'Escape route planning', 'Avoiding distractions']
    },
    {
      id: 3,
      title: 'Escape Techniques',
      subtitle: 'Methods to break free from holds and grabs',
      icon: 'run',
      color: '#4CAF50',
      duration: '20 min',
      level: 'Intermediate',
      youtubeId: 'dQw4w9WgXcQ', // Replace with actual video ID
      description: 'Learn effective techniques to escape from various holds and grabs.',
      techniques: ['Wrist grab escapes', 'Choke hold escapes', 'Hair grab defense', 'Bear hug escapes', 'Ground escape techniques']
    },
    {
      id: 4,
      title: 'Verbal Self-Defense',
      subtitle: 'Using your voice to de-escalate situations',
      icon: 'microphone',
      color: '#9C27B0',
      duration: '12 min',
      level: 'Beginner',
      youtubeId: 'dQw4w9WgXcQ', // Replace with actual video ID
      description: 'Master the art of verbal self-defense to de-escalate potentially dangerous situations.',
      techniques: ['Assertive communication', 'Boundary setting', 'De-escalation tactics', 'Confident body language', 'Emergency phrases']
    },
    {
      id: 5,
      title: 'Weapon Defense',
      subtitle: 'Protecting yourself against armed attackers',
      icon: 'shield',
      color: '#F44336',
      duration: '25 min',
      level: 'Advanced',
      youtubeId: 'dQw4w9WgXcQ', // Replace with actual video ID
      description: 'Advanced techniques for defending against armed attackers (knife, gun, blunt objects).',
      techniques: ['Knife defense basics', 'Gun disarm techniques', 'Improvised weapons', 'Distance management', 'Escape strategies']
    },
    {
      id: 6,
      title: 'Ground Defense',
      subtitle: 'Fighting techniques when on the ground',
      icon: 'human-handsup',
      color: '#607D8B',
      duration: '18 min',
      level: 'Intermediate',
      youtubeId: 'dQw4w9WgXcQ', // Replace with actual video ID
      description: 'Essential ground fighting techniques for self-defense situations.',
      techniques: ['Guard position', 'Hip escape', 'Sweep techniques', 'Ground striking', 'Getting back to feet']
    },
  ];

  const safetyTips = [
    'Always trust your instincts - if something feels wrong, it probably is',
    'Stay in well-lit areas when walking at night',
    'Keep your phone charged and easily accessible',
    'Share your location with trusted friends when traveling',
    'Learn basic self-defense moves and practice them regularly',
    'Be aware of your surroundings and avoid distractions',
    'Have a plan for emergency situations',
    'Know the emergency numbers for your area',
  ];

  const openYouTubeVideo = (youtubeId: string) => {
    const youtubeUrl = `https://www.youtube.com/watch?v=${youtubeId}`;
    Linking.openURL(youtubeUrl).catch(err => {
      Alert.alert('Error', 'Could not open YouTube video. Please try again.');
    });
  };

  const openVideoDetails = (topic: any) => {
    setSelectedVideo(topic);
  };

  const SelfDefenseCard = ({ topic }: any) => (
    <TouchableOpacity 
      style={styles.topicCard}
      onPress={() => openVideoDetails(topic)}
    >
      <View style={[styles.topicIcon, { backgroundColor: topic.color }]}>
        <Icon name={topic.icon} size={32} color="white" />
      </View>
      <View style={styles.topicInfo}>
        <Text style={styles.topicTitle}>{topic.title}</Text>
        <Text style={styles.topicSubtitle}>{topic.subtitle}</Text>
        <View style={styles.topicMeta}>
          <View style={styles.metaItem}>
            <Icon name="clock" size={16} color="#666" />
            <Text style={styles.metaText}>{topic.duration}</Text>
          </View>
          <View style={styles.metaItem}>
            <Icon name="star" size={16} color="#666" />
            <Text style={styles.metaText}>{topic.level}</Text>
          </View>
        </View>
      </View>
      <View style={styles.topicActions}>
        <TouchableOpacity 
          style={styles.playButton}
          onPress={() => openYouTubeVideo(topic.youtubeId)}
        >
          <Icon name="play-circle" size={32} color={topic.color} />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.infoButton}
          onPress={() => openVideoDetails(topic)}
        >
          <Icon name="information" size={20} color="#666" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#FF9800" />
      
      {/* Header */}
      <LinearGradient
        colors={['#FF9800', '#F57C00']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <Icon name="karate" size={80} color="white" />
          <Text style={styles.headerTitle}>Self Defense</Text>
          <Text style={styles.headerSubtitle}>Knowledge is your best weapon</Text>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Quick Start */}
        <View style={styles.quickStartSection}>
          <Text style={styles.sectionTitle}>Quick Start</Text>
          <TouchableOpacity style={styles.quickStartButton}>
            <LinearGradient
              colors={['#FF9800', '#F57C00']}
              style={styles.quickStartGradient}
            >
              <Icon name="play" size={32} color="white" />
              <Text style={styles.quickStartText}>Start Training</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Training Topics */}
        <View style={styles.topicsSection}>
          <Text style={styles.sectionTitle}>Training Topics</Text>
          
          {selfDefenseTopics.map((topic) => (
            <SelfDefenseCard key={topic.id} topic={topic} />
          ))}
        </View>

        {/* Safety Tips */}
        <View style={styles.tipsSection}>
          <Text style={styles.sectionTitle}>Safety Tips</Text>
          
          {safetyTips.map((tip, index) => (
            <View key={index} style={styles.tipCard}>
              <Icon name="lightbulb" size={24} color="#FF9800" />
              <Text style={styles.tipText}>{tip}</Text>
            </View>
          ))}
        </View>

        {/* Emergency Resources */}
        <View style={styles.resourcesSection}>
          <Text style={styles.sectionTitle}>Emergency Resources</Text>
          
          <View style={styles.resourceGrid}>
            <TouchableOpacity style={styles.resourceCard}>
              <Icon name="phone" size={32} color="#F44336" />
              <Text style={styles.resourceTitle}>Emergency Call</Text>
              <Text style={styles.resourceSubtitle}>Call 112 immediately</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.resourceCard}>
              <Icon name="map-marker" size={32} color="#2196F3" />
              <Text style={styles.resourceTitle}>Find Safe Zones</Text>
              <Text style={styles.resourceSubtitle}>Locate nearby help</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.resourceCard}>
              <Icon name="bell" size={32} color="#FF9800" />
              <Text style={styles.resourceTitle}>SOS Alert</Text>
              <Text style={styles.resourceSubtitle}>Send emergency alert</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.resourceCard}>
              <Icon name="account-group" size={32} color="#4CAF50" />
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

      {/* Video Details Modal */}
      <Modal
        visible={selectedVideo !== null}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedVideo(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedVideo && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>{selectedVideo.title}</Text>
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => setSelectedVideo(null)}
                  >
                    <Icon name="close" size={24} color="#666" />
                  </TouchableOpacity>
                </View>

                <View style={styles.modalBody}>
                  <Text style={styles.modalDescription}>{selectedVideo.description}</Text>
                  
                  <View style={styles.techniquesSection}>
                    <Text style={styles.techniquesTitle}>Techniques Covered:</Text>
                    {selectedVideo.techniques.map((technique: string, index: number) => (
                      <View key={index} style={styles.techniqueItem}>
                        <Icon name="check-circle" size={16} color="#4CAF50" />
                        <Text style={styles.techniqueText}>{technique}</Text>
                      </View>
                    ))}
                  </View>

                  <View style={styles.modalActions}>
                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: selectedVideo.color }]}
                      onPress={() => {
                        openYouTubeVideo(selectedVideo.youtubeId);
                        setSelectedVideo(null);
                      }}
                    >
                      <Icon name="play" size={20} color="white" />
                      <Text style={styles.actionButtonText}>Watch on YouTube</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            )}
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
  },
  quickStartSection: {
    marginTop: 30,
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  quickStartButton: {
    height: 80,
    borderRadius: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  quickStartGradient: {
    flex: 1,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  quickStartText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginLeft: 16,
  },
  topicsSection: {
    marginBottom: 30,
  },
  topicCard: {
    flexDirection: 'row',
    alignItems: 'center',
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
  topicIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
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
  topicActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  playButton: {
    padding: 4,
    marginRight: 8,
  },
  infoButton: {
    padding: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
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
  modalActions: {
    marginTop: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default SelfDefenseScreen;
