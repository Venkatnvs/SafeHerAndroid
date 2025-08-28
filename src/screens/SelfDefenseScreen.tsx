import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const SelfDefenseScreen = () => {
  const selfDefenseTopics = [
    {
      id: 1,
      title: 'Basic Self-Defense Techniques',
      subtitle: 'Learn fundamental moves to protect yourself',
      icon: 'karate',
      color: '#FF9800',
      duration: '15 min',
      level: 'Beginner',
    },
    {
      id: 2,
      title: 'Situational Awareness',
      subtitle: 'How to stay alert and avoid dangerous situations',
      icon: 'eye',
      color: '#2196F3',
      duration: '10 min',
      level: 'Beginner',
    },
    {
      id: 3,
      title: 'Escape Techniques',
      subtitle: 'Methods to break free from holds and grabs',
      icon: 'run',
      color: '#4CAF50',
      duration: '20 min',
      level: 'Intermediate',
    },
    {
      id: 4,
      title: 'Verbal Self-Defense',
      subtitle: 'Using your voice to de-escalate situations',
      icon: 'microphone',
      color: '#9C27B0',
      duration: '12 min',
      level: 'Beginner',
    },
    {
      id: 5,
      title: 'Weapon Defense',
      subtitle: 'Protecting yourself against armed attackers',
      icon: 'shield',
      color: '#F44336',
      duration: '25 min',
      level: 'Advanced',
    },
    {
      id: 6,
      title: 'Ground Defense',
      subtitle: 'Fighting techniques when on the ground',
      icon: 'human-handsup',
      color: '#607D8B',
      duration: '18 min',
      level: 'Intermediate',
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

  const SelfDefenseCard = ({ topic }: any) => (
    <TouchableOpacity style={styles.topicCard}>
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
      <Icon name="play-circle" size={32} color={topic.color} />
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    paddingTop: 60,
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
});

export default SelfDefenseScreen;
