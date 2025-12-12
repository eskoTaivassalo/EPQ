// Quick test to verify notification path
const testPath = () => {
  const serviceType = 'education';
  const collectionName = 'parents';
  const userId = 'kkhILDNjHiNPA4SONFWqIedoyYS2';
  
  console.log('Testing notification path construction:');
  console.log('Arguments:', 'serviceTypes', serviceType, collectionName, userId, 'notifications');
  console.log('Expected path: serviceTypes/education/parents/kkhILDNjHiNPA4SONFWqIedoyYS2/notifications');
  
  // This is what collection() receives:
  const args = ['serviceTypes', serviceType, collectionName, userId, 'notifications'];
  console.log('Array of args:', args);
  console.log('Number of args:', args.length, '(should be 5 for proper subcollection)');
};

testPath();
