/**
 * Test data utilities for Ezra test suite
 * 
 * IMPORTANT: Sensitive credentials are loaded from environment variables.
 * Create a .env file in the project root with your test credentials.
 * See .env.example for the required variables.
 */

/// <reference types="node" />

export interface TestUser {
  email: string;
  password: string;
  name?: string;
}

export interface BookingData {
  date: string;
  time: string;
  service?: string;
  coach?: string;
}

export interface PaymentCard {
  number: string;
  expiry: string;
  cvv: string;
  name: string;
  address?: string;
}

// Load credentials from environment variables with fallback to defaults
// Defaults are only used if environment variables are not set
export const testUsers: Record<string, TestUser> = {
  valid: {
    email: process.env.TEST_USER_EMAIL || 'testuser@ezra.com',
    password: process.env.TEST_USER_PASSWORD || 'TestPassword123!',
    name: process.env.TEST_USER_NAME || 'Test User',
  },
  invalid: {
    email: process.env.TEST_INVALID_EMAIL || 'invalid@example.com',
    password: process.env.TEST_INVALID_PASSWORD || 'WrongPassword123!',
  },
};

export const testCards: Record<string, PaymentCard> = {
  valid: {
    number: process.env.TEST_CARD_NUMBER || '4242 4242 4242 4242',
    expiry: process.env.TEST_CARD_EXPIRY || '12/34',  // Updated to match test requirements
    cvv: process.env.TEST_CARD_CVV || '333',        // Updated to match test requirements
    name: process.env.TEST_CARD_NAME || 'Test User',
    address: process.env.TEST_CARD_ADDRESS || '123 Test Street, Test City, TC 12345',
  },
  declined: {
    number: '4000 0000 0000 0002',
    expiry: '12/25',
    cvv: '123',
    name: 'Test User',
  },
  invalidFormat: {
    number: '1234 5678 9012 3456',
    expiry: '12/25',
    cvv: '123',
    name: 'Test User',
  },
  expired: {
    number: '4242 4242 4242 4242',
    expiry: '01/20',
    cvv: '123',
    name: 'Test User',
  },
};

export function getFutureDate(daysAhead: number = 7): string {
  const date = new Date();
  date.setDate(date.getDate() + daysAhead);
  return date.toISOString().split('T')[0]; // Returns YYYY-MM-DD
}

export function getPastDate(daysAgo: number = 1): string {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().split('T')[0];
}

export function getTimeSlot(hour: number, minute: number = 0): string {
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  const displayMinute = minute.toString().padStart(2, '0');
  return `${displayHour}:${displayMinute} ${period}`;
}

export const bookingData: BookingData = {
  date: getFutureDate(7),
  time: getTimeSlot(14, 0), // 2:00 PM
  service: 'Coaching Session',
  coach: 'John Doe',
};

export const services = [
  'Coaching Session',
  'Therapy Session',
  'Consultation',
];

export const coaches = [
  'John Doe',
  'Jane Smith',
  'Bob Johnson',
];

/**
 * Generate a random first name for test accounts
 */
export function generateRandomFirstName(): string {
  const firstNames = [
    'John', 'Jane', 'Michael', 'Sarah', 'David', 'Emily', 'James', 'Jessica',
    'Robert', 'Amanda', 'William', 'Melissa', 'Richard', 'Michelle', 'Joseph', 'Ashley',
    'Thomas', 'Jennifer', 'Christopher', 'Nicole', 'Daniel', 'Stephanie', 'Matthew', 'Elizabeth',
    'Anthony', 'Lauren', 'Mark', 'Lisa', 'Donald', 'Nancy', 'Steven', 'Karen',
    'Paul', 'Betty', 'Andrew', 'Helen', 'Joshua', 'Sandra', 'Kenneth', 'Donna',
    'Kevin', 'Carol', 'Brian', 'Ruth', 'George', 'Sharon', 'Timothy', 'Michelle',
    'Ronald', 'Laura', 'Jason', 'Kimberly', 'Edward', 'Deborah', 'Jeffrey', 'Amy'
  ];
  return firstNames[Math.floor(Math.random() * firstNames.length)];
}

/**
 * Generate a random last name for test accounts
 */
export function generateRandomLastName(): string {
  const lastNames = [
    'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
    'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Wilson', 'Anderson', 'Thomas', 'Taylor',
    'Moore', 'Jackson', 'Martin', 'Lee', 'Thompson', 'White', 'Harris', 'Sanchez',
    'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker', 'Young', 'Allen', 'King',
    'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores', 'Green', 'Adams',
    'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell', 'Carter', 'Roberts'
  ];
  return lastNames[Math.floor(Math.random() * lastNames.length)];
}

/**
 * Generate a random email address for test accounts
 * Format: test-{timestamp}-{random}@ezratest.com
 */
export function generateRandomEmail(): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return `test-${timestamp}-${random}@ezratest.com`;
}

/**
 * Generate a random phone number for test accounts
 * Format: (555) 555-{random 4 digits}
 */
export function generateRandomPhoneNumber(): string {
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `(555) 555-${random}`;
}

