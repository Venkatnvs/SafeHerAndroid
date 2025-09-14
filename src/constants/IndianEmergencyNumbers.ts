// Indian Emergency Helpline Numbers
export const INDIAN_EMERGENCY_NUMBERS = {
  // National Emergency Numbers
  POLICE: '100',
  FIRE: '101', 
  AMBULANCE: '102',
  WOMEN_HELPLINE: '1091',
  CHILD_HELPLINE: '1098',
  SENIOR_CITIZEN: '1090',
  DISASTER_MANAGEMENT: '108',
  NATIONAL_EMERGENCY: '112', // Single emergency number
  
  // State-wise Women Helplines
  WOMEN_HELPLINES: {
    'Andhra Pradesh': '1091',
    'Arunachal Pradesh': '1091', 
    'Assam': '1091',
    'Bihar': '1091',
    'Chhattisgarh': '1091',
    'Goa': '1091',
    'Gujarat': '1091',
    'Haryana': '1091',
    'Himachal Pradesh': '1091',
    'Jharkhand': '1091',
    'Karnataka': '1091',
    'Kerala': '1091',
    'Madhya Pradesh': '1091',
    'Maharashtra': '1091',
    'Manipur': '1091',
    'Meghalaya': '1091',
    'Mizoram': '1091',
    'Nagaland': '1091',
    'Odisha': '1091',
    'Punjab': '1091',
    'Rajasthan': '1091',
    'Sikkim': '1091',
    'Tamil Nadu': '1091',
    'Telangana': '1091',
    'Tripura': '1091',
    'Uttar Pradesh': '1091',
    'Uttarakhand': '1091',
    'West Bengal': '1091',
    'Delhi': '1091',
    'Chandigarh': '1091',
    'Puducherry': '1091',
    'Jammu and Kashmir': '1091',
    'Ladakh': '1091'
  },

  // Additional Emergency Services
  ADDITIONAL_SERVICES: {
    'Railway Helpline': '139',
    'Tourist Helpline': '1363',
    'Anti Corruption': '1064',
    'Cyber Crime': '1930',
    'Mental Health': '1800-599-0019',
    'Domestic Violence': '181',
    'Nirbhaya Helpline': '181',
    'Ujjawala Helpline': '1098',
    'Child Labour': '1098',
    'Human Trafficking': '1098'
  },

  // Quick Dial Options for Indian Users
  QUICK_DIAL_OPTIONS: [
    { name: 'Police', number: '100', icon: 'police-badge' },
    { name: 'Women Helpline', number: '1091', icon: 'account-heart' },
    { name: 'Ambulance', number: '102', icon: 'ambulance' },
    { name: 'Fire', number: '101', icon: 'fire' },
    { name: 'Emergency', number: '112', icon: 'phone-alert' },
    { name: 'Child Helpline', number: '1098', icon: 'baby-face' },
    { name: 'Disaster Management', number: '108', icon: 'alert-circle' }
  ]
};

// Indian Safe Zones Types
export const INDIAN_SAFE_ZONE_TYPES = {
  POLICE_STATION: 'police_station',
  HOSPITAL: 'hospital', 
  WOMEN_HELPLINE_CENTER: 'women_helpline_center',
  CHILD_WELFARE_COMMITTEE: 'child_welfare_committee',
  ONE_STOP_CENTER: 'one_stop_center',
  WOMEN_POLICE_STATION: 'women_police_station',
  FIRE_STATION: 'fire_station',
  RAILWAY_STATION: 'railway_station',
  BUS_STAND: 'bus_stand',
  SHOPPING_MALL: 'shopping_mall',
  BANK: 'bank',
  ATM: 'atm',
  PHARMACY: 'pharmacy',
  SCHOOL: 'school',
  COLLEGE: 'college',
  UNIVERSITY: 'university'
};

// Indian Emergency Messages Templates
export const INDIAN_EMERGENCY_MESSAGES = {
  SOS_MESSAGE: (location: string, time: string) => 
    `🚨 EMERGENCY ALERT 🚨\n\nI am in danger and need immediate help!\n\n📍 Location: ${location}\n⏰ Time: ${time}\n\nPlease call the police (100) and send help immediately.\n\nThis message was sent from SafeHer app.`,
  
  GUARDIAN_MESSAGE: (location: string, time: string, userName: string) =>
    `🚨 GUARDIAN ALERT 🚨\n\n${userName} has triggered an emergency alert!\n\n📍 Location: ${location}\n⏰ Time: ${time}\n\nPlease check on them immediately and call emergency services if needed.\n\nSent from SafeHer app.`,
  
  LOCATION_UPDATE: (location: string, time: string) =>
    `📍 Location Update\n\nCurrent location: ${location}\nTime: ${time}\n\nSent from SafeHer app.`
};
