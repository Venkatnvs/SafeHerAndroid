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

const GuardianDashboardScreen = () => {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#4CAF50" />
      
      {/* Header */}
      <LinearGradient
        colors={['#4CAF50', '#388E3C']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <Icon name="shield-account" size={80} color="white" />
          <Text style={styles.headerTitle}>Guardian Dashboard</Text>
          <Text style={styles.headerSubtitle}>Monitor and protect your loved ones</Text>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Status Overview */}
        <View style={styles.statusSection}>
          <Text style={styles.sectionTitle}>Status Overview</Text>
          
          <View style={styles.statusGrid}>
            <View style={styles.statusCard}>
              <Icon name="account-check" size={32} color="#4CAF50" />
              <Text style={styles.statusNumber}>3</Text>
              <Text style={styles.statusLabel}>Protected Users</Text>
            </View>
            
            <View style={styles.statusCard}>
              <Icon name="crosshairs-gps" size={32} color="#2196F3" />
              <Text style={styles.statusNumber}>2</Text>
              <Text style={styles.statusLabel}>Active Tracking</Text>
            </View>
            
            <View style={styles.statusCard}>
              <Icon name="alert" size={32} color="#FF9800" />
              <Text style={styles.statusNumber}>0</Text>
              <Text style={styles.statusLabel}>Active Alerts</Text>
            </View>
          </View>
        </View>

        {/* Protected Users */}
        <View style={styles.usersSection}>
          <Text style={styles.sectionTitle}>Protected Users</Text>
          
          <View style={styles.userCard}>
            <View style={styles.userAvatar}>
              <Icon name="account" size={32} color="white" />
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>Sarah Johnson</Text>
              <Text style={styles.userStatus}>📍 Last seen 2 min ago</Text>
              <Text style={styles.userLocation}>Downtown Mall, City Center</Text>
            </View>
            <TouchableOpacity style={styles.callButton}>
              <Icon name="phone" size={24} color="#4CAF50" />
            </TouchableOpacity>
          </View>

          <View style={styles.userCard}>
            <View style={styles.userAvatar}>
              <Icon name="account" size={32} color="white" />
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>Emma Davis</Text>
              <Text style={styles.userStatus}>📍 Last seen 15 min ago</Text>
              <Text style={styles.userLocation}>University Campus</Text>
            </View>
            <TouchableOpacity style={styles.callButton}>
              <Icon name="phone" size={24} color="#4CAF50" />
            </TouchableOpacity>
          </View>

          <View style={styles.userCard}>
            <View style={styles.userAvatar}>
              <Icon name="account" size={32} color="white" />
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>Lisa Chen</Text>
              <Text style={styles.userStatus}>📍 Last seen 1 hour ago</Text>
              <Text style={styles.userLocation}>Home - Safe Zone</Text>
            </View>
            <TouchableOpacity style={styles.callButton}>
              <Icon name="phone" size={24} color="#4CAF50" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsSection}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          
          <View style={styles.actionGrid}>
            <TouchableOpacity style={styles.actionCard}>
              <Icon name="map" size={32} color="#2196F3" />
              <Text style={styles.actionTitle}>View Map</Text>
              <Text style={styles.actionSubtitle}>See all users on map</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionCard}>
              <Icon name="history" size={32} color="#FF9800" />
              <Text style={styles.actionTitle}>History</Text>
              <Text style={styles.actionSubtitle}>View movement history</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionCard}>
              <Icon name="bell" size={32} color="#9C27B0" />
              <Text style={styles.actionTitle}>Alerts</Text>
              <Text style={styles.actionSubtitle}>Emergency notifications</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionCard}>
              <Icon name="settings" size={32} color="#607D8B" />
              <Text style={styles.actionTitle}>Settings</Text>
              <Text style={styles.actionSubtitle}>Configure preferences</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Emergency Contacts */}
        <View style={styles.contactsSection}>
          <Text style={styles.sectionTitle}>Emergency Contacts</Text>
          
          <View style={styles.contactCard}>
            <Icon name="phone" size={24} color="#F44336" />
            <Text style={styles.contactInfo}>Emergency Services: 112</Text>
            <TouchableOpacity style={styles.contactButton}>
              <Text style={styles.contactButtonText}>Call</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.contactCard}>
            <Icon name="police-badge" size={24} color="#2196F3" />
            <Text style={styles.contactInfo}>Local Police: 15</Text>
            <TouchableOpacity style={styles.contactButton}>
              <Text style={styles.contactButtonText}>Call</Text>
            </TouchableOpacity>
          </View>
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
  statusSection: {
    marginTop: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  statusGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statusCard: {
    flex: 1,
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  statusNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
    marginBottom: 4,
  },
  statusLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  usersSection: {
    marginTop: 30,
  },
  userCard: {
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
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  userStatus: {
    fontSize: 14,
    color: '#4CAF50',
    marginBottom: 2,
  },
  userLocation: {
    fontSize: 12,
    color: '#666',
  },
  callButton: {
    padding: 8,
  },
  actionsSection: {
    marginTop: 30,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionCard: {
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
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 12,
    marginBottom: 4,
    textAlign: 'center',
  },
  actionSubtitle: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  contactsSection: {
    marginTop: 30,
    marginBottom: 40,
  },
  contactCard: {
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
  contactInfo: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    marginLeft: 16,
  },
  contactButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  contactButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default GuardianDashboardScreen;
