import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  StatusBar,
  Modal,
  Switch,
  FlatList,
  TextInput,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSettings } from '../context/SettingsContext';
import { SOSContact } from '../config/sosConfig';
import { useNavigation } from '@react-navigation/native';

// Move ContactSelectionModal outside to prevent recreation
const ContactSelectionModal = React.memo(({ 
  visible, 
  onClose, 
  title, 
  showCheckbox = false,
  onContactSelect,
  availableContacts,
  sosSettings,
  isLoadingContacts,
  searchQuery,
  setSearchQuery,
  handleLoadContacts
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  showCheckbox?: boolean;
  onContactSelect: (contact: SOSContact) => void;
  availableContacts: SOSContact[];
  sosSettings: any;
  isLoadingContacts: boolean;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  handleLoadContacts: () => void;
}) => {
  const ContactItem = ({ 
    contact, 
    isSelected, 
    onPress, 
    showCheckbox = false 
  }: {
    contact: SOSContact;
    isSelected: boolean;
    onPress: () => void;
    showCheckbox?: boolean;
  }) => {
    // Check if this is an emergency number that won't receive SMS
    const emergencyNumbers = ['100', '101', '102', '103', '108', '1091', '1098', '182', '112'];
    const cleanPhone = String(contact.phone).replace(/[^\d+]/g, '');
    const isEmergencyNumber = emergencyNumbers.some(emergencyNum => 
      cleanPhone.includes(emergencyNum) || cleanPhone.endsWith(emergencyNum)
    );
    
    return (
      <TouchableOpacity style={styles.contactItem} onPress={onPress}>
        <View style={styles.contactInfo}>
          <View style={[styles.contactIcon, { backgroundColor: contact.isEmergency ? '#E91E63' : '#673AB7' }]}>
            <Icon 
              name={contact.isEmergency ? 'phone-alert' : 'account'} 
              size={20} 
              color="white" 
            />
          </View>
          <View style={styles.contactDetails}>
            <Text style={styles.contactName}>{contact.name}</Text>
            <Text style={styles.contactPhone}>{contact.phone}</Text>
            {contact.isEmergency && (
              <Text style={styles.emergencyLabel}>Emergency Service</Text>
            )}
            {showCheckbox && isEmergencyNumber && (
              <Text style={styles.smsNoteLabel}>Will not receive SMS</Text>
            )}
          </View>
        </View>
        {showCheckbox ? (
          <Switch
            value={isSelected}
            onValueChange={onPress}
            trackColor={{ false: '#E0E0E0', true: '#673AB7' }}
            thumbColor={isSelected ? '#FFFFFF' : '#F4F3F4'}
          />
        ) : (
          <Icon 
            name={isSelected ? "check-circle" : "circle-outline"} 
            size={24} 
            color={isSelected ? "#673AB7" : "#999"} 
          />
        )}
      </TouchableOpacity>
    );
  };

  // Filter contacts based on search query
  const filteredContacts = useMemo(() => {
    if (searchQuery.trim() === '') {
      return availableContacts;
    } else {
      return availableContacts.filter(contact =>
        contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.phone.includes(searchQuery)
      );
    }
  }, [searchQuery, availableContacts]);

  return (
    <Modal 
      visible={visible} 
      animationType="slide" 
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity 
              onPress={onClose}
              style={styles.closeButton}
            >
              <Icon name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          
          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <Icon name="magnify" size={20} color="#666" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search contacts..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#999"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity 
                onPress={() => setSearchQuery('')}
                style={styles.clearSearchButton}
              >
                <Icon name="close-circle" size={20} color="#666" />
              </TouchableOpacity>
            )}
          </View>
          
          {/* Load Contacts Button in Modal */}
          {!sosSettings.contactsLoaded && (
            <TouchableOpacity 
              style={[styles.modalLoadButton, isLoadingContacts && styles.loadingButton]}
              onPress={handleLoadContacts}
              disabled={isLoadingContacts}
            >
              <Icon 
                name={isLoadingContacts ? "loading" : "account-plus"} 
                size={20} 
                color="white" 
              />
              <Text style={styles.modalLoadButtonText}>
                {isLoadingContacts ? 'Loading...' : 'Load Device Contacts'}
              </Text>
            </TouchableOpacity>
          )}
          
          <FlatList
            data={filteredContacts}
            keyExtractor={(item) => item.phone}
            renderItem={({ item }) => {
              const isSelected = showCheckbox 
                ? sosSettings.selectedSMSContacts.some((c: SOSContact) => c.phone === item.phone)
                : sosSettings.selectedCallContact?.phone === item.phone;
              
              return (
                <ContactItem
                  contact={item}
                  isSelected={isSelected}
                  onPress={() => onContactSelect(item)}
                  showCheckbox={showCheckbox}
                />
              );
            }}
            style={styles.contactList}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={() => (
              <View style={styles.emptyState}>
                {isLoadingContacts ? (
                  <>
                    <Icon name="loading" size={48} color="#673AB7" />
                    <Text style={styles.emptyStateText}>Loading contacts...</Text>
                  </>
                ) : (
                  <>
                    <Icon name="account-search" size={48} color="#999" />
                    <Text style={styles.emptyStateText}>
                      {searchQuery.trim() ? 'No contacts found' : 'No contacts available'}
                    </Text>
                    {searchQuery.trim() && (
                      <Text style={styles.emptyStateSubtext}>
                        Try searching with a different term
                      </Text>
                    )}
                  </>
                )}
              </View>
            )}
          />
          
          {showCheckbox && (
            <TouchableOpacity 
              style={styles.doneButton}
              onPress={onClose}
            >
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
});

ContactSelectionModal.displayName = 'ContactSelectionModal';

const SOSSettingsScreen = () => {
  const { sosSettings, updateSOSSettings, loadDeviceContacts } = useSettings();
  const navigation = useNavigation();
  const [showCallContactModal, setShowCallContactModal] = useState(false);
  const [showSMSContactModal, setShowSMSContactModal] = useState(false);
  const [availableContacts, setAvailableContacts] = useState<SOSContact[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);

  useEffect(() => {
    // Only load contacts if not already loaded
    if (!sosSettings.contactsLoaded) {
      console.log('Initial load of device contacts...');
      loadDeviceContacts();
    } else {
      console.log('Device contacts already loaded, skipping...');
      console.log('Current device contacts count:', sosSettings.deviceContacts.length);
    }
  }, [sosSettings.contactsLoaded, loadDeviceContacts]);

  useEffect(() => {
    // Combine helplines and device contacts for selection
    const combinedContacts = [
      ...sosSettings.availableHelplines,
      ...sosSettings.deviceContacts,
    ];
    console.log('Updating available contacts:', {
      helplines: sosSettings.availableHelplines.length,
      deviceContacts: sosSettings.deviceContacts.length,
      total: combinedContacts.length
    });
    setAvailableContacts(combinedContacts);
  }, [sosSettings.availableHelplines, sosSettings.deviceContacts]);

  // Debounce search query to prevent flickering
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300); // 300ms delay

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Use useMemo for filtering contacts to prevent unnecessary re-renders
  const filteredContacts = useMemo(() => {
    if (debouncedSearchQuery.trim() === '') {
      return availableContacts;
    } else {
      return availableContacts.filter(contact =>
        contact.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        contact.phone.includes(debouncedSearchQuery)
      );
    }
  }, [debouncedSearchQuery, availableContacts]);

  const handleLoadContacts = async () => {
    try {
      setIsLoadingContacts(true);
      console.log('Manual reload of device contacts...');
      
      // Reset the contacts loaded flag to force reload
      updateSOSSettings({ contactsLoaded: false });
      
      // Wait a bit for the state to update
      await new Promise((resolve: any) => setTimeout(resolve, 100));
      
      // Load contacts
        await loadDeviceContacts();
      
      console.log('Contact loading completed');
    } catch (error) {
      console.error('Error loading contacts:', error);
      Alert.alert('Error', 'Failed to load device contacts. Please try again.');
    } finally {
      setIsLoadingContacts(false);
    }
  };

  const handleCallContactSelect = useCallback((contact: SOSContact) => {
    console.log('Call contact selected:', contact.name);
    // Max 1 contact for calls
    updateSOSSettings({ selectedCallContact: contact });
    // Close modal after a small delay to ensure state update
    setTimeout(() => {
      setShowCallContactModal(false);
    }, 100);
  }, [updateSOSSettings]);

  const handleSMSContactToggle = useCallback((contact: SOSContact) => {
    console.log('SMS contact toggled:', contact.name);
    const isSelected = sosSettings.selectedSMSContacts.some(
      c => c.phone === contact.phone
    );
    
    if (isSelected) {
      // Remove contact
      const updatedContacts = sosSettings.selectedSMSContacts.filter(
        c => c.phone !== contact.phone
      );
      updateSOSSettings({ selectedSMSContacts: updatedContacts });
    } else {
      // Add contact
      const updatedContacts = [...sosSettings.selectedSMSContacts, contact];
      updateSOSSettings({ selectedSMSContacts: updatedContacts });
    }
    // Don't close modal for SMS contacts as user might want to select multiple
  }, [sosSettings.selectedSMSContacts, updateSOSSettings]);

  const handleModalClose = useCallback(() => {
    setSearchQuery('');
    setDebouncedSearchQuery('');
  }, []);

  const handleCallModalClose = useCallback(() => {
    handleModalClose();
    setShowCallContactModal(false);
  }, [handleModalClose]);

  const handleSMSModalClose = useCallback(() => {
    handleModalClose();
    setShowSMSContactModal(false);
  }, [handleModalClose]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#E91E63" />

      <ScrollView style={styles.content}>
        {/* Call Contact Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Emergency Call Contact</Text>
          <Text style={styles.sectionSubtitle}>
            Select ONE contact for emergency calls (max 1)
          </Text>
          
          <TouchableOpacity 
            style={styles.contactSelector}
            onPress={() => setShowCallContactModal(true)}
          >
            <View style={styles.contactInfo}>
              <View style={[styles.contactIcon, { backgroundColor: '#E91E63' }]}>
                <Icon name="phone-alert" size={20} color="white" />
              </View>
              <View style={styles.contactDetails}>
                <Text style={styles.contactName}>
                  {sosSettings.selectedCallContact?.name || 'Select Contact'}
                </Text>
                <Text style={styles.contactPhone}>
                  {sosSettings.selectedCallContact?.phone || 'Tap to choose'}
                </Text>
              </View>
            </View>
            <Icon name="chevron-right" size={24} color="#666" />
          </TouchableOpacity>
        </View>

        {/* SMS Contacts Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Emergency SMS Contacts</Text>
          <Text style={styles.sectionSubtitle}>
            Select multiple personal contacts for emergency SMS (emergency numbers like 100, 102 will not receive SMS)
          </Text>
          
          <TouchableOpacity 
            style={styles.contactSelector}
            onPress={() => setShowSMSContactModal(true)}
          >
            <View style={styles.contactInfo}>
              <View style={[styles.contactIcon, { backgroundColor: '#673AB7' }]}>
                <Icon name="message-text" size={20} color="white" />
              </View>
              <View style={styles.contactDetails}>
                <Text style={styles.contactName}>
                  {sosSettings.selectedSMSContacts.length} Contact(s) Selected
                </Text>
                <Text style={styles.contactPhone}>
                  {sosSettings.selectedSMSContacts.length > 0 
                    ? sosSettings.selectedSMSContacts.map(c => c.name).join(', ')
                    : 'Tap to choose contacts'
                  }
                </Text>
              </View>
            </View>
            <Icon name="chevron-right" size={24} color="#666" />
          </TouchableOpacity>

          {/* Show selected SMS contacts */}
          {sosSettings.selectedSMSContacts.length > 0 && (
            <View style={styles.selectedContacts}>
              {sosSettings.selectedSMSContacts.map((contact, index) => (
                <View key={contact.phone} style={styles.selectedContactItem}>
                  <View style={styles.contactInfo}>
                    <View style={[styles.contactIcon, { backgroundColor: contact.isEmergency ? '#E91E63' : '#673AB7' }]}>
                      <Icon 
                        name={contact.isEmergency ? 'phone-alert' : 'account'} 
                        size={16} 
                        color="white" 
                      />
                    </View>
                    <View style={styles.contactDetails}>
                      <Text style={styles.selectedContactName}>{contact.name}</Text>
                      <Text style={styles.selectedContactPhone}>{contact.phone}</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleSMSContactToggle(contact)}
                    style={styles.removeButton}
                  >
                    <Icon name="close-circle" size={20} color="#E91E63" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Available Helplines */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Available Helplines</Text>
          <Text style={styles.sectionSubtitle}>
            Emergency services you can select from
          </Text>
          
          {sosSettings.availableHelplines.map((helpline) => (
            <View key={helpline.phone} style={styles.helplineItem}>
              <View style={styles.contactInfo}>
                <View style={[styles.contactIcon, { backgroundColor: '#E91E63' }]}>
                  <Icon name="phone-alert" size={20} color="white" />
                </View>
                <View style={styles.contactDetails}>
                  <Text style={styles.contactName}>{helpline.name}</Text>
                  <Text style={styles.contactPhone}>{helpline.phone}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Device Contacts Management */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Device Contacts</Text>
          <Text style={styles.sectionSubtitle}>
            Load contacts from your device to use as emergency contacts
          </Text>
          
          <TouchableOpacity 
            style={[styles.loadContactsButton, isLoadingContacts && styles.loadingButton]}
            onPress={handleLoadContacts}
            disabled={isLoadingContacts}
          >
            <Icon 
              name={isLoadingContacts ? "loading" : "account-plus"} 
              size={20} 
              color="white" 
            />
            <Text style={styles.loadContactsButtonText}>
              {isLoadingContacts 
                ? 'Loading Contacts...' 
                : sosSettings.contactsLoaded 
                  ? 'Reload Device Contacts' 
                  : 'Load Device Contacts'
              }
            </Text>
          </TouchableOpacity>
          
          {sosSettings.deviceContacts.length > 0 && (
            <Text style={styles.contactsCount}>
              {sosSettings.deviceContacts.length} contacts loaded
            </Text>
          )}
          
          {/* Debug Info */}
          <View style={styles.debugInfo}>
            <Text style={styles.debugText}>
              Debug Info:
            </Text>
            <Text style={styles.debugText}>
              • Contacts Loaded: {sosSettings.contactsLoaded ? 'Yes' : 'No'}
            </Text>
            <Text style={styles.debugText}>
              • Device Contacts: {sosSettings.deviceContacts.length}
            </Text>
            <Text style={styles.debugText}>
              • Available Helplines: {sosSettings.availableHelplines.length}
            </Text>
            <Text style={styles.debugText}>
              • Total Available: {availableContacts.length}
            </Text>
            
            <TouchableOpacity 
              style={styles.debugButton}
              onPress={async () => {
                console.log('🔄 Force reloading contacts...');
                await handleLoadContacts();
              }}
            >
              <Text style={styles.debugButtonText}>Force Reload Contacts</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Modals */}
      <ContactSelectionModal
        visible={showCallContactModal}
        onClose={handleCallModalClose}
        title="Select Call Contact"
        onContactSelect={handleCallContactSelect}
        availableContacts={availableContacts}
        sosSettings={sosSettings}
        isLoadingContacts={isLoadingContacts}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        handleLoadContacts={handleLoadContacts}
      />

      <ContactSelectionModal
        visible={showSMSContactModal}
        onClose={handleSMSModalClose}
        title="Select SMS Contacts"
        showCheckbox={true}
        onContactSelect={handleSMSContactToggle}
        availableContacts={availableContacts}
        sosSettings={sosSettings}
        isLoadingContacts={isLoadingContacts}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        handleLoadContacts={handleLoadContacts}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  contactSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  contactInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  contactIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  contactDetails: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  contactPhone: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  emergencyLabel: {
    fontSize: 12,
    color: '#E91E63',
    fontWeight: '600',
    marginTop: 2,
  },
  smsNoteLabel: {
    fontSize: 11,
    color: '#FF9800',
    fontWeight: '500',
    marginTop: 2,
    fontStyle: 'italic',
  },
  selectedContacts: {
    marginTop: 15,
  },
  selectedContactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 15,
    backgroundColor: '#F8F8F8',
    borderRadius: 8,
    marginBottom: 8,
  },
  selectedContactName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  selectedContactPhone: {
    fontSize: 12,
    color: '#666',
  },
  removeButton: {
    padding: 5,
  },
  helplineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 0,
    width: '100%',
    height: '100%',
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 50,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    backgroundColor: '#F8F9FA',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 5,
  },
  contactList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    marginHorizontal: 20,
    marginBottom: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    paddingVertical: 0,
  },
  clearSearchButton: {
    marginLeft: 10,
    padding: 2,
  },
  modalLoadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#673AB7',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginHorizontal: 20,
    marginBottom: 10,
  },
  modalLoadButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 5,
    textAlign: 'center',
  },
  loadContactsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#673AB7',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 10,
  },
  loadingButton: {
    backgroundColor: '#9C27B0',
    opacity: 0.7,
  },
  loadContactsButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  contactsCount: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 10,
  },
  debugInfo: {
    backgroundColor: '#F5F5F5',
    padding: 15,
    borderRadius: 8,
    marginTop: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  debugText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
    fontFamily: 'monospace',
  },
  debugButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginTop: 10,
    alignSelf: 'flex-start',
  },
  debugButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  doneButton: {
    backgroundColor: '#673AB7',
    paddingVertical: 15,
    paddingHorizontal: 20,
    margin: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  doneButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default SOSSettingsScreen;
