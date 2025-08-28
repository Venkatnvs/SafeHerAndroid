import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  StatusBar,
  Animated,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';

const { width, height } = Dimensions.get('window');

const OnboardingScreen = () => {
  const navigation = useNavigation();
  const [currentPage, setCurrentPage] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const onboardingData = [
    {
      id: 1,
      title: 'Welcome to SafeHer',
      subtitle: 'Your Personal Safety Guardian',
      description: 'SafeHer is designed to keep you safe with instant emergency alerts, real-time location tracking, and quick access to help when you need it most.',
      icon: 'shield-heart',
      color: ['#E91E63', '#C2185B'],
    },
    {
      id: 2,
      title: 'One-Tap SOS',
      subtitle: 'Instant Emergency Response',
      description: 'With just one tap, trigger an SOS alert that immediately notifies your guardians, emergency contacts, and dials emergency services.',
      icon: 'alert-circle',
      color: ['#FF5722', '#E64A19'],
    },
    {
      id: 3,
      title: 'Smart Location Tracking',
      subtitle: 'Always Know Where Help Is',
      description: 'Real-time GPS tracking shows your guardians exactly where you are, while highlighting nearby safe zones like police stations and hospitals.',
      icon: 'crosshairs-gps',
      color: ['#2196F3', '#1976D2'],
    },
    {
      id: 4,
      title: 'Guardian Network',
      subtitle: 'Your Trusted Safety Circle',
      description: 'Build a network of trusted guardians who receive instant alerts and can respond immediately when you need help.',
      icon: 'account-group',
      color: ['#4CAF50', '#388E3C'],
    },
    {
      id: 5,
      title: 'Self-Defense Resources',
      subtitle: 'Knowledge is Power',
      description: 'Access comprehensive self-defense training, safety tips, and emergency preparedness resources to stay empowered and confident.',
      icon: 'karate',
      color: ['#FF9800', '#F57C00'],
    },
  ];

  const handleNext = () => {
    if (currentPage < onboardingData.length - 1) {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      scrollViewRef.current?.scrollTo({
        x: nextPage * width,
        animated: true,
      });
    } else {
      navigation.navigate('Login' as never);
    }
  };

  const handleSkip = () => {
    navigation.navigate('Login' as never);
  };

  const handleScroll = (event: any) => {
    const contentOffset = event.nativeEvent.contentOffset.x;
    const page = Math.round(contentOffset / width);
    if (page !== currentPage) {
      setCurrentPage(page);
    }
  };

  const renderPage = (item: any, index: number) => (
    <View key={item.id} style={styles.page}>
      <LinearGradient
        colors={item.color}
        style={styles.iconContainer}
      >
        <Icon name={item.icon} size={80} color="white" />
      </LinearGradient>
      
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.subtitle}>{item.subtitle}</Text>
      <Text style={styles.description}>{item.description}</Text>
    </View>
  );

  const renderDots = () => (
    <View style={styles.dotsContainer}>
      {onboardingData.map((_, index) => (
        <View
          key={index}
          style={[
            styles.dot,
            index === currentPage && styles.activeDot,
          ]}
        />
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#E91E63" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        style={styles.scrollView}
      >
        {onboardingData.map((item, index) => renderPage(item, index))}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        {renderDots()}
        
        <TouchableOpacity
          style={styles.nextButton}
          onPress={handleNext}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#E91E63', '#C2185B']}
            style={styles.nextButtonGradient}
          >
            <Text style={styles.nextButtonText}>
              {currentPage === onboardingData.length - 1 ? 'Get Started' : 'Next'}
            </Text>
            <Icon 
              name={currentPage === onboardingData.length - 1 ? "check" : "arrow-right"} 
              size={24} 
              color="white" 
              style={styles.nextButtonIcon}
            />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Background Pattern */}
      <View style={styles.backgroundPattern}>
        <View style={styles.patternCircle1} />
        <View style={styles.patternCircle2} />
        <View style={styles.patternCircle3} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingTop: 50,
    paddingHorizontal: 20,
    alignItems: 'flex-end',
  },
  skipButton: {
    padding: 12,
  },
  skipText: {
    fontSize: 16,
    color: '#E91E63',
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  page: {
    width,
    height: height * 0.7,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  iconContainer: {
    width: 160,
    height: 160,
    borderRadius: 80,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 36,
  },
  subtitle: {
    fontSize: 18,
    color: '#E91E63',
    textAlign: 'center',
    marginBottom: 20,
    fontWeight: '600',
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  footer: {
    paddingHorizontal: 40,
    paddingBottom: 40,
    alignItems: 'center',
  },
  dotsContainer: {
    flexDirection: 'row',
    marginBottom: 30,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: '#E91E63',
    width: 24,
  },
  nextButton: {
    width: '100%',
    height: 56,
    borderRadius: 28,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  nextButtonGradient: {
    flex: 1,
    borderRadius: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  nextButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginRight: 8,
  },
  nextButtonIcon: {
    marginLeft: 8,
  },
  backgroundPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: -1,
  },
  patternCircle1: {
    position: 'absolute',
    top: height * 0.1,
    right: -50,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(233, 30, 99, 0.1)',
  },
  patternCircle2: {
    position: 'absolute',
    top: height * 0.4,
    left: -30,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
  },
  patternCircle3: {
    position: 'absolute',
    bottom: height * 0.2,
    right: -40,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
  },
});

export default OnboardingScreen;
